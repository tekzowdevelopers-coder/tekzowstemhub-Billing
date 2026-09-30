import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        branch: true,
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Branch isolation check
    if (!session.isSuperAdmin && !session.isAccountant && expense.branchId !== session.user.branchId) {
      return NextResponse.json({ error: "Access denied to this branch's expense records" }, { status: 403 });
    }

    return NextResponse.json({ expense });
  } catch (error: any) {
    console.error("Get expense error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch expense" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCurrentSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { category: true, branch: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Branch isolation check
    if (!session.isSuperAdmin && !session.isAccountant && existing.branchId !== session.user.branchId) {
      return NextResponse.json({ error: "Access denied to modify this branch expense" }, { status: 403 });
    }

    if (existing.status === "VOID") {
      return NextResponse.json({ error: "Cannot modify a voided expense record" }, { status: 400 });
    }

    const body = await req.json();
    const {
      expenseDate,
      categoryId,
      amount,
      paymentMode,
      paidTo,
      referenceNumber,
      description,
      notes,
      attachmentUrl,
      attachmentName,
    } = body;

    if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) <= 0)) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const updateData: any = {
      updatedBy: session.user.name,
    };

    if (expenseDate) updateData.expenseDate = new Date(expenseDate);
    if (categoryId) updateData.categoryId = categoryId;
    if (amount !== undefined) updateData.amount = Number(amount);
    if (paymentMode) updateData.paymentMode = paymentMode;
    if (paidTo !== undefined) updateData.paidTo = paidTo?.trim() || null;
    if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber?.trim() || null;
    if (description !== undefined) updateData.description = description.trim();
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (attachmentUrl !== undefined) updateData.attachmentUrl = attachmentUrl || null;
    if (attachmentName !== undefined) updateData.attachmentName = attachmentName || null;

    const updated = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: { category: true, branch: true },
    });

    // Record audit log
    await logAudit({
      userId: session.user.id,
      branchId: updated.branchId,
      action: "EXPENSE_UPDATED",
      entity: "EXPENSE",
      entityId: updated.id,
      oldData: {
        amount: existing.amount,
        category: existing.category.name,
        paymentMode: existing.paymentMode,
        description: existing.description,
      },
      newData: {
        amount: updated.amount,
        category: updated.category.name,
        paymentMode: updated.paymentMode,
        description: updated.description,
      },
    });

    return NextResponse.json({ success: true, expense: updated });
  } catch (error: any) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: error.message || "Failed to update expense" }, { status: 500 });
  }
}
