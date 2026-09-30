import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Rent', description: 'Branch space leasing and property rent' },
  { name: 'Electricity', description: 'Monthly electricity and power utility bills' },
  { name: 'Water', description: 'Water utility and supply expenses' },
  { name: 'Internet', description: 'High-speed broadband and Wi-Fi services' },
  { name: 'Telephone', description: 'Landline, mobile recharges, and communication' },
  { name: 'Stationery', description: 'Notebooks, pens, markers, and classroom material' },
  { name: 'Robotics Materials', description: 'Sensors, microcontrollers, kits, and wiring' },
  { name: 'Robot Repair', description: 'Spares, soldering, component replacement' },
  { name: 'Equipment', description: 'Laptops, projectors, tools, 3D printer parts' },
  { name: 'Maintenance', description: 'Cleaning, sanitization, AC service, electrical repairs' },
  { name: 'Transportation', description: 'Local conveyance, material delivery, fuel' },
  { name: 'Marketing', description: 'Pamphlets, digital ads, social media, signage' },
  { name: 'Printing', description: 'Worksheets, certificates, brochures, banners' },
  { name: 'Office Supplies', description: 'Consumables, paper, organizers, first-aid' },
  { name: 'Staff Expense', description: 'Trainer allowances, meeting expenses, petty cash' },
  { name: 'Workshop Expense', description: 'Materials and logistics for weekend workshops' },
  { name: 'Event Expense', description: 'STEM exhibitions, competitions, annual events' },
  { name: 'Training Expense', description: 'Instructor upskilling, certifications' },
  { name: 'Food & Refreshments', description: 'Tea, snacks, student water & refreshments' },
  { name: 'Other', description: 'Miscellaneous operational expenses' }
];

async function main() {
  console.log('Seeding Expense Categories...');
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { name: cat.name }
    });
    if (!existing) {
      await prisma.expenseCategory.create({
        data: {
          name: cat.name,
          description: cat.description,
          isGlobal: true,
          status: 'ACTIVE'
        }
      });
    }
  }
  console.log('Default categories initialized.');

  // Check branches
  const hosur = await prisma.branch.findUnique({ where: { code: 'HOS' } });
  const blr = await prisma.branch.findUnique({ where: { code: 'BLR' } });

  const electricityCat = await prisma.expenseCategory.findFirst({ where: { name: 'Electricity' } });
  const stationeryCat = await prisma.expenseCategory.findFirst({ where: { name: 'Stationery' } });
  const maintenanceCat = await prisma.expenseCategory.findFirst({ where: { name: 'Maintenance' } });

  if (hosur && electricityCat) {
    const exp1 = await prisma.expense.findFirst({ where: { expenseCode: 'EXP-HOS-2026-000001' } });
    if (!exp1) {
      await prisma.expense.create({
        data: {
          branchId: hosur.id,
          expenseCode: 'EXP-HOS-2026-000001',
          expenseDate: new Date('2026-09-30T10:30:00Z'),
          categoryId: electricityCat.id,
          amount: 4500,
          paymentMode: 'UPI',
          paidTo: 'Electricity Board',
          referenceNumber: 'UPI123456789',
          description: 'September electricity bill',
          notes: 'Paid on time to avoid late fees',
          status: 'ACTIVE',
          createdBy: 'Hosur Admin'
        }
      });
      console.log('Sample Hosur Expense 1 created');
    }
  }

  if (hosur && stationeryCat) {
    const exp2 = await prisma.expense.findFirst({ where: { expenseCode: 'EXP-HOS-2026-000002' } });
    if (!exp2) {
      await prisma.expense.create({
        data: {
          branchId: hosur.id,
          expenseCode: 'EXP-HOS-2026-000002',
          expenseDate: new Date('2026-09-29T14:15:00Z'),
          categoryId: stationeryCat.id,
          amount: 2300,
          paymentMode: 'CASH',
          paidTo: 'Venkateshwara Book House',
          referenceNumber: 'CASH-REC-884',
          description: 'Student STEM notebooks and graph pads',
          status: 'ACTIVE',
          createdBy: 'Hosur Cashier'
        }
      });
      console.log('Sample Hosur Expense 2 created');
    }
  }

  if (blr && maintenanceCat) {
    const exp3 = await prisma.expense.findFirst({ where: { expenseCode: 'EXP-BLR-2026-000001' } });
    if (!exp3) {
      await prisma.expense.create({
        data: {
          branchId: blr.id,
          expenseCode: 'EXP-BLR-2026-000001',
          expenseDate: new Date('2026-09-27T11:00:00Z'),
          categoryId: maintenanceCat.id,
          amount: 1500,
          paymentMode: 'CASH',
          paidTo: 'Precision Tool Service',
          referenceNumber: 'CASH-REC-102',
          description: 'Robot repair and servo motor maintenance',
          status: 'ACTIVE',
          createdBy: 'Bangalore Admin'
        }
      });
      console.log('Sample Bangalore Expense 1 created');
    }
  }

  console.log('Expense seeding completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
