import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Password hashing built on Node's crypto.scrypt — no extra dependencies.
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(hash, "hex");
    if (candidate.length !== expected.length) return false;
    return timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// A one-time password-reset token. The raw token is emailed to the user; only
// its hash is stored in the database.
export function createResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashPassword(token) };
}

// Same scheme, used for the email-verification link at sign-up.
export function createVerificationToken(): { token: string; hash: string } {
  return createResetToken();
}