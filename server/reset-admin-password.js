/**
 * reset-admin-password.js
 *
 * One-time utility to set a new admin password directly in the PostgreSQL database.
 * Run with:
 *   node server/reset-admin-password.js YourNewPassword
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const newPassword = process.argv[2];

if (!newPassword) {
  console.error("❌  Usage: node server/reset-admin-password.js <NewPassword>");
  console.error("   Example: node server/reset-admin-password.js MySecurePass123");
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error("❌  Password must be at least 8 characters long.");
  process.exit(1);
}

const isHosted =
  !!process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes("localhost") &&
  !process.env.DATABASE_URL.includes("127.0.0.1");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isHosted ? { rejectUnauthorized: false } : false,
});

async function resetPassword() {
  console.log("  Connecting to PostgreSQL…");
  await pool.query("SELECT 1"); // fail fast if connection is bad
  console.log("  ✅ Connected.");

  const newHash = await bcrypt.hash(newPassword, 10);

  // UPSERT: update if row exists, insert if not
  await pool.query(`
    INSERT INTO admin_settings (id, password_hash)
    VALUES (1, $1)
    ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `, [newHash]);

  console.log("  ✅ Admin password updated successfully.");
  console.log("  👉 You can now log in at /admin with your new password.");
  await pool.end();
}

resetPassword().catch(err => {
  console.error("❌  Failed:", err.message);
  pool.end();
  process.exit(1);
});
