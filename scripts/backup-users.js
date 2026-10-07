require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

async function backupUsers() {
  if (!process.env.MONGODB_URI) {
    console.error("Error: MONGODB_URI is not set in .env.local");
    process.exit(1);
  }

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected.");

  const users = await mongoose.connection.db.collection("users").find({}).toArray();
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFilename = `backup-users-${dateStr}.json`;
  const backupPath = path.join(__dirname, backupFilename);

  fs.writeFileSync(backupPath, JSON.stringify(users, null, 2));
  console.log(`Backup successfully created: ${backupPath} (${users.length} users backed up)`);

  await mongoose.disconnect();
}

backupUsers().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
