// Shared, field-specific input validation for both frontend and backend.
// Safe to import from client components (no Node-only dependencies).
//
// Conventions:
//   - `sanitize*`  : used in onChange handlers to block characters that can never
//                    be valid for the field (e.g. letters in a phone number).
//                    They never invent data — they only drop disallowed characters.
//   - `validate*`  : return `null` when valid, or a human-readable error string.
//                    Used on submit (frontend) and on every API route (backend).
//
// NOTE: Passwords are intentionally NOT handled here. Password rules live in
// `lib/password-validation.ts` and must never be trimmed or character-filtered.

// ── Generic helpers ──────────────────────────────────────────────────────────

/** C0/C1 control characters except tab (\t), newline (\n), carriage return (\r). */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;
/** Same, but also disallows newlines (for single-line fields). */
const CONTROL_CHARS_SINGLE_LINE = /[\u0000-\u001F\u007F-\u009F]/;

export function hasControlChars(value: string, allowNewlines = false): boolean {
  return (allowNewlines ? CONTROL_CHARS : CONTROL_CHARS_SINGLE_LINE).test(value);
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === "";
}

// ── Phone numbers ────────────────────────────────────────────────────────────
// Stored as strings (leading zero / "+" country code must be preserved).
// Accepted formats (spaces, hyphens, dots and parentheses are allowed as
// visual separators and are ignored when checking the digits):
//   PH mobile    : 09XXXXXXXXX | +639XXXXXXXXX | 639XXXXXXXXX
//   PH landline  : 0[2-8]XXXXXXXX (e.g. (02) 8123-4567, (046) 123-4567)
//                  +63[2-8]XXXXXXXX
//   International: +<country code><number>, 8–15 digits total (E.164)

export const PHONE_MAX_INPUT_LENGTH = 20;

/** onChange filter: keeps digits, separators, and a single leading "+". */
export function sanitizePhoneInput(raw: string): string {
  let out = "";
  for (const ch of raw) {
    if (/[0-9 ()\-.]/.test(ch)) out += ch;
    else if (ch === "+" && out.trim() === "") out += ch;
  }
  return out.slice(0, PHONE_MAX_INPUT_LENGTH);
}

/** Digits (and leading "+") only — useful for comparison/lookup. Does not alter stored value. */
export function phoneDigits(value: string): string {
  const v = String(value ?? "").trim();
  const plus = v.startsWith("+") ? "+" : "";
  return plus + v.replace(/\D/g, "");
}

export type BaseOptions = { required?: boolean; label?: string };

export interface NameValidationOptions extends BaseOptions {
  max?: number;
  maxLength?: number;
}

export interface TextValidationOptions extends BaseOptions {
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
  multiline?: boolean;
}

export interface NumberValidationOptions extends BaseOptions {
  min?: number;
  max?: number;
  integer?: boolean;
  decimals?: number;
}

export interface AmountValidationOptions extends BaseOptions {
  min?: number;
  max?: number;
}

export interface UrlValidationOptions extends BaseOptions {
  max?: number;
  maxLength?: number;
}

function parseOpts<T extends BaseOptions>(
  arg1?: string | T,
  arg2?: T
): T & BaseOptions {
  if (typeof arg1 === "string") {
    return { ...(arg2 || {}), label: arg1 } as T & BaseOptions;
  }
  return (arg1 || {}) as T & BaseOptions;
}

export function validatePhone(
  value: unknown,
  opts?: string | { required?: boolean; label?: string }
): string | null {
  const options = parseOpts(opts);
  const label = options.label ?? "Contact number";
  if (isBlank(value)) return options.required ? `${label} is required.` : null;
  const v = String(value).trim();

  if (v.length > PHONE_MAX_INPUT_LENGTH) return `${label} is too long.`;
  if (!/^\+?[0-9 ()\-.]+$/.test(v)) {
    return `${label} may only contain digits, spaces, hyphens, parentheses, and a leading "+".`;
  }

  const d = phoneDigits(v);
  const isPhMobile = /^09\d{9}$/.test(d) || /^\+639\d{9}$/.test(d) || /^639\d{9}$/.test(d);
  const isPhLandline = /^0[2-8]\d{8}$/.test(d) || /^\+63[2-8]\d{8}$/.test(d);
  const isIntl = /^\+(?!63)[1-9]\d{7,14}$/.test(d);

  if (isPhMobile || isPhLandline || isIntl) return null;
  return `Enter a valid ${label.toLowerCase()} (e.g. 09171234567 or +639171234567).`;
}

