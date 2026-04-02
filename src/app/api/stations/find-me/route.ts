import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "";
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const lastName = name.split(" ").pop()?.toLowerCase() || "";

  if (!lastName) return NextResponse.json({ found: false });

  const dateObj = new Date(date + "T00:00:00Z");

  // Search all cached roster data in one DB query
  const cached = await prisma.staffingCache.findMany({
    where: { date: dateObj },
    select: { platoon: true, station: true, data: true },
    orderBy: { station: "asc" },
  });

  for (const entry of cached) {
    const data = entry.data as { trucks?: { truck: string; crew?: { name?: string }[] }[] };
    if (!data?.trucks) continue;
    for (const truck of data.trucks) {
      if (!truck.crew) continue;
      for (const member of truck.crew) {
        if (member.name?.toLowerCase().includes(lastName)) {
          return NextResponse.json({
            found: true,
            platoon: entry.platoon,
            station: entry.station,
            truck: truck.truck,
            name: member.name,
          });
        }
      }
    }
  }

  return NextResponse.json({ found: false });
}
