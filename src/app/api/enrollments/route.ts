import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { generateReceiptNumber } from "@/lib/id-generator";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { activeBranchId } = await getCurrentSession();
  const searchParams = req.nextUrl.searchParams;
  const studentId = searchParams.get("studentId");
  const branchId = activeBranchId || searchParams.get("branchId");

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...(branchId && branchId !== "ALL" ? { branchId } : {}),
      ...(studentId ? { studentId } : {}),
    },
    include: {
      student: {
        include: { parent: true },
      },
      branch: true,
      course: true,
      plan: true,
      installments: {
        orderBy: { installmentNumber: "asc" },
      },
      payments: {
        where: { status: "ACTIVE" },
        include: { receipt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ enrollments });
}

export async function POST(req: NextRequest) {
  try {
    const { user, activeBranchId } = await getCurrentSession();
    const body = await req.json();

    const {
      studentId,
      courseId,
      planId,
      startDate,
      planFee,
      discount = 0,
      finalFee,
      installments, // Array of { installmentNumber, amount, dueDate }
      firstPayment, // Optional { amount, paymentMode, transactionReference, notes }
    } = body;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { branch: true, parent: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    const plan = await prisma.plan.findUnique({ where: { id: planId } });

    if (!course || !plan) {
      return NextResponse.json({ error: "Course or Plan not found" }, { status: 404 });
    }

    const branchId = student.branchId;

    // Execute atomic transaction for enrollment creation + installment generation + optional first payment
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          branchId,
          studentId,
          courseId,
          planId,
          startDate: startDate ? new Date(startDate) : new Date(),
          planFee: Number(planFee),
          discount: Number(discount),
          finalFee: Number(finalFee),
          status: "ACTIVE",
        },
      });

      // 2. Generate Installments
      const createdInstallments = [];
      for (const inst of installments) {
        const amount = Number(inst.amount);
        const createdInst = await tx.installment.create({
          data: {
            enrollmentId: enrollment.id,
            installmentNumber: Number(inst.installmentNumber),
            amount,
            dueDate: new Date(inst.dueDate),
            paidAmount: 0,
            balanceAmount: amount,
            status: "PENDING",
          },
        });
        createdInstallments.push(createdInst);
      }

      // 3. Process First Payment if entered (SRS Section 25 & 92)
      let recordedPayment = null;
      let generatedReceipt = null;

      if (firstPayment && Number(firstPayment.amount) > 0) {
        const payAmount = Number(firstPayment.amount);
        const targetInst = createdInstallments[0]; // Apply to Installment 1

        const newPaid = payAmount;
        const newBalance = Math.max(0, targetInst.amount - newPaid);
        const instStatus = newBalance === 0 ? "PAID" : "PARTIAL";

        // Update target installment
        await tx.installment.update({
          where: { id: targetInst.id },
          data: {
            paidAmount: newPaid,
            balanceAmount: newBalance,
            status: instStatus,
          },
        });

        // Create Payment record
        recordedPayment = await tx.payment.create({
          data: {
            branchId,
            studentId,
            enrollmentId: enrollment.id,
            installmentId: targetInst.id,
            amount: payAmount,
            paymentMode: firstPayment.paymentMode || "UPI",
            transactionReference: firstPayment.transactionReference || null,
            paymentDate: new Date(),
            notes: firstPayment.notes || "Enrollment first payment",
            status: "ACTIVE",
            createdBy: user?.name || "Staff",
          },
        });

        // Generate Receipt Number: TSH-{BRANCH_CODE}-{YEAR}-{SEQ}
        const receiptNumber = await generateReceiptNumber(student.branch.code, 2026);

        generatedReceipt = await tx.receipt.create({
          data: {
            branchId,
            paymentId: recordedPayment.id,
            receiptNumber,
            whatsappStatus: "QUEUED",
            smsStatus: "QUEUED",
          },
        });
      }

      return {
        enrollment,
        installments: createdInstallments,
        payment: recordedPayment,
        receipt: generatedReceipt,
      };
    });

    // 4. Send Notifications in background (SRS Section 40, 41, 42)
    if (result.receipt && result.payment && student.parent) {
      const variables = {
        student_name: student.name,
        parent_name: student.parent.fatherName || student.parent.motherName || "Parent",
        course_name: course.name,
        plan_name: plan.name,
        installment: "1st Installment",
        amount: result.payment.amount,
        payment_mode: result.payment.paymentMode,
        receipt_number: result.receipt.receiptNumber,
        balance: result.enrollment.finalFee - result.payment.amount,
        due_date: result.installments[1]?.dueDate ? new Date(result.installments[1].dueDate).toLocaleDateString("en-IN") : "Fully Paid",
        branch_name: student.branch.name,
        branch_phone: student.branch.phone,
      };

      // WhatsApp Notification
      sendNotification({
        branchId,
        studentId: student.id,
        parentId: student.parent.id,
        paymentId: result.payment.id,
        channel: "WHATSAPP",
        templateId: "payment_receipt",
        recipient: student.parent.whatsappNumber || student.parent.mobile,
        variables,
      }).then(async (res) => {
        await prisma.receipt.update({
          where: { id: result.receipt!.id },
          data: { whatsappStatus: "DELIVERED" },
        });
      });

      // SMS Notification
      sendNotification({
        branchId,
        studentId: student.id,
        parentId: student.parent.id,
        paymentId: result.payment.id,
        channel: "SMS",
        templateId: "payment_receipt",
        recipient: student.parent.mobile,
        variables,
      }).then(async (res) => {
        await prisma.receipt.update({
          where: { id: result.receipt!.id },
          data: { smsStatus: res.success ? "DELIVERED" : "FAILED" },
        });
      });
    }

    // 5. Audit Log
    await logAudit({
      userId: user?.id,
      branchId,
      action: "ENROLLMENT_CREATED",
      entity: "Enrollment",
      entityId: result.enrollment.id,
      newData: {
        studentId,
        course: course.name,
        finalFee: result.enrollment.finalFee,
        firstPaymentAmount: result.payment?.amount || 0,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Create enrollment error:", error);
    return NextResponse.json({ error: error.message || "Failed to create enrollment" }, { status: 500 });
  }
}