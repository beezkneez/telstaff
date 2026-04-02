import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getOnShiftPlatoons, getLast6Off } from "@/lib/rotation";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const force = searchParams.get("force") === "true";

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user?.profile) {
    return NextResponse.json(
      { error: "Profile required" },
      { status: 400 }
    );
  }

  const userPlatoon = user.profile.platoon;

  // Get the eligible days from last 6-off + today
  const last6Off = getLast6Off(date, userPlatoon);
  const eligibleDates = last6Off.dates.filter((_, i) => last6Off.eligible[i]);

  // Also include today and yesterday so we always have fresh data
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const allDates = [...new Set([...eligibleDates, today, yesterday])];

  const scrapeList = allDates
    .map((d) => {
      const shifts = getOnShiftPlatoons(d);
      return {
        date: d,
        dayShiftPlatoon: shifts.dayShift || "",
        nightShiftPlatoon: shifts.nightShift || "",
      };
    })
    .filter((d) => d.dayShiftPlatoon && d.nightShiftPlatoon);

  // Check database cache first (skip if force refresh)
  if (!force) try {
    const results = [];
    let allCached = true;

    for (const entry of scrapeList) {
      const dateObj = new Date(entry.date + "T00:00:00Z");
      const dayCache = await prisma.oTWPCache.findUnique({
        where: {
          date_platoon_shift: {
            date: dateObj,
            platoon: entry.dayShiftPlatoon,
            shift: "day",
          },
        },
      });
      const nightCache = await prisma.oTWPCache.findUnique({
        where: {
          date_platoon_shift: {
            date: dateObj,
            platoon: entry.nightShiftPlatoon,
            shift: "night",
          },
        },
      });

      if (dayCache && nightCache) {
        results.push({
          date: entry.date,
          dayShiftPlatoon: entry.dayShiftPlatoon,
          dayShiftCount: dayCache.count,
          nightShiftPlatoon: entry.nightShiftPlatoon,
          nightShiftCount: nightCache.count,
        });
      } else {
        allCached = false;
        break;
      }
    }

    if (allCached && results.length === scrapeList.length) {
      console.log("[otwp-api] DB cache hit for all", results.length, "dates");
      return NextResponse.json({ results, cached: true });
    }
  } catch (err) {
    console.error("[otwp-api] DB cache read error:", err);
  }

  // Check in-memory cache
  const cacheKey = `${userPlatoon}:${last6Off.dates[0]}`;
  const { getCachedOTWP, setCachedOTWP, scrapeOTWPForDates } = await import(
    "@/lib/otwp-scraper"
  );

  const memCached = !force ? getCachedOTWP(cacheKey) : null;
  if (memCached) {
    console.log("[otwp-api] Memory cache hit");
    return NextResponse.json({ results: memCached, cached: true });
  }

  // Get credentials — own or fall back to admin/system creds
  let username = "";
  let password = "";

  if (user.telestaff_username && user.telestaff_password) {
    username = decrypt(user.telestaff_username);
    password = decrypt(user.telestaff_password);
  } else {
    // Fall back to admin creds
    const admin = await prisma.user.findFirst({
      where: { isAdmin: true, telestaff_username: { not: null } },
      select: { telestaff_username: true, telestaff_password: true },
    });
    if (admin?.telestaff_username && admin?.telestaff_password) {
      username = decrypt(admin.telestaff_username);
      password = decrypt(admin.telestaff_password);
    }
  }

  if (!username || !password) {
    return NextResponse.json(
      { error: "No Telestaff credentials available" },
      { status: 400 }
    );
  }

  // Scrape OTWP data
  console.log("[otwp-api] Scraping OTWP for", scrapeList.length, "dates...");
  try {
    const results = await scrapeOTWPForDates(username, password, scrapeList);
    setCachedOTWP(cacheKey, results);

    // Also store in DB for other users
    for (const r of results) {
      const dateObj = new Date(r.date + "T00:00:00Z");
      if (r.dayShiftPlatoon) {
        await prisma.oTWPCache.upsert({
          where: {
            date_platoon_shift: {
              date: dateObj,
              platoon: r.dayShiftPlatoon,
              shift: "day",
            },
          },
          update: { count: r.dayShiftCount, scrapedAt: new Date() },
          create: {
            date: dateObj,
            platoon: r.dayShiftPlatoon,
            shift: "day",
            count: r.dayShiftCount,
          },
        });
      }
      if (r.nightShiftPlatoon) {
        await prisma.oTWPCache.upsert({
          where: {
            date_platoon_shift: {
              date: dateObj,
              platoon: r.nightShiftPlatoon,
              shift: "night",
            },
          },
          update: { count: r.nightShiftCount, scrapedAt: new Date() },
          create: {
            date: dateObj,
            platoon: r.nightShiftPlatoon,
            shift: "night",
            count: r.nightShiftCount,
          },
        });
      }
    }

    return NextResponse.json({ results, cached: false });
  } catch (error) {
    console.error("[otwp-api] Scrape failed:", error);
    return NextResponse.json(
      { error: "Failed to scrape OTWP data" },
      { status: 500 }
    );
  }
}
