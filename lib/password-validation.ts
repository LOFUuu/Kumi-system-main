// Shared password-strength validation for both frontend and backend.
// This file is safe to import from client components (no Node-only deps).

export interface PasswordValidation {
  valid: boolean;
  score: number;      // 0–3
  label: string;      // "", "Weak", "Fair", "Strong"
  color: string;      // Tailwind bg colour for strength bar
  /** A single human-readable error if the password is invalid, or null. */
  error: string | null;
}

/**
 * Evaluate a password:
 * Minimum 8 characters required for validity.
 * Additional length and character variety improve the strength indicator.
 */
export function validatePassword(pw: string): PasswordValidation {
  const valid = pw.length >= 8;

  // Score based on simple heuristics (0–3)
  let score = 0;
  if (pw.length >= 8) score = 1;
  if (pw.length >= 10 && /[a-zA-Z]/.test(pw) && /\d/.test(pw)) score = 2;
  if (pw.length >= 12 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) score = 3;

  const labels = ["", "Weak", "Fair", "Strong"];
  const colors = ["", "bg-amber-400", "bg-sky-400", "bg-emerald-500"];

  let error: string | null = null;
  if (!valid) {
    error = "Password must be at least 8 characters.";
  }

  return {
    valid,
    score,
    label: labels[score] ?? "",
    color: colors[score] ?? "",
    error,
  };
}
