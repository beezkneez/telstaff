import { chromium, type Browser, type Page } from "playwright";
import {
  type StationStaffing,
  type TruckAssignment,
  type CrewMember,
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
  console.log("[scraper] Login page loaded, URL:", page.url());

  await page.fill("#username", username);
  await page.fill("#password", password);
  console.log("[scraper] Credentials filled, clicking Sign In...");

  // Submit the login form — click "Sign In" button by text
  await page.getByRole("button", { name: "Sign In" }).click();
  console.log("[scraper] Clicked Sign In, waiting for redirect...");

  // Wait for the login page to go away (URL changes from /login)
  await page.waitForFunction(
    () => !window.location.href.includes("/login"),
    { timeout: 30000 }
  );
  console.log("[scraper] Login complete, URL:", page.url());
}

function formatDate(date?: string): string {
  if (date) {
    // Convert YYYY-MM-DD to YYYYMMDD
    return date.replace(/-/g, "");
  }
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function getRosterUrl(platoon: string, date?: string): string {
  const viewId = PLATOON_ROSTER_VIEW_IDS[platoon];
  if (!viewId) throw new Error(`Unknown platoon: ${platoon}`);
  const d = formatDate(date);
  return `${TELESTAFF_BASE_URL}/telestaff/roster/d%5B${d}%5D?rosterViewId=${viewId}&dynamicDateOffSet=0&collapsedStateChanges=&refresh=true`;
}

function classifyTruckType(
  truckName: string
): TruckAssignment["type"] {
  const lower = truckName.toLowerCase();
  if (lower.includes("pump") || lower.includes("engine")) return "Engine";
  if (lower.includes("ladder") || lower.includes("tower") || lower.includes("quint")) return "Ladder";
  if (lower.includes("rescue")) return "Rescue";
  if (lower.includes("medic") || lower.includes("ems")) return "Medic";
  if (lower.includes("hazmat") || lower.includes("haz")) return "Hazmat";
  if (lower.includes("command") || lower.includes("chief") || lower.includes("battalion")) return "Command";
  return "Other";
}

function parseStationNumber(text: string): number {
  const match = text.match(/station\s*(\d+)/i);
  return match ? parseInt(match[1]) : 0;
}

function parseDistrictNumber(text: string): number {
  const match = text.match(/district\s*(\d+)/i);
  return match ? parseInt(match[1]) : 0;
}

async function parseRosterPage(
  page: Page,
  platoon: string,
  date: string
): Promise<StationStaffing[]> {
  // Wait for the roster table to be in the DOM
  await page.waitForSelector("#tableGrid", {
    state: "attached",
    timeout: 30000,
  });
  // Give the roster data time to fully populate
  await page.waitForTimeout(5000);

  // Debug: dump a sample of the page HTML to understand the structure
  const debugHtml = await page.evaluate(() => {
    const grid = document.getElementById("tableGrid");
    if (!grid) return "NO #tableGrid found";
    // Get first 3000 chars of the grid's HTML
    return grid.outerHTML.substring(0, 3000);
  });
  console.log("[scraper] tableGrid sample HTML:", debugHtml.substring(0, 2000));

  // Expand all collapsed stations by clicking the expand/collapse links
  const expandButtons = await page.$$('a.plainTextLink[aria-label="Expand/collapse"][aria-expanded="false"]');
  console.log("[scraper] Found", expandButtons.length, "expand buttons to click");

  for (const btn of expandButtons) {
    try {
      await btn.click();
      await page.waitForTimeout(300);
    } catch {
      // Some buttons may not be clickable, skip
    }
  }

  // Give time for all expansions to complete
  console.log("[scraper] Waiting for expansions to settle...");
  await page.waitForTimeout(3000);

  // Parse the page content
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

    // Get all text content and parse the tree structure
    const body = document.body.innerHTML;

    // Strategy: find all station nodes and parse their children
    // The structure is: District > Station > Truck > Crew rows
    // Each level is typically a tree node with expandable children

    // Look for table rows that contain the roster data
    const allRows = document.querySelectorAll("tr, .rosterRow, .treeNode");
    let currentDistrict = 0;
    let currentStation = 0;
    let currentTruck = "";
    let currentPhoneNumber = "";
    let stationMap = new Map<number, {
      district: number;
      trucks: Map<string, {
        phoneNumber: string;
        crew: {
          name: string;
          rank: string;
          position: string;
          employeeId: string;
          status: string;
          qualifications: string;
        }[];
      }>;
    }>();

    allRows.forEach((row) => {
      const text = row.textContent?.trim() || "";

      // Check if this is a district header
      const districtMatch = text.match(/District\s*(\d+)/i);
      if (districtMatch && text.length < 30) {
        currentDistrict = parseInt(districtMatch[1]);
        return;
      }

      // Check if this is a station header
      const stationMatch = text.match(/Station\s*(\d+)/i);
      if (stationMatch && text.length < 30) {
        currentStation = parseInt(stationMatch[1]);
        if (!stationMap.has(currentStation)) {
          stationMap.set(currentStation, {
            district: currentDistrict,
            trucks: new Map(),
          });
        }
        return;
      }

      // Check if this is a truck/unit header (e.g., "Pump 10 (Cell:(780) 860-6851)")
      const truckMatch = text.match(/^(Pump|Engine|Ladder|Tower|Rescue|Hazmat|Haz|Medic|FF|Command|Battalion|Quint)\s*\d*.*?(?:\((?:Cell:)?([\d\-() ]+)\))?/i);
      if (truckMatch && text.length < 100 && !text.match(/\d{7}/)) {
        currentTruck = truckMatch[0].split("(")[0].trim();
        const phoneMatch = text.match(/(?:Cell:)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
        currentPhoneNumber = phoneMatch ? phoneMatch[0] : "";

        if (currentStation && stationMap.has(currentStation)) {
          const station = stationMap.get(currentStation)!;
          if (!station.trucks.has(currentTruck)) {
            station.trucks.set(currentTruck, {
              phoneNumber: currentPhoneNumber,
              crew: [],
            });
          }
        }
        return;
      }

      // Check if this row contains a crew member (has a 7-digit employee ID)
      const empIdMatch = text.match(/\b(\d{7})\b/);
      if (empIdMatch && currentStation && currentTruck) {
        const cells = row.querySelectorAll("td, .cell, span");
        const cellTexts: string[] = [];
        cells.forEach((cell) => {
          const t = cell.textContent?.trim();
          if (t) cellTexts.push(t);
        });

        // Try to parse rank, name, qualifications, employee ID, status
        let rank = "";
        let name = "";
        let qualifications = "";
        let employeeId = empIdMatch[1];
        let status = "";

        // Typically: Rank | Name + Quals | EmpID | Status
        if (cellTexts.length >= 3) {
          rank = cellTexts[0] || "";
          // The name/quals cell usually contains "LastName, FirstName PositionCode MiddleInitial. (quals)"
          const nameQualText = cellTexts[1] || "";
          const qualMatch = nameQualText.match(/\(([^)]+)\)/);
          qualifications = qualMatch ? qualMatch[1] : "";
          name = nameQualText.split("(")[0].trim();
          // Clean up name — remove position codes like "10-F3"
          const nameClean = name.match(/^([A-Za-z]+,\s*[A-Za-z]+)/);
          if (nameClean) {
            name = nameClean[1];
          }
          // Status is usually the cell after employee ID
          for (let i = 0; i < cellTexts.length; i++) {
            if (cellTexts[i] === employeeId && i + 1 < cellTexts.length) {
              status = cellTexts[i + 1];
              break;
            }
          }
        }

        if (currentStation && stationMap.has(currentStation)) {
          const station = stationMap.get(currentStation)!;
          if (station.trucks.has(currentTruck)) {
            station.trucks.get(currentTruck)!.crew.push({
              name,
              rank,
              position: rank,
              employeeId,
              status,
              qualifications,
            });
          }
        }
      }
    });

    // Convert map to array
    const dateStr = document.querySelector(".roster-date, h1, .rosterHeader")?.textContent?.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || "";

    stationMap.forEach((data, stationNum) => {
      const trucks: typeof results[0]["trucks"] = [];
      data.trucks.forEach((truckData, truckName) => {
        const lower = truckName.toLowerCase();
        let type = "Other";
        if (lower.includes("pump") || lower.includes("engine")) type = "Engine";
        else if (lower.includes("ladder") || lower.includes("tower") || lower.includes("quint")) type = "Ladder";
        else if (lower.includes("rescue")) type = "Rescue";
        else if (lower.includes("medic") || lower.includes("ems")) type = "Medic";
        else if (lower.includes("hazmat") || lower.includes("haz")) type = "Hazmat";
        else if (lower.includes("command") || lower.includes("chief")) type = "Command";

        trucks.push({
          truck: truckName,
          type,
          phoneNumber: truckData.phoneNumber,
          crew: truckData.crew,
        });
      });

      results.push({
        station: stationNum,
        district: data.district,
        platoon: platoonId,
        date: dateStr,
        trucks,
      });
    });

    return results.sort((a, b) => a.station - b.station);
  }, platoon);

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
    // Login
    await login(page, username, password);

    // Navigate to roster page
    const d = formatDate(date);
    const rosterUrl = `${TELESTAFF_BASE_URL}/telestaff/roster/d%5B${d}%5D`;
    console.log("[scraper] Navigating to roster:", rosterUrl);
    await page.goto(rosterUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Select platoon from Bootstrap dropdown: click #rosterView button, then click the option
    const viewId = PLATOON_ROSTER_VIEW_IDS[platoon];
    console.log("[scraper] Clicking #rosterView dropdown...");
    await page.click("#rosterView", { timeout: 10000 });
    await page.waitForTimeout(500);
    console.log("[scraper] Dropdown opened, selecting platoon value:", viewId);
    await page.click(`a[value="${viewId}"]`, { timeout: 10000 });
    console.log("[scraper] Platoon selected, waiting for data to load...");

    // Wait for stations to load (~10 seconds)
    await page.waitForTimeout(10000);

    const tableLength = await page.evaluate(() => {
      const table = document.getElementById("tableGrid");
      return table ? table.innerHTML.trim().length : 0;
    });
    console.log("[scraper] Table content length:", tableLength);

    // Parse the roster
    const stations = await parseRosterPage(page, platoon, date || formatDate());
    console.log("[scraper] Parsed", stations.length, "stations");

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

// Cleanup browser on process exit
process.on("beforeExit", async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
});
