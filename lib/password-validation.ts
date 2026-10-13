// Shared password-strength validation for both frontend and backend.
// This file is safe to import from client components (no Node-only deps).

export interface PasswordCheck {
  label: string;
  pass: boolean;
}

export interface PasswordValidation {
  valid: boolean;
  score: number;      // 0–5 (one point per passing check)
  label: string;
  color: string;      // Tailwind bg colour for strength bar
  checks: PasswordCheck[];
  /** A single human-readable error if the password is invalid, or null. */
  error: string | null;
}

/**
 * Evaluate a password against the Mabuhay Homes strength requirements:
 *  1. Minimum 8 characters
 *  2. At least one uppercase letter (A–Z)
 *  3. At least one lowercase letter (a–z)
 *  4. At least one number (0–9)
 *  5. At least one special character (e.g. ! @ # $ % etc.)
 *
 * Additionally rejects passwords consisting entirely of uppercase letters or lowercase letters.
 */
export function validatePassword(pw: string): PasswordValidation {
  const isAllUpper = pw.length > 0 && /^[A-Z]+$/.test(pw);
  const isAllLower = pw.length > 0 && /^[a-z]+$/.test(pw);

  const checks: PasswordCheck[] = [
    { label: "At least 8 characters", pass: pw.length >= 8 },
    { label: "An uppercase letter (A–Z)", pass: /[A-Z]/.test(pw) },
    { label: "A lowercase letter (a–z)", pass: /[a-z]/.test(pw) },
    { label: "A number (0–9)", pass: /\d/.test(pw) },
    { label: "A special character (!@#$…)", pass: /[^a-zA-Z0-9]/.test(pw) },
  ];

  const score = checks.filter((c) => c.pass).length;
  const valid = score === 5 && !isAllUpper && !isAllLower;

  const labels = ["", "Weak", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "",
    "bg-red-400",
    "bg-red-400",
    "bg-amber-400",
    "bg-sky-400",
    "bg-emerald-500",
  ];

  // Pick the first failing requirement as the error message
  let error: string | null = null;
  if (!valid) {
    if (isAllUpper || isAllLower) {
      error = "Password cannot consist entirely of uppercase or lowercase letters.";
    } else {
      const failing = checks.find((c) => !c.pass);
      if (failing) {
        error = `Password must contain: ${failing.label.toLowerCase()}.`;
      }
    }
  }

  return {
    valid,
    score,
    label: labels[score] ?? "",
    color: colors[score] ?? "",
    checks,
    error,
  };
}
