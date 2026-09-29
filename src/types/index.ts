export type UserRole = "SUPER_ADMIN" | "BRANCH_ADMIN" | "STAFF_CASHIER" | "ACCOUNTANT";

export type PaymentMode = "CASH" | "UPI" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "OTHER";

export type InstallmentStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";

export type PaymentStatus = "ACTIVE" | "VOID" | "REVERSED" | "REFUNDED";

export type NotificationChannel = "WHATSAPP" | "SMS";

export type NotificationStatus = "QUEUED" | "SENT" | "DELIVERED" | "FAILED";

export interface CurrentUserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string | null; // null for Super Admin viewing all
  branchCode?: string;
  branchName?: string;
}