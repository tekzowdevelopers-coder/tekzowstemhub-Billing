import { prisma } from "./prisma";

export async function generateStudentId(branchCode: string, year = 2026): Promise<string> {
  const prefix = `TSH-${branchCode.toUpperCase()}-${year}-`;
  
  // Find highest sequence for this branch and year
  const latestStudent = await prisma.student.findFirst({
    where: {
      studentCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      studentCode: "desc",
    },
  });

  let nextSeq = 1;
  if (latestStudent && latestStudent.studentCode) {
    const parts = latestStudent.studentCode.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  const seqStr = String(nextSeq).padStart(4, "0");
  return `${prefix}${seqStr}`;
}

export async function generateReceiptNumber(branchCode: string, year = 2026): Promise<string> {
  const prefix = `TSH-${branchCode.toUpperCase()}-${year}-`;
  
  const latestReceipt = await prisma.receipt.findFirst({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNumber: "desc",
    },
  });

  let nextSeq = 1;
  if (latestReceipt && latestReceipt.receiptNumber) {
    const parts = latestReceipt.receiptNumber.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  const seqStr = String(nextSeq).padStart(6, "0");
  return `${prefix}${seqStr}`;
}