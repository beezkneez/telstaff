// Calculate staffing shortfalls from roster data
import { REQUIRED_CREW, STATION_OVERRIDES } from "./prediction";

interface TruckData {
  truck: string;
  type: string;
  crew: { name: string; rank: string; status?: string }[];
}

interface StationData {
  station: number;
  trucks: TruckData[];
}

export interface TruckShortfall {
  truck: string;
  type: string;
  requiredFF: number;
  actualFF: number;
  shortFF: number;
  hasCaptain: boolean;
  needsCaptain: boolean;
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
  truckBreakdown: TruckShortfall[];
}

function isOffRoster(t: TruckData): boolean {
  return t.type === "OffRoster" || /^ff\s*\d/i.test(t.truck);
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

function isCaptainRank(rank: string): boolean {
  const lower = rank.toLowerCase().trim();
  return lower.includes("captain");
}

function isOffRosterStatus(status: string): boolean {
  const st = (status || "").toLowerCase();
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
  let totalRequired = 0;
  let totalActual = 0;
  let totalFFHoles = 0;
  let totalCaptainHoles = 0;
  const truckBreakdown: TruckShortfall[] = [];

  // Count off-roster qualified people who can fill captain spots
  let offRosterQualified = 0;
  for (const station of stations) {
    if (station.station >= 900) continue;
    for (const truck of station.trucks) {
      if (!isOffRoster(truck)) continue;
      for (const c of truck.crew) {
        if (isOffRosterStatus(c.status || "")) continue;
        const rank = (c.rank || "").toLowerCase();
        if (rank.includes("qualified")) {
          offRosterQualified++;
        }
      }
    }
  }

  let captainHolesRemaining = 0;

  for (const station of stations) {
    // Skip support staff stations (ECS, Investigations = 900+)
    if (station.station >= 900) continue;

    for (const truck of station.trucks) {
      if (isOffRoster(truck)) continue;

      // Filter to active crew only
      const activeCrew = truck.crew.filter((c) => {
        if (isSupportRank(c.rank || "")) return false;
        return !isOffRosterStatus(c.status || "");
      });
      const captains = activeCrew.filter((c) => isCaptainRank(c.rank || ""));
      const ffs = activeCrew.filter((c) => !isCaptainRank(c.rank || ""));

      // Required crew for this truck
      const truckType = truck.type || "Other";
      const stationStr = String(station.station);
      const override = STATION_OVERRIDES[stationStr]?.[truckType];
      const totalReq = override || REQUIRED_CREW[truckType] || REQUIRED_CREW[truck.truck.split(" ")[0]] || 4;

      // Service and Salvage trucks don't require captains
      const noCaptainRequired = truckType === "Service" || truckType === "Salvage";
      const requiredCaptains = noCaptainRequired ? 0 : 1;
      const requiredFF = totalReq - requiredCaptains;

      totalRequired += totalReq;
      totalActual += activeCrew.length;

      const hasCaptain = captains.length >= requiredCaptains;
      const needsCaptain = !hasCaptain && !noCaptainRequired;
      const ffShort = Math.max(0, requiredFF - ffs.length);

      if (needsCaptain) captainHolesRemaining++;
      totalFFHoles += ffShort;

      if (ffShort > 0 || needsCaptain) {
        truckBreakdown.push({
          truck: `STN-${String(station.station).padStart(2, "0")} ${truck.truck}`,
          type: truckType,
          requiredFF,
          actualFF: ffs.length,
          shortFF: ffShort,
          hasCaptain,
          needsCaptain,
        });
      }
    }
  }

  // Don't subtract qualified from captain holes — moving a qualified person
  // to fill a captain spot creates an FF hole. Total call-ins needed stays the same.
  totalCaptainHoles = captainHolesRemaining;

  // Simple hole calculation: min staffing - active crew = holes
  // This matches reality better than per-truck required crew calculation
  const { DEFAULT_MIN_STAFFING } = require("./prediction");
  const minStaffing = DEFAULT_MIN_STAFFING; // 216
  const simpleHoles = Math.max(0, minStaffing - totalActual);

  return {
    date,
    platoon,
    shift,
    requiredCrew: minStaffing,
    actualCrew: totalActual,
    ffHoles: simpleHoles,
    captainHoles: 0, // captains handled internally
    totalHoles: simpleHoles,
    truckBreakdown: truckBreakdown.sort((a, b) => b.shortFF - a.shortFF),
  };
}
