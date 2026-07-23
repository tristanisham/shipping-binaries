import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INDEFINITE_DENIAL_EXPIRES_AT,
  Permission,
  USERS_READ_PERMISSION,
} from "../../src/models/permission.js";
import {
  assignRoleToUser,
  createRole,
  getRoleByName,
} from "../../src/models/role.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("permissions are inherited through roles", async () => {
  const db = createTestDb();
  const adminRole = await getRoleByName(db, "admin");
  const guestRole = await getRoleByName(db, "guest");
  assert.ok(adminRole);
  assert.ok(guestRole);

  const adminId = await seedUser(db, {
    email: "admin@example.com",
    username: "admin",
  });
  const guestId = await seedUser(db, {
    email: "guest@example.com",
    username: "guest",
  });
  await assignRoleToUser(db, adminId, "admin");
  await assignRoleToUser(db, guestId, "guest");

  assert.equal(
    await Permission.can(USERS_READ_PERMISSION, db, adminId),
    true,
  );
  assert.equal(
    await Permission.can(USERS_READ_PERMISSION, db, guestId),
    false,
  );
  assert.equal(
    await Permission.cannot(USERS_READ_PERMISSION, db, guestId),
    true,
  );

  const adminPermissions = await Permission.forRole(db, adminRole.id);
  assert.deepEqual(
    adminPermissions.map(({ name }) => name),
    [
      "comments:create",
      "comments:delete",
      "comments:read",
      "comments:update",
      "posts:create",
      "posts:delete",
      "posts:read",
      "posts:update",
      "users:create",
      "users:delete",
      "users:read",
      "users:update",
    ],
  );
  assert.deepEqual(
    (await Permission.all(db)).map(({ name }) => name),
    adminPermissions.map(({ name }) => name),
  );
  assert.deepEqual(await Permission.forRole(db, guestRole.id), []);
});

test("custom roles can be granted custom permissions", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "editor@example.com",
    username: "editor",
  });
  const roleId = await createRole(db, "contributor");
  await Permission.create(db, "posts:publish");
  await Permission.assignToRole(db, roleId, "posts:publish");
  await assignRoleToUser(db, userId, "contributor");

  assert.equal(await Permission.can("posts:publish", db, userId), true);
  assert.deepEqual(
    (await Permission.forUser(db, userId)).map(({ name }) => name),
    ["posts:publish"],
  );
});

test("deny records a denial (upserting) and restore removes it", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "u@example.com",
    username: "u",
  });
  const permission = (await Permission.all(db)).find(
    ({ name }) => name === USERS_READ_PERMISSION,
  );
  assert.ok(permission);

  await Permission.deny(
    db,
    userId,
    permission.id,
    INDEFINITE_DENIAL_EXPIRES_AT,
  );
  assert.deepEqual(
    (await Permission.denialsForUser(db, userId)).map((d) => ({
      expiresAt: d.expiresAt,
      permissionId: d.permissionId,
    })),
    [{ expiresAt: INDEFINITE_DENIAL_EXPIRES_AT, permissionId: permission.id }],
  );

  // Re-denying upserts: one row, expiry updated.
  const future = new Date(Date.now() + 60_000).toISOString();
  await Permission.deny(db, userId, permission.id, future);
  assert.deepEqual(
    (await Permission.denialsForUser(db, userId)).map((d) => d.expiresAt),
    [future],
  );

  await Permission.restore(db, userId, permission.id);
  assert.deepEqual(await Permission.denialsForUser(db, userId), []);
});

test("deny suppresses a role-granted permission until cleared", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "s1@example.com",
    username: "s1",
  });
  await assignRoleToUser(db, userId, "admin"); // admin holds users:read
  const permission = (await Permission.all(db)).find(
    ({ name }) => name === USERS_READ_PERMISSION,
  );
  assert.ok(permission);

  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), true);

  await Permission.deny(
    db,
    userId,
    permission.id,
    INDEFINITE_DENIAL_EXPIRES_AT,
  );
  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), false);

  await Permission.restore(db, userId, permission.id);
  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), true);
});

test("an expired snooze does not suppress; a future one does", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "s2@example.com",
    username: "s2",
  });
  await assignRoleToUser(db, userId, "admin");
  const permission = (await Permission.all(db)).find(
    ({ name }) => name === USERS_READ_PERMISSION,
  );
  assert.ok(permission);

  const past = new Date(Date.now() - 60_000).toISOString();
  await Permission.deny(db, userId, permission.id, past);
  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), true);

  const future = new Date(Date.now() + 60_000).toISOString();
  await Permission.deny(db, userId, permission.id, future);
  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), false);
});

test("author and editor roles are seeded with their post permissions", async () => {
  const db = createTestDb();
  const author = await getRoleByName(db, "author");
  const editor = await getRoleByName(db, "editor");
  assert.ok(author);
  assert.ok(editor);

  assert.deepEqual(
    (await Permission.forRole(db, author.id)).map(({ name }) => name),
    ["posts:create", "posts:read"],
  );
  assert.deepEqual(
    (await Permission.forRole(db, editor.id)).map(({ name }) => name),
    ["posts:create", "posts:delete", "posts:read", "posts:update"],
  );
});
