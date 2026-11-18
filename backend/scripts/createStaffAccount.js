const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { createUser } = require("../services/userService");

async function main() {
  const { STAFF_NAME, STAFF_EMAIL, STAFF_PASSWORD, STAFF_ROLE } = process.env;
  if (!["Administrator", "Manager"].includes(STAFF_ROLE) ||
      !STAFF_NAME || !STAFF_EMAIL || !STAFF_PASSWORD) {
    throw new Error("Set STAFF_NAME, STAFF_EMAIL, STAFF_PASSWORD and STAFF_ROLE (Administrator or Manager).");
  }
  await connectDB();
  const user = await createUser({
    name: STAFF_NAME,
    email: STAFF_EMAIL,
    password: STAFF_PASSWORD,
    role: STAFF_ROLE
  });
  console.log(`Created ${user.role} account for ${user.email}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
