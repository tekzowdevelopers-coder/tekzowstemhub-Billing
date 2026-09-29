import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { activeBranchId, isSuperAdmin } = await getCurrentSession();

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      branch: true,
      parent: true,
      enrollments: {
        include: {
          course: true,
          plan: {
            include: {
              installments: true,
            },
          },
          installments: {
            orderBy: { installmentNumber: "asc" },
            include: {
              payments: {
                where: { status: "ACTIVE" },
                include: { receipt: true },
              },
            },
          },
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        include: {
          receipt: true,
          installment: true,
          enrollment: {
            include: { course: true, plan: true },
          },
        },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Branch data isolation check (SRS Section 7)
  if (!isSuperAdmin && activeBranchId && student.branchId !== activeBranchId) {
    return NextResponse.json({ error: "Unauthorized access to other branch student" }, { status: 403 });
  }

  // Fetch notifications sent to this student
  const notifications = await prisma.notification.findMany({
    where: { studentId: id },
    include: { logs: true },
    orderBy: { createdAt: "desc" },
  });

  // Fetch student audit history
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ student, notifications, auditLogs });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getCurrentSession();
  const body = await req.json();

  const existing = await prisma.student.findUnique({
    where: { id },
    include: { parent: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        dob: body.dob ? new Date(body.dob) : existing.dob,
        gender: body.gender ?? existing.gender,
        schoolName: body.schoolName ?? existing.schoolName,
        grade: body.grade ?? existing.grade,
        academicYear: body.academicYear ?? existing.academicYear,
        address: body.address ?? existing.address,
        city: body.city ?? existing.city,
        state: body.state ?? existing.state,
        pincode: body.pincode ?? existing.pincode,
        status: body.status ?? existing.status,
      },
    });

    if (body.parent && existing.parent) {
      await tx.parent.update({
        where: { id: existing.parent.id },
        data: {
          fatherName: body.parent.fatherName ?? existing.parent.fatherName,
          motherName: body.parent.motherName ?? existing.parent.motherName,
          relationship: body.parent.relationship ?? existing.parent.relationship,
          mobile: body.parent.mobile ?? existing.parent.mobile,
          whatsappNumber: body.parent.whatsappNumber ?? existing.parent.whatsappNumber,
          alternateMobile: body.parent.alternateMobile ?? existing.parent.alternateMobile,
          email: body.parent.email ?? existing.parent.email,
          address: body.parent.address ?? existing.parent.address,
        },
      });
    }

    return student;
  });

  await logAudit({
    userId: user?.id,
    branchId: existing.branchId,
    action: "STUDENT_UPDATED",
    entity: "Student",
    entityId: id,
    oldData: existing,
    newData: body,
  });

  return NextResponse.json({ student: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { isSuperAdmin, user } = await getCurrentSession();

    // User requirement: "i dont have the option to deeted the student ony aacce for super admin"
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Only Super Admin can delete students" },
        { status: 403 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        parent: true,
        enrollments: {
          include: {
            installments: true,
          },
        },
        payments: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete notifications related to this student
      await tx.notification.deleteMany({
        where: { studentId: id },
      });

      // 2. Delete receipts for student's payments
      const paymentIds = student.payments.map((p) => p.id);
      if (paymentIds.length > 0) {
        await tx.receipt.deleteMany({
          where: { paymentId: { in: paymentIds } },
        });
      }

      // 3. Delete payments
      await tx.payment.deleteMany({
        where: { studentId: id },
      });

      // 4. Delete installments of student's enrollments
      const enrollmentIds = student.enrollments.map((e) => e.id);
      if (enrollmentIds.length > 0) {
        await tx.installment.deleteMany({
          where: { enrollmentId: { in: enrollmentIds } },
        });
      }

      // 5. Delete enrollments
      await tx.enrollment.deleteMany({
        where: { studentId: id },
      });

      // 6. Delete parent record
      if (student.parent) {
        await tx.parent.delete({
          where: { id: student.parent.id },
        });
      }

      // 7. Delete student
      await tx.student.delete({
        where: { id },
      });
    });

    // 8. Record audit log
    await logAudit({
      userId: user?.id,
      branchId: student.branchId,
      action: "STUDENT_DELETED",
      entity: "Student",
      entityId: id,
      oldData: {
        studentCode: student.studentCode,
        name: student.name,
      },
    });

    return NextResponse.json({ success: true, message: `Student ${student.name} deleted successfully` });
  } catch (error: any) {
    console.error("Delete student error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete student" },
      { status: 500 }
    );
  }
}