import { prisma } from "./prisma";

interface LogAuditParams {
  userId?: string | null;
  branchId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
}

export async function logAudit(params: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        branchId: params.branchId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        oldData: params.oldData ? JSON.stringify(params.oldData) : null,
        newData: params.newData ? JSON.stringify(params.newData) : null,
        ipAddress: params.ipAddress || "127.0.0.1",
      },
    });
  } catch (error) {
    console.error("Audit log failed:", error);
    return null;
  }
}