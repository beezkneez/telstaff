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
  const { telestaff_username, telestaff_password } = await req.json();

  if (!telestaff_username || !telestaff_password) {
    return NextResponse.json(
      { error: "Both username and password are required" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      telestaff_username: encrypt(telestaff_username),
      telestaff_password: encrypt(telestaff_password),
    },
  });

  return NextResponse.json({ success: true });
}
