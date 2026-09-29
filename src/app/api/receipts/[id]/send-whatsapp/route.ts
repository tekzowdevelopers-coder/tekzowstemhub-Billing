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
  const { student, enrollment, installment } = payment;
  const parent = student.parent!;

  let totalBalance = 0;
  let nextDueDate: Date | null = null;
  enrollment.installments.forEach((inst) => {
    totalBalance += inst.balanceAmount;
    if (inst.balanceAmount > 0 && (!nextDueDate || inst.dueDate < nextDueDate)) {
      nextDueDate = inst.dueDate;
    }
  });

  const variables = {
    student_name: student.name,
    parent_name: parent.fatherName || parent.motherName || "Parent",
    course_name: enrollment.course.name,
    plan_name: enrollment.plan.name,
    installment: `${installment.installmentNumber}nd Installment`,
    amount: payment.amount.toLocaleString("en-IN"),
    payment_mode: payment.paymentMode,
    receipt_number: receipt.receiptNumber,
    balance: totalBalance.toLocaleString("en-IN"),
    due_date: nextDueDate ? new Date(nextDueDate).toLocaleDateString("en-IN") : "Completed",
    branch_name: branch.name,
    branch_phone: branch.phone,
  };

  const res = await sendNotification({
    branchId: branch.id,
    studentId: student.id,
    parentId: parent.id,
    paymentId: payment.id,
    channel: "WHATSAPP",
    templateId: "payment_receipt",
    recipient: parent.whatsappNumber || parent.mobile,
    variables,
  });

  await prisma.receipt.update({
    where: { id },
    data: { whatsappStatus: res.success ? "DELIVERED" : "FAILED" },
  });

  return NextResponse.json({
    success: res.success,
    message: res.message,
    whatsappUrl: res.whatsappUrl,
    recipient: parent.whatsappNumber || parent.mobile,
  });
}