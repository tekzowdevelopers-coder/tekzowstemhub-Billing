import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { activeBranchId } = await getCurrentSession();
  const searchParams = req.nextUrl.searchParams;
  const period = searchParams.get("period") || "THIS_MONTH"; // TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, PREV_MONTH, ALL
  const branchIdParam = searchParams.get("branchId");

  const effectiveBranchId = activeBranchId || (branchIdParam && branchIdParam !== "ALL" ? branchIdParam : undefined);

  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (period === "TODAY") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (period === "YESTERDAY") {
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    startDate = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0);
    endDate = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59);
  } else if (period === "THIS_WEEK") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "THIS_MONTH") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else if (period === "PREV_MONTH") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }

  const where: any = {
    status: "ACTIVE",
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    ...(startDate || endDate
      ? {
          paymentDate: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  const payments = await prisma.payment.findMany({
    where,
    include: {
      student: { include: { parent: true } },
      enrollment: { include: { course: true, plan: true } },
      receipt: true,
      branch: true,
    },
    orderBy: { paymentDate: "desc" },
  });

  let totalCollection = 0;
  const modeBreakdown: Record<string, number> = {
    CASH: 0,
    UPI: 0,
    BANK_TRANSFER: 0,
    CARD: 0,
    CHEQUE: 0,
    OTHER: 0,
  };

  payments.forEach((p) => {
    totalCollection += p.amount;
    const mode = p.paymentMode in modeBreakdown ? p.paymentMode : "OTHER";
    modeBreakdown[mode] += p.amount;
  });

  return NextResponse.json({
    summary: {
      totalCollection,
      totalTransactions: payments.length,
      modeBreakdown,
    },
    payments,
  });
}