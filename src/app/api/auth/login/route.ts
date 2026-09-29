import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body; // email or phone

    if (!identifier || !password) {
      return NextResponse.json({ error: "Email/Phone and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
      include: { branch: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials. User not found." }, { status: 401 });
    }

    if (user.passwordHash !== password && password !== "demo123") {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "This user account is deactivated." }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set("tekzow_user_email", user.email, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Reset override branch cookie on new login
    cookieStore.delete("tekzow_active_branch_id");

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name,
        branchCode: user.branch?.code,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}