import "./load-env";
import { sendPasswordResetEmail } from "../lib/mailer";

async function testResetMail() {
  console.log("Calling sendPasswordResetEmail...");
  try {
    await sendPasswordResetEmail("kumicarry@gmail.com", "http://localhost:3000/reset-password?token=test12345");
    console.log("Reset email sent successfully!");
  } catch (err: any) {
    console.error("sendPasswordResetEmail FAILED:", err);
  }
}

testResetMail().catch(console.error);
