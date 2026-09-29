import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const STANDARD_COURSE_PLANS = [
  {
    name: "1 Month",
    durationMonths: 1,
    totalFee: 1800,
    installments: [
      { installmentNumber: 1, percentage: 100, defaultAmount: 1800, dueOffsetMonths: 0 },
    ],
  },
  {
    name: "3 Months",
    durationMonths: 3,
    totalFee: 4999,
    installments: [
      { installmentNumber: 1, percentage: 50.01, defaultAmount: 2500, dueOffsetMonths: 0 },
      { installmentNumber: 2, percentage: 49.99, defaultAmount: 2499, dueOffsetMonths: 1 },
    ],
  },
  {
    name: "6 Months",
    durationMonths: 6,
    totalFee: 8999,
    installments: [
      { installmentNumber: 1, percentage: 50.01, defaultAmount: 4500, dueOffsetMonths: 0 },
      { installmentNumber: 2, percentage: 49.99, defaultAmount: 4499, dueOffsetMonths: 2 },
    ],
  },
  {
    name: "12 Months",
    durationMonths: 12,
    totalFee: 13999,
    installments: [
      { installmentNumber: 1, percentage: 35.72, defaultAmount: 5000, dueOffsetMonths: 0 },
      { installmentNumber: 2, percentage: 32.14, defaultAmount: 4500, dueOffsetMonths: 3 },
      { installmentNumber: 3, percentage: 32.14, defaultAmount: 4499, dueOffsetMonths: 6 },
    ],
  },
];

export async function GET() {
  const courses = await prisma.course.findMany({
    where: { status: "ACTIVE" },
    include: {
      plans: {
        where: { status: "ACTIVE" },
        include: {
          installments: {
            orderBy: { installmentNumber: "asc" },
          },
        },
        orderBy: { durationMonths: "asc" },
      },
      _count: {
        select: { enrollments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  try {
    const { user, activeBranchId } = await getCurrentSession();
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: "Course name is required" }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        branchId: body.isGlobal ? null : activeBranchId,
        name: body.name,
        description: body.description,
        duration: body.duration || "6 Months",
        status: "ACTIVE",
        plans: {
          create: STANDARD_COURSE_PLANS.map((p) => ({
            name: p.name,
            durationMonths: p.durationMonths,
            totalFee: p.totalFee,
            status: "ACTIVE",
            installments: {
              create: p.installments.map((inst) => ({
                installmentNumber: inst.installmentNumber,
                percentage: inst.percentage,
                defaultAmount: inst.defaultAmount,
                dueOffsetMonths: inst.dueOffsetMonths,
              })),
            },
          })),
        },
      },
      include: {
        plans: {
          include: { installments: true },
        },
      },
    });

    await logAudit({
      userId: user?.id,
      branchId: activeBranchId,
      action: "COURSE_CREATED",
      entity: "Course",
      entityId: course.id,
      newData: { name: course.name },
    });

    return NextResponse.json({ course });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create course" }, { status: 500 });
  }
}