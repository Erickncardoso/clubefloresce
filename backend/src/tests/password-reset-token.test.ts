import test from "node:test";
import assert from "node:assert/strict";
import {
  createPasswordResetToken,
  getPasswordResetTtlMs,
  hashPasswordResetToken,
} from "../utils/password-reset-token";

test("hashPasswordResetToken: mesmo token gera mesmo hash", () => {
  const token = "abc123";
  assert.equal(hashPasswordResetToken(token), hashPasswordResetToken(token));
});

test("createPasswordResetToken: gera valores diferentes", () => {
  const a = createPasswordResetToken();
  const b = createPasswordResetToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});

test("getPasswordResetTtlMs: default 10 minutos", () => {
  const prev = process.env.PASSWORD_RESET_TTL_MINUTES;
  delete process.env.PASSWORD_RESET_TTL_MINUTES;
  assert.equal(getPasswordResetTtlMs(), 10 * 60 * 1000);
  if (prev) process.env.PASSWORD_RESET_TTL_MINUTES = prev;
});
