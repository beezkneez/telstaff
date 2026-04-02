import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email, password, name, platoon, homeStation, payrollNumber } = await req.json();

    if (!email || !password || !name || !platoon || !homeStation || !payrollNumber) {
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

    // Verify payroll number exists in CallInMember database
    const member = await prisma.callInMember.findFirst({
      where: { payrollNumber, platoon },
    });

    if (!member) {
      // Try finding by payroll across all platoons
      const anyMember = await prisma.callInMember.findFirst({
        where: { payrollNumber },
      });

      if (anyMember) {
        return NextResponse.json(
          { error: `Payroll number found on PLT-${anyMember.platoon}, not PLT-${platoon}. Please select the correct platoon.` },
          { status: 400 }
        );
      }

      // Not a hard error — they might be new or not in the DB yet
      console.log(`[register] Payroll ${payrollNumber} not found in CallInMember DB`);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Use name from CallInMember if available (more accurate)
    const displayName = member
      ? `${member.firstName || ""} ${member.lastName}`.trim()
      : name;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            name: displayName,
            platoon: member?.platoon || platoon,
            homeStation: parseInt(homeStation),
            payrollNumber,
          },
        },
      },
      include: { profile: true },
    });

    // Update CallInMember with payroll number if not already set
    if (member && !member.payrollNumber) {
      await prisma.callInMember.update({
        where: { id: member.id },
        data: { payrollNumber },
      });
    }

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
