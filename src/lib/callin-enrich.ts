import { prisma } from "./prisma";

// Enrich call-in members with first names from scraped roster data
export async function enrichFromRoster(): Promise<{ updated: number; notFound: string[] }> {
  let updated = 0;
  const notFound: string[] = [];

  // Get all call-in members missing first names
  const members = await prisma.callInMember.findMany({
    where: { active: true, firstName: null },
  });

  // Get recent roster data for all platoons
  const recentDate = new Date();
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(recentDate);
    d.setDate(d.getDate() - i);
    dates.push(new Date(d.toISOString().split("T")[0] + "T00:00:00Z"));
  }

  // Build a name lookup from all cached roster data
  const nameLookup = new Map<string, { firstName: string; payroll: string }>();

  for (const platoon of ["1", "2", "3", "4"]) {
    for (const dateObj of dates) {
      const cached = await prisma.staffingCache.findMany({
        where: { platoon, date: dateObj },
        select: { data: true },
      });

      for (const entry of cached) {
        const data = entry.data as {
          trucks?: {
            crew?: { name?: string; employeeId?: string }[];
          }[];
        };
        if (!data?.trucks) continue;

        for (const truck of data.trucks) {
          if (!truck.crew) continue;
          for (const member of truck.crew) {
            if (!member.name) continue;
            // Name format: "LastName, FirstName" or "LastName, FirstName MiddleInit."
            const parts = member.name.split(",");
            if (parts.length >= 2) {
              const lastName = parts[0].trim().toUpperCase();
              const firstName = parts[1].trim().split(" ")[0]; // just first name, no middle
              if (!nameLookup.has(lastName) || !nameLookup.get(lastName)!.firstName) {
                nameLookup.set(lastName, {
                  firstName,
                  payroll: member.employeeId || "",
                });
              }
            }
          }
        }
      }
    }
  }

  console.log(`[enrich] Built lookup with ${nameLookup.size} names from roster`);

  // Match and update
  for (const member of members) {
    const match = nameLookup.get(member.lastName.toUpperCase());
    if (match && match.firstName) {
      await prisma.callInMember.update({
        where: { id: member.id },
        data: {
          firstName: match.firstName,
          ...(match.payroll ? { payrollNumber: match.payroll } : {}),
        },
      });
      updated++;
    } else {
      notFound.push(`${member.lastName} (PLT-${member.platoon})`);
    }
  }

  console.log(`[enrich] Updated ${updated} members, ${notFound.length} not found`);
  return { updated, notFound };
}
