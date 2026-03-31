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
    console.log("[paybacks] Dashboard loaded, URL:", page.url());

    // Debug: dump dashboard structure
    const debug = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll(".dashboardItemTitle"))
        .map(el => el.textContent?.trim());
      const allClasses = Array.from(document.querySelectorAll("[class*='dashboard']"))
        .slice(0, 10)
        .map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.trim().substring(0, 60) }));
      const dateRanges = document.querySelectorAll(".dateRange").length;
      const displayBlocks = document.querySelectorAll(".displayBlock.fontResize").length;
      return { titles, allClasses, dateRanges, displayBlocks, bodyLen: document.body.innerHTML.length };
    });
    console.log("[paybacks] Debug:", JSON.stringify(debug));

    // Parse the paybacks data
    // Structure: div.dashboardItemTitle ("Owes Me" / "I Owe")
    //   followed by sibling div.dashboardItem entries
    //   each entry has: span.dateRange + span.displayBlock.fontResize (name) + span.displayBlock.fontResize (details)
    const data = await page.evaluate(() => {
      const result: {
        owesMe: { date: string; name: string; details: string }[];
        iOwe: { date: string; name: string; details: string }[];
      } = { owesMe: [], iOwe: [] };

      // Get all title and item elements in DOM order
      const allElements = document.querySelectorAll(".dashboardItemTitle, .dashboardItem");

      let currentList: typeof result.owesMe | null = null;

      allElements.forEach((el) => {
        if (el.classList.contains("dashboardItemTitle")) {
          const title = el.textContent?.trim().toLowerCase() || "";
          if (title === "owes me") {
            currentList = result.owesMe;
          } else if (title === "i owe") {
            currentList = result.iOwe;
          } else {
            currentList = null; // other sections like Vacation, etc
          }
          return;
        }

        // It's a dashboardItem entry
        if (!currentList) return;

        const dateSpan = el.querySelector("span.dateRange");
        const displayBlocks = el.querySelectorAll("span.displayBlock.fontResize");

        const date = dateSpan?.textContent?.trim().replace("Since", "").trim() || "";
        const nameRaw = displayBlocks[0]?.textContent?.trim() || "";
        const details = displayBlocks[1]?.textContent?.trim() || "";

        if (nameRaw) {
          const nameClean = nameRaw.match(/^([A-Za-z'-]+,\s*[A-Za-z'-]+)/);
          currentList.push({
            date,
            name: nameClean ? nameClean[1] : nameRaw.split(/\d/)[0].trim(),
            details,
          });
        }
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
