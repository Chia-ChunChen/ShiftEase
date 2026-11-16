const { isValidPassword } = require("./services/userService");

const cases = [
  ["Valid 8-character password", "Abcdef12", true],
  ["Too short", "Abc12", false],
  ["No digit", "Abcdefgh", false],
  ["No letter", "12345678", false],
  ["Exactly 72 bytes", "A1".repeat(36), true],
  ["73 bytes", "A1".repeat(36) + "x", false],
  ["Multibyte password over 72 bytes", "Ab1" + "密".repeat(30), false],
  ["Multibyte password within 72 bytes", "Ab1" + "密".repeat(20), true],
  ["Non-string input", 12345678, false],
  ["Undefined input", undefined, false]
];

let passed = 0;

for (const [name, value, expected] of cases) {
  if (isValidPassword(value) === expected) {
    console.log(`PASS: ${name}`);
    passed++;
  } else {
    console.log(`FAIL: ${name}`);
  }
}

console.log(`\nResult: ${passed}/${cases.length} tests passed`);

if (passed !== cases.length) {
  process.exitCode = 1;
}
