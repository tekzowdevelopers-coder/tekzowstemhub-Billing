import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const branches = await prisma.branch.findMany({
    include: {
      students: true,
      enrollments: {
        include: {
          installments: true,
        },
      },
      payments: {
        where: { status: "ACTIVE" },
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();

  const metrics = branches.map((b) => {
    const totalStudents = b.students.length;
    const activeStudents = b.students.filter((s) => s.status === "ACTIVE").length;

    let totalEnrolledFees = 0;
    let overdueAmount = 0;

    b.enrollments.forEach((e) => {
      totalEnrolledFees += e.finalFee;
      e.installments.forEach((inst) => {
        if (inst.balanceAmount > 0 && new Date(inst.dueDate) < now) {
          overdueAmount += inst.balanceAmount;
        }
      });
    });

    let totalCollected = 0;
    b.payments.forEach((p) => {
      totalCollected += p.amount;
    });

    const pendingAmount = Math.max(0, totalEnrolledFees - totalCollected);

    return {
      branchId: b.id,
      branchName: b.name,
      branchCode: b.code,
      phone: b.phone,
      totalStudents,
      activeStudents,
      totalEnrolledFees,
      totalCollected,
      pendingAmount,
      overdueAmount,
      collectionRatio: totalEnrolledFees > 0 ? Math.round((totalCollected / totalEnrolledFees) * 100) : 0,
    };
  });

  return NextResponse.json({ branchMetrics: metrics });
}