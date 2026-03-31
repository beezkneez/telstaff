import { chromium, type Browser, type Page } from "playwright";
import {
  type StationStaffing,
  PLATOON_ROSTER_VIEW_IDS,
  TELESTAFF_BASE_URL,
} from "./types";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

async function login(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  console.log("[scraper] Navigating to login page...");
  await page.goto(`${TELESTAFF_BASE_URL}/telestaff/login`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  console.log("[scraper] Login page loaded");

  await page.fill("#username", username);
  await page.fill("#password", password);
  console.log("[scraper] Credentials filled, clicking Sign In...");

  await page.getByRole("button", { name: "Sign In" }).click();

  await page.waitForFunction(
    () => !window.location.href.includes("/login"),
    { timeout: 30000 }
  );
  console.log("[scraper] Login complete");
}

function formatDate(date?: string): string {
  if (date) return date.replace(/-/g, "");
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

async function selectPlatoon(page: Page, platoon: string): Promise<void> {
  const viewId = PLATOON_ROSTER_VIEW_IDS[platoon];
  console.log("[scraper] Clicking #rosterView dropdown...");
  await page.click("#rosterView", { timeout: 10000 });
  await page.waitForTimeout(500);
  console.log("[scraper] Selecting platoon:", viewId);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }),
    page.click(`a[value="${viewId}"]`),
  ]);
  console.log("[scraper] Platoon selected, URL:", page.url());
}

async function expandAllStations(page: Page): Promise<void> {
  // Click all collapsed expand buttons
  let expandCount = 0;
  // May need multiple passes as expanding parents reveals child expand buttons
  for (let pass = 0; pass < 3; pass++) {
    const buttons = await page.$$('a.plainTextLink[aria-label="Expand/collapse"][aria-expanded="false"]');
    if (buttons.length === 0) break;
    console.log("[scraper] Pass", pass + 1, "- expanding", buttons.length, "items");
    for (const btn of buttons) {
      try {
        await btn.click();
        expandCount++;
        await page.waitForTimeout(100);
      } catch { /* skip */ }
    }
    await page.waitForTimeout(2000);
  }
  console.log("[scraper] Expanded", expandCount, "total items");
}

