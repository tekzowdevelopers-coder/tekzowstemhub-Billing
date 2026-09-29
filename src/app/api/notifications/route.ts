import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { sendNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const { activeBranchId } = await getCurrentSession();
  const searchParams = req.nextUrl.searchParams;
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");

  const notifications = await prisma.notification.findMany({
    where: {
      ...(activeBranchId ? { branchId: activeBranchId } : {}),
      ...(channel && channel !== "ALL" ? { channel } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
    },
    include: {
      logs: {
        orderBy: { sentAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notifications });
}

export async function POST(req: NextRequest) {
  try {
    const { activeBranchId } = await getCurrentSession();
    const body = await req.json();
    const { installmentId, channel = "WHATSAPP", templateId = "payment_due_reminder" } = body;

    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        enrollment: {
          include: {
            student: { include: { parent: true, branch: true } },
            course: true,
            plan: true,
          },
        },
      },
    });

    if (!installment || !installment.enrollment.student.parent) {
      return NextResponse.json({ error: "Installment or Parent not found" }, { status: 404 });
    }

    const { enrollment } = installment;
    const { student } = enrollment;
    const parent = student.parent!;

    const now = new Date();
    const diffTime = now.getTime() - new Date(installment.dueDate).getTime();
    const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    const variables = {
      student_name: student.name,
      parent_name: parent.fatherName || parent.motherName || "Parent",
      course_name: enrollment.course.name,
      plan_name: enrollment.plan.name,
      installment: `${installment.installmentNumber}nd Installment`,
      amount: installment.balanceAmount.toLocaleString("en-IN"),
      due_date: new Date(installment.dueDate).toLocaleDateString("en-IN"),
      days_overdue: daysOverdue,
      branch_name: student.branch.name,
      branch_phone: student.branch.phone,
    };

    const recipient = channel === "WHATSAPP" ? parent.whatsappNumber : parent.mobile;

    const result = await sendNotification({
      branchId: student.branchId,
      studentId: student.id,
      parentId: parent.id,
      paymentId: null,
      channel,
      templateId,
      recipient,
      variables,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to send reminder" }, { status: 500 });
  }
}