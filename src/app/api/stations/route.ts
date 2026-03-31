import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getCached, setCached, getInProgress, setInProgress } from "@/lib/cache";
import type { StationStaffing } from "@/lib/types";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const platoon = searchParams.get("platoon") || "1";
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  // Check in-memory cache first
  const memCached = getCached(platoon, date);
  if (memCached) {
    console.log("[stations] Memory cache hit for platoon", platoon);
    return NextResponse.json(memCached);
  }

  // Check database cache (from nightly cron)
  try {
    const dateObj = new Date(date + "T00:00:00Z");
    const dbCached = await prisma.staffingCache.findMany({
      where: { date: dateObj, platoon },
      orderBy: { station: "asc" },
    });
    if (dbCached.length > 0) {
      const stations = dbCached.map((c) => c.data as unknown as StationStaffing);
      setCached(platoon, date, stations);
      console.log("[stations] DB cache hit:", dbCached.length, "stations");
      return NextResponse.json(stations);
    }
  } catch (err) {
    console.error("[stations] DB cache read error:", err);
  }

  // Get credentials — use own or fall back to system (admin) creds
  let username = "";
  let password = "";

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telestaff_username: true,
        telestaff_password: true,
        useSystemCreds: true,
      },
    });

    if (user?.telestaff_username && user?.telestaff_password) {
      username = decrypt(user.telestaff_username);
      password = decrypt(user.telestaff_password);
    } else if (user?.useSystemCreds) {
      // Use admin's credentials
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
        { error: "No Telestaff credentials available. Ask admin or add your own in Profile." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[stations] Error loading credentials:", error);
    return NextResponse.json(
      { error: "Failed to load credentials" },
      { status: 500 }
    );
  }

  // Check if a scrape is already in progress for this platoon+date
  let scrapePromise = getInProgress(platoon, date);

  if (!scrapePromise) {
    // Start a new scrape
    const { scrapeRoster } = await import("@/lib/scraper");
    scrapePromise = scrapeRoster(username, password, platoon, date)
      .then((stations) => {
        setCached(platoon, date, stations);
        console.log("[stations] Cached", stations.length, "stations for platoon", platoon);
        return stations;
      });
    setInProgress(platoon, date, scrapePromise);
  } else {
    console.log("[stations] Joining in-progress scrape for platoon", platoon);
  }

  try {
    const stations = await scrapePromise;
    return NextResponse.json(stations);
  } catch (error) {
    console.error("[stations] Scraper error:", error);
    return NextResponse.json(
      { error: "Failed to load staffing data from Telestaff. Try again." },
      { status: 500 }
    );
  }
}
