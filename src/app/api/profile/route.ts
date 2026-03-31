import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telestaff_username: true,
      telestaff_password: true,
      profile: true,
    },
  });

  return NextResponse.json({
    hasTelestaffCreds: !!(user?.telestaff_username && user?.telestaff_password),
    profile: user?.profile || null,
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await req.json();

  // Update Telestaff credentials if provided
  if (body.telestaff_username && body.telestaff_password) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        telestaff_username: encrypt(body.telestaff_username),
        telestaff_password: encrypt(body.telestaff_password),
      },
    });
  }

  // Update profile (platoon, station) if provided
  if (body.platoon || body.homeStation) {
    await prisma.profile.update({
      where: { userId },
      data: {
        ...(body.platoon && { platoon: body.platoon }),
        ...(body.homeStation && { homeStation: parseInt(body.homeStation) }),
      },
    });
  }

  return NextResponse.json({ success: true });
}
