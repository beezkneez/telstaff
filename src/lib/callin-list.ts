// Fetches the call-in list from the shared Google Sheet

const SHEET_ID = "1PsvLJsUm5XdVKtQQQ2sPID2DxGGY0m0QaAQnaTlwU-Y";

interface CallInList {
  platoon: string;
  currentUp: string; // who's first up (from row 13 / first data row)
  members: { position: number; name: string }[];
}

// Map column pairs to platoons: A-B=1, C-D=2, E-F=3, G-H=4
const PLATOON_MAP: Record<number, string> = {
  0: "1", // columns A-B
  1: "2", // columns C-D
  2: "3", // columns E-F
  3: "4", // columns G-H
};

let cachedData: CallInList[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCallInLists(): Promise<CallInList[]> {
  if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
    return cachedData;
  }

  // Fetch the "who's up" row (row 13 in sheet = first row after headers)
  const startUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&range=B13:H13`;
  const listUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&range=A14:H220`;

  const [startRes, listRes] = await Promise.all([
    fetch(startUrl),
    fetch(listUrl),
  ]);

  if (!startRes.ok || !listRes.ok) {
    throw new Error("Failed to fetch Google Sheet data");
  }

  const startCsv = await startRes.text();
  const listCsv = await listRes.text();

  // Parse the "who's up" row — columns B, D, F, H (the name columns)
  const startNames = parseCsvRow(startCsv.trim().split("\n")[0]);
  // startNames should be [plt1_name, "", plt2_name, "", plt3_name, "", plt4_name] or similar
  // Actually the CSV from gviz might merge — let's parse carefully
  const currentUp = extractNames(startNames);

  // Parse the full list
  const listRows = listCsv.trim().split("\n");
  const lists: CallInList[] = [
    { platoon: "1", currentUp: currentUp[0] || "", members: [] },
    { platoon: "2", currentUp: currentUp[1] || "", members: [] },
    { platoon: "3", currentUp: currentUp[2] || "", members: [] },
    { platoon: "4", currentUp: currentUp[3] || "", members: [] },
  ];

  for (const row of listRows) {
    const cols = parseCsvRow(row);
    // Columns: A=pos1, B=name1, C=pos2, D=name2, E=pos3, F=name3, G=pos4, H=name4
    for (let p = 0; p < 4; p++) {
      const posStr = cols[p * 2]?.trim();
      const name = cols[p * 2 + 1]?.trim();
      const pos = parseInt(posStr);
      if (pos && name) {
        lists[p].members.push({ position: pos, name });
      }
    }
  }

  cachedData = lists;
  cacheTime = Date.now();
  return lists;
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

function extractNames(cols: string[]): string[] {
  // From the CSV, names are in every other column (B, D, F, H = indices 0, 1, 2, 3 after range starts at B)
  // But since we fetched B13:H13, columns are B,C,D,E,F,G,H = 7 columns
  // Names are at indices 0 (B), 2 (D), 4 (F), 6 (H)
  return [
    cols[0]?.trim() || "",
    cols[2]?.trim() || "",
    cols[4]?.trim() || "",
    cols[6]?.trim() || "",
  ];
}

export function findMemberPosition(
  list: CallInList,
  lastName: string
): number | null {
  const upper = lastName.toUpperCase().trim();
  if (!upper) return null;

  // Exact match first (sheet has last names only, sometimes with first name)
  const exact = list.members.find((m) => {
    const sheetName = m.name.toUpperCase().split(",")[0].trim();
    return sheetName === upper;
  });
  if (exact) return exact.position;

  // Partial match fallback (e.g., "JOHNSON, Mark" contains "JOHNSON")
  const partial = list.members.find((m) =>
    m.name.toUpperCase().startsWith(upper)
  );
  return partial?.position ?? null;
}

export function getPositionsAhead(
  list: CallInList,
  userPosition: number
): number {
  // Find the position of the current "up" person
  const currentUpPos = list.members.find(
    (m) => m.name.toUpperCase() === list.currentUp.toUpperCase()
  )?.position;

  if (!currentUpPos) return -1;

  const total = list.members.length;

  if (userPosition >= currentUpPos) {
    return userPosition - currentUpPos;
  } else {
    // Wrapped around
    return total - currentUpPos + userPosition;
  }
}
