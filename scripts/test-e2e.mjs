async function runTests() {
  console.log("=== Starting Automated Verification Tests ===");
  const baseUrl = "http://localhost:3000";

  // Test 1: Dashboard API
  console.log("\n[Test 1] Testing Dashboard API...");
  const dashRes = await fetch(`${baseUrl}/api/dashboard`);
  const dashData = await dashRes.json();
  console.log("Dashboard KPIs:", dashData.kpis);
  if (!dashData.kpis || typeof dashData.kpis.totalStudents !== "number") {
    throw new Error("Dashboard KPI test failed");
  }
  console.log("✓ Dashboard KPIs verified");

  // Test 2: Branches
  console.log("\n[Test 2] Testing Branches API...");
  const branchRes = await fetch(`${baseUrl}/api/branches`);
  const branchData = await branchRes.json();
  console.log("Branches loaded:", branchData.branches.map(b => `${b.name} (${b.code})`));
  const hosur = branchData.branches.find(b => b.code === "HOS");
  if (!hosur) throw new Error("Hosur branch not found");
  console.log("✓ Branches verified");

  // Test 3: Create Student with Auto-ID
  console.log("\n[Test 3] Creating new student in Hosur branch...");
  const timestamp = Date.now();
  const uniqueName = `Student ${timestamp}`;
  const uniqueMobile = `+91 9845${Math.floor(100000 + Math.random() * 900000)}`;
  const stuRes = await fetch(`${baseUrl}/api/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId: hosur.id,
      name: uniqueName,
      gender: "Male",
      schoolName: "Delhi Public School Hosur",
      grade: "Grade 7",
      fatherName: "Mr. Rajeev Verma",
      mobile: uniqueMobile,
      whatsappNumber: uniqueMobile,
      email: `parent_${timestamp}@example.com`,
    }),
  });
  const stuData = await stuRes.json();
  if (!stuData.student) {
    console.error("Student creation failed:", stuData);
    throw new Error("Failed to create student");
  }
  console.log("Created Student:", stuData.student.name, "ID:", stuData.student.studentCode);
  if (!stuData.student.studentCode.startsWith("TSH-HOS-2026-")) {
    throw new Error("Student ID format mismatch");
  }
  console.log("✓ Student created with auto-sequence ID");

  // Test 4: Duplicate Detection (SRS Section 95)
  console.log("\n[Test 4] Testing duplicate detection with identical mobile...");
  const dupRes = await fetch(`${baseUrl}/api/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branchId: hosur.id,
      name: "Different Name",
      mobile: uniqueMobile, // Same mobile
      whatsappNumber: uniqueMobile,
      fatherName: "Mr. Rajeev Verma",
    }),
  });
  const dupData = await dupRes.json();
  if (dupRes.status === 409 && dupData.duplicateDetected) {
    console.log("✓ Duplicate detected successfully:", dupData.message);
  } else {
    throw new Error("Duplicate detection failed");
  }

  // Test 5: Enroll Student with Dynamic Installments & First Payment
  console.log("\n[Test 5] Enrolling student with custom discount & first payment...");
  const coursesRes = await fetch(`${baseUrl}/api/courses`);
  const coursesData = await coursesRes.json();
  const roboticsCourse = coursesData.courses.find(c => c.plans && c.plans.length > 0);
  const roboticsPlan = roboticsCourse.plans[0];

  const enrollRes = await fetch(`${baseUrl}/api/enrollments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentId: stuData.student.id,
      courseId: roboticsCourse.id,
      planId: roboticsPlan.id,
      startDate: new Date().toISOString(),
      planFee: roboticsPlan.totalFee,
      discount: 2000,
      finalFee: roboticsPlan.totalFee - 2000,
      installments: [
        { installmentNumber: 1, amount: 6000, dueDate: new Date().toISOString() },
        { installmentNumber: 2, amount: 6000, dueDate: new Date(Date.now() + 60*24*60*60*1000).toISOString() },
      ],
      firstPayment: {
        amount: 6000,
        paymentMode: "UPI",
        transactionReference: "UPI-TEST-12345",
      },
    }),
  });
  const enrollData = await enrollRes.json();
  console.log("Enrollment created. Receipt #:", enrollData.receipt?.receiptNumber);
  if (!enrollData.receipt || !enrollData.receipt.receiptNumber.startsWith("TSH-HOS-2026-")) {
    throw new Error("Receipt generation during enrollment failed");
  }
  console.log("✓ Dynamic installments and first payment receipt generated");

  // Test 6: Manual Payment Collection for Installment 2 (SRS Section 28)
  console.log("\n[Test 6] Recording second payment manually...");
  const inst2 = enrollData.installments[1];
  const payRes = await fetch(`${baseUrl}/api/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      installmentId: inst2.id,
      amount: 6000,
      paymentMode: "UPI",
      transactionReference: "UPI-TEST-998877",
      notes: "Second installment paid via PhonePe",
    }),
  });
  const payData = await payRes.json();
  console.log("Payment recorded. Receipt #:", payData.receipt.receiptNumber, "Status:", payData.installment.status);
  if (payData.installment.balanceAmount !== 0 || payData.installment.status !== "PAID") {
    throw new Error("Installment status after full payment is incorrect");
  }
  console.log("✓ Second payment recorded, balance is ₹0, status is PAID");

  // Test 7: Financial Immutability - Void Payment (SRS Section 35)
  console.log("\n[Test 7] Testing financial void / reversal...");
  const voidRes = await fetch(`${baseUrl}/api/payments/${payData.payment.id}/void`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "Accidental duplicate entry test" }),
  });
  const voidData = await voidRes.json();
  console.log("Payment voided. Restored Balance:", voidData.installment.balanceAmount, "Status:", voidData.installment.status);
  if (voidData.installment.balanceAmount !== 6000 || voidData.installment.status !== "PENDING") {
    throw new Error("Void reversal calculation failed");
  }
  console.log("✓ Void successfully restored installment balance and status");

  // Test 8: Notification logs
  console.log("\n[Test 8] Checking notification logs...");
  const notifRes = await fetch(`${baseUrl}/api/notifications`);
  const notifData = await notifRes.json();
  console.log("Dispatched notifications count:", notifData.notifications.length);
  if (notifData.notifications.length === 0) throw new Error("No notifications logged");
  console.log("✓ Notification logs recorded with templates and channels");

  console.log("\n==========================================");
  console.log("🎉 ALL AUTOMATED VERIFICATION TESTS PASSED!");
  console.log("==========================================");
}

runTests().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});