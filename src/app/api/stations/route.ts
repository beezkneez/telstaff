import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scrapeStationStaffing, scrapeAllStations } from "@/lib/scraper";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const station = searchParams.get("station");
  const platoon = searchParams.get("platoon") || "1";
  const date = searchParams.get("date") || undefined;

  if (station) {
    const data = await scrapeStationStaffing(
      parseInt(station),
      platoon,
      date
    );
    return NextResponse.json(data);
  }

  const data = await scrapeAllStations(platoon, date);
  return NextResponse.json(data);
}
