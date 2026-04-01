import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email, password, name, platoon, homeStation } = await req.json();

    if (!email || !password || !name || !platoon || !homeStation) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            name,
            platoon,
            homeStation: parseInt(homeStation),
          },
        },
      },
      include: { profile: true },
    });

    // Send welcome email (fire and forget)
    sendWelcomeEmail(user.email, user.profile?.name || "").catch(() => {});

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.profile?.name,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
