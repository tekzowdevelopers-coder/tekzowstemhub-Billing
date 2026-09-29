import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { activeBranchId } = await getCurrentSession();
  const searchParams = req.nextUrl.searchParams;
  const branchIdParam = searchParams.get("branchId");
  const search = searchParams.get("search") || "";

  const effectiveBranchId = activeBranchId || (branchIdParam && branchIdParam !== "ALL" ? branchIdParam : undefined);

  const where: any = {
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    ...(search
      ? {
          OR: [
            { receiptNumber: { contains: search } },
            { payment: { student: { name: { contains: search } } } },
            { payment: { student: { studentCode: { contains: search } } } },
            { payment: { transactionReference: { contains: search } } },
          ],
        }
      : {}),
  };

  const receipts = await prisma.receipt.findMany({
    where,
    include: {
      branch: true,
      payment: {
        include: {
          student: {
            include: { parent: true, branch: true },
          },
          enrollment: {
            include: {
              course: true,
              plan: true,
              installments: true,
            },
          },
          installment: true,
        },
      },
    },
    orderBy: { generatedAt: "desc" },
  });

  return NextResponse.json({ receipts });
}