// ── Email ────────────────────────────────────────────────────────────────────
// Deliberately identical to the rule already used by register/login so that
// existing accounts and Google-returned emails are never rejected.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;

export function validateEmail(
  value: unknown,
  opts?: string | { required?: boolean; label?: string }
): string | null {
  const options = parseOpts(opts);
  const label = options.label ?? "Email address";
  if (isBlank(value)) return options.required ? `${label} is required.` : null;
  const v = String(value).trim();
  if (v.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(v)) return `Enter a valid ${label.toLowerCase()}.`;
  return null;
}

// ── Personal names ───────────────────────────────────────────────────────────
// Unicode letters (incl. ñ, accented chars), combining marks, spaces,
// apostrophes, hyphens, periods (e.g. "Jr."), and commas.
const NAME_REGEX = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M} .,'\u2019\\-]*$", "u");
export const NAME_MAX_LENGTH = 100;

export function validateName(
  value: unknown,
  opts?: string | NameValidationOptions,
  extra?: NameValidationOptions
): string | null {
  const options = parseOpts(opts, extra);
  const label = options.label ?? "Name";
  const max = options.maxLength ?? options.max ?? NAME_MAX_LENGTH;
  if (isBlank(value)) return options.required ? `${label} is required.` : null;
  const v = String(value).trim();
  if (v.length < 2) return `${label} must be at least 2 characters.`;
  if (v.length > max) return `${label} must be ${max} characters or fewer.`;
  if (hasControlChars(v) || !NAME_REGEX.test(v)) {
    return `${label} may only contain letters, spaces, hyphens, apostrophes, and periods.`;
  }
  return null;
}

// ── Free text (addresses, titles, descriptions, messages) ────────────────────

export function validateText(
  value: unknown,
  opts?: string | TextValidationOptions,
  extra?: TextValidationOptions
): string | null {
  const options = parseOpts(opts, extra);
  const label = options.label ?? "This field";
  const max = options.maxLength ?? options.max ?? 500;
  const min = options.minLength ?? options.min;
  if (isBlank(value)) return options.required ? `${label} is required.` : null;
  const v = String(value).trim();
  if (min && v.length < min) return `${label} must be at least ${min} characters.`;
  if (v.length > max) return `${label} must be ${max} characters or fewer.`;
  if (hasControlChars(v, !!options.multiline)) return `${label} contains invalid characters.`;
  return null;
}

// ── Block / Lot identifiers ──────────────────────────────────────────────────
// Kept as strings: real values look like "5", "B-12", "C-03", "12A".
const BLOCK_LOT_REGEX = /^[A-Za-z0-9][A-Za-z0-9 \-/]*$/;
export const BLOCK_LOT_MAX_LENGTH = 10;

export function sanitizeBlockLotInput(raw: string): string {
  return raw.replace(/[^A-Za-z0-9 \-/]/g, "").slice(0, BLOCK_LOT_MAX_LENGTH);
}

export function validateBlockLot(
  value: unknown,
  opts?: string | { required?: boolean; label?: string }
): string | null {
  const options = parseOpts(opts);
  const label = options.label ?? "Block/Lot";
  if (isBlank(value)) return options.required ? `${label} is required.` : null;
  const v = String(value).trim();
  if (v.toLowerCase() === "null" || v.toLowerCase() === "undefined") return `Enter a valid ${label}.`;
  if (v.length > BLOCK_LOT_MAX_LENGTH || !BLOCK_LOT_REGEX.test(v)) {
    return `${label} may only contain letters, digits, hyphens, or slashes (e.g. 5, B-12).`;
  }
  return null;
}

// ── Numbers ──────────────────────────────────────────────────────────────────

/** onChange filter for whole numbers (no sign, no decimal point). */
export function sanitizeIntegerInput(raw: string, maxDigits = 9): string {
  return raw.replace(/\D/g, "").slice(0, maxDigits);
}

