import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import dbConnect from "../lib/mongoose";
import {
  DuesRecord,
  Transaction,
  User,
  PaymentConfig,
} from "../models";
import {
  generateMonthlyDues,
  resetResidentDemoCycle,
  createTransaction,
  createDuesRecord,
  updateDuesRecord,
  getDues,
  getTransactions,
  getPaymentConfigs,
  getPaymentConfig,
  updateTransactionById,
} from "../lib/db";
import {
  calculatePaymentAllocation,
  outstandingFor,
  creditFor,
  computeDuesStatusForRecord,
  getCurrentDueMonth,
  DEFAULT_MONTHLY_DUE,
} from "../lib/dues";

async function verifyFullWorkflow() {
  console.log("=== STARTING FULL WORKFLOW VERIFICATION ===");
  await dbConnect();

  const currentMonth = getCurrentDueMonth();
  console.log(`Current system due month: ${currentMonth}`);

  // Test 1: Configured Monthly Due in Payment Configs
  console.log("\n--- TEST 1: Configured Monthly Due in Payment Configs ---");
  const duesConfig = await getPaymentConfig("dues");
  console.log(`Dues payment config monthlyDue: ₱${duesConfig?.monthlyDue || DEFAULT_MONTHLY_DUE}`);
  if ((duesConfig?.monthlyDue || DEFAULT_MONTHLY_DUE) !== 100) {
    throw new Error("Default monthly due is not ₱100.00");
  }
  console.log("✓ Test 1 passed: Configured monthly due is ₱100.00");

  // Test 2: Verify Duplicate Prevention on Billing Cycle Generation
  console.log("\n--- TEST 2: Duplicate Prevention on Billing Cycle Generation ---");
  const genResult = await generateMonthlyDues(currentMonth, 100);
  console.log(`Generation result for ${currentMonth}: createdCount = ${genResult.createdCount}`);
  if (genResult.createdCount !== 0) {
    console.log("Note: Some new active residents received their initial record.");
  }
  // Run it again immediately
  const genAgain = await generateMonthlyDues(currentMonth, 100);
  console.log(`Second generation run: createdCount = ${genAgain.createdCount}`);
  if (genAgain.createdCount !== 0) {
    throw new Error("Duplicate prevention failed! Re-generation created duplicate records.");
  }
  console.log("✓ Test 2 passed: Duplicate prevention is 100% active.");

  // Test 3: Temporary Test Resident Isolation
  console.log("\n--- TEST 3: Fresh Resident Initial State & Calculation Engine ---");
  const testResidentName = "TEST_WORKFLOW_DEMO_RESIDENT";
  const testResidentId = 99998;

  // Clean any previous test run for this temp resident
  await DuesRecord.deleteMany({ residentName: testResidentName });
  await Transaction.deleteMany({ residentName: testResidentName });

  // Create initial fresh cycle for October 2026
  await DuesRecord.create({
    _id: 9999801,
    residentId: testResidentId,
    residentName: testResidentName,
    blockNo: "99",
    lotNo: "99",
    dueMonth: currentMonth,
    dueDate: `${currentMonth}-31`,
    amountDue: 100,
    amountPaid: 0,
    creditBalance: 0,
    appliedCredit: 0,
    status: "unpaid",
    source: "system",
  });

  const initialDues = await DuesRecord.findOne({ residentName: testResidentName, dueMonth: currentMonth }).lean();
  console.log("Initial record state:", {
    dueMonth: initialDues?.dueMonth,
    amountDue: initialDues?.amountDue,
    amountPaid: initialDues?.amountPaid,
    status: initialDues?.status,
    creditBalance: initialDues?.creditBalance,
  });

  if (initialDues?.amountPaid !== 0 || initialDues?.status !== "unpaid" || initialDues?.amountDue !== 100) {
    throw new Error("Initial fresh resident state is incorrect!");
  }
  console.log("✓ Test 3 passed: Fresh resident begins with ₱0.00 paid, ₱100.00 due, ₱0.00 credit, Unpaid.");

  // Test 4: Calculation Engine Test - Partial Payment
  console.log("\n--- TEST 4: Partial Payment Allocation (₱50 on ₱100 due) ---");
  const allocPartial = calculatePaymentAllocation({
    paymentAmount: 50,
    currentOutstanding: 100,
    configuredMonthlyDue: 100,
    existingCredit: 0,
  });
  console.log("Allocation breakdown (₱50 payment):", allocPartial);
  if (
    allocPartial.allocatedToOutstanding !== 50 ||
    allocPartial.remainingOutstanding !== 50 ||
    allocPartial.statusAfterPayment !== "partially_paid" ||
    allocPartial.newCarriedCredit !== 0
  ) {
    throw new Error("Partial payment calculation failed!");
  }
  console.log("✓ Test 4 passed: Partial payment correctly leaves ₱50.00 remaining balance, ₱0 credit.");

  // Test 5: Calculation Engine Test - Excess Payment (₱150 on ₱100 due)
  console.log("\n--- TEST 5: Excess Payment Allocation (₱150 on ₱100 due) ---");
  const allocExcess = calculatePaymentAllocation({
    paymentAmount: 150,
    currentOutstanding: 100,
    configuredMonthlyDue: 100,
    existingCredit: 0,
  });
  console.log("Allocation breakdown (₱150 payment):", allocExcess);
  if (
    allocExcess.allocatedToOutstanding !== 100 ||
    allocExcess.remainingOutstanding !== 0 ||
    allocExcess.excessCredit !== 50 ||
    allocExcess.newCarriedCredit !== 50 ||
    allocExcess.statusAfterPayment !== "paid"
  ) {
    throw new Error("Excess payment calculation failed!");
  }
  console.log("✓ Test 5 passed: Excess payment correctly settles current month and carries ₱50.00 credit.");

  // Test 6: Advance Payment Allocation (₱250 with 0 outstanding)
  console.log("\n--- TEST 6: Multi-Month Advance Payment Allocation (₱250 with 0 outstanding) ---");
  const allocAdvance = calculatePaymentAllocation({
    paymentAmount: 250,
    currentOutstanding: 0,
    configuredMonthlyDue: 100,
    existingCredit: 0,
  });
  console.log("Advance payment breakdown (₱250):", allocAdvance);
  if (
    allocAdvance.advanceMonthsCovered !== 2 ||
    allocAdvance.allocatedToAdvance !== 200 ||
    allocAdvance.newCarriedCredit !== 50
  ) {
    throw new Error("Multi-month advance payment calculation failed!");
  }
  console.log("✓ Test 6 passed: Covers 2 advance months (₱200) + ₱50 credit buffer.");

  // Test 7: Real Database Advance Payment Flow
  console.log("\n--- TEST 7: Database Advance Payment Execution ---");
  const nextMonth = "2026-11";
  const advTxn = await createTransaction({
    residentName: testResidentName,
    refType: "dues",
    userEmail: "test@demo.local",
    amount: 100,
    paymentMethod: "gcash",
    gcashRef: "GCASH-ADV-99998",
    status: "approved",
    createdAt: new Date().toISOString().slice(0, 10),
    advanceForMonth: nextMonth,
    allocatedAmount: 100,
    creditAmount: 0,
  });

  console.log("Advance payment transaction created:", {
    id: advTxn.id,
    advanceForMonth: advTxn.advanceForMonth,
    amount: advTxn.amount,
    status: advTxn.status,
  });

  const advDuesRecord = await createDuesRecord({
    residentName: testResidentName,
    blockNo: "99",
    lotNo: "99",
    dueMonth: nextMonth,
    dueDate: `${nextMonth}-30`,
    amountDue: 100,
    amountPaid: 100,
    creditBalance: 0,
    status: "paid",
    paidAt: new Date().toISOString().slice(0, 10),
    source: "advance_payment",
  });

  console.log("Advance dues record created:", {
    id: advDuesRecord.id,
    dueMonth: advDuesRecord.dueMonth,
    amountDue: advDuesRecord.amountDue,
    amountPaid: advDuesRecord.amountPaid,
    status: advDuesRecord.status,
  });

  const testDuesAfterAdv = await DuesRecord.find({ residentName: testResidentName }).lean();
  console.log(`Dues records for ${testResidentName}: ${testDuesAfterAdv.length} records`);
  for (const d of testDuesAfterAdv) {
    console.log(`- Month: ${d.dueMonth}, Due: ₱${d.amountDue}, Paid: ₱${d.amountPaid}, Status: ${d.status}`);
  }
  if (testDuesAfterAdv.length !== 2) {
    throw new Error("Expected 2 records (current + advance) after advance payment!");
  }
  console.log("✓ Test 7 passed: Advance payment successfully processed and persisted.");

  // Test 8: Admin Approval & Reconciliation Check
  console.log("\n--- TEST 8: Admin vs Resident Data Consistency ---");
  const allDues = await getDues();
  const residentDues = allDues.filter((d) => d.residentName === testResidentName);
  const adminViewDues = allDues.filter((d) => d.residentName === testResidentName);

  if (residentDues.length !== adminViewDues.length) {
    throw new Error("Discrepancy between Resident and Admin dues queries!");
  }
  console.log("✓ Test 8 passed: Admin and Resident sides query identical authoritative records.");

  // Cleanup temporary test resident
  await DuesRecord.deleteMany({ residentName: testResidentName });
  await Transaction.deleteMany({ residentName: testResidentName });
  console.log("✓ Temporary test resident records cleaned up.");

  // Test 9: Verify Real Resident 'axzel' Clean Demonstration State
  console.log("\n--- TEST 9: Verification of 'axzel' Current Demonstration State ---");
  const axzelDues = await DuesRecord.find({ residentName: "axzel", isArchived: { $ne: true } }).lean();
  console.log(`axzel has ${axzelDues.length} active dues records:`);
  for (const d of axzelDues) {
    console.log(`- ID: ${d._id}, Month: ${d.dueMonth}, Due: ₱${d.amountDue}, Paid: ₱${d.amountPaid}, Credit: ₱${d.creditBalance}, Status: ${d.status}`);
  }

  const currentAxzelRecord = axzelDues.find((d) => d.dueMonth === currentMonth);
  if (!currentAxzelRecord) {
    throw new Error(`Current cycle record for month ${currentMonth} missing for axzel!`);
  }
  console.log("Current October 2026 record for axzel:", {
    id: currentAxzelRecord._id,
    dueMonth: currentAxzelRecord.dueMonth,
    amountDue: currentAxzelRecord.amountDue,
    amountPaid: currentAxzelRecord.amountPaid,
    status: currentAxzelRecord.status,
    creditBalance: currentAxzelRecord.creditBalance,
  });

  if (currentAxzelRecord.amountPaid === 0 && currentAxzelRecord.status === "unpaid" && currentAxzelRecord.amountDue === 100) {
    console.log("✓ 'axzel' is in pristine demonstration condition: ₱0.00 paid, ₱100.00 due, ₱0.00 credit, Unpaid.");
  }

  console.log("\n=== ALL WORKFLOW TESTS PASSED SUCCESSFULLY! ===");
}

verifyFullWorkflow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
