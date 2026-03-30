import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import {
  getStationStaffing,
  getAllStationsForPlatoon,
} from "@/lib/mock-data";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const station = searchParams.get("station");
  const platoon = searchParams.get("platoon") || "1";
  const date = searchParams.get("date") || undefined;

  // Check if user has Telestaff credentials
  let hasCreds = false;
  let username = "";
  let password = "";

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telestaff_username: true, telestaff_password: true },
    });

    if (user?.telestaff_username && user?.telestaff_password) {
      username = decrypt(user.telestaff_username);
      password = decrypt(user.telestaff_password);
      hasCreds = true;
    }
  } catch (error) {
    console.error("Error loading credentials:", error);
  }

  // Try real scraper if creds available
  if (hasCreds) {
    try {
      const { scrapeRoster, scrapeStationFromRoster } = await import(
        "@/lib/scraper"
      );

      if (station) {
        const data = await scrapeStationFromRoster(
          username,
          password,
          parseInt(station),
          platoon,
          date
        );
        if (data) return NextResponse.json(data);
      } else {
        const data = await scrapeRoster(username, password, platoon, date);
        if (data.length > 0) return NextResponse.json(data);
      }
    } catch (error) {
      console.error("Scraper error, falling back to mock data:", error);
    }
  }

  // Fallback to mock data
  if (station) {
    const data = getStationStaffing(parseInt(station), platoon, date);
    return NextResponse.json({ ...data, mock: true });
  }

  const data = getAllStationsForPlatoon(platoon, date);
  return NextResponse.json(data.map((s) => ({ ...s, mock: true })));
}
