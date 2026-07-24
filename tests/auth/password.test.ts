import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hashPassword,
  validateAccountPassword,
} from "../../src/auth/password.js";

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

test("account passwords cannot exceed 64 UTF-8 bytes", async () => {
  assert.equal(
    validateAccountPassword(`a!${"x".repeat(62)}`),
    null,
  );
  assert.equal(
    validateAccountPassword(`a!${"x".repeat(63)}`),
    "Password cannot exceed 64 UTF-8 bytes.",
  );
  assert.equal(
    validateAccountPassword(`a!${"é".repeat(31)}`),
    null,
  );
  assert.equal(
    validateAccountPassword(`a!${"é".repeat(32)}`),
    "Password cannot exceed 64 UTF-8 bytes.",
  );
  await assert.rejects(
    hashPassword(`a!${"x".repeat(63)}`),
    {
      message: "Password cannot exceed 64 UTF-8 bytes.",
      name: "RangeError",
    },
  );
});