/** onChange filter for non-negative decimals with at most `decimals` places. */
export function sanitizeDecimalInput(raw: string, decimals = 2, maxIntDigits = 10): string {
  let cleaned = raw.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  let [intPart, fracPart] = cleaned.split(".");
  intPart = (intPart ?? "").slice(0, maxIntDigits);
  if (fracPart !== undefined) {
    if (decimals <= 0) return intPart;
    return `${intPart}.${fracPart.slice(0, decimals)}`;
  }
  return intPart;
}

/** Parse a form value to a number, returning NaN for blanks (never silently 0). */
export function parseNumberInput(value: unknown): number {
  if (typeof value === "number") return value;
  if (isBlank(value)) return NaN;
  const s = String(value).trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

export function validateNumber(
  value: unknown,
  opts?: string | NumberValidationOptions,
  extra?: NumberValidationOptions
): string | null {
  const options = parseOpts(opts, extra);
  const label = options.label ?? "Value";
  if (isBlank(value)) return options.required ? `${label} is required.` : null;
  const n = parseNumberInput(value);
  if (!Number.isFinite(n)) return `${label} must be a valid number.`;
  if (options.integer && !Number.isInteger(n)) return `${label} must be a whole number.`;
  if (options.decimals !== undefined && !options.integer) {
    const frac = String(value).split(".")[1];
    if (frac && frac.length > options.decimals) return `${label} may have at most ${options.decimals} decimal places.`;
  }
  if (options.min !== undefined && n < options.min) return `${label} must be at least ${options.min.toLocaleString()}.`;
  if (options.max !== undefined && n > options.max) return `${label} must not exceed ${options.max.toLocaleString()}.`;
  return null;
}

/** Monetary amount in PHP: non-negative, max 2 decimal places. */
export function validateAmount(
  value: unknown,
  opts?: string | AmountValidationOptions,
  extra?: AmountValidationOptions
): string | null {
  const options = parseOpts(opts, extra);
  return validateNumber(value, {
    required: options.required,
    label: options.label ?? "Amount",
    min: options.min ?? 0,
    max: options.max ?? 100_000_000,
    decimals: 2,
  });
}

// ── Payment reference numbers ────────────────────────────────────────────────
// GCash reference numbers are typically 13 digits, often displayed in groups
// ("1002 9384 7561"). Other providers/bank transfers can include letters or
// hyphens, so we allow alphanumerics with spaces/hyphens as separators.
// Always kept as a string so leading zeros are preserved.
const REF_REGEX = /^[A-Za-z0-9][A-Za-z0-9 \-]*$/;
export const REF_MAX_LENGTH = 30;

export function sanitizeReferenceInput(raw: string): string {
  return raw.replace(/[^A-Za-z0-9 \-]/g, "").slice(0, REF_MAX_LENGTH);
}

export function validateReferenceNumber(
  value: unknown,
  opts?: string | { required?: boolean; label?: string }
): string | null {
  const options = parseOpts(opts);
  const label = options.label ?? "Reference number";
  if (isBlank(value)) return options.required ? `${label} is required.` : null;
  const v = String(value).trim();
  const core = v.replace(/[\s\-]/g, "");
  if (v.length > REF_MAX_LENGTH || !REF_REGEX.test(v)) {
    return `${label} may only contain letters, digits, spaces, and hyphens.`;
  }
  if (core.length < 6) return `${label} looks too short. Please check your receipt.`;
  if (!/\d/.test(core)) return `${label} must contain digits from your receipt.`;
  return null;
}

// ── URLs (e.g. Messenger / Facebook links) ───────────────────────────────────

export function validateUrl(
  value: unknown,
  opts?: string | UrlValidationOptions,
  extra?: UrlValidationOptions
): string | null {
  const options = parseOpts(opts, extra);
  const label = options.label ?? "Link";
  if (isBlank(value)) return options.required ? `${label} is required.` : null;
  const v = String(value).trim();
  const max = options.maxLength ?? options.max ?? 500;
  if (v.length > max) return `${label} is too long.`;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    return null;
  } catch {
    return `Enter a valid ${label.toLowerCase()} starting with https://`;
  }
}

/** Return the first non-null error from a list of validation results. */
export function firstError(...errors: (string | null | undefined)[]): string | null {
  for (const e of errors) if (e) return e;
  return null;
}
