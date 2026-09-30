import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { generateExpenseCode } from "@/lib/id-generator";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("category") || "ALL";
    const paymentMode = searchParams.get("paymentMode") || "ALL";
    const status = searchParams.get("status") || "ACTIVE";
    const datePreset = searchParams.get("datePreset") || "ALL";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const branchParam = searchParams.get("branchId");

    // Branch Security Enforcement
    let targetBranchId: string | null = null;
    if (session.isSuperAdmin || session.isAccountant) {
      if (branchParam && branchParam !== "ALL") {
        targetBranchId = branchParam;
      } else if (session.activeBranchId) {
        targetBranchId = session.activeBranchId;
      }
    } else {
      // Locked to user's assigned branch
      targetBranchId = session.user.branchId;
    }

    const where: any = {};

    if (targetBranchId) {
      where.branchId = targetBranchId;
    }

    if (status !== "ALL") {
      where.status = status;
    }

    if (categoryId !== "ALL") {
      where.categoryId = categoryId;
    }

    if (paymentMode !== "ALL") {
      where.paymentMode = paymentMode;
    }

    // Date filtering logic
    const now = new Date();
    if (datePreset === "TODAY") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.expenseDate = { gte: startOfDay, lte: endOfDay };
    } else if (datePreset === "YESTERDAY") {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      where.expenseDate = { gte: startOfDay, lte: endOfDay };
    } else if (datePreset === "THIS_WEEK") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.expenseDate = { gte: sevenDaysAgo, lte: now };
    } else if (datePreset === "THIS_MONTH") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      where.expenseDate = { gte: startOfMonth, lte: endOfMonth };
    } else if (datePreset === "PREV_MONTH") {
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      where.expenseDate = { gte: startOfPrevMonth, lte: endOfPrevMonth };
    } else if (datePreset === "CUSTOM" && startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    }

    // Search query across ID, description, vendor, ref number, category
    if (search) {
      where.OR = [
        { expenseCode: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { paidTo: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        expenseDate: "desc",
      },
    });

    // Calculate table-level total for current filtered records
    const filteredTotal = expenses.reduce((sum, exp) => sum + (exp.status === "ACTIVE" ? exp.amount : 0), 0);

    return NextResponse.json({
      expenses,
      filteredTotal,
      count: expenses.length,
    });
  } catch (error: any) {
    console.error("Fetch expenses error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      branchId: reqBranchId,
      expenseDate,
      categoryId,
      amount,
      paymentMode,
      paidTo,
      referenceNumber,
      description,
      notes,
      attachmentUrl,
      attachmentName,
    } = body;

    // Validate required fields
    if (!expenseDate) {
      return NextResponse.json({ error: "Expense date is required" }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "A valid positive expense amount is required" }, { status: 400 });
    }
    if (!paymentMode) {
      return NextResponse.json({ error: "Payment mode is required" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Branch Resolution & Access Check
    let branchId = session.user.branchId;
    if (session.isSuperAdmin || session.isAccountant) {
      branchId = reqBranchId || session.activeBranchId || session.user.branchId;
    }

    if (!branchId) {
      // If super admin has no branch selected, grab first active branch
      const firstBranch = await prisma.branch.findFirst({ where: { status: "ACTIVE" } });
      if (!firstBranch) {
        return NextResponse.json({ error: "No active branch found to assign expense" }, { status: 400 });
      }
      branchId = firstBranch.id;
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const category = await prisma.expenseCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Expense category not found" }, { status: 404 });
    }

    const expDate = new Date(expenseDate);
    const expenseCode = await generateExpenseCode(branch.code, expDate.getFullYear());

    const expense = await prisma.expense.create({
      data: {
        branchId,
        expenseCode,
        expenseDate: expDate,
        categoryId,
        amount: Number(amount),
        paymentMode,
        paidTo: paidTo?.trim() || null,
        referenceNumber: referenceNumber?.trim() || null,
        description: description.trim(),
        notes: notes?.trim() || null,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        status: "ACTIVE",
        createdBy: session.user.name,
      },
      include: {
        category: true,
        branch: true,
      },
    });

    await logAudit({
      userId: session.user.id,
      branchId,
      action: "EXPENSE_CREATED",
      entity: "EXPENSE",
      entityId: expense.id,
      newData: {
        expenseCode: expense.expenseCode,
        amount: expense.amount,
        category: category.name,
        paymentMode: expense.paymentMode,
        date: expense.expenseDate,
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: error.message || "Failed to create expense" }, { status: 500 });
  }
}
