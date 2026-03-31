// Overtime prediction engine

// Alberta statutory holidays
const ALBERTA_STAT_HOLIDAYS: Record<string, string> = {
  // Fixed dates
  "01-01": "New Year's Day",
  "02-17": "Family Day", // 3rd Monday of Feb — approximate, need to calculate
  "05-19": "Victoria Day", // Monday before May 25 — approximate
  "07-01": "Canada Day",
  "08-04": "Heritage Day", // 1st Monday of Aug — approximate
  "09-01": "Labour Day", // 1st Monday of Sep — approximate
  "09-30": "National Day for Truth and Reconciliation",
  "10-13": "Thanksgiving", // 2nd Monday of Oct — approximate
  "11-11": "Remembrance Day",
  "12-25": "Christmas Day",
};

// Dynamic stat holidays for 2026
function getAlbertaStatHolidays(year: number): { date: string; name: string }[] {
  const holidays: { date: string; name: string }[] = [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: getNthWeekdayOfMonth(year, 2, 1, 3), name: "Family Day" }, // 3rd Monday Feb
    { date: getMondayBefore(year, 5, 25), name: "Victoria Day" },
    { date: `${year}-07-01`, name: "Canada Day" },
    { date: getNthWeekdayOfMonth(year, 8, 1, 1), name: "Heritage Day" }, // 1st Monday Aug
    { date: getNthWeekdayOfMonth(year, 9, 1, 1), name: "Labour Day" }, // 1st Monday Sep
    { date: `${year}-09-30`, name: "Truth and Reconciliation" },
    { date: getNthWeekdayOfMonth(year, 10, 1, 2), name: "Thanksgiving" }, // 2nd Monday Oct
    { date: `${year}-11-11`, name: "Remembrance Day" },
    { date: `${year}-12-25`, name: "Christmas Day" },
  ];

  // Add Good Friday (Easter - 2 days) — approximate for 2026
  // Easter 2026 is April 5
  if (year === 2026) holidays.push({ date: "2026-04-03", name: "Good Friday" });
  if (year === 2027) holidays.push({ date: "2027-03-26", name: "Good Friday" });

  return holidays;
}

function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): string {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1) break;
    if (d.getDay() === weekday) {
      count++;
      if (count === n) {
        return d.toISOString().split("T")[0];
      }
    }
  }
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function getMondayBefore(year: number, month: number, day: number): string {
  const target = new Date(year, month - 1, day);
  while (target.getDay() !== 1) {
    target.setDate(target.getDate() - 1);
  }
  return target.toISOString().split("T")[0];
}

export function isNearStatHoliday(date: string): { near: boolean; holiday: string | null; daysAway: number } {
  const d = new Date(date + "T12:00:00");
  const year = d.getFullYear();
  const holidays = getAlbertaStatHolidays(year);

  for (const h of holidays) {
    const hd = new Date(h.date + "T12:00:00");
    const diff = Math.abs(d.getTime() - hd.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 3) {
      return { near: true, holiday: h.name, daysAway: Math.round(diff) };
    }
  }
  return { near: false, holiday: null, daysAway: 99 };
}

// Required crew per truck type
export const REQUIRED_CREW: Record<string, { captain: number; ff: number; total: number }> = {
  Engine: { captain: 1, ff: 3, total: 4 },
  Pump: { captain: 1, ff: 3, total: 4 },
  Ladder: { captain: 1, ff: 3, total: 4 },
  Hazmat: { captain: 1, ff: 4, total: 5 },
  Tanker: { captain: 1, ff: 1, total: 2 },
  Rescue: { captain: 1, ff: 3, total: 4 },
  Medic: { captain: 1, ff: 1, total: 2 },
};

