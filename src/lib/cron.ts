import cron from "node-cron";
import { prisma } from "./prisma";
import { decrypt } from "./encryption";
import { getOnShiftPlatoons, getLast6Off } from "./rotation";
import type { StationStaffing } from "./types";

let initialized = false;

async function getSystemCredentials(): Promise<{
  username: string;
  password: string;
} | null> {
  // Use the first user with Telestaff credentials
  const user = await prisma.user.findFirst({
    where: {
      telestaff_username: { not: null },
      telestaff_password: { not: null },
    },
    select: { telestaff_username: true, telestaff_password: true },
  });

  if (!user?.telestaff_username || !user?.telestaff_password) return null;

  return {
    username: decrypt(user.telestaff_username),
    password: decrypt(user.telestaff_password),
  };
}

async function scrapeAndCacheRoster(
  username: string,
  password: string,
  platoon: string,
  date: string
): Promise<void> {
  try {
    const { scrapeRoster } = await import("./scraper");
    const stations = await scrapeRoster(username, password, platoon, date);

    // Store each station in the DB
    const dateObj = new Date(date + "T00:00:00Z");
    for (const station of stations) {
      await prisma.staffingCache.upsert({
        where: {
          date_platoon_station: {
            date: dateObj,
            platoon,
            station: station.station,
          },
        },
        update: {
          data: JSON.parse(JSON.stringify(station)),
          scrapedAt: new Date(),
        },
        create: {
          date: dateObj,
          platoon,
          station: station.station,
          data: JSON.parse(JSON.stringify(station)),
          scrapedAt: new Date(),
        },
      });
    }

    console.log(
      `[cron] Cached ${stations.length} stations for PLT-${platoon} on ${date}`
    );
  } catch (err) {
    console.error(`[cron] Failed roster scrape PLT-${platoon} ${date}:`, err);
  }
}

async function scrapeAndCacheOTWP(
  username: string,
  password: string,
  date: string,
  platoon: string,
  shift: string
): Promise<void> {
  try {
    const { scrapeOTWPForDates } = await import("./otwp-scraper");
    const shifts = getOnShiftPlatoons(date);
    const targetPlatoon =
      shift === "day" ? shifts.dayShift : shifts.nightShift;
    if (!targetPlatoon) return;

    const results = await scrapeOTWPForDates(username, password, [
      {
        date,
        dayShiftPlatoon: shifts.dayShift || "",
        nightShiftPlatoon: shifts.nightShift || "",
      },
    ]);

    if (results.length > 0) {
      const r = results[0];
      const dateObj = new Date(date + "T00:00:00Z");

      if (r.dayShiftCount >= 0 && shifts.dayShift) {
        await prisma.oTWPCache.upsert({
          where: {
            date_platoon_shift: {
              date: dateObj,
              platoon: shifts.dayShift,
              shift: "day",
            },
          },
          update: { count: r.dayShiftCount, scrapedAt: new Date() },
          create: {
            date: dateObj,
            platoon: shifts.dayShift,
            shift: "day",
            count: r.dayShiftCount,
          },
        });
      }

      if (r.nightShiftCount >= 0 && shifts.nightShift) {
        await prisma.oTWPCache.upsert({
          where: {
            date_platoon_shift: {
              date: dateObj,
              platoon: shifts.nightShift,
              shift: "night",
            },
          },
          update: { count: r.nightShiftCount, scrapedAt: new Date() },
          create: {
            date: dateObj,
            platoon: shifts.nightShift,
            shift: "night",
            count: r.nightShiftCount,
          },
        });
      }

      console.log(
        `[cron] Cached OTWP for ${date}: day=${r.dayShiftCount} night=${r.nightShiftCount}`
      );
    }
  } catch (err) {
    console.error(`[cron] Failed OTWP scrape ${date}:`, err);
  }
}

