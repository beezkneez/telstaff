import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { setCached } from "@/lib/cache";

interface BatchEntry {
  platoon: string;
  date: string;
}

// Scrapes a list of (platoon, date) pairs sequentially, reusing a single browser/login.
// Used by the overtime page's "Rescrape Now" to freshen every on-shift platoon across
// the upcoming 6-off in one request instead of multiple round-trips.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { scrapes } = (await req.json()) as { scrapes: BatchEntry[] };
  if (!Array.isArray(scrapes) || scrapes.length === 0) {
    return NextResponse.json({ error: "scrapes array required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telestaff_username: true, telestaff_password: true, useSystemCreds: true },
  });

  let username = "";
  let password = "";
  if (user?.telestaff_username && user?.telestaff_password) {
    username = decrypt(user.telestaff_username);
    password = decrypt(user.telestaff_password);
  } else if (user?.useSystemCreds) {
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
    return NextResponse.json({ error: "No credentials available" }, { status: 400 });
  }

  const { scrapeRoster } = await import("@/lib/scraper");

  // Dedupe
  const seen = new Set<string>();
  const unique = scrapes.filter((s) => {
    const key = `${s.platoon}:${s.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`[refresh-batch] ${unique.length} scrapes requested`);
  const results: { platoon: string; date: string; ok: boolean; stations?: number; error?: string }[] = [];

  for (const { platoon, date } of unique) {
    try {
      const stations = await scrapeRoster(username, password, platoon, date);
      setCached(platoon, date, stations);
      const dateObj = new Date(date + "T00:00:00Z");
      for (const station of stations) {
        await prisma.staffingCache.upsert({
          where: {
            date_platoon_station: { date: dateObj, platoon, station: station.station },
          },
          update: { data: JSON.parse(JSON.stringify(station)), scrapedAt: new Date() },
          create: {
            date: dateObj,
            platoon,
            station: station.station,
            data: JSON.parse(JSON.stringify(station)),
            scrapedAt: new Date(),
          },
        });
      }
      results.push({ platoon, date, ok: true, stations: stations.length });
    } catch (err) {
      console.error(`[refresh-batch] PLT-${platoon} ${date} failed:`, err);
      results.push({ platoon, date, ok: false, error: (err as Error).message });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  console.log(`[refresh-batch] ${succeeded}/${unique.length} succeeded`);
  return NextResponse.json({ results, succeeded, total: unique.length });
}
