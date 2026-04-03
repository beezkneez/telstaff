// Calculate staffing shortfalls from roster data

interface TruckData {
  truck: string;
  type: string;
  crew: { name: string; rank: string; status?: string }[];
}

interface StationData {
  station: number;
  trucks: TruckData[];
}

export interface StaffingShortfall {
  date: string;
  platoon: string;
  shift: "day" | "night";
  requiredCrew: number;
  actualCrew: number;
  ffHoles: number;
  captainHoles: number;
  totalHoles: number;
  truckBreakdown: never[];
}

const SUPPORT_RANKS: Record<string, boolean> = {
  "sr captain investigator": true,
  "captain investigator": true,
  "investigator": true,
  ".sr captain investigator": true,
  ".captain investigator": true,
  ".investigator": true,
  "ecs captain": true,
  "emergency communications specialist": true,
  "ecs q": true,
  ".ecs captain": true,
  ".emergency communications specialist": true,
  ".ecs q": true,
  "duty office staff": true,
  ".duty office staff": true,
};

function isOffStatus(status: string): boolean {
  const st = (status || "").toLowerCase().trim();
  if (st === "tw" || st === "twu" || st === "24tw") return false;
  if (st.includes("rel supp") || st.includes("rel support")) return false;
  return st.includes("tnw") || st.includes("vac") || st.includes("lieuo") || st.includes("sick") || st.includes(".sa") || st.includes("sur");
}

export function calculateShortfall(
  stations: StationData[],
  platoon: string,
  date: string,
  shift: "day" | "night" = "day"
): StaffingShortfall {
  const { DEFAULT_MIN_STAFFING } = require("./prediction");
  const minStaffing = DEFAULT_MIN_STAFFING; // 216

  // Count all crew on stations 1-31, excluding support ranks and off-status
  let onRoster = 0;
  for (const station of stations) {
    if (station.station < 1 || station.station > 31) continue;
    for (const truck of station.trucks) {
      for (const c of truck.crew) {
        if (SUPPORT_RANKS[(c.rank || "").toLowerCase().trim()]) continue;
        if (isOffStatus(c.status || "")) continue;
        onRoster++;
      }
    }
  }

  // Simple math: 216 - onRoster
  // Positive = understaffed (holes), negative = overstaffed (surplus)
  const delta = minStaffing - onRoster;

  return {
    date,
    platoon,
    shift,
    requiredCrew: minStaffing,
    actualCrew: onRoster,
    ffHoles: delta,
    captainHoles: 0,
    totalHoles: delta,
    truckBreakdown: [],
  };
}
