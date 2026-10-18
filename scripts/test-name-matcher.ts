import { normalizeResidentName } from "../lib/name-matcher";

function testNormalization() {
  console.log("=== Testing normalizeResidentName ===");

  const cases = [
    { input: "Juan Dela Cruz", expected: "juan dela cruz" },
    { input: "Dela Cruz, Juan", expected: "juan dela cruz" },
    { input: "Dela Cruz, Juan P.", expected: "juan dela cruz" },
    { input: "Juan P. Dela Cruz Jr.", expected: "juan dela cruz" },
    { input: "  JUAN    DELA   CRUZ  ", expected: "juan dela cruz" },
    { input: "Juán Delá Crúz", expected: "juan dela cruz" },
    { input: "Carlos M. Garcia III", expected: "carlos garcia" },
    { input: "Garcia, Carlos M., III", expected: "carlos garcia" },
    { input: "Regaza, Axzel V.", expected: "axzel regaza" },
    { input: "Axzel Regaza Jr.", expected: "axzel regaza" },
    { input: "Elena Bautista-Santos", expected: "elena bautista santos" },
  ];

  let passed = 0;
  for (const c of cases) {
    const output = normalizeResidentName(c.input);
    const ok = output === c.expected;
    if (ok) {
      console.log(`[PASS] "${c.input}" -> "${output}"`);
      passed++;
    } else {
      console.error(`[FAIL] "${c.input}" -> Expected "${c.expected}", Got "${output}"`);
    }
  }

  console.log(`Passed ${passed} / ${cases.length} tests.`);
  if (passed !== cases.length) process.exit(1);
}

testNormalization();
