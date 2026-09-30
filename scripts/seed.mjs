import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Tekzow STEMHub Database...");

  // 1. Clean existing records
  await prisma.notificationLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.planInstallment.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.course.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.setting.deleteMany();

  // 2. Create Branches
  const hosurBranch = await prisma.branch.create({
    data: {
      name: "Hosur Branch",
      code: "HOS",
      address: "Plot 42, Sipcot Industrial Complex Phase 1, Hosur, Tamil Nadu 635126",
      phone: "+91 83628 50853",
      email: "hosur@tekzowstemhub.com",
      status: "ACTIVE",
    },
  });

  const blrBranch = await prisma.branch.create({
    data: {
      name: "Bangalore Branch",
      code: "BLR",
      address: "21, 2nd Main Rd, near GoodWorks Infinity Park, Electronic City Phase I, Konappana Agrahara, Karnataka 560100",
      phone: "+91 83628 50854",
      email: "bangalore@tekzowstemhub.com",
      status: "ACTIVE",
    },
  });

  console.log("Branches created:", hosurBranch.name, blrBranch.name);

  // 3. Create Users
  await prisma.user.createMany({
    data: [
      {
        name: "Central Admin",
        email: "admin@tekzow.com",
        phone: "+91 83628 50853",
        passwordHash: "demo123",
        role: "SUPER_ADMIN",
        branchId: null,
      },
      {
        name: "Hosur Branch Admin",
        email: "hosur.admin@tekzow.com",
        phone: "+91 98450 11223",
        passwordHash: "demo123",
        role: "BRANCH_ADMIN",
        branchId: hosurBranch.id,
      },
      {
        name: "Bangalore Branch Admin",
        email: "blr.admin@tekzow.com",
        phone: "+91 98450 44556",
        passwordHash: "demo123",
        role: "BRANCH_ADMIN",
        branchId: blrBranch.id,
      },
      {
        name: "Hosur Cashier",
        email: "cashier.hosur@tekzow.com",
        phone: "+91 98450 77889",
        passwordHash: "demo123",
        role: "STAFF_CASHIER",
        branchId: hosurBranch.id,
      },
      {
        name: "Financial Accountant",
        email: "accountant@tekzow.com",
        phone: "+91 98450 99000",
        passwordHash: "demo123",
        role: "ACCOUNTANT",
        branchId: null,
      },
    ],
  });

  console.log("Users created");

  // 4. Create Courses
  const roboticsCourse = await prisma.course.create({
    data: {
      name: "Robotics & AI",
      description: "Hands-on robotics, sensors, Arduino, Raspberry Pi, and computer vision algorithms.",
      duration: "6 Months",
      status: "ACTIVE",
    },
  });

  const codingCourse = await prisma.course.create({
    data: {
      name: "Coding & Game Development",
      description: "Python, JavaScript, Pygame, 2D/3D Game physics, logic building and algorithms.",
      duration: "6 Months",
      status: "ACTIVE",
    },
  });

  const stemCourse = await prisma.course.create({
    data: {
      name: "STEM Explorers",
      description: "Foundational STEM principles, mechanics, aerodynamics, and structural design for young minds.",
      duration: "3 Months",
      status: "ACTIVE",
    },
  });

  const droneCourse = await prisma.course.create({
    data: {
      name: "Drone Technology",
      description: "Flight dynamics, drone assembly, autonomous navigation, and aerial robotics.",
      duration: "12 Months",
      status: "ACTIVE",
    },
  });

  // 5. Create Standard Plans with Dynamic Installment Breakdown for All Courses
  const STANDARD_COURSE_PLANS = [
    {
      name: "1 Month",
      durationMonths: 1,
      totalFee: 1800,
      installments: [
        { installmentNumber: 1, percentage: 100, defaultAmount: 1800, dueOffsetMonths: 0 },
      ],
    },
    {
      name: "3 Months",
      durationMonths: 3,
      totalFee: 4999,
      installments: [
        { installmentNumber: 1, percentage: 50.01, defaultAmount: 2500, dueOffsetMonths: 0 },
        { installmentNumber: 2, percentage: 49.99, defaultAmount: 2499, dueOffsetMonths: 1 },
      ],
    },
    {
      name: "6 Months",
      durationMonths: 6,
      totalFee: 8999,
      installments: [
        { installmentNumber: 1, percentage: 50.01, defaultAmount: 4500, dueOffsetMonths: 0 },
        { installmentNumber: 2, percentage: 49.99, defaultAmount: 4499, dueOffsetMonths: 2 },
      ],
    },
    {
      name: "12 Months",
      durationMonths: 12,
      totalFee: 13999,
      installments: [
        { installmentNumber: 1, percentage: 35.72, defaultAmount: 5000, dueOffsetMonths: 0 },
        { installmentNumber: 2, percentage: 32.14, defaultAmount: 4500, dueOffsetMonths: 3 },
        { installmentNumber: 3, percentage: 32.14, defaultAmount: 4499, dueOffsetMonths: 6 },
      ],
    },
  ];

  async function createStandardPlansForCourse(cId) {
    const created = [];
    for (const p of STANDARD_COURSE_PLANS) {
      const plan = await prisma.plan.create({
        data: {
          courseId: cId,
          name: p.name,
          durationMonths: p.durationMonths,
          totalFee: p.totalFee,
          status: "ACTIVE",
          installments: {
            create: p.installments,
          },
        },
      });
      created.push(plan);
    }
    return created;
  }

  const roboticsPlans = await createStandardPlansForCourse(roboticsCourse.id);
  const codingPlans = await createStandardPlansForCourse(codingCourse.id);
  const stemPlans = await createStandardPlansForCourse(stemCourse.id);
  const dronePlans = await createStandardPlansForCourse(droneCourse.id);

  const robotics6MoPlan = roboticsPlans.find((p) => p.durationMonths === 6);
  const robotics12MoPlan = roboticsPlans.find((p) => p.durationMonths === 12);
  const coding3MoPlan = codingPlans.find((p) => p.durationMonths === 3);
  const coding6MoPlan = codingPlans.find((p) => p.durationMonths === 6);

  console.log("Courses and Standard Plans created for all 4 tracks");

  // Helper date function
  const now = new Date();
  const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const daysAhead = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // 6. Seed Students, Parents, Enrollments, Installments, Payments & Receipts
  // Student 1: Rahul Kumar (Hosur) - PAID Installment 1, Upcoming Installment 2
  const rahul = await prisma.student.create({
    data: {
      branchId: hosurBranch.id,
      studentCode: "TSH-HOS-2026-0001",
      name: "Rahul Kumar",
      gender: "Male",
      schoolName: "Greenwood High School",
      grade: "Grade 7",
      academicYear: "2026-2027",
      city: "Hosur",
      state: "Tamil Nadu",
      pincode: "635109",
      status: "ACTIVE",
      parent: {
        create: {
          fatherName: "Mr. Suresh Kumar",
          motherName: "Mrs. Meena Kumar",
          relationship: "Father",
          mobile: "+91 98451 22334",
          whatsappNumber: "+91 98451 22334",
          email: "suresh.kumar@gmail.com",
          address: "42, Shanthi Nagar, Hosur",
        },
      },
    },
    include: { parent: true },
  });

  const rahulEnrollment = await prisma.enrollment.create({
    data: {
      branchId: hosurBranch.id,
      studentId: rahul.id,
      courseId: roboticsCourse.id,
      planId: robotics6MoPlan.id,
      startDate: daysAgo(30),
      planFee: 8999,
      discount: 999,
      finalFee: 8000, // Custom discounted fee
      status: "ACTIVE",
    },
  });

  // Installment 1: ₹4,000 - Fully Paid
  const rahulInst1 = await prisma.installment.create({
    data: {
      enrollmentId: rahulEnrollment.id,
      installmentNumber: 1,
      amount: 4000,
      dueDate: daysAgo(30),
      paidAmount: 4000,
      balanceAmount: 0,
      status: "PAID",
    },
  });

  // Installment 2: ₹4,000 - Due in 30 days
  const rahulInst2 = await prisma.installment.create({
    data: {
      enrollmentId: rahulEnrollment.id,
      installmentNumber: 2,
      amount: 4000,
      dueDate: daysAhead(30),
      paidAmount: 0,
      balanceAmount: 4000,
      status: "PENDING",
    },
  });

  // Record payment for Installment 1
  const rahulPayment = await prisma.payment.create({
    data: {
      branchId: hosurBranch.id,
      studentId: rahul.id,
      enrollmentId: rahulEnrollment.id,
      installmentId: rahulInst1.id,
      amount: 4000,
      paymentMode: "UPI",
      transactionReference: "UPI98451223341",
      paymentDate: daysAgo(30),
      notes: "First installment received via GPay",
      status: "ACTIVE",
      createdBy: "Hosur Cashier",
    },
  });

  const rahulReceipt = await prisma.receipt.create({
    data: {
      branchId: hosurBranch.id,
      paymentId: rahulPayment.id,
      receiptNumber: "TSH-HOS-2026-000182",
      whatsappStatus: "DELIVERED",
      smsStatus: "DELIVERED",
    },
  });

  // Student 2: Priya Sharma (Hosur) - PARTIAL payment on Inst 1
  const priya = await prisma.student.create({
    data: {
      branchId: hosurBranch.id,
      studentCode: "TSH-HOS-2026-0002",
      name: "Priya Sharma",
      gender: "Female",
      schoolName: "Delhi Public School",
      grade: "Grade 6",
      academicYear: "2026-2027",
      city: "Hosur",
      state: "Tamil Nadu",
      pincode: "635109",
      status: "ACTIVE",
      parent: {
        create: {
          fatherName: "Mr. Rajesh Sharma",
          motherName: "Mrs. Anjali Sharma",
          relationship: "Father",
          mobile: "+91 97412 88990",
          whatsappNumber: "+91 97412 88990",
          email: "rajesh.sharma@yahoo.com",
          address: "15, Anna Nagar, Hosur",
        },
      },
    },
    include: { parent: true },
  });

  const priyaEnrollment = await prisma.enrollment.create({
    data: {
      branchId: hosurBranch.id,
      studentId: priya.id,
      courseId: codingCourse.id,
      planId: coding3MoPlan.id,
      startDate: daysAgo(10),
      planFee: 4999,
      discount: 0,
      finalFee: 4999,
      status: "ACTIVE",
    },
  });

  const priyaInst1 = await prisma.installment.create({
    data: {
      enrollmentId: priyaEnrollment.id,
      installmentNumber: 1,
      amount: 2500,
      dueDate: daysAgo(10),
      paidAmount: 1500,
      balanceAmount: 1000,
      status: "PARTIAL",
    },
  });

  const priyaPayment1 = await prisma.payment.create({
    data: {
      branchId: hosurBranch.id,
      studentId: priya.id,
      enrollmentId: priyaEnrollment.id,
      installmentId: priyaInst1.id,
      amount: 1500,
      paymentMode: "CASH",
      transactionReference: "CASH-REC-001",
      paymentDate: daysAgo(10),
      notes: "Partial payment paid in cash at reception",
      status: "ACTIVE",
      createdBy: "Hosur Cashier",
    },
  });

  await prisma.receipt.create({
    data: {
      branchId: hosurBranch.id,
      paymentId: priyaPayment1.id,
      receiptNumber: "TSH-HOS-2026-000183",
      whatsappStatus: "DELIVERED",
      smsStatus: "DELIVERED",
    },
  });

  // Student 3: Arun Venkatesh (Hosur) - OVERDUE Installment
  const arun = await prisma.student.create({
    data: {
      branchId: hosurBranch.id,
      studentCode: "TSH-HOS-2026-0003",
      name: "Arun Venkatesh",
      gender: "Male",
      schoolName: "St. Joseph's Boys High School",
      grade: "Grade 8",
      academicYear: "2026-2027",
      city: "Hosur",
      state: "Tamil Nadu",
      pincode: "635109",
      status: "ACTIVE",
      parent: {
        create: {
          fatherName: "Mr. K. Venkatesh",
          motherName: "Mrs. Lakshmi Venkatesh",
          relationship: "Father",
          mobile: "+91 99001 55667",
          whatsappNumber: "+91 99001 55667",
          email: "kvenkatesh@gmail.com",
          address: "88, Rayakotta Road, Hosur",
        },
      },
    },
    include: { parent: true },
  });

  const arunEnrollment = await prisma.enrollment.create({
    data: {
      branchId: hosurBranch.id,
      studentId: arun.id,
      courseId: roboticsCourse.id,
      planId: robotics6MoPlan.id,
      startDate: daysAgo(75),
      planFee: 8999,
      discount: 0,
      finalFee: 8999,
      status: "ACTIVE",
    },
  });

  const arunInst1 = await prisma.installment.create({
    data: {
      enrollmentId: arunEnrollment.id,
      installmentNumber: 1,
      amount: 4500,
      dueDate: daysAgo(75),
      paidAmount: 4500,
      balanceAmount: 0,
      status: "PAID",
    },
  });

  // Inst 2 was due 15 days ago -> OVERDUE
  const arunInst2 = await prisma.installment.create({
    data: {
      enrollmentId: arunEnrollment.id,
      installmentNumber: 2,
      amount: 4499,
      dueDate: daysAgo(15),
      paidAmount: 0,
      balanceAmount: 4499,
      status: "OVERDUE",
    },
  });

  const arunPayment1 = await prisma.payment.create({
    data: {
      branchId: hosurBranch.id,
      studentId: arun.id,
      enrollmentId: arunEnrollment.id,
      installmentId: arunInst1.id,
      amount: 4500,
      paymentMode: "BANK_TRANSFER",
      transactionReference: "NEFT99238472",
      paymentDate: daysAgo(75),
      notes: "Bank transfer via ICICI Bank",
      status: "ACTIVE",
      createdBy: "Hosur Cashier",
    },
  });

  await prisma.receipt.create({
    data: {
      branchId: hosurBranch.id,
      paymentId: arunPayment1.id,
      receiptNumber: "TSH-HOS-2026-000184",
      whatsappStatus: "DELIVERED",
      smsStatus: "DELIVERED",
    },
  });

  // Student 4: Ananya Rao (Bangalore Branch) - Bangalore data
  const ananya = await prisma.student.create({
    data: {
      branchId: blrBranch.id,
      studentCode: "TSH-BLR-2026-0001",
      name: "Ananya Rao",
      gender: "Female",
      schoolName: "TVS Academy Electronic City",
      grade: "Grade 5",
      academicYear: "2026-2027",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560100",
      status: "ACTIVE",
      parent: {
        create: {
          fatherName: "Mr. Ramesh Rao",
          motherName: "Mrs. Shobha Rao",
          relationship: "Father",
          mobile: "+91 98800 12345",
          whatsappNumber: "+91 98800 12345",
          email: "ramesh.rao@techcorp.com",
          address: "502, Prestige Sunrise Park, Electronic City, Bangalore",
        },
      },
    },
    include: { parent: true },
  });

  const ananyaEnrollment = await prisma.enrollment.create({
    data: {
      branchId: blrBranch.id,
      studentId: ananya.id,
      courseId: codingCourse.id,
      planId: coding6MoPlan.id,
      startDate: daysAgo(15),
      planFee: 8999,
      discount: 0,
      finalFee: 8999,
      status: "ACTIVE",
    },
  });

  const ananyaInst1 = await prisma.installment.create({
    data: {
      enrollmentId: ananyaEnrollment.id,
      installmentNumber: 1,
      amount: 4500,
      dueDate: daysAgo(15),
      paidAmount: 4500,
      balanceAmount: 0,
      status: "PAID",
    },
  });

  const ananyaInst2 = await prisma.installment.create({
    data: {
      enrollmentId: ananyaEnrollment.id,
      installmentNumber: 2,
      amount: 4499,
      dueDate: daysAhead(45),
      paidAmount: 0,
      balanceAmount: 4499,
      status: "PENDING",
    },
  });

  const ananyaPayment = await prisma.payment.create({
    data: {
      branchId: blrBranch.id,
      studentId: ananya.id,
      enrollmentId: ananyaEnrollment.id,
      installmentId: ananyaInst1.id,
      amount: 4500,
      paymentMode: "UPI",
      transactionReference: "UPI98800123450",
      paymentDate: daysAgo(15),
      notes: "PhonePe payment",
      status: "ACTIVE",
      createdBy: "Bangalore Branch Admin",
    },
  });

  await prisma.receipt.create({
    data: {
      branchId: blrBranch.id,
      paymentId: ananyaPayment.id,
      receiptNumber: "TSH-BLR-2026-000001",
      whatsappStatus: "DELIVERED",
      smsStatus: "DELIVERED",
    },
  });

  // Student 5: Karthik Subramanian (Bangalore Branch) - Due This Week
  const karthik = await prisma.student.create({
    data: {
      branchId: blrBranch.id,
      studentCode: "TSH-BLR-2026-0002",
      name: "Karthik Subramanian",
      gender: "Male",
      schoolName: "Ebenezer International School",
      grade: "Grade 9",
      academicYear: "2026-2027",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560100",
      status: "ACTIVE",
      parent: {
        create: {
          fatherName: "Mr. T. Subramanian",
          motherName: "Mrs. Deepa Subramanian",
          relationship: "Father",
          mobile: "+91 99400 33445",
          whatsappNumber: "+91 99400 33445",
          email: "subramanian.t@gmail.com",
          address: "Tower 3, GM Infinite, Electronic City, Bangalore",
        },
      },
    },
    include: { parent: true },
  });

  const karthikEnrollment = await prisma.enrollment.create({
    data: {
      branchId: blrBranch.id,
      studentId: karthik.id,
      courseId: roboticsCourse.id,
      planId: robotics12MoPlan.id,
      startDate: daysAgo(90),
      planFee: 13999,
      discount: 0,
      finalFee: 13999,
      status: "ACTIVE",
    },
  });

  await prisma.installment.create({
    data: {
      enrollmentId: karthikEnrollment.id,
      installmentNumber: 1,
      amount: 5000,
      dueDate: daysAgo(90),
      paidAmount: 5000,
      balanceAmount: 0,
      status: "PAID",
    },
  });

  // Inst 2 is due in 3 days -> Due Soon / This Week
  await prisma.installment.create({
    data: {
      enrollmentId: karthikEnrollment.id,
      installmentNumber: 2,
      amount: 4500,
      dueDate: daysAhead(3),
      paidAmount: 0,
      balanceAmount: 4500,
      status: "PENDING",
    },
  });

  await prisma.installment.create({
    data: {
      enrollmentId: karthikEnrollment.id,
      installmentNumber: 3,
      amount: 4499,
      dueDate: daysAhead(93),
      paidAmount: 0,
      balanceAmount: 4499,
      status: "PENDING",
    },
  });

  // Seed default settings
  await prisma.setting.createMany({
    data: [
      { key: "company_name", value: "Tekzow STEMHub" },
      { key: "company_phone", value: "+91 83628 50853" },
      { key: "company_email", value: "joinus@tekzowstemhub.com" },
      { key: "company_website", value: "Tekzowstemhub.com" },
      { key: "company_address", value: "21, 2nd Main Rd, near GoodWorks Infinity Park, Electronic City Phase I, Konappana Agrahara, Karnataka 560100" },
      { key: "whatsapp_enabled", value: "true" },
      { key: "sms_enabled", value: "true" },
      { key: "reminder_offsets", value: "-7,-3,0,3,7" },
    ],
  });

  // Create initial audit log
  await prisma.auditLog.create({
    data: {
      action: "SYSTEM_INITIALIZATION",
      entity: "SYSTEM",
      entityId: "ROOT",
      newData: JSON.stringify({ message: "Tekzow STEMHub Billing System v1.1 initialized successfully" }),
      ipAddress: "127.0.0.1",
    },
  });

  console.log("Database seeded successfully with multi-branch students, enrollments, and payments!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });