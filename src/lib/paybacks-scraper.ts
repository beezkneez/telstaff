import { chromium, type Browser, type Page } from "playwright";
import { TELESTAFF_BASE_URL } from "./types";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export interface PaybackEntry {
  date: string;
  name: string;
  details: string;
}

export interface PaybacksData {
  owesMe: PaybackEntry[];
  iOwe: PaybackEntry[];
}

export async function scrapePaybacks(
  username: string,
  password: string
): Promise<PaybacksData> {
  const b = await getBrowser();
  const context = await b.newContext();
  const page = await context.newPage();

  try {
    // Login
    console.log("[paybacks] Logging in...");
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
    console.log("[paybacks] Logged in, navigating to dashboard...");

    // Navigate to dashboard
    await page.goto(`${TELESTAFF_BASE_URL}/telestaff/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(5000);
    console.log("[paybacks] Dashboard loaded");

    // Parse the paybacks data
    const data = await page.evaluate(() => {
      const result: {
        owesMe: { date: string; name: string; details: string }[];
        iOwe: { date: string; name: string; details: string }[];
      } = { owesMe: [], iOwe: [] };

      // Find all dashboard sections by their title
      const titleElements = document.querySelectorAll(".dashboardItemTitle");

      titleElements.forEach((titleEl) => {
        const title = titleEl.textContent?.trim().toLowerCase() || "";

        // Find the parent container that holds the entries
        const container = titleEl.closest(".dashboardItem, .panel, [class*='dashboard']") || titleEl.parentElement;
        if (!container) return;

        // Determine which list to add to
        let targetList: typeof result.owesMe | null = null;
        if (title.includes("owes me")) {
          targetList = result.owesMe;
        } else if (title.includes("i owe")) {
          targetList = result.iOwe;
        }
        if (!targetList) return;

        // Find all entries within this section
        // Each entry has: span.dateRange, then span.displayBlock.fontResize (name), then span.displayBlock.fontResize (details)
        const dateSpans = container.querySelectorAll("span.dateRange");

        dateSpans.forEach((dateSpan) => {
          const date = dateSpan.textContent?.trim() || "";

          // Get sibling displayBlock spans after this dateRange
          const parent = dateSpan.parentElement;
          if (!parent) return;

          const displayBlocks = parent.querySelectorAll("span.displayBlock.fontResize");
          const name = displayBlocks[0]?.textContent?.trim() || "";
          const details = displayBlocks[1]?.textContent?.trim() || "";

          if (name) {
            // Clean up the name — extract "LastName, FirstName"
            const nameClean = name.match(/^([A-Za-z'-]+,\s*[A-Za-z'-]+)/);
            targetList!.push({
              date: date.replace("Since ", ""),
              name: nameClean ? nameClean[1] : name.split(/\d/)[0].trim(),
              details,
            });
          }
        });
      });

      return result;
    });

    console.log(`[paybacks] Found ${data.owesMe.length} owes me, ${data.iOwe.length} I owe`);
    return data;
  } finally {
    await context.close();
  }
}

process.on("beforeExit", async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
});
