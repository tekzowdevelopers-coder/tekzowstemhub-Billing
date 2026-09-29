import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const branches = await prisma.branch.findMany({
    include: {
      _count: {
        select: {
          students: true,
          payments: true,
          enrollments: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ branches });
}

export async function POST(req: NextRequest) {
  try {
    const { user, isSuperAdmin, isAccountant } = await getCurrentSession();

    // User requirement: "super admin or accountant can add the branch"
    if (!isSuperAdmin && !isAccountant) {
      return NextResponse.json(
        { error: "Unauthorized: Only Super Admin or Accountant can add new branches" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, code, address, phone, email } = body;

    if (!name || !code || !phone) {
      return NextResponse.json({ error: "Branch name, code, and phone number are required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await prisma.branch.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `A branch with code "${cleanCode}" already exists` }, { status: 400 });
    }

    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        address: address ? address.trim() : "Main Branch Address",
        phone: phone.trim(),
        email: email ? email.trim() : `${cleanCode.toLowerCase()}@tekzowstemhub.com`,
        status: "ACTIVE",
      },
    });

    await logAudit({
      userId: user?.id,
      branchId: branch.id,
      action: "BRANCH_CREATED",
      entity: "Branch",
      entityId: branch.id,
      newData: { name: branch.name, code: branch.code },
    });

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create branch" }, { status: 500 });
  }
}