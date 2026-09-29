import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get("tekzow_user_email")?.value;
  const overrideBranchId = cookieStore.get("tekzow_active_branch_id")?.value;

  if (!sessionEmail) {
    return {
      user: null,
      activeBranchId: null,
      isSuperAdmin: false,
      isAccountant: false,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: sessionEmail },
    include: { branch: true },
  });

  if (!user) {
    return {
      user: null,
      activeBranchId: null,
      isSuperAdmin: false,
      isAccountant: false,
    };
  }

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isAccountant = user.role === "ACCOUNTANT";
  
  // Strict Branch Isolation Rule:
  // If user is a branch admin or branch cashier, activeBranchId is ALWAYS locked to their assigned branch.
  // They CANNOT view or access other branches (e.g. Hosur branch cannot access Bengaluru branch).
  const activeBranchId = (isSuperAdmin || isAccountant) ? (overrideBranchId || null) : user.branchId;

  return {
    user,
    activeBranchId,
    isSuperAdmin,
    isAccountant,
  };
}