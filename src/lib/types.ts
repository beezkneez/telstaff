export interface CrewMember {
  name: string;
  rank: string;
  position: string;
  employeeId?: string;
  status?: string; // REG, .Vac, Rel Supp, etc.
  qualifications?: string;
}

export interface TruckAssignment {
  truck: string;
  type: "Engine" | "Ladder" | "Rescue" | "Medic" | "Hazmat" | "Command" | "Other";
  phoneNumber?: string;
  crew: CrewMember[];
}

export interface StationStaffing {
  station: number;
  district: number;
  platoon: string;
  date: string;
  trucks: TruckAssignment[];
}

export const PLATOON_ROSTER_VIEW_IDS: Record<string, string> = {
  "1": "192_1",
  "2": "193_1",
  "3": "194_1",
  "4": "195_1",
};

export const TELESTAFF_BASE_URL =
  "https://edmontonfirerescue-tsc.prd.mykronos.com";
