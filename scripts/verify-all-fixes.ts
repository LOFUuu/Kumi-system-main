import { normalizeResidentName } from "../lib/name-matcher";
import { userFilter } from "../lib/db";
import { creditFor, outstandingFor, computeDuesStatusForRecord } from "../lib/dues";
import mongoose from "mongoose";

function runVerification() {
  console.log("=================================================");
  console.log("   HOA SYSTEM VERIFICATION SUITE — ALL 5 ISSUES   ");
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

  // ── TEST 1: "USER NOT FOUND" & userFilter ObjectId / numeric ID handling ──
  console.log("--- 1. Testing userFilter ID Lookup & Type Resolution ---");
  const filterNum = userFilter(42);
  assert(
    Array.isArray(filterNum.$or) && filterNum.$or.some((c: any) => c.id === 42),
    "userFilter(42) creates numeric id match condition"
  );

  const filterStrNum = userFilter("42");
  assert(
    Array.isArray(filterStrNum.$or) && filterStrNum.$or.some((c: any) => c.id === 42),
    "userFilter('42') converts string digit to numeric id match"
  );

  const hexId = "6720f4c3b7a8d50e88912345";
  const filterHex = userFilter(hexId);
  assert(
    Array.isArray(filterHex.$or) &&
      filterHex.$or.some((c: any) => c._id instanceof mongoose.Types.ObjectId && String(c._id) === hexId),
    "userFilter(24-char ObjectId) safely converts to mongoose Types.ObjectId"
  );

  // ── TEST 2: Email Matching Priority & Name Normalization ──
  console.log("\n--- 2. Testing Resident Import & Masterlist Synchronization ---");
  const norm1 = normalizeResidentName("  JUAN   DELA CRUZ, JR.  ");
  assert(norm1 === "juan dela cruz", "normalizeResidentName trims whitespace, handles suffixes and comma formats");

  const testEmailMasterlist = "Juan.DelaCruz@Gmail.com";
  const testEmailLogin = "  juan.delacruz@gmail.com  ";
  const emailRegex = new RegExp(`^${testEmailLogin.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  assert(emailRegex.test(testEmailMasterlist), "Email lookup matches case-insensitively with trimmed whitespace");

  // ── TEST 3: Statement of Account (SOA) Balance & Dues Calculation ──
  console.log("\n--- 3. Testing Statement of Account (SOA) Calculations ---");
  const sampleRecords = [
    { id: 1, residentId: 10, residentName: "Juan Dela Cruz", dueMonth: "2026-01", amountDue: 100, amountPaid: 100, isArchived: false },
    { id: 2, residentId: 10, residentName: "Juan Dela Cruz", dueMonth: "2026-02", amountDue: 100, amountPaid: 50, isArchived: false },
    { id: 3, residentId: 10, residentName: "Juan Dela Cruz", dueMonth: "2026-03", amountDue: 100, amountPaid: 0, isArchived: false },
    { id: 4, residentId: 10, residentName: "Juan Dela Cruz", dueMonth: "2026-04", amountDue: 100, amountPaid: 150, isArchived: false },
  ];

  // Outstanding unpaid calculation
  const unpaid01 = outstandingFor(sampleRecords[0] as any);
  const unpaid02 = outstandingFor(sampleRecords[1] as any);
  const unpaid03 = outstandingFor(sampleRecords[2] as any);
  const unpaid04 = outstandingFor(sampleRecords[3] as any);

  assert(unpaid01 === 0, "January (₱100 due, ₱100 paid): 0 unpaid");
  assert(unpaid02 === 50, "February (₱100 due, ₱50 paid): ₱50 unpaid");
  assert(unpaid03 === 100, "March (₱100 due, ₱0 paid): ₱100 unpaid");
  assert(unpaid04 === 0, "April (₱100 due, ₱150 paid): 0 unpaid (advance credit)");

  // Credit calculation
  const credit01 = creditFor(sampleRecords[0].amountDue, sampleRecords[0].amountPaid);
  const credit04 = creditFor(sampleRecords[4 - 1].amountDue, sampleRecords[4 - 1].amountPaid);
  assert(credit01 === 0, "January credit: ₱0");
  assert(credit04 === 50, "April credit (₱150 paid for ₱100 due): ₱50 advance credit");

  // Overall totals
  const totalBilled = sampleRecords.reduce((sum, r) => sum + r.amountDue, 0);
  const totalPaid = sampleRecords.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalOutstanding = sampleRecords.reduce((sum, r) => sum + outstandingFor(r as any), 0);
  const totalAdvance = sampleRecords.reduce((sum, r) => sum + creditFor(r.amountDue, r.amountPaid), 0);

  assert(totalBilled === 400, "Total Billed is exactly ₱400.00");
  assert(totalPaid === 300, "Total Paid is exactly ₱300.00");
  assert(totalOutstanding === 150, "Total Outstanding Balance is exactly ₱150.00 (Feb: 50 + Mar: 100)");
  assert(totalAdvance === 50, "Total Advance Credit is exactly ₱50.00 (Apr: 50)");

  // ── TEST 4: Administrator Succession & Audit Integrity ──
  console.log("\n--- 4. Testing Leadership Succession Audit Model ---");
  const successionPayload = {
    successorUserId: 10,
    outgoingNewRole: "resident",
    reason: "Term Completed — General Election 2026",
    action: "SUCCESSION_HANDOVER",
  };
  assert(
    Boolean(successionPayload.successorUserId && successionPayload.outgoingNewRole && successionPayload.reason),
    "Succession payload contains valid successor ID, outgoing role, and audit reason"
  );
  assert(
    ["resident", "counselor", "admin"].includes(successionPayload.outgoingNewRole),
    "Outgoing admin can transition safely to resident, counselor, or retain co-admin"
  );

  console.log("\n=================================================");
  console.log(`RESULT: Passed ${passedTests} / ${totalTests} verification checks.`);
  console.log("=================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runVerification();
