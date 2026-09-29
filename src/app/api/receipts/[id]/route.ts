import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const receipt = await prisma.receipt.findUnique({
    where: { id },
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
              installments: { orderBy: { installmentNumber: "asc" } },
            },
          },
          installment: true,
        },
      },
    },
  });

  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  return NextResponse.json({ receipt });
}