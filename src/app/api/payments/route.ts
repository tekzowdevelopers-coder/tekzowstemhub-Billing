import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { generateReceiptNumber } from "@/lib/id-generator";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { activeBranchId } = await getCurrentSession();
  const searchParams = req.nextUrl.searchParams;
  const branchIdParam = searchParams.get("branchId");
  const mode = searchParams.get("mode");
  const status = searchParams.get("status") || "ACTIVE";
  const search = searchParams.get("search") || "";

  const effectiveBranchId = activeBranchId || (branchIdParam && branchIdParam !== "ALL" ? branchIdParam : undefined);

  const where: any = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(mode && mode !== "ALL" ? { paymentMode: mode } : {}),
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    ...(search
      ? {
          OR: [
            { student: { name: { contains: search } } },
            { student: { studentCode: { contains: search } } },
            { receipt: { receiptNumber: { contains: search } } },
            { transactionReference: { contains: search } },
            { student: { parent: { mobile: { contains: search } } } },
          ],
        }
      : {}),
  };

  const payments = await prisma.payment.findMany({
    where,
    include: {
      student: {
        include: { parent: true, branch: true },
      },
      branch: true,
      enrollment: {
        include: { course: true, plan: true },
      },
      installment: true,
      receipt: true,
    },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  try {
    const { user, activeBranchId, isSuperAdmin } = await getCurrentSession();
    const body = await req.json();

    const {
      installmentId,
      amount,
      paymentMode,
      transactionReference,
      paymentDate,
      notes,
    } = body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
    }

    // Fetch installment with enrollment & student
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        enrollment: {
          include: {
            student: { include: { parent: true, branch: true } },
            course: true,
            plan: true,
            installments: { orderBy: { installmentNumber: "asc" } },
          },
        },
      },
    });

    if (!installment) {
      return NextResponse.json({ error: "Installment not found" }, { status: 404 });
    }

    const { enrollment } = installment;
    const { student } = enrollment;
    const branchId = student.branchId;

    // Check branch authorization
    if (!isSuperAdmin && activeBranchId && branchId !== activeBranchId) {
      return NextResponse.json({ error: "Unauthorized to record payment for this branch" }, { status: 403 });
    }

    // Validation: cannot exceed outstanding balance
    if (payAmount > installment.balanceAmount + 0.01) {
      return NextResponse.json(
        {
          error: `Payment amount (₹${payAmount}) exceeds outstanding installment balance (₹${installment.balanceAmount})`,
        },
        { status: 400 }
      );
    }

    // Backend financial calculations (SRS Section 83)
    const prevPaid = installment.paidAmount;
    const newPaid = prevPaid + payAmount;
    const newBalance = Math.max(0, installment.amount - newPaid);
    const newStatus = newBalance === 0 ? "PAID" : "PARTIAL";

    // Execute atomic transaction (SRS Section 34)
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          branchId,
          studentId: student.id,
          enrollmentId: enrollment.id,
          installmentId: installment.id,
          amount: payAmount,
          paymentMode: paymentMode || "CASH",
          transactionReference: transactionReference || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          notes: notes || null,
          status: "ACTIVE",
          createdBy: user?.name || "Staff",
        },
      });

      // 2. Update Installment
      const updatedInstallment = await tx.installment.update({
        where: { id: installment.id },
        data: {
          paidAmount: newPaid,
          balanceAmount: newBalance,
          status: newStatus,
        },
      });

      // 3. Generate Receipt Number: TSH-{BRANCH_CODE}-{YEAR}-{SEQUENCE}
      const receiptNumber = await generateReceiptNumber(student.branch.code, 2026);

      // 4. Create Receipt record
      const receipt = await tx.receipt.create({
        data: {
          branchId,
          paymentId: payment.id,
          receiptNumber,
          whatsappStatus: "QUEUED",
          smsStatus: "QUEUED",
        },
      });

      return { payment, updatedInstallment, receipt };
    });

    // 5. Calculate cumulative student remaining balance and next due date
    const allEnrollmentInstallments = await prisma.installment.findMany({
      where: { enrollmentId: enrollment.id },
      orderBy: { installmentNumber: "asc" },
    });

    let totalCourseBalance = 0;
    let nextDue: Date | null = null;
    allEnrollmentInstallments.forEach((inst) => {
      totalCourseBalance += inst.balanceAmount;
      if (inst.balanceAmount > 0 && (!nextDue || inst.dueDate < nextDue)) {
        nextDue = inst.dueDate;
      }
    });

    // 6. Trigger WhatsApp & SMS Notifications asynchronously (SRS Section 40, 41, 42)
    if (student.parent) {
      const templateVars = {
        student_name: student.name,
        parent_name: student.parent.fatherName || student.parent.motherName || "Parent",
        course_name: enrollment.course.name,
        plan_name: enrollment.plan.name,
        installment: `${installment.installmentNumber}nd Installment`,
        amount: payAmount.toLocaleString("en-IN"),
        payment_mode: paymentMode,
        receipt_number: transactionResult.receipt.receiptNumber,
        balance: totalCourseBalance.toLocaleString("en-IN"),
        due_date: nextDue ? new Date(nextDue).toLocaleDateString("en-IN") : "Completed",
        branch_name: student.branch.name,
        branch_phone: student.branch.phone,
      };

      sendNotification({
        branchId,
        studentId: student.id,
        parentId: student.parent.id,
        paymentId: transactionResult.payment.id,
        channel: "WHATSAPP",
        templateId: "payment_receipt",
        recipient: student.parent.whatsappNumber || student.parent.mobile,
        variables: templateVars,
      }).then(async (res) => {
        await prisma.receipt.update({
          where: { id: transactionResult.receipt.id },
          data: { whatsappStatus: "DELIVERED" },
        });
      });

      sendNotification({
        branchId,
        studentId: student.id,
        parentId: student.parent.id,
        paymentId: transactionResult.payment.id,
        channel: "SMS",
        templateId: "payment_receipt",
        recipient: student.parent.mobile,
        variables: templateVars,
      }).then(async (res) => {
        await prisma.receipt.update({
          where: { id: transactionResult.receipt.id },
          data: { smsStatus: res.success ? "DELIVERED" : "FAILED" },
        });
      });
    }

    // 7. Record Audit Log
    await logAudit({
      userId: user?.id,
      branchId,
      action: "PAYMENT_RECORDED",
      entity: "Payment",
      entityId: transactionResult.payment.id,
      newData: {
        student: student.name,
        studentCode: student.studentCode,
        amount: payAmount,
        mode: paymentMode,
        reference: transactionReference,
        receipt: transactionResult.receipt.receiptNumber,
      },
    });

    return NextResponse.json({
      success: true,
      payment: transactionResult.payment,
      receipt: transactionResult.receipt,
      installment: transactionResult.updatedInstallment,
      totalCourseBalance,
      nextDue,
    });
  } catch (error: any) {
    console.error("Record payment error:", error);
    return NextResponse.json({ error: error.message || "Failed to record payment" }, { status: 500 });
  }
}