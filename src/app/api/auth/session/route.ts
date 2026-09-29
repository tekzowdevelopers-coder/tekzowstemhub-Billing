import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get("tekzow_user_email")?.value || "admin@tekzow.com";
  const overrideBranchId = cookieStore.get("tekzow_active_branch_id")?.value;

  const users = await prisma.user.findMany({
    include: { branch: true },
    orderBy: { role: "asc" },
  });

  const currentUser = users.find((u) => u.email === sessionEmail) || users[0];
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const activeBranchId = isSuperAdmin ? (overrideBranchId || null) : currentUser?.branchId;

  const branches = await prisma.branch.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    currentUser,
    activeBranchId,
    isSuperAdmin,
    availableUsers: users,
    branches,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cookieStore = await cookies();

  if (body.email) {
    cookieStore.set("tekzow_user_email", body.email, { path: "/" });
  }

  if (body.activeBranchId !== undefined) {
    if (body.activeBranchId === null || body.activeBranchId === "ALL") {
      cookieStore.delete("tekzow_active_branch_id");
    } else {
      cookieStore.set("tekzow_active_branch_id", body.activeBranchId, { path: "/" });
    }
  }

  return NextResponse.json({ success: true });
}