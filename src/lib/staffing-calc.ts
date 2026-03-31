// Calculate staffing shortfalls from roster data
import { REQUIRED_CREW } from "./prediction";

interface TruckData {
  truck: string;
  type: string;
  crew: { name: string; rank: string }[];
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
  holes: number;
  truckBreakdown: {
    truck: string;
    type: string;
    required: number;
    actual: number;
    short: number;
  }[];
}

function isOffRoster(t: TruckData): boolean {
  return t.type === "OffRoster" || /^ff\s+\d/i.test(t.truck);
}

function isSupportRank(rank: string): boolean {
  const lower = rank.toLowerCase().trim();
  return (
    lower.includes("investigator") ||
    lower.includes("ecs") ||
    lower.includes("emergency communications") ||
    lower.includes("duty office")
  );
}

export function calculateShortfall(
  stations: StationData[],
  platoon: string,
  date: string,
  shift: "day" | "night" = "day"
): StaffingShortfall {
  let totalRequired = 0;
  let totalActual = 0;
  const truckBreakdown: StaffingShortfall["truckBreakdown"] = [];

  for (const station of stations) {
    for (const truck of station.trucks) {
      if (isOffRoster(truck)) continue;

      // Filter out support staff from crew count
      const activeCrew = truck.crew.filter((c) => !isSupportRank(c.rank || ""));
      const actual = activeCrew.length;

      // Look up required crew for this truck type
      const truckType = truck.type || "Other";
      const required = REQUIRED_CREW[truckType] || REQUIRED_CREW[truck.truck.split(" ")[0]] || 4;

      totalRequired += required;
      totalActual += actual;

      const short = Math.max(0, required - actual);
      if (short > 0) {
        truckBreakdown.push({
          truck: `STN-${String(station.station).padStart(2, "0")} ${truck.truck}`,
          type: truckType,
          required,
          actual,
          short,
        });
      }
    }
  }

  return {
    date,
    platoon,
    shift,
    requiredCrew: totalRequired,
    actualCrew: totalActual,
    holes: Math.max(0, totalRequired - totalActual),
    truckBreakdown: truckBreakdown.sort((a, b) => b.short - a.short),
  };
}
