import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const courseId = searchParams.get("courseId");

  const plans = await prisma.plan.findMany({
    where: {
      status: "ACTIVE",
      ...(courseId ? { courseId } : {}),
    },
    include: {
      course: true,
      installments: {
        orderBy: { installmentNumber: "asc" },
      },
    },
  });

  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  try {
    const { user, activeBranchId } = await getCurrentSession();
    const body = await req.json();
    const { courseId, name, durationMonths, totalFee, installments } = body;

    if (!courseId || !name || !totalFee || !installments?.length) {
      return NextResponse.json({ error: "Missing required plan fields" }, { status: 400 });
    }

    const plan = await prisma.plan.create({
      data: {
        courseId,
        name,
        durationMonths: Number(durationMonths) || 6,
        totalFee: Number(totalFee),
        status: "ACTIVE",
        installments: {
          create: installments.map((inst: any, idx: number) => ({
            installmentNumber: inst.installmentNumber || idx + 1,
            percentage: Number(inst.percentage) || 100 / installments.length,
            defaultAmount: Number(inst.defaultAmount) || Number(totalFee) / installments.length,
            dueOffsetMonths: Number(inst.dueOffsetMonths) || 0,
          })),
        },
      },
      include: {
        installments: true,
        course: true,
      },
    });

    await logAudit({
      userId: user?.id,
      branchId: activeBranchId,
      action: "PLAN_CREATED",
      entity: "Plan",
      entityId: plan.id,
      newData: { name: plan.name, totalFee: plan.totalFee },
    });

    return NextResponse.json({ plan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create plan" }, { status: 500 });
  }
}