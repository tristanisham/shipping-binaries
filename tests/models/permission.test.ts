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
      "roles:read",
      "roles:update",
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
  const roleId = await createRole(db, "editor");
  await Permission.create(db, "posts:publish");
  await Permission.assignToRole(db, roleId, "posts:publish");
  await assignRoleToUser(db, userId, "editor");

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
