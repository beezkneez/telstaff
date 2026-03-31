import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShiftInfo, getOnShiftPlatoons, canBeCalledIn, getLast6Off } from "@/lib/rotation";
import { getCallInLists, findMemberPosition, getPositionsAhead } from "@/lib/callin-list";

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
  });
}