async function parseRosterPage(
  page: Page,
  platoon: string,
  date: string
): Promise<StationStaffing[]> {
  // Wait for roster data to load
  await page.waitForTimeout(10000);

  // Expand all stations and trucks
  await expandAllStations(page);
  await page.waitForTimeout(3000);

  // Parse using the real Telestaff DOM structure:
  // - Organization names: div.organizationName > span.bold (District/Station/Truck)
  // - Crew rank: span.positionNameText
  // - Crew name: div.displayNameText
  // - All in DOM order: District > Station > Truck > Crew
  const stations = await page.evaluate((platoonId: string) => {
    const results: {
      station: number;
      district: number;
      platoon: string;
      date: string;
      trucks: {
        truck: string;
        type: string;
        phoneNumber: string;
        crew: {
          name: string;
          rank: string;
          position: string;
          employeeId: string;
          status: string;
          qualifications: string;
        }[];
      }[];
    }[] = [];

    const allOrgNames = document.querySelectorAll(".organizationName span.bold");
    const allCrewNames = document.querySelectorAll("div.displayNameText");

    type Marker =
      | { type: "district"; num: number; el: Element }
      | { type: "station"; num: number; el: Element }
      | { type: "truck"; name: string; phone: string; el: Element }
      | { type: "crew"; name: string; rank: string; quals: string; el: Element };

    const markers: Marker[] = [];

    allOrgNames.forEach((span) => {
      const text = span.textContent?.trim() || "";
      const distMatch = text.match(/^District\s+(\d+)$/i);
      const stnMatch = text.match(/^Station\s+(\d+)$/i);

      if (distMatch) {
        markers.push({ type: "district", num: parseInt(distMatch[1]), el: span });
      } else if (stnMatch) {
        markers.push({ type: "station", num: parseInt(stnMatch[1]), el: span });
      } else if (text && !text.match(/Fire Rescue|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i)) {
        // Truck/unit name like "Pump 10 {Cell:(780) 860-6851}"
        const truckName = text.split("{")[0].trim();
        if (truckName) {
          markers.push({ type: "truck", name: truckName, phone: "", el: span });
        }
      }
    });

    // Crew members from div.displayNameText
    allCrewNames.forEach((el) => {
      const fullText = el.textContent?.trim() || "";
      // Format: "Alexander, Kyle    SQ30 T. (2 St Pump/EMR/Hz3/Pump)"
      // Extract "LastName, FirstName"
      const nameMatch = fullText.match(/^([A-Za-z'-]+,\s*[A-Za-z'-]+)/);
      const name = nameMatch ? nameMatch[1] : fullText.split("(")[0].trim();

      const qualMatch = fullText.match(/\(([^)]+)\)/);
      const quals = qualMatch ? qualMatch[1] : "";

      // Find the rank from a nearby span.positionNameText
      // Walk up to find the crew row container, then find positionNameText within it
      let rank = "";
      let parent = el.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        const rankEl = parent.querySelector("span.positionNameText");
        if (rankEl) {
          rank = rankEl.textContent?.trim() || "";
          break;
        }
        parent = parent.parentElement;
      }

      markers.push({ type: "crew", name, rank, quals, el });
    });

    // Sort markers by DOM order
    markers.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    // Walk through markers in order to build the station data
    let currentDistrict = 0;
    let currentStation: typeof results[0] | null = null;
    let currentTruck: typeof results[0]["trucks"][0] | null = null;

    for (const marker of markers) {
      if (marker.type === "district") {
        currentDistrict = marker.num;
      } else if (marker.type === "station") {
        currentStation = {
          station: marker.num,
          district: currentDistrict,
          platoon: platoonId,
          date: "",
          trucks: [],
        };
        results.push(currentStation);
        currentTruck = null;
      } else if (marker.type === "truck" && currentStation) {
        const lower = marker.name.toLowerCase();
        let truckType = "Other";
        if (lower.includes("pump") || lower.includes("engine")) truckType = "Engine";
        else if (lower.includes("ladder") || lower.includes("tower") || lower.includes("quint")) truckType = "Ladder";
        else if (lower.includes("rescue")) truckType = "Rescue";
        else if (lower.includes("medic") || lower.includes("ems")) truckType = "Medic";
        else if (lower.includes("hazmat") || lower.includes("haz")) truckType = "Hazmat";
        else if (lower.includes("command") || lower.includes("chief") || lower.includes("battalion")) truckType = "Command";

        currentTruck = {
          truck: marker.name,
          type: truckType,
          phoneNumber: marker.phone,
          crew: [],
        };
        currentStation.trucks.push(currentTruck);
      } else if (marker.type === "crew" && currentTruck) {
        currentTruck.crew.push({
          name: marker.name,
          rank: marker.rank,
          position: marker.rank,
          employeeId: "",
          status: "",
          qualifications: marker.quals,
        });
      }
    }

    return results;
  }, platoon);

  console.log("[scraper] Parsed", stations.length, "stations with",
    stations.reduce((sum, s) => sum + s.trucks.length, 0), "trucks and",
    stations.reduce((sum, s) => sum + s.trucks.reduce((t, u) => t + u.crew.length, 0), 0), "crew");

  return stations as StationStaffing[];
}

export async function scrapeRoster(
  username: string,
  password: string,
  platoon: string,
  date?: string
): Promise<StationStaffing[]> {
  const b = await getBrowser();
  const context = await b.newContext();
  const page = await context.newPage();

  try {
    await login(page, username, password);

    // Navigate to roster page
    const d = formatDate(date);
    const rosterUrl = `${TELESTAFF_BASE_URL}/telestaff/roster/d%5B${d}%5D`;
    console.log("[scraper] Navigating to roster:", rosterUrl);
    await page.goto(rosterUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Select platoon from dropdown
    await selectPlatoon(page, platoon);

    // Parse the roster
    const stations = await parseRosterPage(page, platoon, date || formatDate());
    return stations;
  } finally {
    await context.close();
  }
}

export async function scrapeStationFromRoster(
  username: string,
  password: string,
  station: number,
  platoon: string,
  date?: string
): Promise<StationStaffing | null> {
  const allStations = await scrapeRoster(username, password, platoon, date);
  return allStations.find((s) => s.station === station) || null;
}

process.on("beforeExit", async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
});
