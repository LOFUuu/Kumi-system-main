import "./load-env";
import nodemailer from "nodemailer";

async function test() {
  const user = process.env.EMAIL_USER;
  const rawPass = process.env.EMAIL_PASS;
  console.log("USER:", user);
  console.log("PASS length:", rawPass ? rawPass.length : 0);
  const pass = rawPass?.replace(/\s+/g, "");
  console.log("Sanitized pass length:", pass ? pass.length : 0);

  const configs = [
    { host: "smtp.gmail.com", port: 465, secure: true },
    { host: "smtp.gmail.com", port: 587, secure: false, requireTLS: true },
  ];

  for (const cfg of configs) {
    try {
      console.log("Testing port", cfg.port, "...");
      const t = nodemailer.createTransport({
        ...cfg,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      await t.verify();
      console.log("SUCCESS on port", cfg.port);
      return;
    } catch (err: any) {
      console.error("FAILED port", cfg.port, ":", err.message, err.code, err.response);
    }
  }
}

test().catch(console.error);
