import { chromium, type Browser, type Page } from "playwright";
import {
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

async function login(page: Page, username: string, password: string): Promise<void> {
  await page.goto(`${TELESTAFF_BASE_URL}/telestaff/login`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForFunction(
    () => !window.location.href.includes("/login"),
    { timeout: 30000 }
  );
  console.log("[otwp] Logged in");
}

function formatDateMMDDYYYY(dateStr: string): string {
  // Convert YYYY-MM-DD to MM/DD/YYYY
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${mm}/${dd}/${yyyy}`;
}

function formatDateForUrl(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

async function scrapeOTWPForPlatoonDate(
  page: Page,
  platoon: string,
  date: string,
  isFirstLoad: boolean
): Promise<number> {
  const viewId = PLATOON_ROSTER_VIEW_IDS[platoon];
  console.log("[otwp] Scraping PLT-${platoon} on ${date}...");

  if (isFirstLoad) {
    // Navigate to roster page first time
    const rosterUrl = `${TELESTAFF_BASE_URL}/telestaff/roster/d%5B${formatDateForUrl(date)}%5D`;
    await page.goto(rosterUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);
  } else {
    // Change the date using the date input
    await page.fill("#targetDate", "");
    await page.fill("#targetDate", formatDateMMDDYYYY(date));
    await page.keyboard.press("Enter");
    await page.waitForTimeout(3000);
  }

  // Select platoon from dropdown
  await page.click("#rosterView", { timeout: 10000 });
  await page.waitForTimeout(500);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }),
    page.click(`a[value="${viewId}"]`),
  ]);
  await page.waitForTimeout(5000);

  // Open People Panel
  try {
    await page.click('span.icon-k-hm-manage-attendance', { timeout: 10000 });
    await page.waitForTimeout(2000);
  } catch {
    console.log("[otwp] People panel button not found, trying parent click");
    await page.click('button:has(span.icon-k-hm-manage-attendance)', { timeout: 5000 });
    await page.waitForTimeout(2000);
  }

  // Search for OTWP
  const searchInput = page.locator('input[placeholder="Search"][aria-controls*="locatePerson"]');
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.fill("");
  await searchInput.fill("OTWP");
  await page.waitForTimeout(3000);

  // Count the OTWP results
  const count = await page.locator("a.nameSingleEditLink").count();
  console.log(`[otwp] PLT-${platoon} on ${date}: ${count} OTWP`);

  // Close the people panel / clear search for next iteration
  await searchInput.fill("");
  await page.waitForTimeout(500);

  return count;
}

export interface OTWPResult {
  date: string;
  dayShiftPlatoon: string;
  dayShiftCount: number;
  nightShiftPlatoon: string;
  nightShiftCount: number;
}

export async function scrapeOTWPForDates(
  username: string,
  password: string,
  dates: { date: string; dayShiftPlatoon: string; nightShiftPlatoon: string }[]
): Promise<OTWPResult[]> {
  const b = await getBrowser();
  const context = await b.newContext();
  const page = await context.newPage();
  const results: OTWPResult[] = [];

  try {
    await login(page, username, password);

    let isFirst = true;
    for (const entry of dates) {
      let dayCount = 0;
      let nightCount = 0;

      try {
        dayCount = await scrapeOTWPForPlatoonDate(
          page, entry.dayShiftPlatoon, entry.date, isFirst
        );
        isFirst = false;
      } catch (err) {
        console.error(`[otwp] Failed day shift PLT-${entry.dayShiftPlatoon} on ${entry.date}:`, err);
      }

      try {
        nightCount = await scrapeOTWPForPlatoonDate(
          page, entry.nightShiftPlatoon, entry.date, false
        );
      } catch (err) {
        console.error(`[otwp] Failed night shift PLT-${entry.nightShiftPlatoon} on ${entry.date}:`, err);
      }

      results.push({
        date: entry.date,
        dayShiftPlatoon: entry.dayShiftPlatoon,
        dayShiftCount: dayCount,
        nightShiftPlatoon: entry.nightShiftPlatoon,
        nightShiftCount: nightCount,
      });
    }
  } finally {
    await context.close();
  }

  return results;
}

// Cache
const otwpCache = new Map<string, { results: OTWPResult[]; time: number }>();
const OTWP_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function getCachedOTWP(key: string): OTWPResult[] | null {
  const entry = otwpCache.get(key);
  if (!entry || Date.now() - entry.time > OTWP_CACHE_TTL) return null;
  return entry.results;
}

export function setCachedOTWP(key: string, results: OTWPResult[]): void {
  otwpCache.set(key, { results, time: Date.now() });
}

process.on("beforeExit", async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
});
