import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { activeBranchId } = await getCurrentSession();
  const searchParams = req.nextUrl.searchParams;
  const filter = searchParams.get("filter") || "ALL"; // ALL, DUE_TODAY, DUE_WEEK, DUE_MONTH, OVERDUE
  const branchIdParam = searchParams.get("branchId");
  const search = searchParams.get("search") || "";

  const effectiveBranchId = activeBranchId || (branchIdParam && branchIdParam !== "ALL" ? branchIdParam : undefined);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const where: any = {
    balanceAmount: { gt: 0 },
    enrollment: {
      status: "ACTIVE",
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(search
        ? {
            student: {
              OR: [
                { name: { contains: search } },
                { studentCode: { contains: search } },
                { parent: { mobile: { contains: search } } },
              ],
            },
          }
        : {}),
    },
  };

  if (filter === "DUE_TODAY") {
    where.dueDate = {
      gte: startOfToday,
      lte: endOfToday,
    };
  } else if (filter === "DUE_WEEK") {
    where.dueDate = {
      gte: startOfToday,
      lte: endOfWeek,
    };
  } else if (filter === "DUE_MONTH") {
    where.dueDate = {
      gte: startOfToday,
      lte: endOfMonth,
    };
  } else if (filter === "OVERDUE") {
    where.dueDate = {
      lt: startOfToday,
    };
  }

  const installments = await prisma.installment.findMany({
    where,
    include: {
      enrollment: {
        include: {
          student: {
            include: { parent: true, branch: true },
          },
          course: true,
          plan: true,
        },
      },
      payments: {
        where: { status: "ACTIVE" },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  // Calculate days overdue / due status
  const formatted = installments.map((inst) => {
    const diffTime = now.getTime() - new Date(inst.dueDate).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays > 0 && inst.balanceAmount > 0;

    return {
      ...inst,
      daysOverdue: isOverdue ? diffDays : 0,
      computedStatus: isOverdue ? "OVERDUE" : inst.status,
    };
  });

  return NextResponse.json({ installments: formatted });
}