// Day-of-week acceptance rate multipliers
// Higher = more people accept (easier to fill)
// Lower = fewer accept (harder to fill, need more calls)
export function getAcceptanceRate(date: string): { rate: number; label: string } {
  const d = new Date(date + "T12:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const stat = isNearStatHoliday(date);

  // Near stat holiday — very high acceptance (fewer people booked off)
  if (stat.near && stat.daysAway <= 1) {
    return { rate: 0.7, label: `Near ${stat.holiday} — low demand expected` };
  }

  // Base rates by day of week
  switch (day) {
    case 0: // Sunday
      return { rate: 0.45, label: "Sunday — moderate acceptance" };
    case 1: // Monday
    case 2: // Tuesday
    case 3: // Wednesday
    case 4: // Thursday
      return { rate: 0.40, label: "Weekday — good acceptance" };
    case 5: // Friday
      return { rate: 0.25, label: "Friday night — low acceptance" };
    case 6: // Saturday
      return { rate: 0.25, label: "Saturday — low acceptance" };
    default:
      return { rate: 0.35, label: "Average" };
  }
}

export interface PredictionResult {
  // Inputs
  userPosition: number;
  positionsAhead: number;
  slotsNeeded: number;
  acceptanceRate: number;
  acceptanceLabel: string;

  // Calculated
  namesNeededToCall: number; // slots / acceptance rate
  willGetCalled: boolean;
  probability: "high" | "medium" | "low" | "unlikely";
  explanation: string;

  // Context
  nearStatHoliday: boolean;
  statHolidayName: string | null;
  dayOfWeek: string;
}

export function predictOvertime(
  userPositionsAhead: number,
  slotsNeeded: number,
  date: string,
  historicalRatio?: number // if we have actual data: names called / slots filled
): PredictionResult {
  const d = new Date(date + "T12:00:00");
  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
  const stat = isNearStatHoliday(date);
  const { rate, label: acceptanceLabel } = getAcceptanceRate(date);

  // Use historical ratio if available, otherwise use day-of-week estimate
  const effectiveRate = historicalRatio || rate;
  const namesNeededToCall = Math.ceil(slotsNeeded / effectiveRate);

  const willGetCalled = userPositionsAhead < namesNeededToCall;

  let probability: PredictionResult["probability"];
  let explanation: string;

  if (slotsNeeded === 0) {
    probability = "unlikely";
    explanation = "No overtime slots needed.";
  } else if (userPositionsAhead < namesNeededToCall * 0.6) {
    probability = "high";
    explanation = `${slotsNeeded} slots needed, ~${namesNeededToCall} names will be called. You're #${userPositionsAhead + 1} in line — very likely to get the call.`;
  } else if (userPositionsAhead < namesNeededToCall) {
    probability = "medium";
    explanation = `${slotsNeeded} slots needed, ~${namesNeededToCall} names will be called. You're #${userPositionsAhead + 1} — you could get called.`;
  } else if (userPositionsAhead < namesNeededToCall * 1.3) {
    probability = "low";
    explanation = `${slotsNeeded} slots needed, ~${namesNeededToCall} names will be called. You're #${userPositionsAhead + 1} — possible but unlikely.`;
  } else {
    probability = "unlikely";
    explanation = `${slotsNeeded} slots needed, ~${namesNeededToCall} names will be called. You're #${userPositionsAhead + 1} — probably won't reach you.`;
  }

  if (stat.near) {
    explanation += ` Note: near ${stat.holiday} — typically fewer people booked off.`;
  }

  if (historicalRatio) {
    explanation += ` (Based on recent ${Math.round(historicalRatio * 100)}% acceptance rate)`;
  }

  return {
    userPosition: userPositionsAhead + 1,
    positionsAhead: userPositionsAhead,
    slotsNeeded,
    acceptanceRate: effectiveRate,
    acceptanceLabel,
    namesNeededToCall,
    willGetCalled,
    probability,
    explanation,
    nearStatHoliday: stat.near,
    statHolidayName: stat.holiday,
    dayOfWeek,
  };
}
