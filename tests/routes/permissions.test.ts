import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import {
  COMMENTS_CREATE_PERMISSION,
  Permission,
  POSTS_READ_PERMISSION,
  POSTS_UPDATE_PERMISSION,
  USERS_READ_PERMISSION,
} from "../../src/models/permission.js";
import { createPost } from "../../src/models/post.js";
import {
  ADMIN_ROLE,
  assignRoleToUser,
  createRole,
  getRoleByName,
  getRolesForUser,
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
  await Permission.assignToRole(db, roleId, USERS_READ_PERMISSION);
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
  await Permission.assignToRole(db, roleId, POSTS_READ_PERMISSION);
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
  await Permission.assignToRole(db, roleId, POSTS_UPDATE_PERMISSION);
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

test("users:update guards every user-mutating route (no escalation)", async () => {
  const db = createTestDb();
  const attackerId = await seedUser(db, {
    email: "attacker@example.com",
    username: "attacker",
  });
  const victimId = await seedUser(db, {
    email: "victim@example.com",
    username: "victim",
  });
  // The attacker has no roles or permissions, like a fresh signup.
  const token = await createSession(db, attackerId);
  const headers = { Cookie: `${SESSION_COOKIE_NAME}=${token}` };
  const form = {
    ...headers,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Cannot grant themselves a role via the user-update endpoint...
  const escalate = await app.request(
    `/admin/users/${attackerId}`,
    {
      body: new URLSearchParams({
        email: "attacker@example.com",
        roleIds: "1",
        username: "attacker",
      }).toString(),
      headers: form,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(escalate.status, 403);

  // ...cannot open the edit form...
  const editForm = await app.request(
    `/admin/users/${victimId}/edit`,
    { headers },
    { DB: db } as Env,
  );
  assert.equal(editForm.status, 403);

  // ...and cannot toggle another user's active state.
  const toggle = await app.request(
    `/admin/users/${victimId}/active`,
    {
      body: new URLSearchParams({ active: "0" }).toString(),
      headers: form,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(toggle.status, 403);
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
  const permission = (await Permission.all(db)).find(
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
    (await Permission.forRole(db, targetRoleId)).map(({ name }) => name),
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
  assert.deepEqual(await Permission.forRole(db, targetRoleId), []);
});

test("role save moves to /roles and enforces users:update", async () => {
  const db = createTestDb();
  const admin = await seedUser(db, {
    email: "a2@example.com",
    username: "a2",
  });
  const target = await seedUser(db, {
    email: "t2@example.com",
    username: "t2",
  });
  await assignRoleToUser(db, admin, ADMIN_ROLE);
  const token = await createSession(db, admin);
  const form = {
    Cookie: `${SESSION_COOKIE_NAME}=${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const editorRole = await getRoleByName(db, "editor");
  assert.ok(editorRole);

  const res = await app.request(
    `/admin/users/${target}/roles`,
    {
      body: new URLSearchParams({ roleIds: String(editorRole.id) }).toString(),
      headers: form,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(res.status, 303);
  assert.deepEqual(await getRolesForUser(db, target), ["editor"]);
});

test("a user cannot strip their own admin role via /roles", async () => {
  const db = createTestDb();
  const adminId = await seedUser(db, {
    email: "self@example.com",
    username: "self",
  });
  await assignRoleToUser(db, adminId, ADMIN_ROLE);
  const token = await createSession(db, adminId);

  // Post an empty role set for themselves — admin must be retained.
  const res = await app.request(
    `/admin/users/${adminId}/roles`,
    {
      body: new URLSearchParams({}).toString(),
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(res.status, 303);
  assert.deepEqual(await getRolesForUser(db, adminId), ["admin"]);
});

test("denying comments:create blocks commenting; clearing restores it", async () => {
  const db = createTestDb();
  const admin = await seedUser(db, {
    email: "a3@example.com",
    username: "a3",
  });
  await assignRoleToUser(db, admin, ADMIN_ROLE);
  const token = await createSession(db, admin);
  const form = {
    Cookie: `${SESSION_COOKIE_NAME}=${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const perm = (await Permission.all(db)).find(
    ({ name }) => name === COMMENTS_CREATE_PERMISSION,
  );
  assert.ok(perm);

  // admin holds comments:create by default
  assert.equal(
    await Permission.can(COMMENTS_CREATE_PERMISSION, db, admin),
    true,
  );

  const deny = await app.request(
    `/admin/users/${admin}/denials`,
    {
      body: new URLSearchParams({
        duration: "indefinite",
        permissionId: String(perm.id),
      }).toString(),
      headers: form,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(deny.status, 303);
  assert.equal(
    await Permission.can(COMMENTS_CREATE_PERMISSION, db, admin),
    false,
  );

  const clear = await app.request(
    `/admin/users/${admin}/denials/${perm.id}/delete`,
    { headers: form, method: "POST" },
    { DB: db } as Env,
  );
  assert.equal(clear.status, 303);
  assert.equal(
    await Permission.can(COMMENTS_CREATE_PERMISSION, db, admin),
    true,
  );
});

test("denial routes require users:update", async () => {
  const db = createTestDb();
  const nobody = await seedUser(db, {
    email: "n@example.com",
    username: "nobody",
  });
  const token = await createSession(db, nobody);
  const res = await app.request(
    `/admin/users/${nobody}/denials`,
    {
      body: new URLSearchParams({ duration: "1h", permissionId: "1" })
        .toString(),
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(res.status, 403);
});

test("GET /admin/users/:id/permissions renders for users:update, 403 otherwise", async () => {
  const db = createTestDb();
  const admin = await seedUser(db, {
    email: "a4@example.com",
    username: "a4",
  });
  const target = await seedUser(db, {
    email: "t4@example.com",
    username: "t4",
  });
  await assignRoleToUser(db, admin, ADMIN_ROLE);
  const adminToken = await createSession(db, admin);
  const ok = await app.request(
    `/admin/users/${target}/permissions`,
    { headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` } },
    { DB: db } as Env,
  );
  assert.equal(ok.status, 200);
  assert.ok((await ok.text()).includes(`/admin/users/${target}/roles`));

  const nobodyToken = await createSession(db, target);
  const denied = await app.request(
    `/admin/users/${target}/permissions`,
    { headers: { Cookie: `${SESSION_COOKIE_NAME}=${nobodyToken}` } },
    { DB: db } as Env,
  );
  assert.equal(denied.status, 403);
});
