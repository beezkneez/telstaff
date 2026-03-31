import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getCached, setCached, getInProgress, setInProgress } from "@/lib/cache";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const platoon = searchParams.get("platoon") || "1";
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  // Check cache first — return immediately if fresh
  const cached = getCached(platoon, date);
  if (cached) {
    console.log("[stations] Cache hit for platoon", platoon, "date", date);
    return NextResponse.json(cached);
  }

  // Get user credentials
  let username = "";
  let password = "";

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telestaff_username: true, telestaff_password: true },
    });

    if (!user?.telestaff_username || !user?.telestaff_password) {
      return NextResponse.json(
        { error: "No Telestaff credentials saved. Go to Profile to connect." },
        { status: 400 }
      );
    }

    username = decrypt(user.telestaff_username);
    password = decrypt(user.telestaff_password);
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
