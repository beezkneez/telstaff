// Overtime prediction engine

// Alberta statutory holidays
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): string {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1) break;
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return d.toISOString().split("T")[0];
    }
  }
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function getMondayBefore(year: number, month: number, day: number): string {
  const target = new Date(year, month - 1, day);
  while (target.getDay() !== 1) target.setDate(target.getDate() - 1);
  return target.toISOString().split("T")[0];
}

function getAlbertaStatHolidays(year: number): { date: string; name: string }[] {
  const holidays = [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: getNthWeekdayOfMonth(year, 2, 1, 3), name: "Family Day" },
    { date: getMondayBefore(year, 5, 25), name: "Victoria Day" },
    { date: `${year}-07-01`, name: "Canada Day" },
    { date: getNthWeekdayOfMonth(year, 8, 1, 1), name: "Heritage Day" },
    { date: getNthWeekdayOfMonth(year, 9, 1, 1), name: "Labour Day" },
    { date: `${year}-09-30`, name: "Truth and Reconciliation" },
    { date: getNthWeekdayOfMonth(year, 10, 1, 2), name: "Thanksgiving" },
    { date: `${year}-11-11`, name: "Remembrance Day" },
    { date: `${year}-12-25`, name: "Christmas Day" },
  ];
  if (year === 2026) holidays.push({ date: "2026-04-03", name: "Good Friday" });
  if (year === 2027) holidays.push({ date: "2027-03-26", name: "Good Friday" });
  return holidays;
}

export function isNearStatHoliday(date: string): { near: boolean; holiday: string | null; daysAway: number } {
  const d = new Date(date + "T12:00:00");
  const year = d.getFullYear();
  for (const h of getAlbertaStatHolidays(year)) {
    const hd = new Date(h.date + "T12:00:00");
    const diff = Math.abs(d.getTime() - hd.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 3) return { near: true, holiday: h.name, daysAway: Math.round(diff) };
  }
  return { near: false, holiday: null, daysAway: 99 };
}

// Required crew per truck type
export const REQUIRED_CREW: Record<string, number> = {
  Engine: 4,  // 1 captain + 3 FF
  Pump: 4,
  Ladder: 4,  // 1 captain + 3 FF
  Hazmat: 5,  // 1 captain + 4 FF
  Tanker: 2,  // 1 captain + 1 FF
  Rescue: 4,  // 1 captain + 3 FF
  Medic: 2,
};

// Day-of-week call-through multiplier
// How many names they need to call to fill N slots
// Higher = harder to fill (more names per slot)
export function getCallThroughRate(date: string): { ratio: number; label: string } {
  const d = new Date(date + "T12:00:00");
  const day = d.getDay();
  const stat = isNearStatHoliday(date);

  if (stat.near && stat.daysAway <= 1) {
    return { ratio: 1.5, label: `Near ${stat.holiday} — easy to fill, low demand` };
  }

  switch (day) {
    case 0: return { ratio: 2.5, label: "Sunday — moderate call-through" };
    case 1: case 2: case 3: case 4:
      return { ratio: 2.5, label: "Weekday — moderate call-through" };
    case 5: return { ratio: 3.5, label: "Friday night — high call-through (many decline)" };
    case 6: return { ratio: 3.0, label: "Saturday — high call-through" };
    default: return { ratio: 2.5, label: "Average" };
  }
}

export interface PredictionInput {
  positionsAhead: number;
  last6OffTotal: number; // total OTWP across user's last 6-off (all 4 eligible days)
  todayOtwp: number | null; // today's OTWP count if available
  date: string;
}

export interface PredictionResult {
  positionsAhead: number;
  last6OffTotal: number;
  todayOtwp: number | null;
  callThroughRatio: number;
  callThroughLabel: string;
  namesTheyWillCall: number;
  probability: "high" | "medium" | "low" | "unlikely";
  willGetCalled: boolean;
  explanation: string;
  nearStatHoliday: boolean;
  statHolidayName: string | null;
  dayOfWeek: string;
  // Raw factors for admin visibility
  factors: {
    name: string;
    value: string;
    impact: string;
  }[];
}

