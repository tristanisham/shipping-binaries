import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import {
  assignPermissionToRole,
  getAllPermissions,
  getPermissionsForRole,
  POSTS_CREATE_PERMISSION,
  POSTS_UPDATE_PERMISSION,
  USERS_CREATE_PERMISSION,
  USERS_DELETE_PERMISSION,
  USERS_READ_PERMISSION,
  USERS_UPDATE_PERMISSION,
} from "../../src/models/permission.js";
import { createPost, getPostById } from "../../src/models/post.js";
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

const revokeAdminPermission = async (
  db: D1Database,
  permission: string,
): Promise<void> => {
  await db
    .prepare(
      `DELETE FROM role_permissions
       WHERE role_id = (SELECT id FROM roles WHERE name = 'admin')
         AND permission_id = (
           SELECT id FROM permissions WHERE name = ?1
         )`,
    )
    .bind(permission)
    .run();
};

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

test("admin pages remain role-gated while mutations enforce permissions", async () => {
  const db = createTestDb();
  const adminId = await seedUser(db, {
    email: "admin@example.com",
    username: "admin",
  });
  await assignRoleToUser(db, adminId, ADMIN_ROLE);
  const token = await createSession(db, adminId);
  const cookie = `${SESSION_COOKIE_NAME}=${token}`;
  const formHeaders = {
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookie,
  };
  const targetId = await seedUser(db, {
    email: "target@example.com",
    username: "target",
  });
  const postId = await createPost(db, {
    body: "Body",
    description: "",
    draft: false,
    image: "",
    keywords: [],
    slug: "permission-test",
    title: "Permission test",
    userId: adminId,
  });

  await revokeAdminPermission(db, POSTS_CREATE_PERMISSION);
  const createPostResponse = await app.request(
    "/admin/write",
    {
      body: new URLSearchParams({
        action: "draft",
        body: "Body",
        description: "",
        image: "",
        keywords: "",
        slug: "blocked-post",
        slugMode: "custom",
        title: "Blocked post",
      }).toString(),
      headers: formHeaders,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(createPostResponse.status, 403);

  await revokeAdminPermission(db, POSTS_UPDATE_PERMISSION);
  const updatePostResponse = await app.request(
    `/admin/posts/${postId}/draft`,
    {
      body: new URLSearchParams({ draft: "1" }).toString(),
      headers: formHeaders,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(updatePostResponse.status, 403);
  assert.equal((await getPostById(db, postId))?.draft, false);

  await revokeAdminPermission(db, USERS_CREATE_PERMISSION);
  const createUserResponse = await app.request(
    "/admin/users",
    {
      body: new URLSearchParams({
        email: "blocked@example.com",
        username: "blocked",
      }).toString(),
      headers: formHeaders,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(createUserResponse.status, 403);

  await revokeAdminPermission(db, USERS_UPDATE_PERMISSION);
  const rolesPage = await app.request(
    "/admin/roles",
    { headers: { Cookie: cookie } },
    { DB: db } as Env,
  );
  assert.equal(rolesPage.status, 200);
  const createRoleResponse = await app.request(
    "/admin/roles",
    {
      body: new URLSearchParams({ name: "blocked-role" }).toString(),
      headers: formHeaders,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(createRoleResponse.status, 403);
  const updateUserResponse = await app.request(
    `/admin/users/${targetId}`,
    {
      body: new URLSearchParams({
        email: "changed@example.com",
        label: "Changed",
        username: "changed",
      }).toString(),
      headers: formHeaders,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(updateUserResponse.status, 403);

  await revokeAdminPermission(db, USERS_DELETE_PERMISSION);
  const deactivateResponse = await app.request(
    `/admin/users/${targetId}/active`,
    {
      body: new URLSearchParams({ active: "0" }).toString(),
      headers: formHeaders,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(deactivateResponse.status, 403);
});
