import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getOnShiftPlatoons } from "@/lib/rotation";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, telestaff_username: true, telestaff_password: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  if (!user.telestaff_username || !user.telestaff_password) {
    return NextResponse.json({ error: "No credentials" }, { status: 400 });
  }

  const username = decrypt(user.telestaff_username);
  const password = decrypt(user.telestaff_password);

  // Build list of dates from Jan 1 to today
  const yearStart = new Date(`${new Date().getFullYear()}-01-01`);
  const today = new Date();
  const dates: string[] = [];

  for (let d = new Date(yearStart); d <= today; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }

  // Filter out dates we already have in the DB
  const existing = await prisma.oTWPCache.findMany({
    where: { date: { gte: yearStart } },
    select: { date: true, platoon: true, shift: true },
  });

  const existingKeys = new Set(
    existing.map((e) => `${e.date.toISOString().split("T")[0]}:${e.platoon}:${e.shift}`)
  );

  // Build scrape list — only dates missing from DB
  const scrapeList: { date: string; dayShiftPlatoon: string; nightShiftPlatoon: string }[] = [];

  for (const date of dates) {
    const shifts = getOnShiftPlatoons(date);
    if (!shifts.dayShift || !shifts.nightShift) continue;

    const dayKey = `${date}:${shifts.dayShift}:day`;
    const nightKey = `${date}:${shifts.nightShift}:night`;

    if (!existingKeys.has(dayKey) || !existingKeys.has(nightKey)) {
      scrapeList.push({
        date,
        dayShiftPlatoon: shifts.dayShift,
        nightShiftPlatoon: shifts.nightShift,
      });
    }
  }

  console.log(`[backfill] ${dates.length} total days, ${scrapeList.length} need scraping, ${dates.length - scrapeList.length} already cached`);

  if (scrapeList.length === 0) {
    return NextResponse.json({ status: "complete", scraped: 0, message: "All dates already cached" });
  }

  // Start the backfill in the background — don't block the response
  (async () => {
    try {
      const { scrapeOTWPForDates } = await import("@/lib/otwp-scraper");

      // Process in batches of 4 dates (8 scrapes per batch)
      const batchSize = 4;
      let scraped = 0;

      for (let i = 0; i < scrapeList.length; i += batchSize) {
        const batch = scrapeList.slice(i, i + batchSize);
        console.log(`[backfill] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scrapeList.length / batchSize)} — ${batch.length} dates`);

        try {
          const results = await scrapeOTWPForDates(username, password, batch);

          // Store in DB
          for (const r of results) {
            const dateObj = new Date(r.date + "T00:00:00Z");

            if (r.dayShiftPlatoon && r.dayShiftCount >= 0) {
              await prisma.oTWPCache.upsert({
                where: {
                  date_platoon_shift: { date: dateObj, platoon: r.dayShiftPlatoon, shift: "day" },
                },
                update: { count: r.dayShiftCount, scrapedAt: new Date() },
                create: { date: dateObj, platoon: r.dayShiftPlatoon, shift: "day", count: r.dayShiftCount },
              });
            }

            if (r.nightShiftPlatoon && r.nightShiftCount >= 0) {
              await prisma.oTWPCache.upsert({
                where: {
                  date_platoon_shift: { date: dateObj, platoon: r.nightShiftPlatoon, shift: "night" },
                },
                update: { count: r.nightShiftCount, scrapedAt: new Date() },
                create: { date: dateObj, platoon: r.nightShiftPlatoon, shift: "night", count: r.nightShiftCount },
              });
            }

            scraped++;
          }

          console.log(`[backfill] Progress: ${scraped}/${scrapeList.length} dates done`);
        } catch (err) {
          console.error(`[backfill] Batch failed:`, err);
          // Continue with next batch
        }
      }

      console.log(`[backfill] Complete! Scraped ${scraped} dates`);
    } catch (err) {
      console.error("[backfill] Fatal error:", err);
    }
  })();

  return NextResponse.json({
    status: "started",
    totalDates: scrapeList.length,
    alreadyCached: dates.length - scrapeList.length,
    message: `Backfilling ${scrapeList.length} dates in background. Check logs for progress.`,
  });
}
