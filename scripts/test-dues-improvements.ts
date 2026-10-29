import { getDetailedDuesStatus } from "../lib/dues";
import type { DuesRecord } from "../lib/mock-data";

function runTests() {
  console.log("=================================================");
  console.log("   MABUHAY HOMES — DUES UI & STATUS VERIFICATION ");
  console.log("=================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    }
  }

  const fixedRefDate = new Date("2026-10-28T09:00:00");

  // 1. Fully paid on time
  console.log("--- 1. Testing Fully Paid On Time ---");
  const onTimeRecord: DuesRecord = {
    id: 1,
    residentName: "Juan Dela Cruz",
    blockNo: "B",
    lotNo: "12",
    dueMonth: "2026-09",
    dueDate: "2026-09-30",
    amountDue: 100,
    amountPaid: 100,
    paidAt: "2026-09-28",
    creditBalance: 0,
    status: "on_time",
  };
  const onTimeStatus = getDetailedDuesStatus(onTimeRecord, { referenceNow: fixedRefDate });
  assert(onTimeStatus.paymentStatus === "paid_on_time", "Payment status is 'paid_on_time'");
  assert(onTimeStatus.paymentStatusLabel === "Paid On Time", "Payment status label is 'Paid On Time'");
  assert(onTimeStatus.balanceStatus === "fully_settled", "Balance status is 'fully_settled'");
  assert(onTimeStatus.remainingBalance === 0, "Remaining balance is 0");
  assert(onTimeStatus.daysLate === 0, "Days late is 0");

  // 2. Fully paid late (User's specific case: Sep 30 due, paid Oct 7)
  console.log("\n--- 2. Testing Fully Paid Late (User Scenario: Paid Oct 07 for Sep 30 Due) ---");
  const lateRecord: DuesRecord = {
    id: 2,
    residentName: "Kumi Carry",
    blockNo: "A",
    lotNo: "5",
    dueMonth: "2026-09",
    dueDate: "2026-09-30",
    amountDue: 100,
    amountPaid: 100,
    paidAt: "2026-10-07",
    creditBalance: 0,
    status: "delayed",
  };
  const lateStatus = getDetailedDuesStatus(lateRecord, { referenceNow: fixedRefDate });
  assert(lateStatus.paymentStatus === "paid_late", "Payment status is 'paid_late'");
  assert(lateStatus.paymentStatusLabel === "Paid Late (7 days late)", `Payment status label indicates 7 days late: "${lateStatus.paymentStatusLabel}"`);
  assert(lateStatus.balanceStatus === "fully_settled", "Balance status is 'fully_settled'");
  assert(lateStatus.balanceStatusLabel === "Fully Settled", "Balance status label is 'Fully Settled'");
  assert(lateStatus.remainingBalance === 0, "Remaining balance is ₱0.00");
  assert(lateStatus.daysLate === 7, "Calculated exactly 7 days late");

  // 3. Partially paid bill
  console.log("\n--- 3. Testing Partially Paid Bill ---");
  const partialRecord: DuesRecord = {
    id: 3,
    residentName: "Maria Santos",
    blockNo: "C",
    lotNo: "8",
    dueMonth: "2026-09",
    dueDate: "2026-09-30",
    amountDue: 100,
    amountPaid: 40,
    paidAt: "2026-09-25",
    creditBalance: 0,
    status: "delayed",
  };
  const partialStatus = getDetailedDuesStatus(partialRecord, { referenceNow: fixedRefDate });
  assert(partialStatus.paymentStatus === "partial", "Payment status is 'partial'");
  assert(partialStatus.paymentStatusLabel === "Partial Payment", "Payment status label is 'Partial Payment'");
  assert(partialStatus.balanceStatus === "partially_paid", "Balance status is 'partially_paid'");
  assert(partialStatus.remainingBalance === 60, "Remaining balance is ₱60.00");

  // 4. Unpaid & Overdue bill
  console.log("\n--- 4. Testing Unpaid & Overdue Bill ---");
  const overdueRecord: DuesRecord = {
    id: 4,
    residentName: "Pedro Penduko",
    blockNo: "D",
    lotNo: "1",
    dueMonth: "2026-09",
    dueDate: "2026-09-30",
    amountDue: 100,
    amountPaid: 0,
    creditBalance: 0,
    status: "unpaid",
  };
  const overdueStatus = getDetailedDuesStatus(overdueRecord, { referenceNow: fixedRefDate });
  assert(overdueStatus.paymentStatus === "unpaid", "Payment status is 'unpaid'");
  assert(overdueStatus.isOverdue === true, "isOverdue is true");
  assert(overdueStatus.daysOverdue === 28, `Calculated 28 days overdue as of Oct 28: ${overdueStatus.daysOverdue}`);
  assert(overdueStatus.remainingBalance === 100, "Remaining balance is ₱100.00");

  // 5. Unpaid & Upcoming bill
  console.log("\n--- 5. Testing Unpaid Upcoming Bill ---");
  const upcomingRecord: DuesRecord = {
    id: 5,
    residentName: "Pedro Penduko",
    blockNo: "D",
    lotNo: "1",
    dueMonth: "2026-11",
    dueDate: "2026-11-30",
    amountDue: 100,
    amountPaid: 0,
    creditBalance: 0,
    status: "unpaid",
  };
  const upcomingStatus = getDetailedDuesStatus(upcomingRecord, { referenceNow: fixedRefDate });
  assert(upcomingStatus.paymentStatus === "unpaid", "Payment status is 'unpaid'");
  assert(upcomingStatus.isOverdue === false, "isOverdue is false for future date");
  assert(upcomingStatus.daysUntilDue > 0, `Days until due is positive: ${upcomingStatus.daysUntilDue}`);

  // 6. Pending verification
  console.log("\n--- 6. Testing Pending Verification Status ---");
  const pendingStatus = getDetailedDuesStatus(overdueRecord, {
    hasPendingTxn: true,
    referenceNow: fixedRefDate,
  });
  assert(pendingStatus.paymentStatus === "pending_verification", "Payment status is 'pending_verification' when transaction is pending");
  assert(pendingStatus.paymentStatusLabel === "Pending Verification", "Label is 'Pending Verification'");

  // 7. Advance credit
  console.log("\n--- 7. Testing Overpayment & Carried Credit ---");
  const creditRecord: DuesRecord = {
    id: 7,
    residentName: "Ana Ramos",
    blockNo: "E",
    lotNo: "2",
    dueMonth: "2026-09",
    dueDate: "2026-09-30",
    amountDue: 100,
    amountPaid: 250,
    paidAt: "2026-09-15",
    creditBalance: 150,
    status: "on_time",
  };
  const creditStatus = getDetailedDuesStatus(creditRecord, { referenceNow: fixedRefDate });
  assert(creditStatus.credit === 150, "Credit amount is ₱150.00");
  assert(creditStatus.remainingBalance === 0, "Remaining balance is ₱0.00");
  assert(creditStatus.balanceStatus === "advance_credit", "Balance status is 'advance_credit'");
  assert(creditStatus.balanceStatusLabel.includes("₱150.00"), "Balance status label reflects ₱150.00 credit");

  // 8. Summary Cards calculations
  console.log("\n--- 8. Testing Summary Cards Aggregations ---");
  const sampleRecords = [onTimeRecord, lateRecord, partialRecord, overdueRecord, creditRecord];
  const totalPaidSum = sampleRecords.reduce((s, r) => s + r.amountPaid, 0);
  const totalOutstandingSum = sampleRecords.reduce((s, r) => s + Math.max(0, r.amountDue - r.amountPaid), 0);
  const totalCreditSum = sampleRecords.reduce((s, r) => s + Math.max(0, r.amountPaid - r.amountDue), 0);
  const settledCount = sampleRecords.filter((r) => r.amountPaid >= r.amountDue).length;
  const balanceCount = sampleRecords.filter((r) => Math.max(0, r.amountDue - r.amountPaid) > 0).length;

  assert(totalPaidSum === 490, `Total paid sum is ₱490.00 (100 + 100 + 40 + 0 + 250)`);
  assert(totalOutstandingSum === 160, `Total outstanding is ₱160.00 (Partial: 60 + Unpaid: 100)`);
  assert(totalCreditSum === 150, `Total carried credit is ₱150.00`);
  assert(settledCount === 3, `3 billing periods settled`);
  assert(balanceCount === 2, `2 billing periods with remaining balance`);

  console.log("\n=================================================");
  console.log(`RESULT: Passed ${passedTests} / ${totalTests} verification checks.`);
  console.log("=================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
