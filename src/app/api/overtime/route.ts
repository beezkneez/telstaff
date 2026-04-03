import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShiftInfo, getOnShiftPlatoons, canBeCalledIn, getLast6Off, getNext6Off } from "@/lib/rotation";
import { getCallInList, findMemberOnList, getPositionsAhead as getDbPositionsAhead } from "@/lib/callin-db";
import { getRecentHistory } from "@/lib/callin-db";
import { predictOvertime, isNearStatHoliday } from "@/lib/prediction";
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

  // Get call-in list from DB (falls back to Google Sheet if DB is empty)
  let callInData = null;
  try {
    const { members, currentUpPos } = await getCallInList(userPlatoon);

    if (members.length > 0) {
      // Match user by last name
      const nameParts = userName.trim().split(" ");
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      const position = findMemberOnList(members, lastName);

      const positionsAhead = position !== null
        ? getDbPositionsAhead(currentUpPos, position, members.length)
        : null;

      const currentUpMember = members.find((m) => m.position === currentUpPos);

      callInData = {
        currentUp: currentUpMember ? `${currentUpMember.lastName}${currentUpMember.firstName ? `, ${currentUpMember.firstName}` : ""}` : "Unknown",
        totalMembers: members.length,
        userPosition: position,
        positionsAhead,
        nearbyMembers: position !== null
          ? members
              .filter((m) => {
                const dist = getDbPositionsAhead(currentUpPos, m.position, members.length);
                const userDist = positionsAhead ?? 0;
                return Math.abs(dist - userDist) <= 5;
              })
              .sort((a, b) => a.position - b.position)
              .map((m) => ({ position: m.position, name: `${m.lastName}${m.firstName ? `, ${m.firstName}` : ""}` }))
          : members.slice(0, 15).map((m) => ({ position: m.position, name: `${m.lastName}${m.firstName ? `, ${m.firstName}` : ""}` })),
      };
    } else {
      // Fallback to Google Sheet
      const { getCallInLists, findMemberPosition, getPositionsAhead } = await import("@/lib/callin-list");
      const lists = await getCallInLists();
      const myList = lists.find((l) => l.platoon === userPlatoon);
      if (myList) {
        const nameParts = userName.trim().split(" ");
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
        const position = findMemberPosition(myList, lastName);
        const positionsAhead = position ? getPositionsAhead(myList, position) : null;
        callInData = {
          currentUp: myList.currentUp,
          totalMembers: myList.members.length,
          userPosition: position,
          positionsAhead,
          nearbyMembers: myList.members.slice(0, 15),
        };
      }
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

    // Get actual historical ratios from call-in DB
    const recentHistoryData = await getRecentHistory(30);

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

    // Get yesterday's actual call-in history for ratio
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const yesterdayHistory = await prisma.callInHistory.findMany({
      where: { date: new Date(yesterday + "T00:00:00Z") },
    });
    const yesterdayRatio = yesterdayHistory.length > 0
      ? yesterdayHistory.reduce((s, h) => s + (h.ratio || 0), 0) / yesterdayHistory.length
      : undefined;

    prediction = predictOvertime({
      positionsAhead: callInData.positionsAhead,
      last6OffTotal,
      todayOtwp,
      todayHoles: null, // will be updated after shortfalls are calculated
      date,
      historicalAvgPerShift,
      recentTrend,
      yesterdayRatio,
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

  // Get current or next 6-off details (use current if we're in one)
  const next6Off = userShift.type === "off-long"
    ? getLast6Off(date, userPlatoon)
    : getNext6Off(date, userPlatoon);
  const next6OffDetails = next6Off.dates.map((d, i) => {
    const shifts = getOnShiftPlatoons(d);
    const stat = isNearStatHoliday(d);
    return {
      date: d,
      eligible: next6Off.eligible[i],
      dayShiftPlatoon: shifts.dayShift,
      nightShiftPlatoon: shifts.nightShift,
      statHoliday: stat.near ? stat.holiday : null,
      statDaysAway: stat.daysAway,
    };
  });

  // Calculate staffing shortfalls for NEXT 6-off eligible days
  // Only flag stale for dates within the cron scrape window (today + 10 days)
  const shortfalls: StaffingShortfall[] = [];
  let dataStale = false;
  const staleThreshold = 8 * 60 * 60 * 1000; // 8 hours
  const scrapeHorizon = new Date();
  scrapeHorizon.setDate(scrapeHorizon.getDate() + 16);
  const scrapeHorizonStr = scrapeHorizon.toISOString().split("T")[0];
  const allEligibleDetails = next6OffDetails;
  try {
    for (const detail of allEligibleDetails) {
      const dateObj = new Date(detail.date + "T00:00:00Z");
      const withinScrapeWindow = detail.date <= scrapeHorizonStr;

      for (const shiftType of ["day", "night"] as const) {
        const shiftPlatoon = shiftType === "day" ? detail.dayShiftPlatoon : detail.nightShiftPlatoon;
        if (!shiftPlatoon) continue;

        const cached = await prisma.staffingCache.findMany({
          where: { date: dateObj, platoon: shiftPlatoon },
          orderBy: { station: "asc" },
        });

        if (cached.length > 0) {
          // Check staleness only for dates within scrape window
          if (withinScrapeWindow) {
            const oldestScrape = cached.reduce((oldest, c) =>
              c.scrapedAt < oldest ? c.scrapedAt : oldest, cached[0].scrapedAt);
            if (Date.now() - oldestScrape.getTime() > staleThreshold) {
              dataStale = true;
            }
          }

          const stations = cached.map((c) => c.data as unknown as { station: number; trucks: { truck: string; type: string; crew: { name: string; rank: string; status?: string }[] }[] });
          const shortfall = calculateShortfall(stations, shiftPlatoon, detail.date, shiftType);
          console.log(`[overtime] ${detail.date} ${shiftType} PLT-${shiftPlatoon}: ${cached.length} cache rows, ${stations.length} stations, stations: [${stations.map(s => s.station).join(",")}], actual=${shortfall.actualCrew}/216, delta=${shortfall.ffHoles}`);
          shortfalls.push(shortfall);
        } else {
          // No cached data — push a placeholder so UI knows we checked
          shortfalls.push({
            date: detail.date,
            platoon: shiftPlatoon,
            shift: shiftType,
            requiredCrew: 216,
            actualCrew: 0,
            ffHoles: 0,
            captainHoles: 0,
            totalHoles: 0,
            truckBreakdown: [],
            noData: true,
          } as StaffingShortfall & { noData: boolean });
          if (withinScrapeWindow) {
            dataStale = true;
          }
        }
      }
    }
  } catch (err) {
    console.error("[overtime] Shortfall calc error:", err);
  }

  console.log("[overtime] Shortfalls:", shortfalls.map((sf) => `${sf.date} ${sf.shift} PLT-${sf.platoon}: ${sf.ffHoles}FF ${sf.captainHoles}Capt`).join(", "));

  // Update prediction with the NEXT shift's holes from the upcoming 6-off
  if (prediction && callInData?.positionsAhead !== null) {
    // Find the first upcoming shift with holes (day or night)
    const nextDayShift = shortfalls.find((sf) => sf.shift === "day");
    const nextNightShift = shortfalls.find((sf) => sf.shift === "night");

    // Use the average holes per shift across the upcoming 6-off
    const allHoles = shortfalls.map((sf) => sf.ffHoles);
    const avgHolesPerShift = allHoles.length > 0
      ? Math.round(allHoles.reduce((s, h) => s + h, 0) / allHoles.length)
      : 0;

    // Use the first day shift holes as the primary number (most relevant)
    const primaryHoles = nextDayShift?.ffHoles || nextNightShift?.ffHoles || avgHolesPerShift;

    if (primaryHoles > 0) {
      prediction = predictOvertime({
        positionsAhead: callInData!.positionsAhead!,
        last6OffTotal: prediction.last6OffTotal,
        todayOtwp: prediction.todayOtwp,
        todayHoles: primaryHoles,
        date,
        yesterdayRatio: prediction.factors.find((f) => f.name === "Yesterday's ratio")?.value !== "N/A"
          ? parseFloat(prediction.factors.find((f) => f.name === "Yesterday's ratio")?.value || "0")
          : undefined,
      });
    }
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
    next6OffDetails,
    prediction,
    shortfalls,
    dataStale,
    ytdNeeded,
    ytdWorked,
  });
}
