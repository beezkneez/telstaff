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
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user?.profile || !user.telestaff_username || !user.telestaff_password) {
    return NextResponse.json(
      { error: "Profile and Telestaff credentials required" },
      { status: 400 }
    );
  }

  const userPlatoon = user.profile.platoon;
  const username = decrypt(user.telestaff_username);
  const password = decrypt(user.telestaff_password);

  // Get the eligible days from last 6-off
  const last6Off = getLast6Off(date, userPlatoon);
  const eligibleDates = last6Off.dates.filter((_, i) => last6Off.eligible[i]);

  // Build the scrape list: each eligible date with day/night shift platoons
  const scrapeList = eligibleDates.map((d) => {
    const shifts = getOnShiftPlatoons(d);
    return {
      date: d,
      dayShiftPlatoon: shifts.dayShift || "",
      nightShiftPlatoon: shifts.nightShift || "",
    };
  }).filter((d) => d.dayShiftPlatoon && d.nightShiftPlatoon);

  const cacheKey = `${userPlatoon}:${last6Off.dates[0]}`;

  // Check cache
  const { getCachedOTWP, setCachedOTWP, scrapeOTWPForDates } = await import(
    "@/lib/otwp-scraper"
  );

  const cached = getCachedOTWP(cacheKey);
  if (cached) {
    console.log("[otwp-api] Cache hit for", cacheKey);
    return NextResponse.json({ results: cached, cached: true });
  }

  // Scrape OTWP data
  console.log("[otwp-api] Scraping OTWP for", scrapeList.length, "dates...");
  try {
    const results = await scrapeOTWPForDates(username, password, scrapeList);
    setCachedOTWP(cacheKey, results);
    return NextResponse.json({ results, cached: false });
  } catch (error) {
    console.error("[otwp-api] Scrape failed:", error);
    return NextResponse.json(
      { error: "Failed to scrape OTWP data" },
      { status: 500 }
    );
  }
}
