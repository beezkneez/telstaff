// Mock data representing Edmonton Fire Rescue staffing
// This will be replaced by real Telestaff scraper data

export interface CrewMember {
  name: string;
  rank: string;
  position: string;
}

export interface TruckAssignment {
  truck: string;
  type: "Engine" | "Ladder" | "Rescue" | "Medic" | "Hazmat" | "Command";
  crew: CrewMember[];
}

export interface StationStaffing {
  station: number;
  platoon: string;
  date: string;
  trucks: TruckAssignment[];
}

const RANKS = [
  "Captain",
  "Lieutenant",
  "Firefighter",
  "Firefighter",
  "Firefighter",
  "Firefighter",
];
const POSITIONS = ["Officer", "Driver", "FF1", "FF2", "FF3", "FF4"];

const FIRST_NAMES = [
  "James", "Robert", "Michael", "David", "John", "Mark", "Chris",
  "Andrew", "Ryan", "Kevin", "Jason", "Brian", "Matthew", "Daniel",
  "Tyler", "Brandon", "Kyle", "Jordan", "Alex", "Connor", "Nathan",
  "Trevor", "Derek", "Craig", "Scott", "Sean", "Travis", "Cole",
  "Brett", "Chad", "Dustin", "Mitchell", "Riley", "Jesse", "Shane",
  "Cody", "Curtis", "Daryl", "Grant", "Ian", "Keith", "Lance",
  "Neil", "Owen", "Patrick", "Quinn", "Ross", "Stuart", "Vince", "Wayne",
  "Sarah", "Jessica", "Ashley", "Emily", "Amanda", "Nicole", "Megan",
  "Rachel", "Lauren", "Samantha", "Kayla", "Brittany", "Tiffany",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Thompson", "White", "Harris", "Clark", "Lewis", "Robinson",
  "Walker", "Young", "Hall", "Allen", "King", "Wright", "Scott",
  "Adams", "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner",
  "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins",
  "Stewart", "Sanchez", "Morris", "Rogers", "Reed", "Cook", "Morgan",
  "Bell", "Murphy", "Bailey", "Rivera", "Cooper", "Richardson", "Cox",
];

// Deterministic "random" based on seed
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generateCrew(
  rand: () => number,
  count: number
): CrewMember[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]}`,
    rank: RANKS[Math.min(i, RANKS.length - 1)],
    position: POSITIONS[Math.min(i, POSITIONS.length - 1)],
  }));
}

// Station truck configurations (simplified)
const STATION_CONFIGS: Record<number, { truck: string; type: TruckAssignment["type"]; crewSize: number }[]> = {};

for (let s = 1; s <= 31; s++) {
  const trucks: { truck: string; type: TruckAssignment["type"]; crewSize: number }[] = [
    { truck: `Engine ${s}`, type: "Engine", crewSize: 4 },
  ];
  // Some stations have ladders
  if ([1, 2, 5, 6, 14, 22, 24, 27].includes(s)) {
    trucks.push({ truck: `Ladder ${s}`, type: "Ladder", crewSize: 4 });
  }
  // Some stations have rescue
  if ([1, 2, 3, 5, 24].includes(s)) {
    trucks.push({ truck: `Rescue ${s}`, type: "Rescue", crewSize: 2 });
  }
  STATION_CONFIGS[s] = trucks;
}

const PLATOONS = ["1", "2", "3", "4"];

export function getStationStaffing(
  station: number,
  platoon: string,
  date?: string
): StationStaffing {
  const d = date || new Date().toISOString().split("T")[0];
  const seed =
    station * 1000 +
    PLATOONS.indexOf(platoon) * 100 +
    d.split("-").reduce((a, b) => a + parseInt(b), 0);
  const rand = seededRandom(seed);

  const config = STATION_CONFIGS[station] || [
    { truck: `Engine ${station}`, type: "Engine" as const, crewSize: 4 },
  ];

  return {
    station,
    platoon,
    date: d,
    trucks: config.map((t) => ({
      truck: t.truck,
      type: t.type,
      crew: generateCrew(rand, t.crewSize),
    })),
  };
}

export function getAllStationsForPlatoon(
  platoon: string,
  date?: string
): StationStaffing[] {
  return Array.from({ length: 31 }, (_, i) =>
    getStationStaffing(i + 1, platoon, date)
  );
}

export { PLATOONS };
