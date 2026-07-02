/**
 * Generates the bcrypt hash to store in the ADMIN_PASSWORD_HASH env var.
 *
 *   node scripts/hash-admin-password.mjs 'your-strong-password'
 *
 * Copy the printed hash into .env (local) and your Vercel project env.
 * The plaintext password is never stored anywhere.
 */
import bcrypt from "bcryptjs";

const pw = process.argv[2];
if (!pw || pw.length < 10) {
  console.error("Usage: node scripts/hash-admin-password.mjs '<password of 10+ chars>'");
  process.exit(1);
}

const hash = await bcrypt.hash(pw, 12);

// A bcrypt hash contains "$" which Next's dotenv-expand would mangle in a
// local .env file, so it must be escaped there. Hosting dashboards (Vercel,
// Render) store the raw value verbatim — paste the unescaped hash there.
console.log("\n── For local .env (escape $ so dotenv-expand leaves it alone) ──\n");
console.log(`ADMIN_PASSWORD_HASH="${hash.replace(/\$/g, "\\$")}"`);
console.log("\n── For Vercel / hosting dashboards (paste the RAW hash) ──\n");
console.log(hash);
console.log("\nAlso set ADMIN_JWT_SECRET to a random string, e.g. `openssl rand -base64 32`.\n");
