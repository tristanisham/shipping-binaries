import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyPassword } from "../../src/auth/password.js";
import app from "../../src/index.js";
import { getProfileForUser } from "../../src/models/profile.js";
import { findUserByLogin, getUserById } from "../../src/models/user.js";
import { SESSION_COOKIE_NAME } from "../../src/models/session.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

const signup = (
  db: D1Database,
  values: Record<string, string> = {},
) =>
  app.request(
    "/signup",
    {
      body: new URLSearchParams({
        email: "reader@example.com",
        label: "Reader Name",
        password: "readership!",
        passwordConfirmation: "readership!",
        username: "NewReader",
        ...values,
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
    { DB: db } as Env,
  );

test("signup normalizes the username, grants guest, and signs in", async () => {
  const db = createTestDb();
  const response = await signup(db);

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/admin/account");
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie ?? "", new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(cookie ?? "", /HttpOnly/i);
  assert.match(cookie ?? "", /SameSite=Strict/i);

  const row = await findUserByLogin(db, "newreader");
  assert.ok(row);
  assert.equal(row.username, "newreader");
  assert.equal(row.label, "Reader Name");
  assert.equal(await verifyPassword("readership!", row.password_hash), true);

  const user = await getUserById(db, row.id);
  assert.deepEqual(user?.roles, ["guest"]);
  assert.equal((await getProfileForUser(db, row.id))?.biography, "");
});

test("signup rejects invalid passwords without creating a user", async () => {
  const db = createTestDb();
  const response = await signup(db, {
    password: "short",
    passwordConfirmation: "short",
  });

  assert.equal(response.status, 422);
  assert.match(await response.text(), /Use at least 9 characters/);
  assert.equal(await findUserByLogin(db, "newreader"), null);
});

test("signup reports duplicate usernames without creating another user", async () => {
  const db = createTestDb();
  assert.equal((await signup(db)).status, 303);

  const response = await signup(db, {
    email: "other@example.com",
    username: "NEWREADER",
  });

  assert.equal(response.status, 409);
  assert.match(
    await response.text(),
    /account with that email or username already exists/i,
  );
  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM users")
    .first<{ count: number }>();
  assert.equal(count?.count, 1);
});

test("signup rejects identifiers that collide across email and username", async () => {
  const db = createTestDb();
  await seedUser(db, {
    email: "victim@example.com",
    username: "victim",
  });
  await seedUser(db, {
    email: "author@example.com",
    username: "alias@example.com",
  });

  const usernameCollision = await signup(db, {
    email: "other@example.com",
    username: "VICTIM@EXAMPLE.COM",
  });
  assert.equal(usernameCollision.status, 409);

  const emailCollision = await signup(db, {
    email: "ALIAS@EXAMPLE.COM",
    username: "other",
  });
  assert.equal(emailCollision.status, 409);

  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM users")
    .first<{ count: number }>();
  assert.equal(count?.count, 2);
});
