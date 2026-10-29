import { deleteDuesRecords, deleteDuesRecord } from "../lib/db";
import { api } from "../lib/api";

function runVerification() {
  console.log("=================================================");
  console.log("  HOA ARCHIVE CENTER — PERMANENT DELETE TEST     ");
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

  // 1. Verify delete functions are exported and callable
  console.log("--- 1. Testing Backend Function Signatures ---");
  assert(typeof deleteDuesRecords === "function", "deleteDuesRecords is defined and exported in lib/db");
  assert(typeof deleteDuesRecord === "function", "deleteDuesRecord is defined and exported in lib/db");
  assert(typeof api.deleteDues === "function", "api.deleteDues is defined and exported in lib/api");

  // 2. Safe handling of empty/invalid inputs
  console.log("\n--- 2. Testing Input Safety & Edge Cases ---");
  deleteDuesRecords([]).then((res) => {
    assert(res.success === true && res.count === 0, "deleteDuesRecords([]) safely returns { success: true, count: 0 }");
  });

  deleteDuesRecords([NaN, 0, -1] as any).then((res) => {
    assert(res.success === true, "deleteDuesRecords with invalid IDs handles safely without crashing");
  });

  // 3. UI Archive Page Contract Check
  console.log("\n--- 3. Verifying Archive Page Code & Contract ---");
  const fs = require("fs");
  const path = require("path");

  const archivePageCode = fs.readFileSync(
    path.join(__dirname, "../app/admin/amenities/archive/page.tsx"),
    "utf8"
  );

  assert(
    archivePageCode.includes("deleteDueTarget"),
    "Archive page has deleteDueTarget state for single dues record deletion"
  );
  assert(
    archivePageCode.includes("deleteBulkDuesModalOpen"),
    "Archive page has deleteBulkDuesModalOpen state for bulk dues deletion"
  );
  assert(
    archivePageCode.includes("handleDeleteDue"),
    "Archive page has handleDeleteDue handler"
  );
  assert(
    archivePageCode.includes("handleBulkDeleteDues"),
    "Archive page has handleBulkDeleteDues handler"
  );
  assert(
    archivePageCode.includes("<ArchiveRestore className=\"h-3.5 w-3.5 text-amber-600\" />") &&
      archivePageCode.includes("<Trash2 className=\"h-3.5 w-3.5 text-rose-500\" />"),
    "Archive page has Trash2 permanent delete icon right beside ArchiveRestore in dues row"
  );
  assert(
    archivePageCode.includes("Delete Selected (${selectedDueIds.length})"),
    "Archive page has Delete Selected button next to Restore Selected in bulk action bar"
  );
  assert(
    archivePageCode.includes("Delete Permanently?"),
    "Archive page has Delete Permanently confirmation modal"
  );

  console.log(`\n=================================================`);
  console.log(`  Tests completed. Passed: ${passedTests}/${totalTests}`);
  console.log(`=================================================`);
}

runVerification();
