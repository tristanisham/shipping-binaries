import assert from "node:assert/strict";
import { test } from "node:test";
import {
  claimAuthToken,
  createAuthToken,
  getValidAuthToken,
  hashAuthToken,
} from "../../src/models/authToken.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("auth tokens store only a hash and can be claimed once", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "alice@example.com",
    username: "alice",
  });
  const token = await createAuthToken(db, userId, "password_reset", 60_000);
  const row = await db.prepare(
    "SELECT token_hash FROM auth_tokens WHERE user_id = ?1",
  ).bind(userId).first<{ token_hash: string }>();

  assert.ok(row);
  assert.notEqual(row.token_hash, token);
  assert.equal(row.token_hash, await hashAuthToken(token));
  assert.equal(
    (await claimAuthToken(db, token, "password_reset"))?.userId,
    userId,
  );
  assert.equal(await claimAuthToken(db, token, "password_reset"), null);
  assert.equal(await getValidAuthToken(db, token, "password_reset"), null);
});

test("creating a replacement token invalidates the previous token", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "alice@example.com",
    username: "alice",
  });
  const first = await createAuthToken(db, userId, "invite", 60_000);
  const second = await createAuthToken(db, userId, "invite", 60_000);

  assert.equal(await getValidAuthToken(db, first, "invite"), null);
  assert.equal((await getValidAuthToken(db, second, "invite"))?.userId, userId);
});

test("expired auth tokens are rejected", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "alice@example.com",
    username: "alice",
  });
  const token = await createAuthToken(db, userId, "invite", 60_000);
  await db.prepare(
    "UPDATE auth_tokens SET expires_at = '2000-01-01T00:00:00.000Z'",
  ).run();

  assert.equal(await getValidAuthToken(db, token, "invite"), null);
});