export function predictOvertime(input: PredictionInput): PredictionResult {
  const { positionsAhead, last6OffTotal, todayOtwp, date } = input;
  const d = new Date(date + "T12:00:00");
  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
  const stat = isNearStatHoliday(date);
  const { ratio: callThroughRatio, label: callThroughLabel } = getCallThroughRate(date);

  // Best estimate of call-ins: use today's OTWP if available, otherwise average from last 6-off
  // Last 6-off total is across 4 eligible days × 2 shifts = 8 shift-periods
  const avgPerShift = last6OffTotal > 0 ? last6OffTotal / 8 : 8;
  const estimatedSlots = todayOtwp !== null ? todayOtwp : Math.round(avgPerShift);

  // Names they'll need to call = slots × call-through ratio
  // e.g., 10 slots × 3.0 ratio = 30 names called on a Saturday
  const namesTheyWillCall = Math.ceil(estimatedSlots * callThroughRatio);

  // But for the 6-off comparison: total names called across all 4 days
  const totalNamesOver6Off = Math.ceil(last6OffTotal * callThroughRatio);

  const willGetCalled = positionsAhead < totalNamesOver6Off;

  let probability: PredictionResult["probability"];
  let explanation: string;

  if (last6OffTotal === 0 && todayOtwp === null) {
    probability = "unlikely";
    explanation = "No recent OT data available to predict.";
  } else if (positionsAhead < totalNamesOver6Off * 0.5) {
    probability = "high";
    explanation = `Last 6-off had ${last6OffTotal} OT call-ins. At ~${callThroughRatio}:1 call-through, they'd go through ~${totalNamesOver6Off} names. You're ${positionsAhead} away — expect the call.`;
  } else if (positionsAhead < totalNamesOver6Off * 0.85) {
    probability = "medium";
    explanation = `Last 6-off had ${last6OffTotal} OT call-ins (~${totalNamesOver6Off} names called). You're ${positionsAhead} away — good chance you'll get called.`;
  } else if (positionsAhead < totalNamesOver6Off * 1.1) {
    probability = "low";
    explanation = `Last 6-off had ${last6OffTotal} OT call-ins (~${totalNamesOver6Off} names called). You're ${positionsAhead} away — borderline, could go either way.`;
  } else {
    probability = "unlikely";
    explanation = `Last 6-off had ${last6OffTotal} OT call-ins (~${totalNamesOver6Off} names called). You're ${positionsAhead} away — probably won't reach you.`;
  }

  if (stat.near) {
    explanation += ` Near ${stat.holiday} — typically fewer bookoffs, less OT demand.`;
  }

  const factors: PredictionResult["factors"] = [
    { name: "Your position ahead", value: String(positionsAhead), impact: "How far you are from the start" },
    { name: "Last 6-off OTWP total", value: String(last6OffTotal), impact: "Actual OT people last cycle" },
    { name: "Call-through ratio", value: `${callThroughRatio}:1`, impact: callThroughLabel },
    { name: "Est. names called (6-off)", value: `~${totalNamesOver6Off}`, impact: "OTWP × call-through ratio" },
    { name: "Est. per shift today", value: todayOtwp !== null ? String(todayOtwp) : `~${estimatedSlots} (avg)`, impact: "Today's demand estimate" },
    { name: "Est. names called today", value: `~${namesTheyWillCall}`, impact: "Per-shift × call-through" },
    { name: "Day of week", value: dayOfWeek, impact: callThroughLabel },
    { name: "Near stat holiday", value: stat.near ? `${stat.holiday} (${stat.daysAway}d)` : "No", impact: stat.near ? "Reduces demand" : "Normal demand" },
  ];

  return {
    positionsAhead,
    last6OffTotal,
    todayOtwp,
    callThroughRatio,
    callThroughLabel,
    namesTheyWillCall: totalNamesOver6Off,
    probability,
    willGetCalled,
    explanation,
    nearStatHoliday: stat.near,
    statHolidayName: stat.holiday,
    dayOfWeek,
    factors,
  };
}
