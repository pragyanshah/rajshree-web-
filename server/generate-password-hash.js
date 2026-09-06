#!/usr/bin/env node
/**
 * Password Hash Generator for Rajshree Electronics Admin
 *
 * Usage:
 *   node server/generate-password-hash.js YourNewPassword
 *
 * Copy the output hash and paste it as ADMIN_PASSWORD_HASH in .env
 */

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error("\n  ❌ Please provide a password as an argument.");
  console.error("  Usage: node server/generate-password-hash.js YourNewPassword\n");
  process.exit(1);
}

if (password.length < 6) {
  console.error("\n  ⚠️  Password is too short. Use at least 6 characters for security.\n");
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log("\n  ✅ Bcrypt hash generated successfully.");
  console.log("  Copy the line below and paste it into your .env file:\n");
  console.log(`  ADMIN_PASSWORD_HASH=${hash}`);
  console.log("\n  Then restart the server: node server/index.js\n");
});