export async function runNightlyScrape(): Promise<void> {
  console.log("[cron] Starting nightly scrape...");

  const creds = await getSystemCredentials();
  if (!creds) {
    console.log("[cron] No system credentials available, skipping");
    return;
  }

  const now = new Date();

  // Build list of dates: 6 days back through 16 days ahead (full rotation cycle)
  const dates: string[] = [];
  for (let i = -6; i <= 16; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  console.log(`[cron] Scraping ${dates.length} dates × 4 platoons...`);

  // Scrape all 4 platoons for each date
  for (const date of dates) {
    for (const platoon of ["1", "2", "3", "4"]) {
      await scrapeAndCacheRoster(creds.username, creds.password, platoon, date);
    }
  }

  // Scrape OTWP for today + yesterday + each platoon's last 6-off eligible days
  const otwpDatesScraped = new Set<string>();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Always scrape today and yesterday
  for (const d of [today, yesterday]) {
    if (!otwpDatesScraped.has(d)) {
      otwpDatesScraped.add(d);
      await scrapeAndCacheOTWP(creds.username, creds.password, d, "", "both");
    }
  }

  // Scrape each platoon's last 6-off eligible days
  for (const platoon of ["1", "2", "3", "4"]) {
    const last6Off = getLast6Off(today, platoon);
    const eligibleDates = last6Off.dates.filter((_, i) => last6Off.eligible[i]);

    for (const d of eligibleDates) {
      if (otwpDatesScraped.has(d)) continue;
      otwpDatesScraped.add(d);
      await scrapeAndCacheOTWP(creds.username, creds.password, d, "", "both");
    }
  }

  console.log("[cron] Nightly scrape complete");
}

export function initCron(): void {
  if (initialized) return;
  initialized = true;

  // Use America/Edmonton timezone so DST is handled automatically
  const tz = "America/Edmonton";

  // 6:30 AM MT (pre-shift)
  cron.schedule("30 6 * * *", () => {
    console.log("[cron] Running 6:30 AM scrape...");
    runNightlyScrape().catch((err) => console.error("[cron] 6:30 AM error:", err));
  }, { timezone: tz });

  // 7:00 AM MT (shift start)
  cron.schedule("0 7 * * *", () => {
    console.log("[cron] Running 7 AM scrape...");
    runNightlyScrape().catch((err) => console.error("[cron] 7 AM error:", err));
  }, { timezone: tz });

  // 10:00 AM MT (mid-morning update)
  cron.schedule("0 10 * * *", () => {
    console.log("[cron] Running 10 AM scrape...");
    runNightlyScrape().catch((err) => console.error("[cron] 10 AM error:", err));
  }, { timezone: tz });

  // 1:00 PM MT (afternoon update)
  cron.schedule("0 13 * * *", () => {
    console.log("[cron] Running 1 PM scrape...");
    runNightlyScrape().catch((err) => console.error("[cron] 1 PM error:", err));
  }, { timezone: tz });

  // 4:30 PM MT (pre-shift)
  cron.schedule("30 16 * * *", () => {
    console.log("[cron] Running 4:30 PM scrape...");
    runNightlyScrape().catch((err) => console.error("[cron] 4:30 PM error:", err));
  }, { timezone: tz });

  // 5:00 PM MT (shift start)
  cron.schedule("0 17 * * *", () => {
    console.log("[cron] Running 5 PM scrape...");
    runNightlyScrape().catch((err) => console.error("[cron] 5 PM error:", err));
  }, { timezone: tz });

  console.log("[cron] Scheduled: 6:30 AM, 7 AM, 10 AM, 1 PM, 4:30 PM, 5 PM (America/Edmonton)");

  // Run immediately on startup if no recent data
  setTimeout(() => {
    prisma.staffingCache
      .findFirst({
        where: {
          scrapedAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        },
      })
      .then((recent) => {
        if (!recent) {
          console.log("[cron] No recent data, running initial scrape...");
          runNightlyScrape().catch(console.error);
        } else {
          console.log("[cron] Recent data exists, skipping initial scrape");
        }
      })
      .catch(console.error);
  }, 10000); // Wait 10s for app to settle
}
