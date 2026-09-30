import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { category: true, branch: true },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Branch isolation check:
    if (!session.isSuperAdmin && !session.isAccountant && expense.branchId !== session.user.branchId) {
      return NextResponse.json({ error: "Access denied to void another branch's expense" }, { status: 403 });
    }

    // Role check: Only Super Admin, Branch Admin, or Accountant can void
    const canVoid = session.isSuperAdmin || session.isAccountant || session.user.role === "BRANCH_ADMIN";
    if (!canVoid) {
      return NextResponse.json({ error: "Only administrators can void expense records" }, { status: 403 });
    }

    if (expense.status === "VOID") {
      return NextResponse.json({ error: "Expense is already voided" }, { status: 400 });
    }

    const body = await req.json();
    const { reason } = body;
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "A valid reason for voiding this expense is required for audit compliance" }, { status: 400 });
    }

    const voided = await prisma.expense.update({
      where: { id },
      data: {
        status: "VOID",
        voidReason: reason.trim(),
        voidedAt: new Date(),
        voidedBy: session.user.name,
      },
      include: { category: true, branch: true },
    });

    // Record audit log
    await logAudit({
      userId: session.user.id,
      branchId: voided.branchId,
      action: "EXPENSE_VOIDED",
      entity: "EXPENSE",
      entityId: voided.id,
      newData: {
        expenseCode: voided.expenseCode,
        amount: voided.amount,
        reason: reason.trim(),
        voidedBy: session.user.name,
      },
    });

    return NextResponse.json({ success: true, expense: voided });
  } catch (error: any) {
    console.error("Void expense error:", error);
    return NextResponse.json({ error: error.message || "Failed to void expense" }, { status: 500 });
  }
}
