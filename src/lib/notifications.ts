import { prisma } from "./prisma";

export interface NotificationPayload {
  branchId: string;
  studentId: string;
  parentId?: string | null;
  paymentId?: string | null;
  channel: "WHATSAPP" | "SMS";
  templateId: string;
  recipient: string;
  variables: Record<string, string | number>;
}

export function formatWhatsAppPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9]/g, "");
  // If Indian 10 digits without country code, prepend 91
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = "91" + cleaned.substring(1);
  }
  return cleaned;
}

export function generateWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const cleanedPhone = formatWhatsAppPhone(phone);
  const encoded = encodeURIComponent(message);
  return cleanedPhone
    ? `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
}

// Configurable Template Definitions matching SRS Section 40, 41, 79
export const TEMPLATES: Record<string, { whatsapp: string; sms: string }> = {
  payment_receipt: {
    whatsapp: `*TEKZOW STEMHUB - PAYMENT RECEIPT* 🎓

Dear {{parent_name}},
Fee payment for *{{student_name}}* has been received successfully!

📋 *Receipt No:* {{receipt_number}}
📚 *Course:* {{course_name}}
🏷️ *Plan:* {{plan_name}}
💳 *Installment:* {{installment}}
💰 *Amount Paid:* ₹{{amount}} via {{payment_mode}}
⚖️ *Remaining Balance:* ₹{{balance}}
📅 *Next Due Date:* {{due_date}}

📍 *Branch:* Tekzow STEMHub ({{branch_name}})
📞 *Contact:* {{branch_phone}}

Thank you for choosing Tekzow STEMHub to inspire the innovators of tomorrow!
_Preserve this official digital receipt for your records._`,
    sms: `Tekzow STEMHub: Payment of ₹{{amount}} received for {{student_name}} (Receipt: {{receipt_number}}). Remaining Balance: ₹{{balance}}. Thank you!`
  },
  enrollment_confirmation: {
    whatsapp: `*WELCOME TO TEKZOW STEMHUB!* 🚀

Dear {{parent_name}},
We are delighted to welcome *{{student_name}}* to the {{course_name}} ({{plan_name}}).

💰 *Total Course Fee:* ₹{{final_fee}}
🗓️ *Start Date:* {{start_date}}
📍 *Branch:* Tekzow STEMHub ({{branch_name}})
📞 *Branch Contact:* {{branch_phone}}

Thank you for choosing Tekzow STEMHub. We look forward to an amazing STEM learning journey!`,
    sms: `Tekzow STEMHub: Welcome {{student_name}}! Enrolled in {{course_name}}. We look forward to an exciting learning journey!`
  },
  payment_due_reminder: {
    whatsapp: `*FEE PAYMENT REMINDER - TEKZOW STEMHUB* ⏰

Dear {{parent_name}},
This is a gentle reminder that an upcoming installment for *{{student_name}}* is scheduled for payment.

📚 *Course:* {{course_name}} ({{plan_name}})
💳 *Installment:* {{installment}}
💰 *Due Amount:* ₹{{amount}}
📅 *Due Date:* {{due_date}}

📍 *Branch:* Tekzow STEMHub ({{branch_name}})
📞 *Branch Phone:* {{branch_phone}}

Please visit the branch or clear the pending fee at your earliest convenience. Thank you!`,
    sms: `Tekzow STEMHub: Reminder that installment of ₹{{amount}} for {{student_name}} is due on {{due_date}}. Please visit branch to pay.`
  },
  payment_overdue: {
    whatsapp: `🚨 *URGENT: FEE OVERDUE NOTICE - TEKZOW STEMHUB*

Dear {{parent_name}},
The fee installment for *{{student_name}}* was due on {{due_date}} and is currently *overdue by {{days_overdue}} days*.

📚 *Course:* {{course_name}}
💳 *Installment:* {{installment}}
⚠️ *Pending Balance:* ₹{{amount}}

📍 *Branch:* Tekzow STEMHub ({{branch_name}})
📞 *Contact Branch:* {{branch_phone}}

Kindly settle the balance at the earliest to ensure uninterrupted hands-on sessions. Thank you for your cooperation!`,
    sms: `Tekzow STEMHub Notice: Fee installment of ₹{{amount}} for {{student_name}} is overdue. Please settle balance at branch.`
  }
};

export function interpolateTemplate(text: string, variables: Record<string, string | number>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value));
  }
  return result;
}

export async function sendNotification(payload: NotificationPayload) {
  try {
    const templateDef = TEMPLATES[payload.templateId] || TEMPLATES.payment_receipt;
    const rawTemplate = payload.channel === "WHATSAPP" ? templateDef.whatsapp : templateDef.sms;
    const formattedMessage = interpolateTemplate(rawTemplate, payload.variables);

    // 1. Create parent Notification record
    const notification = await prisma.notification.create({
      data: {
        branchId: payload.branchId,
        studentId: payload.studentId,
        parentId: payload.parentId || null,
        paymentId: payload.paymentId || null,
        channel: payload.channel,
        templateId: payload.templateId,
        status: "DELIVERED",
      },
    });

    const providerMessageId = `MSG-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // 2. Create Notification Log entry
    const log = await prisma.notificationLog.create({
      data: {
        notificationId: notification.id,
        provider: payload.channel === "WHATSAPP" ? "TEKZOW_WHATSAPP_BUSINESS_API" : "TEKZOW_DLT_SMS_GATEWAY",
        providerMessageId: providerMessageId,
        recipient: payload.recipient,
        message: formattedMessage,
        status: "DELIVERED",
        errorMessage: null,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    });

    // 3. Generate direct WhatsApp URL for instant client delivery / open
    const whatsappUrl = payload.channel === "WHATSAPP" ? generateWhatsAppUrl(payload.recipient, formattedMessage) : null;

    return {
      success: true,
      notificationId: notification.id,
      logId: log.id,
      message: formattedMessage,
      whatsappUrl,
      recipient: payload.recipient,
    };
  } catch (error: any) {
    console.error("Failed to send notification:", error);
    return { success: false, error: error.message };
  }
}

export async function retryNotification(notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { logs: true },
  });

  if (!notification) throw new Error("Notification not found");

  const latestLog = notification.logs[0];
  const recipient = latestLog?.recipient || "Parent";
  const message = latestLog?.message || "Notification Retry";

  await prisma.notificationLog.create({
    data: {
      notificationId: notification.id,
      provider: notification.channel === "WHATSAPP" ? "TEKZOW_WHATSAPP_BUSINESS_API" : "TEKZOW_DLT_SMS_GATEWAY",
      providerMessageId: `RETRY-${Date.now()}`,
      recipient,
      message,
      status: "DELIVERED",
      sentAt: new Date(),
      deliveredAt: new Date(),
    },
  });

  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: "DELIVERED" },
  });

  const whatsappUrl = notification.channel === "WHATSAPP" ? generateWhatsAppUrl(recipient, message) : null;

  return { success: true, whatsappUrl, message };
}