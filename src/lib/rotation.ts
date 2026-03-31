// Edmonton Fire Rescue 16-day rotation schedule
// Block 1: 2 Day, 2 Night, 2 Off
// Block 2: 2 Day, 2 Night, 6 Off

// Epoch: March 16, 2026 — Platoon 3 starts Block 1 Day 1
const EPOCH = new Date("2026-03-16T00:00:00");

// Offsets: how many days after epoch each platoon starts their cycle
const PLATOON_OFFSETS: Record<string, number> = {
  "3": 0,
  "1": 4,
  "2": 8,
  "4": 12,
};

export type ShiftType = "day" | "night" | "off-short" | "off-long";

export interface ShiftInfo {
  type: ShiftType;
  block: 1 | 2 | 0; // 0 = off
  dayInBlock: number; // 1 or 2 within the 2-day period
  label: string;
}

function getCycleDay(date: Date, platoon: string): number {
  const offset = PLATOON_OFFSETS[platoon] ?? 0;
  const diffMs = date.getTime() - EPOCH.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return ((diffDays - offset) % 16 + 16) % 16;
}

export function getShiftInfo(date: Date | string, platoon: string): ShiftInfo {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  const cycleDay = getCycleDay(d, platoon);

  // Cycle day mapping:
  // 0-1: Block 1 Day
  // 2-3: Block 1 Night
  // 4-5: Short Off (2 days)
  // 6-7: Block 2 Day
  // 8-9: Block 2 Night
  // 10-15: Long Off (6 days)

  if (cycleDay <= 1) {
    return { type: "day", block: 1, dayInBlock: cycleDay + 1, label: `Block 1 Day ${cycleDay + 1}` };
  } else if (cycleDay <= 3) {
    return { type: "night", block: 1, dayInBlock: cycleDay - 1, label: `Block 1 Night ${cycleDay - 1}` };
  } else if (cycleDay <= 5) {
    return { type: "off-short", block: 0, dayInBlock: cycleDay - 3, label: `Off (${cycleDay - 3}/2)` };
  } else if (cycleDay <= 7) {
    return { type: "day", block: 2, dayInBlock: cycleDay - 5, label: `Block 2 Day ${cycleDay - 5}` };
  } else if (cycleDay <= 9) {
    return { type: "night", block: 2, dayInBlock: cycleDay - 7, label: `Block 2 Night ${cycleDay - 7}` };
  } else {
    return { type: "off-long", block: 0, dayInBlock: cycleDay - 9, label: `Off (${cycleDay - 9}/6)` };
  }
}

export function isOnShift(date: Date | string, platoon: string): boolean {
  const info = getShiftInfo(date, platoon);
  return info.type === "day" || info.type === "night";
}

export function getNextShift(fromDate: Date | string, platoon: string): { date: Date; type: "day" | "night"; block: number } {
  const d = typeof fromDate === "string" ? new Date(fromDate + "T12:00:00") : new Date(fromDate);

  // Look ahead up to 16 days
  for (let i = 1; i <= 16; i++) {
    const check = new Date(d);
    check.setDate(check.getDate() + i);
    const info = getShiftInfo(check, platoon);
    if (info.type === "day" || info.type === "night") {
      return { date: check, type: info.type, block: info.block };
    }
  }

  // Shouldn't happen in a 16-day cycle
  return { date: d, type: "day", block: 1 };
}

// Get which platoon is on day/night shift for a given date
export function getOnShiftPlatoons(date: Date | string): {
  dayShift: string | null;
  nightShift: string | null;
} {
  let dayShift: string | null = null;
  let nightShift: string | null = null;

  for (const plt of ["1", "2", "3", "4"]) {
    const info = getShiftInfo(date, plt);
    if (info.type === "day") dayShift = plt;
    if (info.type === "night") nightShift = plt;
  }

  return { dayShift, nightShift };
}

// Check if a user on a specific platoon can be called in for overtime on a date
export function canBeCalledIn(date: Date | string, platoon: string): boolean {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  const cycleDay = getCycleDay(d, platoon);

  // Can be called in during middle 4 days of the 6-day long off (days 12-15 in cycle)
  // Long off is cycle days 10-15
  // First day off (10) and last day off (15) = can't be called
  // Middle 4 (11, 12, 13, 14) = can be called
  return cycleDay >= 11 && cycleDay <= 14;
}
