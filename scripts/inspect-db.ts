import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { isMariaDBConnected, mariaQuery } from "../lib/mariadb";
import { isOnlineMode } from "../lib/db-router";
import dbConnect from "../lib/mongoose";
import { User, DuesRecord, Transaction } from "../models";

async function main() {
  console.log("=== DB CONNECTION CHECK ===");
  const mariaOk = await isMariaDBConnected();
  console.log("MariaDB connected:", mariaOk);

  const onlineMode = await isOnlineMode();
  console.log("isOnlineMode():", onlineMode);

  if (onlineMode) {
    try {
      await dbConnect();
      console.log("Mongoose connected successfully.");
      const users = await User.find({}).lean();
      console.log("MongoDB Users count:", users.length);
      users.forEach(u => console.log(` - [${u._id}] ${u.fullName} (${u.role}) Block ${u.blockNo} Lot ${u.lotNo} Email: ${u.email}`));

      const dues = await DuesRecord.find({}).lean();
      console.log("MongoDB Dues count:", dues.length);
      dues.forEach(d => console.log(` - [${d._id}] ${d.residentName} (${d.dueMonth}): Due ${d.amountDue}, Paid ${d.amountPaid}, Credit ${d.creditBalance}, Status ${d.status}, Archived ${d.isArchived}`));
    } catch (e: any) {
      console.error("MongoDB check failed:", e.message);
    }
  }

  if (mariaOk) {
    try {
      const tables = await mariaQuery("SHOW TABLES");
      console.log("MariaDB tables:", tables);

      const mUsers: any[] = await mariaQuery("SELECT id, fullName, email, role, blockNo, lotNo FROM users");
      console.log("MariaDB Users count:", mUsers.length);
      mUsers.forEach(u => console.log(` - [${u.id}] ${u.fullName} (${u.role}) Block ${u.blockNo} Lot ${u.lotNo} Email: ${u.email}`));

      const mDues: any[] = await mariaQuery("SELECT id, residentId, residentName, dueMonth, amountDue, amountPaid, creditBalance, status, isArchived FROM dues");
      console.log("MariaDB Dues count:", mDues.length);
      mDues.forEach(d => console.log(` - [${d.id}] ${d.residentName} (${d.dueMonth}): Due ${d.amountDue}, Paid ${d.amountPaid}, Credit ${d.creditBalance}, Status ${d.status}, Archived ${d.isArchived}`));
    } catch (e: any) {
      console.error("MariaDB query failed:", e.message);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
