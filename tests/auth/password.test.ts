import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAccountPassword } from "../../src/auth/password.js";

test("account password validation enforces length, letters, and special characters", () => {
  assert.equal(
    validateAccountPassword("short!a"),
    "Use at least 9 characters.",
  );
  assert.equal(
    validateAccountPassword("12345678!"),
    "Include at least one letter.",
  );
  assert.equal(
    validateAccountPassword("abcdefgh9"),
    "Include at least one special character.",
  );
  assert.equal(
    validateAccountPassword("abcdefgh "),
    "Include at least one special character.",
  );
  assert.equal(validateAccountPassword("Valid-pass!"), null);
});

test("account passwords cannot exceed the bcrypt byte limit", () => {
  assert.equal(
    validateAccountPassword(`a!${"x".repeat(71)}`),
    "Password cannot exceed 72 UTF-8 bytes.",
  );
});
