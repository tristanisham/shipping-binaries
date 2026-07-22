import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ADMIN_ROLE,
  assignRoleToUser,
  createRole,
  deleteRole,
  getAllRoles,
  getRoleByName,
  getRolesForUser,
  setRolesForUser,
  updateRole,
} from "../../src/models/role.js";
import { getAllUsers, getUserById } from "../../src/models/user.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

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
  await assignRoleToUser(db, id, ADMIN_ROLE);
  assert.deepEqual(await getRolesForUser(db, id), ["admin"]);
});

test("getUserById includes the user's roles", async () => {
  const db = createTestDb();
  const id = await seedUser(db, { email: "a@x.com", username: "alice" });
  await assignRoleToUser(db, id, ADMIN_ROLE);
  const user = await getUserById(db, id);
  assert.deepEqual(user?.roles, ["admin"]);
});

test("getAllUsers includes roles and defaults to an empty list", async () => {
  const db = createTestDb();
  const withRole = await seedUser(db, { email: "a@x.com", username: "alice" });
  await seedUser(db, { email: "b@x.com", username: "bob" });
  await assignRoleToUser(db, withRole, ADMIN_ROLE);
  const users = await getAllUsers(db);
  const alice = users.find((u) => u.username === "alice");
  const bob = users.find((u) => u.username === "bob");
  assert.deepEqual(alice?.roles, ["admin"]);
  assert.deepEqual(bob?.roles, []);
});

test("roles can be created, renamed, counted, assigned, and deleted", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const roleId = await createRole(db, "writer");

  await setRolesForUser(db, userId, [roleId]);
  assert.deepEqual(await getRolesForUser(db, userId), ["writer"]);
  assert.equal(
    (await getAllRoles(db)).find((role) => role.id === roleId)?.userCount,
    1,
  );

  await updateRole(db, roleId, "editor");
  assert.deepEqual(await getRolesForUser(db, userId), ["editor"]);

  await setRolesForUser(db, userId, []);
  assert.deepEqual(await getRolesForUser(db, userId), []);
  await deleteRole(db, roleId);
  assert.equal(await getRoleByName(db, "editor"), null);
});
