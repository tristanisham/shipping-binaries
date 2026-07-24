import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import {
  COMMENTS_CREATE_PERMISSION,
  INDEFINITE_DENIAL_EXPIRES_AT,
  Permission,
  POSTS_CREATE_PERMISSION,
  POSTS_READ_PERMISSION,
  POSTS_UPDATE_PERMISSION,
  USERS_CREATE_PERMISSION,
  USERS_DELETE_PERMISSION,
  USERS_READ_PERMISSION,
  USERS_UPDATE_PERMISSION,
} from "../../src/models/permission.js";
import { createPost, getPostById } from "../../src/models/post.js";
import { getAllUsers } from "../../src/models/user.js";
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
  // ...but nothing else. The roles page is admin-only, and this role is
  // not admin.
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

test("a non-admin with users:update cannot self-grant admin via /roles", async () => {
  const db = createTestDb();
  const managerId = await seedUser(db, {
    email: "manager2@example.com",
    username: "manager2",
  });
  const roleId = await createRole(db, "user-manager");
  await Permission.assignToRole(db, roleId, USERS_UPDATE_PERMISSION);
  await assignRoleToUser(db, managerId, "user-manager");
  const token = await createSession(db, managerId);

  // The manager edits their OWN roles — the self-lock must NOT hand them admin.
  const res = await app.request(
    `/admin/users/${managerId}/roles`,
    {
      body: new URLSearchParams({ roleIds: String(roleId) }).toString(),
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(res.status, 303);
  assert.deepEqual(await getRolesForUser(db, managerId), ["user-manager"]);
});

test("a non-admin with users:update cannot grant admin via /roles", async () => {
  const db = createTestDb();
  const managerId = await seedUser(db, {
    email: "manager5@example.com",
    username: "manager5",
  });
  const roleId = await createRole(db, "user-manager5");
  await Permission.assignToRole(db, roleId, USERS_UPDATE_PERMISSION);
  await assignRoleToUser(db, managerId, "user-manager5");
  const token = await createSession(db, managerId);
  const adminRole = await getRoleByName(db, ADMIN_ROLE);
  assert.ok(adminRole);

  // The manager explicitly submits the admin role id for themselves — the
  // route must drop it rather than persist the escalation.
  const res = await app.request(
    `/admin/users/${managerId}/roles`,
    {
      body: new URLSearchParams([
        ["roleIds", String(roleId)],
        ["roleIds", String(adminRole.id)],
      ]).toString(),
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(res.status, 303);
  assert.deepEqual(await getRolesForUser(db, managerId), ["user-manager5"]);
  assert.equal(
    await Permission.can(USERS_READ_PERMISSION, db, managerId),
    false,
  );
});

test("a non-admin with users:update cannot strip admin from an admin", async () => {
  const db = createTestDb();
  const adminId = await seedUser(db, {
    email: "keepadmin@example.com",
    username: "keepadmin",
  });
  await assignRoleToUser(db, adminId, ADMIN_ROLE);

  const managerId = await seedUser(db, {
    email: "manager6@example.com",
    username: "manager6",
  });
  const roleId = await createRole(db, "user-manager6");
  await Permission.assignToRole(db, roleId, USERS_UPDATE_PERMISSION);
  await assignRoleToUser(db, managerId, "user-manager6");
  const token = await createSession(db, managerId);

  // The manager posts an empty role set for the admin — admin must survive.
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

test("a non-admin with users:create cannot create a user holding admin", async () => {
  const db = createTestDb();
  const managerId = await seedUser(db, {
    email: "creator@example.com",
    username: "creator",
  });
  const roleId = await createRole(db, "user-creator");
  await Permission.assignToRole(db, roleId, USERS_CREATE_PERMISSION);
  await assignRoleToUser(db, managerId, "user-creator");
  const token = await createSession(db, managerId);
  const adminRole = await getRoleByName(db, ADMIN_ROLE);
  assert.ok(adminRole);

  const email = { send: async () => ({ messageId: "test" }) };
  const res = await app.request(
    "/admin/users",
    {
      body: new URLSearchParams({
        email: "spawned@example.com",
        roleIds: String(adminRole.id),
        username: "spawned",
      }).toString(),
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db, EMAIL: email } as unknown as Env,
  );

  assert.equal(res.status, 303);
  const created = (await getAllUsers(db)).find(
    (u) => u.email === "spawned@example.com",
  );
  assert.ok(created);
  assert.deepEqual(await getRolesForUser(db, created.id), []);
});

test("an admin can still assign the admin role to another user", async () => {
  const db = createTestDb();
  const adminId = await seedUser(db, {
    email: "granter@example.com",
    username: "granter",
  });
  await assignRoleToUser(db, adminId, ADMIN_ROLE);
  const token = await createSession(db, adminId);

  const targetId = await seedUser(db, {
    email: "promoted@example.com",
    username: "promoted",
  });
  const adminRole = await getRoleByName(db, ADMIN_ROLE);
  assert.ok(adminRole);

  const res = await app.request(
    `/admin/users/${targetId}/roles`,
    {
      body: new URLSearchParams({ roleIds: String(adminRole.id) }).toString(),
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(res.status, 303);
  assert.deepEqual(await getRolesForUser(db, targetId), ["admin"]);
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
  // Deny/restore a separate target — a user cannot manage their own denials.
  const target = await seedUser(db, {
    email: "t3@example.com",
    username: "t3",
  });
  await assignRoleToUser(db, target, ADMIN_ROLE);
  const perm = (await Permission.all(db)).find(
    ({ name }) => name === COMMENTS_CREATE_PERMISSION,
  );
  assert.ok(perm);

  // the target holds comments:create by default
  assert.equal(
    await Permission.can(COMMENTS_CREATE_PERMISSION, db, target),
    true,
  );

  const deny = await app.request(
    `/admin/users/${target}/denials`,
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
    await Permission.can(COMMENTS_CREATE_PERMISSION, db, target),
    false,
  );

  const clear = await app.request(
    `/admin/users/${target}/denials/${perm.id}/delete`,
    { headers: form, method: "POST" },
    { DB: db } as Env,
  );
  assert.equal(clear.status, 303);
  assert.equal(
    await Permission.can(COMMENTS_CREATE_PERMISSION, db, target),
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

test("a user cannot deny their own permissions (self-lockout guard)", async () => {
  const db = createTestDb();
  const admin = await seedUser(db, {
    email: "self-deny@example.com",
    username: "selfdeny",
  });
  await assignRoleToUser(db, admin, ADMIN_ROLE);
  const token = await createSession(db, admin);
  const perm = (await Permission.all(db)).find(
    ({ name }) => name === USERS_UPDATE_PERMISSION,
  );
  assert.ok(perm);

  const res = await app.request(
    `/admin/users/${admin}/denials`,
    {
      body: new URLSearchParams({
        duration: "indefinite",
        permissionId: String(perm.id),
      }).toString(),
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  // Redirected back, but the denial was not written — access is intact.
  assert.equal(res.status, 303);
  assert.deepEqual(await Permission.denialsForUser(db, admin), []);
  assert.equal(await Permission.can(USERS_UPDATE_PERMISSION, db, admin), true);
});

test("a user cannot self-restore a denial an admin placed on them", async () => {
  const db = createTestDb();
  const managerId = await seedUser(db, {
    email: "self-restore@example.com",
    username: "selfrestore",
  });
  const roleId = await createRole(db, "user-manager7");
  await Permission.assignToRole(db, roleId, USERS_UPDATE_PERMISSION);
  await Permission.assignToRole(db, roleId, COMMENTS_CREATE_PERMISSION);
  await assignRoleToUser(db, managerId, "user-manager7");
  const token = await createSession(db, managerId);
  const perm = (await Permission.all(db)).find(
    ({ name }) => name === COMMENTS_CREATE_PERMISSION,
  );
  assert.ok(perm);

  // An admin has denied this user's comments:create.
  await Permission.deny(db, managerId, perm.id, INDEFINITE_DENIAL_EXPIRES_AT);
  assert.equal(
    await Permission.can(COMMENTS_CREATE_PERMISSION, db, managerId),
    false,
  );

  const res = await app.request(
    `/admin/users/${managerId}/denials/${perm.id}/delete`,
    {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  // The self-restore is refused; the denial stands.
  assert.equal(res.status, 303);
  assert.equal(
    await Permission.can(COMMENTS_CREATE_PERMISSION, db, managerId),
    false,
  );
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

test("role administration is admin-only, not delegatable by permission", async () => {
  const db = createTestDb();
  // A highly privileged non-admin: holds every non-roles permission.
  const userId = await seedUser(db, {
    email: "super@example.com",
    username: "super",
  });
  const roleId = await createRole(db, "super-manager");
  for (const permission of await Permission.all(db)) {
    await Permission.assignToRole(db, roleId, permission.name);
  }
  await assignRoleToUser(db, userId, "super-manager");
  const token = await createSession(db, userId);
  const cookie = `${SESSION_COOKIE_NAME}=${token}`;
  const form = {
    Cookie: cookie,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Cannot view the roles page...
  const view = await app.request(
    "/admin/roles",
    { headers: { Cookie: cookie } },
    { DB: db } as Env,
  );
  assert.equal(view.status, 403);

  // ...nor create a role...
  const create = await app.request(
    "/admin/roles",
    {
      body: new URLSearchParams({ name: "sneaky" }).toString(),
      headers: form,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(create.status, 403);

  // ...nor create a permission.
  const createPerm = await app.request(
    "/admin/roles/permissions",
    {
      body: new URLSearchParams({ name: "posts:sneak" }).toString(),
      headers: form,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(createPerm.status, 403);
});

test("admin pages remain role-gated while user mutations enforce permissions", async () => {
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
  assert.equal(createRoleResponse.status, 303);
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
