import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { generateStudentId } from "@/lib/id-generator";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { activeBranchId } = await getCurrentSession();
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const branchIdParam = searchParams.get("branchId");
  const status = searchParams.get("status");

  // Determine effective branch filter based on session
  const effectiveBranchId = activeBranchId || (branchIdParam && branchIdParam !== "ALL" ? branchIdParam : undefined);

  const where: any = {};
  if (effectiveBranchId) {
    where.branchId = effectiveBranchId;
  }
  if (status && status !== "ALL") {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { studentCode: { contains: search } },
      { schoolName: { contains: search } },
      { parent: { mobile: { contains: search } } },
      { parent: { fatherName: { contains: search } } },
      { parent: { motherName: { contains: search } } },
    ];
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      branch: true,
      parent: true,
      enrollments: {
        include: {
          course: true,
          plan: true,
          installments: true,
        },
      },
      payments: {
        where: { status: "ACTIVE" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate financial summaries for each student
  const formatted = students.map((s) => {
    let totalEnrolledFee = 0;
    let totalDiscount = 0;
    let totalPaid = 0;
    let nextDueDate: Date | null = null;
    let hasOverdue = false;

    s.enrollments.forEach((e) => {
      totalEnrolledFee += e.finalFee;
      totalDiscount += e.discount;
      e.installments.forEach((inst) => {
        if (inst.status === "OVERDUE") hasOverdue = true;
        if (inst.balanceAmount > 0) {
          if (!nextDueDate || inst.dueDate < nextDueDate) {
            nextDueDate = inst.dueDate;
          }
        }
      });
    });

    s.payments.forEach((p) => {
      totalPaid += p.amount;
    });

    const totalPending = Math.max(0, totalEnrolledFee - totalPaid);

    return {
      ...s,
      financialSummary: {
        totalEnrolledFee,
        totalDiscount,
        totalPaid,
        totalPending,
        nextDueDate,
        hasOverdue,
      },
    };
  });

  return NextResponse.json({ students: formatted });
}

export async function POST(req: NextRequest) {
  try {
    const { user, activeBranchId } = await getCurrentSession();
    const body = await req.json();

    const branchId = body.branchId || activeBranchId;
    if (!branchId) {
      return NextResponse.json({ error: "Branch is required" }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Duplicate detection (SRS Section 95)
    if (!body.allowDuplicate) {
      const existingDuplicate = await prisma.student.findFirst({
        where: {
          OR: [
            { name: { equals: body.name }, branchId },
            { parent: { mobile: body.mobile } },
            { parent: { whatsappNumber: body.whatsappNumber || body.mobile } },
          ],
        },
        include: { parent: true },
      });

      if (existingDuplicate) {
        return NextResponse.json(
          {
            duplicateDetected: true,
            message: `Possible duplicate student found: ${existingDuplicate.name} (${existingDuplicate.studentCode}) with mobile ${existingDuplicate.parent?.mobile}`,
            existingStudent: existingDuplicate,
          },
          { status: 409 }
        );
      }
    }

    // Auto-generate Student ID: TSH-{BRANCH_CODE}-{YEAR}-{SEQ}
    const studentCode = await generateStudentId(branch.code, 2026);

    const student = await prisma.$transaction(async (tx) => {
      const newStudent = await tx.student.create({
        data: {
          branchId,
          studentCode,
          name: body.name,
          dob: body.dob ? new Date(body.dob) : null,
          gender: body.gender || "Male",
          schoolName: body.schoolName,
          grade: body.grade,
          academicYear: body.academicYear || "2026-2027",
          photoUrl: body.photoUrl,
          address: body.address,
          city: body.city || (branch.code === "HOS" ? "Hosur" : "Bangalore"),
          state: body.state || (branch.code === "HOS" ? "Tamil Nadu" : "Karnataka"),
          pincode: body.pincode,
          status: "ACTIVE",
          parent: {
            create: {
              fatherName: body.fatherName,
              motherName: body.motherName,
              guardianName: body.guardianName,
              relationship: body.relationship || "Father",
              mobile: body.mobile,
              whatsappNumber: body.whatsappNumber || body.mobile,
              alternateMobile: body.alternateMobile,
              email: body.email,
              address: body.address,
            },
          },
        },
        include: { parent: true, branch: true },
      });

      return newStudent;
    });

    await logAudit({
      userId: user?.id,
      branchId,
      action: "STUDENT_CREATED",
      entity: "Student",
      entityId: student.id,
      newData: { studentCode: student.studentCode, name: student.name },
    });

    return NextResponse.json({ student });
  } catch (error: any) {
    console.error("Create student error:", error);
    return NextResponse.json({ error: error.message || "Failed to create student" }, { status: 500 });
  }
}