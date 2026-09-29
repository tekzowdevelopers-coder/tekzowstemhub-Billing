import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, isSuperAdmin, activeBranchId } = await getCurrentSession();
    const body = await req.json();
    const reason = body.reason || "Void requested by administrator";

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        installment: true,
        receipt: true,
        student: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "ACTIVE") {
      return NextResponse.json({ error: `Payment is already ${payment.status}` }, { status: 400 });
    }

    // Financial rule (SRS Section 35): Never delete, reverse transaction state
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark payment as VOID
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: "VOID",
          notes: payment.notes ? `${payment.notes} | VOID REASON: ${reason}` : `VOID REASON: ${reason}`,
        },
      });

      // 2. Reverse installment calculations
      const inst = payment.installment;
      const restoredPaid = Math.max(0, inst.paidAmount - payment.amount);
      const restoredBalance = inst.amount - restoredPaid;
      const restoredStatus = restoredPaid === 0 ? "PENDING" : "PARTIAL";

      const updatedInstallment = await tx.installment.update({
        where: { id: inst.id },
        data: {
          paidAmount: restoredPaid,
          balanceAmount: restoredBalance,
          status: restoredStatus,
        },
      });

      return { payment: updatedPayment, installment: updatedInstallment };
    });

    await logAudit({
      userId: user?.id,
      branchId: payment.branchId,
      action: "PAYMENT_VOIDED",
      entity: "Payment",
      entityId: id,
      oldData: { amount: payment.amount, status: "ACTIVE" },
      newData: { status: "VOID", reason },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Void payment error:", error);
    return NextResponse.json({ error: error.message || "Failed to void payment" }, { status: 500 });
  }
}