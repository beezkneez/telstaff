import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return user?.isAdmin === true;
}

// GET: fetch admin data (users, settings, cache stats)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "users") {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isAdmin: true,
        useSystemCreds: true,
        telestaff_username: true,
        createdAt: true,
        profile: { select: { name: true, platoon: true, homeStation: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(
      users.map((u) => ({
        ...u,
        hasTelestaffCreds: !!u.telestaff_username,
        telestaff_username: undefined,
      }))
    );
  }

  if (action === "settings") {
    let settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      settings = await prisma.appSettings.create({
        data: { id: "singleton" },
      });
    }
    return NextResponse.json(settings);
  }

  if (action === "cache-stats") {
    const staffingCount = await prisma.staffingCache.count();
    const otwpCount = await prisma.oTWPCache.count();
    const latestStaffing = await prisma.staffingCache.findFirst({ orderBy: { scrapedAt: "desc" } });
    const latestOtwp = await prisma.oTWPCache.findFirst({ orderBy: { scrapedAt: "desc" } });
    return NextResponse.json({
      staffingEntries: staffingCount,
      otwpEntries: otwpCount,
      lastStaffingScrape: latestStaffing?.scrapedAt || null,
      lastOtwpScrape: latestOtwp?.scrapedAt || null,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// PUT: update settings or user
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();

  if (body.action === "update-settings") {
    const settings = await prisma.appSettings.upsert({
      where: { id: "singleton" },
      update: {
        cronTime1: body.cronTime1,
        cronTime2: body.cronTime2,
        cronEnabled: body.cronEnabled,
        daysBack: body.daysBack,
        daysAhead: body.daysAhead,
      },
      create: {
        id: "singleton",
        cronTime1: body.cronTime1,
        cronTime2: body.cronTime2,
        cronEnabled: body.cronEnabled,
        daysBack: body.daysBack,
        daysAhead: body.daysAhead,
      },
    });
    return NextResponse.json(settings);
  }

  if (body.action === "update-user") {
    await prisma.user.update({
      where: { id: body.userId },
      data: {
        useSystemCreds: body.useSystemCreds,
        isAdmin: body.isAdmin,
      },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete-user") {
    await prisma.user.delete({ where: { id: body.userId } });
    return NextResponse.json({ success: true });
  }

  if (body.action === "clear-cache") {
    await prisma.staffingCache.deleteMany();
    await prisma.oTWPCache.deleteMany();
    return NextResponse.json({ success: true });
  }

  if (body.action === "trigger-scrape") {
    // Trigger a full scrape in the background — bypasses cache check
    import("@/lib/cron").then(({ runNightlyScrape }) => {
      runNightlyScrape().catch(console.error);
    }).catch(console.error);
    return NextResponse.json({ status: "Full scrape triggered — check logs" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
