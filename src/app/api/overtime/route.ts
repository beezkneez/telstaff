import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShiftInfo, getOnShiftPlatoons, canBeCalledIn, getLast6Off } from "@/lib/rotation";
import { getCallInLists, findMemberPosition, getPositionsAhead } from "@/lib/callin-list";
import { predictOvertime } from "@/lib/prediction";
import { calculateShortfall, type StaffingShortfall } from "@/lib/staffing-calc";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  // Get user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user?.profile) {
    return NextResponse.json(
      { error: "Set up your profile with platoon and name first" },
      { status: 400 }
    );
  }

  const userPlatoon = user.profile.platoon;
  const userName = user.profile.name;

  // Get rotation info
  const userShift = getShiftInfo(date, userPlatoon);
  const onShift = getOnShiftPlatoons(date);
  const eligible = canBeCalledIn(date, userPlatoon);

  // Get all platoon shift info
  const allPlatoons = ["1", "2", "3", "4"].map((p) => ({
    platoon: p,
    shift: getShiftInfo(date, p),
    isWorking: getShiftInfo(date, p).type === "day" || getShiftInfo(date, p).type === "night",
  }));

  // Get call-in list data
  let callInData = null;
  try {
    const lists = await getCallInLists();
    const myList = lists.find((l) => l.platoon === userPlatoon);

    if (myList) {
      // Match by last name only (sheet uses last names), within user's platoon
      const nameParts = userName.trim().split(" ");
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      const position = findMemberPosition(myList, lastName);

      const positionsAhead = position
        ? getPositionsAhead(myList, position)
        : null;

      callInData = {
        currentUp: myList.currentUp,
        totalMembers: myList.members.length,
        userPosition: position,
        positionsAhead,
        // Show nearby members on the list
        nearbyMembers: position
          ? myList.members
              .filter(
                (m) =>
                  Math.abs(m.position - position) <= 5 ||
                  (positionsAhead !== null &&
                    Math.abs(
                      getPositionsAhead(myList, m.position) -
                        (positionsAhead ?? 0)
                    ) <= 5)
              )
              .sort((a, b) => a.position - b.position)
          : myList.members.slice(0, 15),
      };
    }
  } catch (error) {
    console.error("[overtime] Failed to fetch call-in list:", error);
  }

  // Get the last 6-off period with shift info for each day
  const last6Off = getLast6Off(date, userPlatoon);
  const sixOffDetails = last6Off.dates.map((d, i) => {
    const shifts = getOnShiftPlatoons(d);
    return {
      date: d,
      eligible: last6Off.eligible[i],
      dayShiftPlatoon: shifts.dayShift,
      nightShiftPlatoon: shifts.nightShift,
    };
  });

  // Build prediction if user has position data
  let prediction = null;
  if (callInData?.positionsAhead !== null && callInData?.positionsAhead !== undefined) {
    // Get total OTWP from user's last 6-off eligible days
    let last6OffTotal = 0;
    for (const detail of sixOffDetails) {
      if (!detail.eligible) continue;
      const dateObj = new Date(detail.date + "T00:00:00Z");
      const otwpEntries = await prisma.oTWPCache.findMany({
        where: { date: dateObj },
      });
      last6OffTotal += otwpEntries.reduce((s, o) => s + o.count, 0);
    }

    // Get today's OTWP if available
    const todayObj = new Date(date + "T00:00:00Z");
    const todayOtwpEntries = await prisma.oTWPCache.findMany({
      where: { date: todayObj },
    });
    const todayOtwp = todayOtwpEntries.length > 0
      ? todayOtwpEntries.reduce((s, o) => s + o.count, 0)
      : null;

    // Calculate historical average and trend from all OTWP data
    let historicalAvgPerShift: number | undefined;
    let recentTrend: "rising" | "stable" | "falling" | undefined;

    try {
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const allOtwp = await prisma.oTWPCache.findMany({
        where: { date: { gte: threeMonthsAgo } },
        orderBy: { date: "asc" },
      });

      if (allOtwp.length > 0) {
        const total = allOtwp.reduce((s, o) => s + o.count, 0);
        historicalAvgPerShift = total / allOtwp.length;

        // Calculate trend: compare last 2 weeks vs 2 weeks before that
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

        const recent = allOtwp.filter((o) => o.date >= twoWeeksAgo);
        const prior = allOtwp.filter((o) => o.date >= fourWeeksAgo && o.date < twoWeeksAgo);

        if (recent.length > 0 && prior.length > 0) {
          const recentAvg = recent.reduce((s, o) => s + o.count, 0) / recent.length;
          const priorAvg = prior.reduce((s, o) => s + o.count, 0) / prior.length;
          const change = (recentAvg - priorAvg) / (priorAvg || 1);

          if (change > 0.15) recentTrend = "rising";
          else if (change < -0.15) recentTrend = "falling";
          else recentTrend = "stable";
        }
      }
    } catch (err) {
      console.error("[overtime] Historical calc error:", err);
    }

    prediction = predictOvertime({
      positionsAhead: callInData.positionsAhead,
      last6OffTotal,
      todayOtwp,
      date,
      historicalAvgPerShift,
      recentTrend,
    });
  }

  // YTD tallies
  const yearStart = new Date(`${new Date().getFullYear()}-01-01T00:00:00Z`);
  let ytdNeeded: { platoon: string; total: number }[] = [];
  let ytdWorked: { platoon: string; total: number }[] = [];
  try {
    const ytdData = await prisma.oTWPCache.findMany({
      where: { date: { gte: yearStart } },
    });

    // "Needed" — how many OT call-ins each on-shift platoon required
    const neededMap: Record<string, number> = {};
    for (const entry of ytdData) {
      neededMap[entry.platoon] = (neededMap[entry.platoon] || 0) + entry.count;
    }
    ytdNeeded = ["1", "2", "3", "4"].map((p) => ({
      platoon: p,
      total: neededMap[p] || 0,
    }));

    // "Worked" — how many OT shifts each platoon's members received
    // For each OTWP entry, figure out which platoons were eligible and attribute call-ins
    const workedMap: Record<string, number> = {};
    for (const entry of ytdData) {
      if (entry.count === 0) continue;
      const dateStr = entry.date.toISOString().split("T")[0];
      // Find which platoons are in their eligible 6-off period on this date
      const eligiblePlatoons = ["1", "2", "3", "4"].filter((p) =>
        canBeCalledIn(dateStr, p)
      );
      if (eligiblePlatoons.length === 0) continue;
      // Split call-ins evenly among eligible platoons
      const perPlatoon = entry.count / eligiblePlatoons.length;
      for (const p of eligiblePlatoons) {
        workedMap[p] = (workedMap[p] || 0) + perPlatoon;
      }
    }
    ytdWorked = ["1", "2", "3", "4"].map((p) => ({
      platoon: p,
      total: Math.round(workedMap[p] || 0),
    }));
  } catch (err) {
    console.error("[overtime] YTD tally error:", err);
  }

  // Calculate staffing shortfalls for eligible days
  const shortfalls: StaffingShortfall[] = [];
  try {
    for (const detail of sixOffDetails) {
      if (!detail.eligible) continue;
      const dateObj = new Date(detail.date + "T00:00:00Z");

      // Check each on-shift platoon's roster
      for (const shiftType of ["day", "night"] as const) {
        const shiftPlatoon = shiftType === "day" ? detail.dayShiftPlatoon : detail.nightShiftPlatoon;
        if (!shiftPlatoon) continue;

        const cached = await prisma.staffingCache.findMany({
          where: { date: dateObj, platoon: shiftPlatoon },
          orderBy: { station: "asc" },
        });

        if (cached.length > 0) {
          const stations = cached.map((c) => c.data as unknown as { station: number; trucks: { truck: string; type: string; crew: { name: string; rank: string }[] }[] });
          const shortfall = calculateShortfall(stations, shiftPlatoon, detail.date, shiftType);
          if (shortfall.holes > 0) {
            shortfalls.push(shortfall);
          }
        }
      }
    }
  } catch (err) {
    console.error("[overtime] Shortfall calc error:", err);
  }

  return NextResponse.json({
    date,
    userPlatoon,
    userName,
    userShift,
    eligible,
    onShift,
    allPlatoons,
    callInData,
    sixOffDetails,
    prediction,
    shortfalls,
    ytdNeeded,
    ytdWorked,
  });
}
