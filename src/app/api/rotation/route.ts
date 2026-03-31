import { NextResponse } from "next/server";
import { getShiftInfo, getOnShiftPlatoons, getNextShift, canBeCalledIn } from "@/lib/rotation";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const platoon = searchParams.get("platoon");

  const onShift = getOnShiftPlatoons(date);

  if (platoon) {
    const info = getShiftInfo(date, platoon);
    const isWorking = info.type === "day" || info.type === "night";
    const overtimeEligible = canBeCalledIn(date, platoon);

    let nextShift = null;
    if (!isWorking) {
      const next = getNextShift(date, platoon);
      nextShift = {
        date: next.date.toISOString().split("T")[0],
        type: next.type,
        block: next.block,
      };
    }

    return NextResponse.json({
      date,
      platoon,
      shift: info,
      isWorking,
      overtimeEligible,
      nextShift,
      onShift,
    });
  }

  // Return all platoon info for this date
  const all = ["1", "2", "3", "4"].map((p) => ({
    platoon: p,
    shift: getShiftInfo(date, p),
    isWorking: getShiftInfo(date, p).type === "day" || getShiftInfo(date, p).type === "night",
    overtimeEligible: canBeCalledIn(date, p),
  }));

  return NextResponse.json({ date, platoons: all, onShift });
}
