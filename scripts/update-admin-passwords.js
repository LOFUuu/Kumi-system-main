require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const { randomBytes, scryptSync } = require("crypto");

// Must match lib/password.ts exactly
const SCRYPT_KEYLEN = 64;
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function updateAdminPasswords() {
  const newPassword = process.env.ADMIN_NEW_PASSWORD;
  if (!newPassword) {
    console.error("Error: ADMIN_NEW_PASSWORD is not set in environment variables / .env.local");
    process.exit(1);
  }

  if (newPassword.length < 16) {
    console.error("Error: ADMIN_NEW_PASSWORD must be at least 16 characters long according to policy.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected.");

  const newHash = hashPassword(newPassword);

  const result = await mongoose.connection.db.collection("users").updateMany(
    { role: "admin" },
    { $set: { passwordHash: newHash } }
  );

  console.log(`Successfully updated ${result.modifiedCount} admin account(s).`);
  console.log("All admin accounts are now secured with the new policy-compliant password.");

  await mongoose.disconnect();
}

updateAdminPasswords().catch((err) => {
  console.error("Update failed:", err.message);
  process.exit(1);
});
