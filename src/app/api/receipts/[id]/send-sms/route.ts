import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      branch: true,
      payment: {
        include: {
          student: { include: { parent: true, branch: true } },
          enrollment: { include: { course: true, plan: true, installments: true } },
          installment: true,
        },
      },
    },
  });

  if (!receipt || !receipt.payment.student.parent) {
    return NextResponse.json({ error: "Receipt or Parent record not found" }, { status: 404 });
  }

  const { payment, branch } = receipt;
  const { student, enrollment } = payment;
  const parent = student.parent!;

  let totalBalance = 0;
  enrollment.installments.forEach((inst) => {
    totalBalance += inst.balanceAmount;
  });

  const variables = {
    student_name: student.name,
    parent_name: parent.fatherName || parent.motherName || "Parent",
    amount: payment.amount.toLocaleString("en-IN"),
    receipt_number: receipt.receiptNumber,
    balance: totalBalance.toLocaleString("en-IN"),
  };

  const res = await sendNotification({
    branchId: branch.id,
    studentId: student.id,
    parentId: parent.id,
    paymentId: payment.id,
    channel: "SMS",
    templateId: "payment_receipt",
    recipient: parent.mobile,
    variables,
  });

  await prisma.receipt.update({
    where: { id },
    data: { smsStatus: res.success ? "DELIVERED" : "FAILED" },
  });

  return NextResponse.json({ success: res.success, message: res.message });
}