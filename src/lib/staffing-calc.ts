// Calculate staffing shortfalls from roster data

interface StationData {
  station: number;
  headCount?: number;
  trucks: { truck: string; type: string; crew: { name: string; rank: string; status?: string }[] }[];
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

export function calculateShortfall(
  stations: StationData[],
  platoon: string,
  date: string,
  shift: "day" | "night" = "day"
): StaffingShortfall {
  const { DEFAULT_MIN_STAFFING } = require("./prediction");
  const minStaffing = DEFAULT_MIN_STAFFING; // 216

  // Use Telestaff's headcount if available (station 0 meta entry)
  const metaStation = stations.find((s) => s.station === 0);
  const headCount = (metaStation as any)?.headCount
    ?? (metaStation?.trucks[0]?.truck === "_headcount" ? (metaStation as any)?.headCount : null);

  // Also check if headCount is stored in the data JSON
  let onRoster: number;
  if (headCount != null && headCount > 0) {
    onRoster = headCount;
  } else {
    // Fallback: count from the cached data (same as dashboard)
    const SUPPORT_RANKS: Record<string, boolean> = {
      "sr captain investigator": true, "captain investigator": true, "investigator": true,
      ".sr captain investigator": true, ".captain investigator": true, ".investigator": true,
      "ecs captain": true, "emergency communications specialist": true, "ecs q": true,
      ".ecs captain": true, ".emergency communications specialist": true, ".ecs q": true,
      "duty office staff": true, ".duty office staff": true,
    };
    const isOffStatus = (status: string) => {
      const st = (status || "").toLowerCase().trim();
      if (st === "tw" || st === "twu" || st === "24tw") return false;
      if (st.includes("rel supp") || st.includes("rel support")) return false;
      return st.includes("tnw") || st.includes("vac") || st.includes("lieuo") || st.includes("sick") || st.includes(".sa") || st.includes("sur");
    };
    onRoster = 0;
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
  }

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
