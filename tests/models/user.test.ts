import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findUserByLogin,
  getAllUsers,
  getPublicUserByUsername,
  getUserById,
  setUserActive,
  setUserPassword,
  updateUser,
} from "../../src/models/user.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("getUserById maps active to a boolean", async () => {
  const db = createTestDb();
  const id = await seedUser(db, {
    email: "a@x.com",
    username: "alice",
    active: 1,
  });
  const user = await getUserById(db, id);
  assert.ok(user);
  assert.equal(user.active, true);
  assert.equal(user.email, "a@x.com");
  assert.equal(user.username, "alice");
});

test("getUserById returns null for a missing user", async () => {
  const db = createTestDb();
  assert.equal(await getUserById(db, 999), null);
});

test("getPublicUserByUsername returns only public profile fields", async () => {
  const db = createTestDb();
  const id = await seedUser(db, {
    email: "alice@example.com",
    username: "alice",
    label: "Alice Author",
  });

  assert.deepEqual(await getPublicUserByUsername(db, "alice"), {
    id,
    label: "Alice Author",
    username: "alice",
  });
  assert.equal(await getPublicUserByUsername(db, "missing"), null);
});

test("getAllUsers returns all users ordered by id ascending", async () => {
  const db = createTestDb();
  await seedUser(db, { email: "b@x.com", username: "bob" });
  await seedUser(db, { email: "a@x.com", username: "alice" });
  const users = await getAllUsers(db);
  assert.deepEqual(
    users.map((u) => u.username),
    ["bob", "alice"],
  );
});

test("getAllUsers sorts by label, username, email, and status", async () => {
  const db = createTestDb();
  await seedUser(db, {
    active: 1,
    email: "z@example.com",
    label: "Zulu",
    username: "bob",
  });
  await seedUser(db, {
    active: 0,
    email: "a@example.com",
    label: "Alpha",
    username: "alice",
  });

  assert.deepEqual(
    (await getAllUsers(db, { sort: "label" })).map((user) => user.username),
    ["alice", "bob"],
  );
  assert.deepEqual(
    (await getAllUsers(db, { direction: "desc", sort: "username" })).map(
      (user) => user.username,
    ),
    ["bob", "alice"],
  );
  assert.deepEqual(
    (await getAllUsers(db, { sort: "email" })).map((user) => user.username),
    ["alice", "bob"],
  );
  assert.deepEqual(
    (await getAllUsers(db, { sort: "status" })).map((user) => user.username),
    ["alice", "bob"],
  );
});

test("updateUser changes email, username, and label", async () => {
  const db = createTestDb();
  const id = await seedUser(db, { email: "old@x.com", username: "old" });
  await updateUser(db, id, {
    email: "new@x.com",
    username: "new",
    label: "Editor",
  });
  const user = await getUserById(db, id);
  assert.equal(user?.email, "new@x.com");
  assert.equal(user?.username, "new");
  assert.equal(user?.label, "Editor");
});

test("setUserActive toggles the active flag", async () => {
  const db = createTestDb();
  const id = await seedUser(db, {
    email: "a@x.com",
    username: "alice",
    active: 1,
  });
  await setUserActive(db, id, false);
  assert.equal((await getUserById(db, id))?.active, false);
  await setUserActive(db, id, true);
  assert.equal((await getUserById(db, id))?.active, true);
});

test("setUserPassword updates the stored hash", async () => {
  const db = createTestDb();
  const id = await seedUser(db, {
    email: "a@x.com",
    username: "alice",
    passwordHash: "old",
  });
  await setUserPassword(db, id, "new-hash");
  const row = await findUserByLogin(db, "alice");
  assert.equal(row?.password_hash, "new-hash");
});

test("findUserByLogin matches email or username", async () => {
  const db = createTestDb();
  await seedUser(db, { email: "a@x.com", username: "alice" });
  assert.equal((await findUserByLogin(db, "a@x.com"))?.username, "alice");
  assert.equal((await findUserByLogin(db, "alice"))?.email, "a@x.com");
  assert.equal(await findUserByLogin(db, "nobody"), null);
});
