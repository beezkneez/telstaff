import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { setCached } from "@/lib/cache";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { platoon, date } = await req.json();

  if (!platoon || !date) {
    return NextResponse.json({ error: "platoon and date required" }, { status: 400 });
  }

  // Get credentials (own or system)
  let username = "";
  let password = "";

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

  try {
    const { scrapeRoster } = await import("@/lib/scraper");
    console.log(`[refresh] Manual scrape PLT-${platoon} on ${date}`);
    const stations = await scrapeRoster(username, password, platoon, date);

    // Update both memory and DB cache
    setCached(platoon, date, stations);

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

    console.log(`[refresh] Cached ${stations.length} stations`);
    return NextResponse.json({ success: true, stations: stations.length });
  } catch (error) {
    console.error("[refresh] Scrape failed:", error);
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}
