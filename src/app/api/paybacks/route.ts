import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import type { PaybackEntry } from "@/lib/paybacks-scraper";

// In-memory cache per user (paybacks are personal)
const cache = new Map<string, { data: unknown; time: number }>();
const CACHE_TTL = 15 * 60 * 1000;

async function lookupPlatoon(lastName: string): Promise<string | undefined> {
  // Search cached roster data for this person's platoon
  const today = new Date();
  const dateObj = new Date(today.toISOString().split("T")[0] + "T00:00:00Z");

  for (const platoon of ["1", "2", "3", "4"]) {
    const cached = await prisma.staffingCache.findMany({
      where: { platoon, date: dateObj },
      select: { data: true },
      take: 31,
    });

    for (const entry of cached) {
      const data = entry.data as { trucks?: { crew?: { name?: string }[] }[] };
      if (data?.trucks) {
        for (const truck of data.trucks) {
          if (truck.crew) {
            for (const member of truck.crew) {
              if (member.name?.toUpperCase().includes(lastName.toUpperCase())) {
                return platoon;
              }
            }
          }
        }
      }
    }
  }
  return undefined;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Check cache
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telestaff_username: true, telestaff_password: true },
  });

  if (!user?.telestaff_username || !user?.telestaff_password) {
    return NextResponse.json(
      { error: "Telestaff credentials required" },
      { status: 400 }
    );
  }

  const username = decrypt(user.telestaff_username);
  const password = decrypt(user.telestaff_password);

  try {
    const { scrapePaybacks } = await import("@/lib/paybacks-scraper");
    const data = await scrapePaybacks(username, password);

    // Look up platoons for each person
    const addPlatoon = async (entries: PaybackEntry[]) => {
      for (const entry of entries) {
        const lastName = entry.name.split(",")[0].trim();
        entry.platoon = await lookupPlatoon(lastName);
      }
    };

    await addPlatoon(data.owesMe);
    await addPlatoon(data.iOwe);

    cache.set(userId, { data, time: Date.now() });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[paybacks] Scrape failed:", error);
    return NextResponse.json(
      { error: "Failed to load paybacks from Telestaff" },
      { status: 500 }
    );
  }
}
