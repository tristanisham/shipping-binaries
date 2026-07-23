import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import {
  assignPermissionToRole,
  getAllPermissions,
  getPermissionsForRole,
  POSTS_READ_PERMISSION,
  POSTS_UPDATE_PERMISSION,
  USERS_READ_PERMISSION,
} from "../../src/models/permission.js";
import { createPost } from "../../src/models/post.js";
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

test("a granted permission opens exactly its own admin page", async () => {
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

  // users:read grants the users page...
  const usersPage = await app.request(
    "/admin/users",
    { headers },
    { DB: db } as Env,
  );
  // ...but nothing else. The roles page needs roles:read, which this role
  // does not hold.
  const forbidden = await app.request(
    "/admin/roles",
    { headers },
    { DB: db } as Env,
  );

  assert.equal(usersPage.status, 200);
  assert.equal(forbidden.status, 403);
});

test("the admin role reaches every admin page", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "boss@example.com",
    username: "boss",
  });
  await assignRoleToUser(db, userId, ADMIN_ROLE);
  const token = await createSession(db, userId);
  const headers = { Cookie: `${SESSION_COOKIE_NAME}=${token}` };

  for (
    const path of ["/admin", "/admin/posts", "/admin/roles", "/admin/users"]
  ) {
    const res = await app.request(path, { headers }, { DB: db } as Env);
    assert.equal(res.status, 200, `${path} should be reachable by admin`);
  }
});

test("the dashboard opens for any single admin permission", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "reader@example.com",
    username: "reader",
  });
  const roleId = await createRole(db, "reader");
  await assignPermissionToRole(db, roleId, POSTS_READ_PERMISSION);
  await assignRoleToUser(db, userId, "reader");
  const token = await createSession(db, userId);
  const headers = { Cookie: `${SESSION_COOKIE_NAME}=${token}` };

  // posts:read alone is enough to see the aggregate dashboard...
  const dashboard = await app.request("/admin", { headers }, { DB: db } as Env);
  assert.equal(dashboard.status, 200);
  // ...but not the users page, which needs users:read.
  const users = await app.request(
    "/admin/users",
    { headers },
    { DB: db } as Env,
  );
  assert.equal(users.status, 403);
});

test("posts:update lets a non-owner reach any post editor", async () => {
  const db = createTestDb();
  const ownerId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
  });
  const editorId = await seedUser(db, {
    email: "editor@example.com",
    username: "editor",
  });
  const postId = await createPost(db, {
    body: "Body",
    description: "",
    draft: false,
    image: "",
    keywords: [],
    slug: "owned",
    title: "Owned",
    userId: ownerId,
  });
  const roleId = await createRole(db, "post-editor");
  await assignPermissionToRole(db, roleId, POSTS_UPDATE_PERMISSION);
  await assignRoleToUser(db, editorId, "post-editor");
  const token = await createSession(db, editorId);
  const headers = { Cookie: `${SESSION_COOKIE_NAME}=${token}` };

  const editor = await app.request(
    `/admin/write?id=${postId}`,
    { headers },
    { DB: db } as Env,
  );
  assert.equal(editor.status, 200);
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
