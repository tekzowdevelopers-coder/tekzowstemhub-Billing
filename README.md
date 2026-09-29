# Tekzow STEMHub Billing & Student Fee Management System (v1.1)

A multi-branch, multi-tenant ready web application designed for **Tekzow STEMHub** and its franchise branches to manage student registrations, courses, fee installments, manual fee collection, official receipts, WhatsApp & SMS alerts, and financial reports.

---

## 🌟 Key Features

* **Multi-Branch Data Isolation**: Hosur and Bengaluru branch data are strictly isolated. Branch Staff and Admins can only view and manage records within their assigned franchise branch.
* **Authentication & Role-Based Access Control**:
  * **Super Admin**: Consolidated multi-branch oversight, add branches, and exclusive authorization to permanently delete students.
  * **Branch Admin**: Full control over student enrollments and fee collection within their branch.
  * **Staff Cashier**: Record manual payments and issue instant receipts.
  * **Accountant**: Financial auditing, branch creation, and collection reporting.
* **Standardized Course Plans & Installments**:
  * **1 Month**: ₹1,800
  * **3 Months**: ₹4,999 (2 installments)
  * **6 Months**: ₹8,999 (2 installments)
  * **12 Months**: ₹13,999 (3 installments)
* **Offline Payment Collection**: Record manual payments via **Cash, UPI, Bank Transfer (NEFT/IMPS), POS Card, or Cheque** with reference IDs.
* **Official Printable Letterhead Receipts**: High-resolution branded receipts with watermark, download as PDF, print, and one-click WhatsApp dispatch.
* **Direct WhatsApp Integration**: Instant 1-click WhatsApp deep-links with formatted receipts and due date reminders pre-filled for parents.
* **Financial Ledger Immutability**: Financial transactions cannot be deleted. Includes audit trails and a void/reversal workflow that restores installment balances.
* **Due & Overdue Engine**: Track upcoming installment due dates and automated overdue notifications.
* **Executive Reports**: Daily collection, mode-wise breakdowns, outstanding balances, and CSV export.

---

## 🚀 Tech Stack

* **Framework**: Next.js 15 (App Router, Server Components & Route Handlers)
* **Language**: TypeScript
* **Styling**: Tailwind CSS
* **Database & ORM**: SQLite / PostgreSQL with Prisma ORM
* **PDF & Printing**: jsPDF, html2canvas
* **Icons**: Lucide React

---

## 🛠️ Getting Started

### 1. Install Dependencies
`ash
pnpm install
`

### 2. Setup Database & Seed Data
`ash
npx prisma db push
node scripts/seed.mjs
`

### 3. Run Development Server
`ash
pnpm dev
`
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Default Persona Logins

| Persona | Email | Password | Branch Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | dmin@tekzow.com | SuperAdminPassword123! | All Branches (Consolidated) |
| **Hosur Admin** | hosur.admin@tekzow.com | demo123 | Hosur Branch Only |
| **Bangalore Admin** | lr.admin@tekzow.com | demo123 | Bengaluru Branch Only |
| **Hosur Cashier** | cashier.hosur@tekzow.com | demo123 | Hosur Branch Only |
| **Accountant** | ccountant@tekzow.com | demo123 | Consolidated Financials |

---

## 📄 License
Proprietary software for Tekzow STEMHub. All rights reserved.
