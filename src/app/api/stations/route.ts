import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { scrapeRoster, scrapeStationFromRoster } from "@/lib/scraper";
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
  const useMock = searchParams.get("mock") === "true";

  // Check if user has Telestaff credentials
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telestaff_username: true, telestaff_password: true },
  });

  const hasCreds =
    !useMock && user?.telestaff_username && user?.telestaff_password;

  if (hasCreds) {
    try {
      const username = decrypt(user.telestaff_username!);
      const password = decrypt(user.telestaff_password!);

      if (station) {
        const data = await scrapeStationFromRoster(
          username,
          password,
          parseInt(station),
          platoon,
          date
        );
        if (!data) {
          return NextResponse.json(
            { error: "Station not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(data);
      }

      const data = await scrapeRoster(username, password, platoon, date);
      return NextResponse.json(data);
    } catch (error) {
      console.error("Scraper error:", error);
      return NextResponse.json(
        {
          error: "Failed to scrape Telestaff. Check your credentials.",
          usedMock: true,
        },
        { status: 500 }
      );
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
