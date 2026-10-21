import "./load-env";
import fs from "fs";
import path from "path";
import { mariaQuery } from "../lib/mariadb";

async function main() {
  const file = path.join(process.cwd(), "database_exports", "payment_configs.json");
  if (!fs.existsSync(file)) return;
  const items = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const c of items) {
    await mariaQuery(
      `INSERT INTO payment_configs (category, accountName, accountNumber, qrCodeUrl, instructions, isActive, updatedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         accountName=VALUES(accountName), accountNumber=VALUES(accountNumber),
         qrCodeUrl=VALUES(qrCodeUrl), instructions=VALUES(instructions), isActive=VALUES(isActive)`,
      [
        c.category,
        c.accountName || "MABUHAY HOMES HOA",
        c.accountNumber || "0917 123 4567",
        c.qrCodeUrl || "",
        c.instructions || "",
        c.isActive !== false ? 1 : 0,
        "Admin",
      ]
    );
  }
  console.log("Successfully seeded payment_configs in MariaDB!");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
