import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin === true;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "search") {
    const q = searchParams.get("q") || "";
    if (q.length < 2) return NextResponse.json([]);
    const results = await prisma.callInMember.findMany({
      where: {
        active: true,
        OR: [
          { lastName: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { payrollNumber: { contains: q } },
        ],
      },
      orderBy: [{ platoon: "asc" }, { position: "asc" }],
      take: 20,
    });
    return NextResponse.json(results);
  }

  if (action === "list") {
    const platoon = searchParams.get("platoon") || "1";
    const members = await prisma.callInMember.findMany({
      where: { platoon, active: true },
      orderBy: { position: "asc" },
    });
    const state = await prisma.callInState.findUnique({ where: { platoon } });
    return NextResponse.json({ members, state });
  }

  if (action === "history") {
    const history = await prisma.callInHistory.findMany({
      orderBy: { date: "desc" },
      take: 50,
    });
    return NextResponse.json(history);
  }

  if (action === "stats") {
    const counts = await Promise.all(
      ["1", "2", "3", "4"].map(async (p) => {
        const state = await prisma.callInState.findUnique({ where: { platoon: p } });
        const currentMember = state ? await prisma.callInMember.findFirst({
          where: { platoon: p, position: state.currentUpPos },
        }) : null;
        return {
          platoon: p,
          members: await prisma.callInMember.count({ where: { platoon: p, active: true } }),
          state,
          currentName: currentMember ? `${currentMember.lastName}${currentMember.firstName ? `, ${currentMember.firstName}` : ""}` : null,
        };
      })
    );
    return NextResponse.json(counts);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();

  if (body.action === "import-sheet") {
    const { importFromGoogleSheet } = await import("@/lib/callin-db");
    const result = await importFromGoogleSheet();
    return NextResponse.json(result);
  }

  if (body.action === "set-current-up") {
    await prisma.callInState.upsert({
      where: { platoon: body.platoon },
      update: { currentUpPos: body.position, updatedAt: new Date() },
      create: { platoon: body.platoon, currentUpPos: body.position },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "enrich-roster") {
    const { enrichFromRoster } = await import("@/lib/callin-enrich");
    const result = await enrichFromRoster();
    return NextResponse.json(result);
  }

  if (body.action === "match-users") {
    // Auto-match existing users to CallInMember records by name
    const users = await prisma.user.findMany({
      include: { profile: true },
    });
    let matched = 0;
    for (const user of users) {
      if (!user.profile) continue;
      const lastName = user.profile.name.split(" ").pop()?.toUpperCase() || "";
      if (!lastName) continue;

      const member = await prisma.callInMember.findFirst({
        where: {
          platoon: user.profile.platoon,
          lastName: { equals: lastName, mode: "insensitive" },
        },
      });

      if (member) {
        // Update profile with payroll if member has it
        if (member.payrollNumber && !user.profile.payrollNumber) {
          await prisma.profile.update({
            where: { id: user.profile.id },
            data: { payrollNumber: member.payrollNumber },
          });
        }
        // Update CallInMember with payroll from profile if it has it
        if (user.profile.payrollNumber && !member.payrollNumber) {
          await prisma.callInMember.update({
            where: { id: member.id },
            data: { payrollNumber: user.profile.payrollNumber },
          });
        }
        matched++;
      }
    }
    return NextResponse.json({ matched, total: users.length });
  }

  if (body.action === "add-member") {
    const { addNewHire } = await import("@/lib/callin-db");
    await addNewHire(body.platoon, body.lastName, body.firstName, body.payrollNumber);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
