import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getCached, setCached, getInProgress, setInProgress } from "@/lib/cache";

// Fire-and-forget background scraping for other platoons
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { platoons, date } = await req.json();

  if (!platoons || !Array.isArray(platoons)) {
    return NextResponse.json({ error: "platoons array required" }, { status: 400 });
  }

  // Get credentials
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telestaff_username: true, telestaff_password: true },
  });

  if (!user?.telestaff_username || !user?.telestaff_password) {
    return NextResponse.json({ error: "No credentials" }, { status: 400 });
  }

  const username = decrypt(user.telestaff_username);
  const password = decrypt(user.telestaff_password);
  const targetDate = date || new Date().toISOString().split("T")[0];

  // Start background scrapes for each platoon (don't await)
  for (const platoon of platoons) {
    if (getCached(platoon, targetDate)) continue; // already cached
    if (getInProgress(platoon, targetDate)) continue; // already scraping

    const scrapePromise = import("@/lib/scraper").then(({ scrapeRoster }) =>
      scrapeRoster(username, password, platoon, targetDate).then((stations) => {
        setCached(platoon, targetDate, stations);
        console.log("[prefetch] Cached platoon", platoon, ":", stations.length, "stations");
        return stations;
      })
    ).catch((err) => {
      console.error("[prefetch] Failed platoon", platoon, ":", err);
      return [];
    });

    setInProgress(platoon, targetDate, scrapePromise);
  }

  return NextResponse.json({ status: "prefetching", platoons });
}
