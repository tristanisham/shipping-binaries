import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import {
  assignPermissionToRole,
  getAllPermissions,
  getPermissionsForRole,
  USERS_READ_PERMISSION,
} from "../../src/models/permission.js";
import {
  ADMIN_ROLE,
  assignRoleToUser,
  createRole,
} from "../../src/models/role.js";
import {
  createSession,
  SESSION_COOKIE_NAME,
} from "../../src/models/session.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("permissions do not bypass admin-role page guards", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "manager@example.com",
    username: "manager",
  });
  const roleId = await createRole(db, "user-manager");
  await assignPermissionToRole(db, roleId, USERS_READ_PERMISSION);
  await assignRoleToUser(db, userId, "user-manager");
  const token = await createSession(db, userId);
  const headers = { Cookie: `${SESSION_COOKIE_NAME}=${token}` };

  const usersPage = await app.request(
    "/admin/users",
    { headers },
    { DB: db } as Env,
  );
  const forbidden = await app.request(
    "/admin/roles",
    { headers },
    { DB: db } as Env,
  );

  assert.equal(usersPage.status, 403);
  assert.equal(forbidden.status, 403);
});

test("admins can create and toggle permissions for a selected role", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "roles@example.com",
    username: "roles-manager",
  });
  const targetRoleId = await createRole(db, "writer");
  await assignRoleToUser(db, userId, ADMIN_ROLE);
  const token = await createSession(db, userId);
  const cookie = `${SESSION_COOKIE_NAME}=${token}`;

  const created = await app.request(
    `/admin/roles/permissions?role=${targetRoleId}`,
    {
      body: new URLSearchParams({ name: "Posts : Publish" }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(created.status, 303);
  assert.equal(
    created.headers.get("location"),
    `/admin/roles?role=${targetRoleId}`,
  );
  const permission = (await getAllPermissions(db)).find(
    ({ name }) => name === "posts:publish",
  );
  assert.ok(permission);

  const assigned = await app.request(
    `/admin/roles/${targetRoleId}/permissions/${permission.id}`,
    {
      body: new URLSearchParams({ assigned: "1" }).toString(),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(assigned.status, 200);
  assert.deepEqual(await assigned.json(), { assigned: true });
  assert.deepEqual(
    (await getPermissionsForRole(db, targetRoleId)).map(({ name }) => name),
    ["posts:publish"],
  );

  const removed = await app.request(
    `/admin/roles/${targetRoleId}/permissions/${permission.id}`,
    {
      body: new URLSearchParams({ assigned: "0" }).toString(),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { assigned: false });
  assert.deepEqual(await getPermissionsForRole(db, targetRoleId), []);
});
