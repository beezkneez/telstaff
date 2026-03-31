import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

// In-memory cache per user (paybacks are personal)
const cache = new Map<string, { data: unknown; time: number }>();
const CACHE_TTL = 15 * 60 * 1000;

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
