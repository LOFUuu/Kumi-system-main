require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const { randomBytes, scryptSync } = require("crypto");

// Must match lib/password.ts exactly
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const newPassword = process.env.ADMIN_NEW_PASSWORD || "Mabuhay!P5#2026Admin";
  const newHash = hashPassword(newPassword);
  const result = await mongoose.connection.db.collection("users").updateOne(
    { email: "admin@mabuhay.com" },
    { $set: { passwordHash: newHash } }
  );
  console.log("Updated:", result.modifiedCount, "document(s)");
  console.log("Admin password reset using current policy.");
  await mongoose.disconnect();
}).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
