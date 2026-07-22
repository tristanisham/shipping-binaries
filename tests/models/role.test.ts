import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADMIN_ROLE,
  getRoleByName,
  getRolesForUser,
} from "../../src/models/role.js";
import { getAllUsers, getUserById } from "../../src/models/user.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

const assignRole = async (
  db: D1Database,
  userId: number,
  roleName: string,
): Promise<void> => {
  await db
    .prepare(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES (?1, (SELECT id FROM roles WHERE name = ?2))`,
    )
    .bind(userId, roleName)
    .run();
};

test("the migration seeds an admin role", async () => {
  const db = createTestDb();
  const role = await getRoleByName(db, ADMIN_ROLE);
  assert.ok(role);
  assert.equal(role.name, "admin");
});

test("getRoleByName returns null for an unknown role", async () => {
  const db = createTestDb();
  assert.equal(await getRoleByName(db, "nope"), null);
});

test("getRolesForUser returns assigned role names, empty when none", async () => {
  const db = createTestDb();
  const id = await seedUser(db, { email: "a@x.com", username: "alice" });
  assert.deepEqual(await getRolesForUser(db, id), []);
  await assignRole(db, id, ADMIN_ROLE);
  assert.deepEqual(await getRolesForUser(db, id), ["admin"]);
});

test("getUserById includes the user's roles", async () => {
  const db = createTestDb();
  const id = await seedUser(db, { email: "a@x.com", username: "alice" });
  await assignRole(db, id, ADMIN_ROLE);
  const user = await getUserById(db, id);
  assert.deepEqual(user?.roles, ["admin"]);
});

test("getAllUsers includes roles and defaults to an empty list", async () => {
  const db = createTestDb();
  const withRole = await seedUser(db, { email: "a@x.com", username: "alice" });
  await seedUser(db, { email: "b@x.com", username: "bob" });
  await assignRole(db, withRole, ADMIN_ROLE);
  const users = await getAllUsers(db);
  const alice = users.find((u) => u.username === "alice");
  const bob = users.find((u) => u.username === "bob");
  assert.deepEqual(alice?.roles, ["admin"]);
  assert.deepEqual(bob?.roles, []);
});
