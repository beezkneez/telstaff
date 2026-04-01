import { prisma } from "./prisma";

// Import call-in list from Google Sheet (one-time initial import)
export async function importFromGoogleSheet(): Promise<{ imported: number }> {
  const SHEET_ID = "1PsvLJsUm5XdVKtQQQ2sPID2DxGGY0m0QaAQnaTlwU-Y";
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&range=A14:H220`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch Google Sheet");

  const csv = await res.text();
  const rows = csv.trim().split("\n");

  let imported = 0;

  for (const row of rows) {
    const cols = parseCsvRow(row);
    // Columns: A=pos1, B=name1, C=pos2, D=name2, E=pos3, F=name3, G=pos4, H=name4
    for (let p = 0; p < 4; p++) {
      const posStr = cols[p * 2]?.trim().replace(/"/g, "");
      const name = cols[p * 2 + 1]?.trim().replace(/"/g, "");
      const pos = parseInt(posStr);
      const platoon = String(p + 1);

      if (pos && name) {
        // Parse name — could be "MUELLER" or "JOHNSON, Mark"
        const parts = name.split(",").map((s) => s.trim());
        const lastName = parts[0] || name;
        const firstName = parts[1] || null;

        await prisma.callInMember.upsert({
          where: { platoon_position: { platoon, position: pos } },
          update: { lastName, firstName },
          create: { platoon, position: pos, lastName, firstName },
        });
        imported++;
      }
    }
  }

  // Also import current "who's up" from row 13
  const startUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&range=B13:H13`;
  const startRes = await fetch(startUrl);
  if (startRes.ok) {
    const startCsv = await startRes.text();
    const startCols = parseCsvRow(startCsv.trim().split("\n")[0]);
    // Names at indices 0 (B), 2 (D), 4 (F), 6 (H)
    const startNames = [
      startCols[0]?.trim().replace(/"/g, ""),
      startCols[2]?.trim().replace(/"/g, ""),
      startCols[4]?.trim().replace(/"/g, ""),
      startCols[6]?.trim().replace(/"/g, ""),
    ];

    for (let p = 0; p < 4; p++) {
      const platoon = String(p + 1);
      const name = startNames[p];
      if (!name) continue;

      // Find this person's position
      const member = await prisma.callInMember.findFirst({
        where: {
          platoon,
          lastName: { equals: name.split(",")[0].trim(), mode: "insensitive" },
        },
      });

      if (member) {
        await prisma.callInState.upsert({
          where: { platoon },
          update: { currentUpPos: member.position },
          create: { platoon, currentUpPos: member.position },
        });
      }
    }
  }

  return { imported };
}

// Get the call-in list for a platoon
export async function getCallInList(platoon: string) {
  const members = await prisma.callInMember.findMany({
    where: { platoon, active: true },
    orderBy: { position: "asc" },
  });

  const state = await prisma.callInState.findUnique({
    where: { platoon },
  });

  return { members, currentUpPos: state?.currentUpPos || 1, lastOtwpName: state?.lastOtwpName };
}

// Find a member's position on the list
export function findMemberOnList(
  members: { position: number; lastName: string; firstName: string | null }[],
  lastName: string
): number | null {
  const upper = lastName.toUpperCase().trim();
  const member = members.find(
    (m) => m.lastName.toUpperCase() === upper
  );
  return member?.position ?? null;
}

// Calculate positions ahead of a member
export function getPositionsAhead(
  currentUpPos: number,
  userPosition: number,
  totalMembers: number
): number {
  if (userPosition >= currentUpPos) {
    return userPosition - currentUpPos;
  }
  return totalMembers - currentUpPos + userPosition;
}

// Update "who's next" from OTWP scrape results
// Matches OTWP names against the call-in list, finds the furthest person,
// sets next-up to one below them
export async function updateFromOTWP(
  platoon: string, // the platoon that called people IN (the off-duty platoon)
  otwpNames: string[], // names from OTWP scrape (format: "LastName, FirstName ...")
  date: string,
  shift: string
): Promise<{ namesDialed: number; ratio: number; newCurrentUp: number } | null> {
  const members = await prisma.callInMember.findMany({
    where: { platoon, active: true },
    orderBy: { position: "asc" },
  });

  if (members.length === 0 || otwpNames.length === 0) return null;

  const state = await prisma.callInState.findUnique({ where: { platoon } });
  const currentUpPos = state?.currentUpPos || 1;

  // Match OTWP names to list positions
  const matchedPositions: number[] = [];
  for (const otwpName of otwpNames) {
    // Extract last name from "LastName, FirstName ..."
    const lastName = otwpName.split(",")[0].trim().toUpperCase();
    const member = members.find((m) => m.lastName.toUpperCase() === lastName);
    if (member) {
      matchedPositions.push(member.position);
    }
  }

  if (matchedPositions.length === 0) return null;

  // Find the furthest person from currentUpPos (accounting for wrap-around)
  let furthestPos = currentUpPos;
  let furthestDistance = 0;

  for (const pos of matchedPositions) {
    const distance = pos >= currentUpPos
      ? pos - currentUpPos
      : members.length - currentUpPos + pos;
    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestPos = pos;
    }
  }

  // Next up = one position after the furthest person
  const furthestIdx = members.findIndex((m) => m.position === furthestPos);
  const nextUpIdx = (furthestIdx + 1) % members.length;
  const newCurrentUp = members[nextUpIdx].position;

  // Calculate names dialed (distance from start to furthest + 1)
  const namesDialed = furthestDistance + 1;
  const ratio = otwpNames.length > 0 ? namesDialed / otwpNames.length : 0;

  // Update state
  const lastMember = members.find((m) => m.position === furthestPos);
  await prisma.callInState.upsert({
    where: { platoon },
    update: {
      currentUpPos: newCurrentUp,
      lastOtwpName: lastMember?.lastName || null,
      updatedAt: new Date(),
    },
    create: {
      platoon,
      currentUpPos: newCurrentUp,
      lastOtwpName: lastMember?.lastName || null,
    },
  });

  // Save history
  const dateObj = new Date(date + "T00:00:00Z");
  await prisma.callInHistory.upsert({
    where: { date_platoon_shift: { date: dateObj, platoon, shift } },
    update: {
      otwpCount: otwpNames.length,
      namesDialed,
      firstOnList: members.find((m) => m.position === Math.min(...matchedPositions))?.lastName,
      lastOnList: lastMember?.lastName,
      ratio,
    },
    create: {
      date: dateObj,
      platoon,
      shift,
      otwpCount: otwpNames.length,
      namesDialed,
      firstOnList: members.find((m) => m.position === Math.min(...matchedPositions))?.lastName,
      lastOnList: lastMember?.lastName,
      ratio,
    },
  });

  console.log(`[callin-db] PLT-${platoon} ${shift}: ${otwpNames.length} OTWP, dialed ${namesDialed} names, ratio ${ratio.toFixed(1)}:1, next up pos ${newCurrentUp}`);

  return { namesDialed, ratio, newCurrentUp };
}

// Add a new hire to the call-in list
export async function addNewHire(
  platoon: string,
  lastName: string,
  firstName: string | null,
  payrollNumber: string | null
): Promise<void> {
  // Get current max position
  const last = await prisma.callInMember.findFirst({
    where: { platoon },
    orderBy: { position: "desc" },
  });
  const nextPos = (last?.position || 0) + 1;

  await prisma.callInMember.create({
    data: {
      platoon,
      position: nextPos,
      lastName,
      firstName,
      payrollNumber,
    },
  });

  console.log(`[callin-db] Added new hire: ${lastName}, ${firstName} to PLT-${platoon} at position ${nextPos}`);
}

// Detect new hires from Telestaff roster that aren't in our DB
export async function detectNewHires(
  platoon: string,
  rosterNames: string[] // "LastName, FirstName" format
): Promise<string[]> {
  const members = await prisma.callInMember.findMany({
    where: { platoon },
    select: { lastName: true },
  });
  const knownNames = new Set(members.map((m) => m.lastName.toUpperCase()));

  const newNames: string[] = [];
  for (const name of rosterNames) {
    const lastName = name.split(",")[0].trim().toUpperCase();
    if (lastName && !knownNames.has(lastName)) {
      newNames.push(name);
    }
  }

  return newNames;
}

// Get recent call-in history for prediction
export async function getRecentHistory(
  daysBack: number = 30
): Promise<{
  avgRatio: number;
  dayRatio: number;
  nightRatio: number;
  weekdayNightRatio: number;
  weekendDayRatio: number;
}> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const history = await prisma.callInHistory.findMany({
    where: { date: { gte: since }, ratio: { not: null } },
    orderBy: { date: "desc" },
  });

  if (history.length === 0) {
    return { avgRatio: 3, dayRatio: 3, nightRatio: 2.5, weekdayNightRatio: 2.5, weekendDayRatio: 3.5 };
  }

  const all = history.filter((h) => h.ratio != null).map((h) => h.ratio!);
  const dayEntries = history.filter((h) => h.shift === "day" && h.ratio != null);
  const nightEntries = history.filter((h) => h.shift === "night" && h.ratio != null);

  const avgRatio = all.reduce((s, r) => s + r, 0) / all.length;
  const dayRatio = dayEntries.length > 0
    ? dayEntries.reduce((s, h) => s + h.ratio!, 0) / dayEntries.length
    : avgRatio;
  const nightRatio = nightEntries.length > 0
    ? nightEntries.reduce((s, h) => s + h.ratio!, 0) / nightEntries.length
    : avgRatio;

  // Weekend vs weekday
  const weekdayNights = history.filter((h) => {
    const d = h.date.getDay();
    return h.shift === "night" && d >= 1 && d <= 4 && h.ratio != null;
  });
  const weekendDays = history.filter((h) => {
    const d = h.date.getDay();
    return h.shift === "day" && (d === 0 || d === 6) && h.ratio != null;
  });

  const weekdayNightRatio = weekdayNights.length > 0
    ? weekdayNights.reduce((s, h) => s + h.ratio!, 0) / weekdayNights.length
    : nightRatio;
  const weekendDayRatio = weekendDays.length > 0
    ? weekendDays.reduce((s, h) => s + h.ratio!, 0) / weekendDays.length
    : dayRatio;

  return { avgRatio, dayRatio, nightRatio, weekdayNightRatio, weekendDayRatio };
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else current += ch;
  }
  result.push(current);
  return result;
}
