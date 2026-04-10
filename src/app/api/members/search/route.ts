import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const members = await prisma.callInMember.findMany({
    where: {
      active: true,
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      platoon: true,
      payrollNumber: true,
    },
    orderBy: { lastName: "asc" },
    take: 10,
  });

  return NextResponse.json(
    members.map((m) => ({
      id: m.id,
      name: `${m.firstName || ""} ${m.lastName}`.trim(),
      platoon: m.platoon,
      payrollNumber: m.payrollNumber || "",
    }))
  );
}
