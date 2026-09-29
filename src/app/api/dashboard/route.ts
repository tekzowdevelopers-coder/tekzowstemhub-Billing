import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { activeBranchId } = await getCurrentSession();
  const searchParams = req.nextUrl.searchParams;
  const branchIdParam = searchParams.get("branchId");

  const effectiveBranchId = activeBranchId || (branchIdParam && branchIdParam !== "ALL" ? branchIdParam : undefined);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // 1. Total & Active Students
  const totalStudents = await prisma.student.count({
    where: effectiveBranchId ? { branchId: effectiveBranchId } : {},
  });

  const activeStudents = await prisma.student.count({
    where: {
      status: "ACTIVE",
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    },
  });

  // 2. Enrolled Fees & Installments
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: "ACTIVE",
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    },
    include: {
      installments: true,
    },
  });

  let totalEnrolledFee = 0;
  let dueThisMonth = 0;
  let overdueAmount = 0;

  let countPaid = 0;
  let countPartial = 0;
  let countPending = 0;
  let countOverdue = 0;

  enrollments.forEach((e) => {
    totalEnrolledFee += e.finalFee;
    e.installments.forEach((inst) => {
      const due = new Date(inst.dueDate);
      if (inst.balanceAmount > 0) {
        if (due >= startOfMonth && due <= endOfMonth) {
          dueThisMonth += inst.balanceAmount;
        }
        if (due < startOfToday) {
          overdueAmount += inst.balanceAmount;
          countOverdue++;
        } else if (inst.status === "PARTIAL") {
          countPartial++;
        } else {
          countPending++;
        }
      } else {
        countPaid++;
      }
    });
  });

  // 3. Payments
  const allPayments = await prisma.payment.findMany({
    where: {
      status: "ACTIVE",
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    },
    orderBy: { paymentDate: "desc" },
  });

  let totalCollected = 0;
  let todayCollection = 0;

  allPayments.forEach((p) => {
    totalCollected += p.amount;
    const pDate = new Date(p.paymentDate);
    if (pDate >= startOfToday && pDate <= endOfToday) {
      todayCollection += p.amount;
    }
  });

  const pendingAmount = Math.max(0, totalEnrolledFee - totalCollected);

  // 4. Monthly Collection Trends for Recharts (SRS Section 14)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyMap: Record<string, number> = {};

  // Default past 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${monthNames[d.getMonth()]}`;
    monthlyMap[label] = 0;
  }

  allPayments.forEach((p) => {
    const pDate = new Date(p.paymentDate);
    const label = `${monthNames[pDate.getMonth()]}`;
    if (label in monthlyMap) {
      monthlyMap[label] += p.amount;
    }
  });

  const monthlyTrends = Object.entries(monthlyMap).map(([month, amount]) => ({
    month,
    collection: amount,
  }));

  // 5. Payment Status Donut (SRS Section 15)
  const statusBreakdown = [
    { name: "Paid", value: countPaid, color: "#10b981" },
    { name: "Partial", value: countPartial, color: "#f59e0b" },
    { name: "Pending", value: countPending, color: "#3b82f6" },
    { name: "Overdue", value: countOverdue, color: "#ef4444" },
  ];

  // 6. Upcoming Due Payments (SRS Section 16)
  const upcomingDues = await prisma.installment.findMany({
    where: {
      balanceAmount: { gt: 0 },
      dueDate: { gte: startOfToday },
      enrollment: {
        status: "ACTIVE",
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
    },
    include: {
      enrollment: {
        include: {
          student: { include: { parent: true } },
          plan: true,
          course: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
  });

  // 7. Overdue Payments (SRS Section 17)
  const overdueInstallments = await prisma.installment.findMany({
    where: {
      balanceAmount: { gt: 0 },
      dueDate: { lt: startOfToday },
      enrollment: {
        status: "ACTIVE",
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
    },
    include: {
      enrollment: {
        include: {
          student: { include: { parent: true, branch: true } },
          course: true,
          plan: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  const overdueList = overdueInstallments.map((inst) => {
    const diff = now.getTime() - new Date(inst.dueDate).getTime();
    const daysOverdue = Math.floor(diff / (1000 * 60 * 60 * 24));
    return {
      installmentId: inst.id,
      studentId: inst.enrollment.student.id,
      studentName: inst.enrollment.student.name,
      studentCode: inst.enrollment.student.studentCode,
      parentName: inst.enrollment.student.parent?.fatherName || inst.enrollment.student.parent?.motherName || "Parent",
      mobile: inst.enrollment.student.parent?.mobile || "",
      whatsapp: inst.enrollment.student.parent?.whatsappNumber || "",
      courseName: inst.enrollment.course.name,
      amount: inst.balanceAmount,
      dueDate: inst.dueDate,
      daysOverdue,
      branchName: inst.enrollment.student.branch.name,
    };
  });

  return NextResponse.json({
    kpis: {
      totalStudents,
      activeStudents,
      totalEnrolledFee,
      totalCollected,
      pendingAmount,
      dueThisMonth,
      overdueAmount,
      todayCollection,
    },
    monthlyTrends,
    statusBreakdown,
    upcomingDues,
    overdueList,
  });
}