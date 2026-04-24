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

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const where: { date?: { gte?: Date; lte?: Date } } = {};
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from + "T00:00:00Z");
    if (to) where.date.lte = new Date(to + "T00:00:00Z");
  }

  const notes = await prisma.shiftNote.findMany({
    where,
    orderBy: { date: "asc" },
  });
  return NextResponse.json(
    notes.map((n) => ({
      id: n.id,
      date: n.date.toISOString().split("T")[0],
      platoon: n.platoon,
      shift: n.shift,
      note: n.note,
      updatedAt: n.updatedAt,
    }))
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const { date, platoon, shift, note } = body as { date: string; platoon: string; shift: string; note: string };
  if (!date || !platoon || !shift) {
    return NextResponse.json({ error: "date, platoon, shift required" }, { status: 400 });
  }

  const dateObj = new Date(date + "T00:00:00Z");
  const trimmed = (note || "").trim();

  if (!trimmed) {
    // Empty note = delete
    await prisma.shiftNote.deleteMany({ where: { date: dateObj, platoon, shift } });
    return NextResponse.json({ success: true, deleted: true });
  }

  const saved = await prisma.shiftNote.upsert({
    where: { date_platoon_shift: { date: dateObj, platoon, shift } },
    update: { note: trimmed, authorId: userId },
    create: { date: dateObj, platoon, shift, note: trimmed, authorId: userId },
  });
  return NextResponse.json({
    success: true,
    note: {
      id: saved.id,
      date: saved.date.toISOString().split("T")[0],
      platoon: saved.platoon,
      shift: saved.shift,
      note: saved.note,
      updatedAt: saved.updatedAt,
    },
  });
}
