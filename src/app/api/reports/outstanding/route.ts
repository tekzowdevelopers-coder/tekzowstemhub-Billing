import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { activeBranchId } = await getCurrentSession();
  const searchParams = req.nextUrl.searchParams;
  const branchIdParam = searchParams.get("branchId");

  const effectiveBranchId = activeBranchId || (branchIdParam && branchIdParam !== "ALL" ? branchIdParam : undefined);

  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    },
    include: {
      branch: true,
      parent: true,
      enrollments: {
        include: {
          course: true,
          plan: true,
          installments: {
            orderBy: { installmentNumber: "asc" },
          },
        },
      },
      payments: {
        where: { status: "ACTIVE" },
      },
    },
  });

  const now = new Date();
  const outstandingList = [];

  for (const s of students) {
    let totalFee = 0;
    let paidAmount = 0;
    let nextDueDate: Date | null = null;
    let maxDaysOverdue = 0;

    s.enrollments.forEach((e) => {
      totalFee += e.finalFee;
      e.installments.forEach((inst) => {
        if (inst.balanceAmount > 0) {
          if (!nextDueDate || inst.dueDate < nextDueDate) {
            nextDueDate = inst.dueDate;
          }
          const diff = now.getTime() - new Date(inst.dueDate).getTime();
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          if (days > maxDaysOverdue) {
            maxDaysOverdue = days;
          }
        }
      });
    });

    s.payments.forEach((p) => {
      paidAmount += p.amount;
    });

    const pendingAmount = Math.max(0, totalFee - paidAmount);

    if (pendingAmount > 0) {
      outstandingList.push({
        studentId: s.id,
        studentCode: s.studentCode,
        studentName: s.name,
        parentName: s.parent?.fatherName || s.parent?.motherName || "Parent",
        mobile: s.parent?.mobile,
        branchName: s.branch.name,
        courseName: s.enrollments[0]?.course?.name || "Multiple Courses",
        totalFee,
        paidAmount,
        pendingAmount,
        nextDueDate,
        daysOverdue: maxDaysOverdue,
      });
    }
  }

  // Sort by highest pending amount or most overdue
  outstandingList.sort((a, b) => b.daysOverdue - a.daysOverdue || b.pendingAmount - a.pendingAmount);

  return NextResponse.json({ outstandingList });
}