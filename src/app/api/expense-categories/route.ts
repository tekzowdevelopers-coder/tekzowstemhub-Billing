import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.expenseCategory.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { isGlobal: true },
          ...(session.activeBranchId ? [{ branchId: session.activeBranchId }] : []),
        ],
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("Fetch expense categories error:", error);
    return NextResponse.json({ error: error.message || "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, isGlobal } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if category already exists
    const existing = await prisma.expenseCategory.findFirst({
      where: {
        name: { equals: trimmedName, mode: "insensitive" },
        status: "ACTIVE",
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 });
    }

    const globalFlag = session.isSuperAdmin ? Boolean(isGlobal) : false;
    const branchId = globalFlag ? null : session.activeBranchId;

    const category = await prisma.expenseCategory.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        branchId,
        isGlobal: globalFlag,
        status: "ACTIVE",
      },
    });

    await logAudit({
      userId: session.user.id,
      branchId: session.activeBranchId,
      action: "EXPENSE_CATEGORY_CREATED",
      entity: "EXPENSE_CATEGORY",
      entityId: category.id,
      newData: { name: category.name, isGlobal: category.isGlobal },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("Create expense category error:", error);
    return NextResponse.json({ error: error.message || "Failed to create category" }, { status: 500 });
  }
}
