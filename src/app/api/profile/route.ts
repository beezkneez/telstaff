import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

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
