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
  Engine: 4,    // 1 captain + 3 FF
  Pump: 4,      // 1 captain + 3 FF
  Ladder: 4,    // 1 captain + 3 FF
  Aerial: 4,    // 1 captain + 3 FF
  Hazmat: 5,    // 1 captain + 4 FF
  Tanker: 2,    // 1 captain + 1 FF (min, can have up to 1 capt + 3 FF)
  Rescue: 4,    // 1 captain + 3 FF (Station 21 = 5, handled in calc)
  Service: 1,   // 1 driver (Station 29)
  Salvage: 1,   // 1 driver (Station 26)
  Medic: 2,
  Command: 1,
  Squad: 4,
};

// Station 21 Rescue requires 5 (boat hall, 1 extra like hazmat)
export const STATION_OVERRIDES: Record<string, Record<string, number>> = {
  "21": { Rescue: 5 },
};

// Default minimum staffing (overridden by AppSettings.minStaffing)
export const DEFAULT_MIN_STAFFING = 216;

// Day-of-week call-through multiplier
// How many names they need to call to fill N slots
// Higher = harder to fill (more names per slot)
export function getCallThroughRate(date: string): { ratio: number; label: string } {
  const d = new Date(date + "T12:00:00");
  const day = d.getDay();
  const stat = isNearStatHoliday(date);

  if (stat.near && stat.daysAway === 0) {
    return { ratio: 0, label: `${stat.holiday} — virtually no call-ins` };
  }
  if (stat.near && stat.daysAway <= 1) {
    return { ratio: 0.5, label: `Day before/after ${stat.holiday} — almost no call-ins` };
  }
  if (stat.near && stat.daysAway <= 2) {
    return { ratio: 1.0, label: `Near ${stat.holiday} — very low demand` };
  }
  if (stat.near && stat.daysAway <= 3) {
    return { ratio: 1.5, label: `Near ${stat.holiday} — reduced demand` };
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
  last6OffTotal: number;
  todayOtwp: number | null;
  todayHoles: number | null; // actual holes from roster shortfall
  date: string;
  historicalAvgPerShift?: number;
  recentTrend?: "rising" | "stable" | "falling";
  yesterdayRatio?: number; // actual names-dialed/spots-filled from yesterday
}

export interface Scenario {
  label: string;
  acceptRate: string; // "1 in 3"
  namesCalledPerShift: number;
  namesCalledOver6Off: number;
  getsCalled: boolean;
  margin: number; // positive = called, negative = missed
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
  scenarios: Scenario[];
  factors: {
    name: string;
    value: string;
    impact: string;
  }[];
}

export function predictOvertime(input: PredictionInput): PredictionResult {
  const { positionsAhead, last6OffTotal, todayOtwp, todayHoles, date, historicalAvgPerShift, recentTrend, yesterdayRatio } = input;
  const d = new Date(date + "T12:00:00");
  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
  const stat = isNearStatHoliday(date);
  const { ratio: baseRatio, label: baseLabel } = getCallThroughRate(date);

  // Dynamic adjustment based on historical trends
  let dynamicMultiplier = 1.0;
  let dynamicNote = "";

  if (historicalAvgPerShift && last6OffTotal > 0) {
    const currentAvg = last6OffTotal / 8; // 4 days × 2 shifts
    const deviation = currentAvg / historicalAvgPerShift;

    if (deviation > 1.4) {
      // OT demand is way above average — people declining more
      dynamicMultiplier = 1.3;
      dynamicNote = "OT demand well above average — higher decline rate";
    } else if (deviation > 1.15) {
      dynamicMultiplier = 1.15;
      dynamicNote = "OT demand above average — slightly higher decline rate";
    } else if (deviation < 0.6) {
      dynamicMultiplier = 0.8;
      dynamicNote = "OT demand well below average — easier to fill";
    } else if (deviation < 0.85) {
      dynamicMultiplier = 0.9;
      dynamicNote = "OT demand below average — slightly easier to fill";
    }
  }

  // Trend adjustment
  if (recentTrend === "rising") {
    dynamicMultiplier *= 1.1;
    dynamicNote += (dynamicNote ? ". " : "") + "Trending up — demand increasing";
  } else if (recentTrend === "falling") {
    dynamicMultiplier *= 0.9;
    dynamicNote += (dynamicNote ? ". " : "") + "Trending down — demand decreasing";
  }

  const callThroughRatio = Math.round(baseRatio * dynamicMultiplier * 10) / 10;
  const callThroughLabel = dynamicNote || baseLabel;

  // Best estimate of call-ins
  const avgPerShift = last6OffTotal > 0 ? last6OffTotal / 8 : 8;
  const estimatedSlots = todayOtwp !== null ? todayOtwp : Math.round(avgPerShift);
  const namesTheyWillCall = Math.ceil(estimatedSlots * callThroughRatio);
  const totalNamesOver6Off = Math.ceil(last6OffTotal * callThroughRatio);

  const willGetCalled = positionsAhead < totalNamesOver6Off;

  let probability: PredictionResult["probability"];
  let explanation: string;

  // Build a detailed, scenario-specific explanation
  const avgPerDay = last6OffTotal > 0 ? Math.round(last6OffTotal / 4) : 0;
  const buffer = totalNamesOver6Off - positionsAhead;

  if (callThroughRatio === 0) {
    probability = "unlikely";
    explanation = `It's ${stat.holiday}. Historically there are virtually zero overtime call-ins on stat holidays or the day before/after. Even though you're only ${positionsAhead} away on the list, don't expect the phone to ring.`;
  } else if (stat.near && stat.daysAway <= 1 && positionsAhead > 10) {
    probability = "unlikely";
    explanation = `You're ${positionsAhead} away on the list, but ${stat.holiday} is ${stat.daysAway === 0 ? "today" : "tomorrow"}. Around stat holidays, barely anyone books off so overtime demand basically disappears. Very unlikely you'll get called.`;
  } else if (stat.near && stat.daysAway <= 1 && positionsAhead <= 10) {
    probability = "low";
    explanation = `You're only ${positionsAhead} away which would normally be a sure thing, but ${stat.holiday} is ${stat.daysAway === 0 ? "today" : stat.daysAway === 1 ? "tomorrow" : `${stat.daysAway} days away`}. Stat holidays kill overtime demand — even being this close, probably won't get called.`;
  } else if (last6OffTotal === 0 && todayOtwp === null) {
    probability = "unlikely";
    explanation = "No recent overtime data available yet. Once the scraper collects more data, the prediction will be more accurate.";
  } else if (positionsAhead < totalNamesOver6Off * 0.3) {
    probability = "high";
    explanation = `You're ${positionsAhead} away on the list. Last 6-off, ${last6OffTotal} people actually worked overtime across 4 eligible days (about ${avgPerDay} per day). To fill those ${last6OffTotal} spots, they typically have to dial through about ${totalNamesOver6Off} names because not everyone answers or accepts. You're well within that range with ${buffer} names of buffer — expect the call, probably multiple shifts.`;
    if (recentTrend === "rising") {
      explanation += ` OT demand has been trending up lately, which makes this even more likely.`;
    }
  } else if (positionsAhead < totalNamesOver6Off * 0.5) {
    probability = "high";
    explanation = `You're ${positionsAhead} away. Last 6-off, ${last6OffTotal} people worked overtime total. At a ${callThroughRatio}:1 call-through rate, they'd have to dial about ${totalNamesOver6Off} names to fill those ${last6OffTotal} spots (since many decline or don't answer). You're comfortably inside that range — very likely to get at least one call.`;
  } else if (positionsAhead < totalNamesOver6Off * 0.85) {
    probability = "medium";
    explanation = `You're ${positionsAhead} away on the list. Last cycle, ${last6OffTotal} people worked overtime. To fill those spots, they'd dial through roughly ${totalNamesOver6Off} names. That puts you in the zone — you'll probably get a call on the busier days, but might not get hit every shift. ${avgPerDay > 10 ? `With ${avgPerDay} per day average, the busy days should reach you.` : `With only ${avgPerDay} per day average, it's a coin flip.`}`;
    if (recentTrend === "rising") {
      explanation += ` Demand has been trending up recently which works in your favour.`;
    } else if (recentTrend === "falling") {
      explanation += ` However, demand has been trending down lately which could push you out of range.`;
    }
  } else if (positionsAhead < totalNamesOver6Off * 1.1) {
    probability = "low";
    explanation = `You're ${positionsAhead} away — right on the edge. Last 6-off, ${last6OffTotal} people worked overtime, meaning they dialed through roughly ${totalNamesOver6Off} names to fill those spots. You're ${positionsAhead > totalNamesOver6Off ? `${positionsAhead - totalNamesOver6Off} past` : `${buffer} inside`} the estimated cutoff. Could go either way — if a couple extra people book off or if it's a particularly busy night, you might get the call. But don't count on it.`;
    if (stat.near) {
      explanation += ` Plus ${stat.holiday} is ${stat.daysAway} days away which usually reduces demand.`;
    }
  } else if (positionsAhead < totalNamesOver6Off * 1.5) {
    probability = "unlikely";
    explanation = `You're ${positionsAhead} away on the list. Last 6-off, ${last6OffTotal} people worked overtime — to fill those spots they'd dial about ${totalNamesOver6Off} names. You're about ${positionsAhead - totalNamesOver6Off} spots past where they'd typically stop. It would take an unusually busy stretch for them to reach you this cycle.`;
  } else {
    probability = "unlikely";
    explanation = `You're ${positionsAhead} away, and last cycle they'd only need to dial through roughly ${totalNamesOver6Off} names to fill ${last6OffTotal} OT spots. That puts you ${positionsAhead - totalNamesOver6Off} spots beyond their reach. Barring something extraordinary, you won't be getting a call this 6-off. Enjoy your days off.`;
  }

  // Add tonight's specific data
  if (todayHoles !== null && todayHoles > 0) {
    explanation += ` Tonight there are ${todayHoles} holes to fill on the shift.`;
    if (yesterdayRatio) {
      explanation += ` Yesterday's actual call-through was ${yesterdayRatio.toFixed(1)}:1 (they dialed ${yesterdayRatio.toFixed(1)} names per spot filled).`;
      const estimatedNames = Math.ceil(todayHoles * yesterdayRatio);
      explanation += ` At that same rate tonight, they'd dial about ${estimatedNames} names.`;
      if (positionsAhead < estimatedNames) {
        explanation += ` You're ${positionsAhead} away — that reaches you.`;
      } else {
        explanation += ` You're ${positionsAhead} away — that falls ${positionsAhead - estimatedNames} short of reaching you.`;
      }
    }
  } else if (todayHoles === 0) {
    explanation += ` The shift is fully staffed tonight — no holes, no call-ins expected.`;
  }

  // Add stat holiday context if nearby but not already covered
  if (stat.near && stat.daysAway > 1 && !explanation.includes(stat.holiday || "")) {
    explanation += ` Note: ${stat.holiday} is ${stat.daysAway} days away — this typically reduces bookoffs and overtime demand around these dates.`;
  }

  // Build scenarios based on TONIGHT'S actual holes (most important)
  // Falls back to average from last 6-off if no current hole data
  const currentHoles = todayHoles !== null ? todayHoles : (last6OffTotal > 0 ? Math.round(last6OffTotal / 8) : 8);
  const scenarioRates = [
    { label: "High acceptance", rate: "1 in 2", ratio: 2 },
    { label: "Good acceptance (weekday)", rate: "1 in 3", ratio: 3 },
    { label: "Average", rate: "1 in 4", ratio: 4 },
    { label: "Low acceptance (weekend)", rate: "1 in 5", ratio: 5 },
    { label: "Very low (Friday night)", rate: "1 in 6", ratio: 6 },
    { label: "Terrible (long weekend)", rate: "1 in 7", ratio: 7 },
    { label: "Extreme", rate: "1 in 8", ratio: 8 },
  ];

  const scenarios: Scenario[] = scenarioRates.map((sr) => {
    // Tonight's holes × ratio = names they'll call THIS SHIFT
    const namesPerShift = currentHoles * sr.ratio;
    const margin = namesPerShift - positionsAhead;
    return {
      label: sr.label,
      acceptRate: sr.rate,
      namesCalledPerShift: namesPerShift,
      namesCalledOver6Off: namesPerShift, // per-shift focused
      getsCalled: margin > 0,
      margin,
    };
  });

  const factors: PredictionResult["factors"] = [
    { name: "Your position ahead", value: String(positionsAhead), impact: "How far you are from the start" },
    { name: "Last 6-off OTWP total", value: String(last6OffTotal), impact: "Actual OT people last cycle" },
    { name: "Call-through ratio", value: `${callThroughRatio}:1`, impact: callThroughLabel },
    { name: "Est. names called (6-off)", value: `~${totalNamesOver6Off}`, impact: "OTWP × call-through ratio" },
    { name: "Est. per shift today", value: todayOtwp !== null ? String(todayOtwp) : `~${estimatedSlots} (avg)`, impact: "Today's demand estimate" },
    { name: "Est. names called today", value: `~${namesTheyWillCall}`, impact: "Per-shift × call-through" },
    { name: "Base ratio", value: `${baseRatio}:1`, impact: baseLabel },
    { name: "Dynamic adjust", value: `×${dynamicMultiplier}`, impact: dynamicNote || "No adjustment" },
    { name: "Final ratio", value: `${callThroughRatio}:1`, impact: "Base × dynamic" },
    { name: "Day of week", value: dayOfWeek, impact: baseLabel },
    { name: "Today's holes", value: todayHoles !== null ? String(todayHoles) : "N/A", impact: "Actual vacancies from roster" },
    { name: "Yesterday's ratio", value: yesterdayRatio ? `${yesterdayRatio.toFixed(1)}:1` : "N/A", impact: "Actual names dialed per spot yesterday" },
    { name: "Near stat holiday", value: stat.near ? `${stat.holiday} (${stat.daysAway}d)` : "No", impact: stat.near ? "Reduces demand" : "Normal demand" },
    { name: "Historical avg/shift", value: historicalAvgPerShift ? String(Math.round(historicalAvgPerShift * 10) / 10) : "N/A", impact: "3-month average" },
    { name: "Trend", value: recentTrend || "Unknown", impact: recentTrend === "rising" ? "+10% ratio" : recentTrend === "falling" ? "-10% ratio" : "No change" },
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
    scenarios,
    factors,
  };
}
