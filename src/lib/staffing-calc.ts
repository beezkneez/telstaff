// Calculate staffing shortfalls from roster data
import { REQUIRED_CREW } from "./prediction";

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

function isCaptainRank(rank: string): boolean {
  const lower = rank.toLowerCase().trim();
  return lower.includes("captain");
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

  for (const station of stations) {
    for (const truck of station.trucks) {
      if (isOffRoster(truck)) continue;

      // Filter out support staff and off-roster statuses (TNW, Vac, LieuO)
      // TW (Trade Working) counts as on-roster
      const activeCrew = truck.crew.filter((c) => {
        if (isSupportRank(c.rank || "")) return false;
        const st = (c.status || "").toLowerCase();
        if (st.includes("tnw") || st.includes("vac") || st.includes("lieuo") || st.includes("sick")) return false;
        return true;
      });
      const captains = activeCrew.filter((c) => isCaptainRank(c.rank || ""));
      const ffs = activeCrew.filter((c) => !isCaptainRank(c.rank || ""));

      // Required crew for this truck
      const truckType = truck.type || "Other";
      const totalReq = REQUIRED_CREW[truckType] || REQUIRED_CREW[truck.truck.split(" ")[0]] || 4;
      const requiredCaptains = 1; // every truck needs 1 captain
      const requiredFF = totalReq - requiredCaptains;

      totalRequired += totalReq;
      totalActual += activeCrew.length;

      const hasCaptain = captains.length >= requiredCaptains;
      const needsCaptain = !hasCaptain;
      const ffShort = Math.max(0, requiredFF - ffs.length);

      if (needsCaptain) totalCaptainHoles++;
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

  return {
    date,
    platoon,
    shift,
    requiredCrew: totalRequired,
    actualCrew: totalActual,
    ffHoles: totalFFHoles,
    captainHoles: totalCaptainHoles,
    totalHoles: totalFFHoles + totalCaptainHoles,
    truckBreakdown: truckBreakdown.sort((a, b) => b.shortFF - a.shortFF),
  };
}
