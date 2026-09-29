import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { generateStudentId } from "@/lib/id-generator";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { user, activeBranchId } = await getCurrentSession();
    const body = await req.json();
    const { rows, branchId: selectedBranchId, dryRun } = body;

    const branchId = selectedBranchId || activeBranchId;
    if (!branchId) {
      return NextResponse.json({ error: "Branch selection is required for import" }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const previewResults: any[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      const studentName = row.studentName || row.name || row["Student Name"];
      const parentName = row.parentName || row["Parent Name"] || row.fatherName || row["Father Name"];
      const mobile = String(row.mobile || row["Mobile"] || row.phone || "").trim();
      const courseName = row.courseName || row["Course"] || row.course;
      const schoolName = row.schoolName || row["School"] || row.school;
      const grade = row.grade || row["Grade"] || row.class;

      if (!studentName || !mobile) {
        previewResults.push({
          row,
          status: "ERROR",
          message: "Student name and mobile number are mandatory",
        });
        errorCount++;
        continue;
      }

      // Check existing duplicate in DB
      const existing = await prisma.student.findFirst({
        where: {
          OR: [
            { name: studentName, branchId },
            { parent: { mobile: mobile } },
          ],
        },
      });

      if (existing) {
        previewResults.push({
          row,
          status: "DUPLICATE",
          message: `Duplicate detected with existing student: ${existing.name} (${existing.studentCode})`,
        });
        duplicateCount++;
      } else {
        previewResults.push({
          row,
          status: "VALID",
          studentName,
          parentName,
          mobile,
          courseName,
          schoolName,
          grade,
        });
        validCount++;
      }
    }

    // If dryRun is requested (Step 1 of SRS 94: Preview & Validate), return analysis
    if (dryRun) {
      return NextResponse.json({
        summary: {
          total: rows.length,
          valid: validCount,
          duplicates: duplicateCount,
          errors: errorCount,
        },
        previewResults,
      });
    }

    // Otherwise, perform actual batch insert for all VALID rows
    const importedStudents = [];
    for (const item of previewResults) {
      if (item.status !== "VALID") continue;

      const studentCode = await generateStudentId(branch.code, 2026);
      const student = await prisma.student.create({
        data: {
          branchId,
          studentCode,
          name: item.studentName,
          schoolName: item.schoolName || null,
          grade: item.grade || null,
          status: "ACTIVE",
          parent: {
            create: {
              fatherName: item.parentName || "Parent",
              mobile: item.mobile,
              whatsappNumber: item.mobile,
            },
          },
        },
        include: { parent: true },
      });

      importedStudents.push(student);
    }

    await logAudit({
      userId: user?.id,
      branchId,
      action: "STUDENTS_BULK_IMPORTED",
      entity: "Student",
      newData: { count: importedStudents.length },
    });

    return NextResponse.json({
      success: true,
      importedCount: importedStudents.length,
      importedStudents,
    });
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: error.message || "Failed to process import" }, { status: 500 });
  }
}