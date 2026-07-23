import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../../src/auth/password.js";
import app from "../../src/index.js";
import {
  createPost,
  getPostById,
  setPostDraft,
} from "../../src/models/post.js";
import { getPublicProfileByUsername } from "../../src/models/profile.js";
import { ADMIN_ROLE, getRoleByName } from "../../src/models/role.js";
import { findUserByLogin, getUserById } from "../../src/models/user.js";
import {
  createSession,
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "../../src/models/session.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

const createAdminSession = async (db: D1Database): Promise<string> => {
  const userId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
  });

  await db
    .prepare(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES (?1, (SELECT id FROM roles WHERE name = 'admin'))`,
    )
    .bind(userId)
    .run();

  return createSession(db, userId);
};

type CapturedEmail = {
  html?: string;
  subject: string;
  text?: string;
  to: string | EmailAddress | (string | EmailAddress)[];
};

const createEmailCapture = (): {
  binding: SendEmail;
  messages: CapturedEmail[];
} => {
  const messages: CapturedEmail[] = [];
  const binding = {
    send: async (message: EmailMessage | EmailMessageBuilder) => {
      if ("subject" in message && "to" in message) {
        messages.push(message as CapturedEmail);
      }
      return { messageId: `test-${messages.length}` };
    },
  } as SendEmail;

  return { binding, messages };
};

const tokenFromEmail = (message: CapturedEmail, path: string): string => {
  const match = message.text?.match(new RegExp(`${path}\\?token=([a-f0-9]+)`));
  assert.ok(match);
  return match[1];
};

const autosave = (
  db: D1Database,
  token: string,
  values: Record<string, string>,
) =>
  app.request(
    "/admin/write",
    {
      body: new URLSearchParams({
        postAction: "autosave",
        body: "Body",
        currentDraft: "1",
        description: "Description",
        image: "",
        keywords: "Hono, Alpine",
        slug: "autosaved-post",
        title: "Autosaved post",
        ...values,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

test("autosave creates a draft and returns its id as JSON", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const response = await autosave(db, token, {});

  assert.equal(response.status, 201);
  const result = await response.json() as {
    id: number;
    saved: boolean;
    slug: string;
  };
  assert.equal(result.saved, true);
  assert.equal(result.slug, "autosaved-post");

  const post = await getPostById(db, result.id);
  assert.equal(post?.title, "Autosaved post");
  assert.equal(post?.draft, true);
});

test("autosave updates an existing post without changing published state", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const created = await autosave(db, token, {});
  const { id } = await created.json() as { id: number };
  await setPostDraft(db, id, false);

  const response = await autosave(db, token, {
    currentDraft: "0",
    id: String(id),
    title: "Updated by autosave",
  });

  assert.equal(response.status, 200);
  const result = await response.json() as {
    id: number;
    saved: boolean;
    slug: string;
  };
  assert.deepEqual(result, { id, saved: true, slug: "autosaved-post" });

  const post = await getPostById(db, id);
  assert.equal(post?.title, "Updated by autosave");
  assert.equal(post?.draft, false);
});

test("autosave generates a unique slug from the title in automatic mode", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const first = await autosave(db, token, {
    slug: "",
    slugMode: "auto",
    title: "Generated Slug",
  });
  const second = await autosave(db, token, {
    slug: "",
    slugMode: "auto",
    title: "Generated Slug",
  });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal((await first.json() as { slug: string }).slug, "generated-slug");
  assert.equal(
    (await second.json() as { slug: string }).slug,
    "generated-slug-2",
  );
});

test("autosave rejects malformed custom slugs", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const response = await autosave(db, token, {
    slug: "Not a valid slug",
    slugMode: "custom",
  });

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: {
      slug: "Use lowercase letters, numbers, and single hyphens only.",
    },
    saved: false,
  });
  const count = await db.prepare("SELECT COUNT(*) AS count FROM posts")
    .first<{ count: number }>();
  assert.equal(count?.count, 0);
});

test("autosave rejects a custom slug already used by another post", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const first = await autosave(db, token, { slug: "chosen-slug" });
  const response = await autosave(db, token, { slug: "chosen-slug" });

  assert.equal(first.status, 201);
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: { slug: "That slug is already used by another post." },
    saved: false,
  });
});

test("inline user identity updates preserve active status", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const owner = await findUserByLogin(db, "owner");
  assert.ok(owner);

  const response = await app.request(
    `/admin/users/${owner.id}`,
    {
      body: new URLSearchParams({
        email: "updated@example.com",
        label: "Site Owner",
        username: "updated-owner",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(response.status, 303);
  const updated = await findUserByLogin(db, "updated-owner");
  assert.equal(updated?.email, "updated@example.com");
  assert.equal(updated?.label, "Site Owner");
  assert.equal(updated?.active, 1);
});

test("inline user saves return JSON success and failure states", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const owner = await findUserByLogin(db, "owner");
  assert.ok(owner);

  const success = await app.request(
    `/admin/users/${owner.id}`,
    {
      body: new URLSearchParams({
        email: owner.email,
        label: "Owner",
        username: owner.username,
      }).toString(),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), { saved: true });

  await seedUser(db, {
    email: "taken@example.com",
    username: "taken",
  });
  const failure = await app.request(
    `/admin/users/${owner.id}`,
    {
      body: new URLSearchParams({
        email: "taken@example.com",
        label: "Owner",
        username: owner.username,
      }).toString(),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(failure.status, 409);
  assert.deepEqual(await failure.json(), { saved: false });
});

test("admins manage roles and assign them from the users view", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);

  const created = await app.request(
    "/admin/roles",
    {
      body: new URLSearchParams({ name: "writer" }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(created.status, 303);

  const writerRole = await getRoleByName(db, "writer");
  assert.ok(writerRole);
  assert.equal(
    created.headers.get("location"),
    `/admin/roles?role=${writerRole.id}`,
  );
  const userId = await seedUser(db, {
    email: "writer@example.com",
    username: "writer",
  });
  const updated = await app.request(
    `/admin/users/${userId}`,
    {
      body: new URLSearchParams({
        email: "writer@example.com",
        label: "Writer",
        username: "writer",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(updated.status, 303);

  const assigned = await app.request(
    `/admin/users/${userId}/roles`,
    {
      body: new URLSearchParams({
        roleIds: String(writerRole.id),
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(assigned.status, 303);
  assert.deepEqual((await getUserById(db, userId))?.roles, ["writer"]);

  const page = await app.request(
    `/admin/roles?role=${writerRole.id}`,
    { headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` } },
    { DB: db } as Env,
  );
  assert.equal(page.status, 200);
  assert.match(await page.text(), /value="writer"/);

  const adminRole = await getRoleByName(db, ADMIN_ROLE);
  assert.ok(adminRole);
  const protectedDelete = await app.request(
    `/admin/roles/${adminRole.id}/delete`,
    {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(protectedDelete.status, 400);
});

test("non-admin users can access account but not admin management", async () => {
  const db = createTestDb();
  const passwordHash = await hashPassword("correct horse battery staple");
  const userId = await seedUser(db, {
    email: "member@example.com",
    passwordHash,
    username: "member",
  });
  const token = await createSession(db, userId);
  const headers = { Cookie: `${SESSION_COOKIE_NAME}=${token}` };

  const account = await app.request(
    "/admin/account",
    { headers },
    { DB: db } as Env,
  );
  assert.equal(account.status, 200);
  const accountHtml = await account.text();
  assert.match(accountHtml, /member@example\.com/);
  assert.match(accountHtml, /aria-label="Open user menu"/);
  assert.match(accountHtml, /role="menu"/);
  assert.match(accountHtml, /href="\/@member"/);
  assert.match(accountHtml, /name="label"/);
  assert.match(accountHtml, /name="biography"/);
  assert.doesNotMatch(accountHtml, />Dashboard<\/a>/);

  const dashboard = await app.request(
    "/admin",
    { headers },
    { DB: db } as Env,
  );
  assert.equal(dashboard.status, 403);

  const posts = await app.request(
    "/admin/posts",
    { headers },
    { DB: db } as Env,
  );
  assert.equal(posts.status, 403);

  const login = await app.request(
    "/login",
    {
      body: new URLSearchParams({
        login: "member",
        password: "correct horse battery staple",
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(login.status, 303);
  assert.equal(login.headers.get("Location"), "/admin/account");
});

test("post authors can edit their own posts but not others' or new ones", async () => {
  const db = createTestDb();
  const authorId = await seedUser(db, {
    email: "author@example.com",
    username: "author",
  });
  const otherId = await seedUser(db, {
    email: "other@example.com",
    username: "other",
  });
  const ownPostId = await createPost(db, {
    userId: authorId,
    slug: "authors-post",
    title: "Author's post",
    description: "",
    keywords: [],
    image: "",
    body: "Original body",
    draft: false,
  });
  const otherPostId = await createPost(db, {
    userId: otherId,
    slug: "others-post",
    title: "Other's post",
    description: "",
    keywords: [],
    image: "",
    body: "Other body",
    draft: false,
  });
  const token = await createSession(db, authorId);
  const headers = { Cookie: `${SESSION_COOKIE_NAME}=${token}` };

  // The author has no posts permissions, only ownership of their own post.
  const ownEditor = await app.request(
    `/admin/write?id=${ownPostId}`,
    { headers },
    { DB: db } as Env,
  );
  assert.equal(ownEditor.status, 200);

  // Creating a new post needs posts:create, which the author lacks.
  const newEditor = await app.request(
    "/admin/write",
    { headers },
    { DB: db } as Env,
  );
  assert.equal(newEditor.status, 403);

  // Editing someone else's post needs posts:update, which the author lacks.
  const otherEditor = await app.request(
    `/admin/write?id=${otherPostId}`,
    { headers },
    { DB: db } as Env,
  );
  assert.equal(otherEditor.status, 403);

  const update = await app.request(
    "/admin/write",
    {
      body: new URLSearchParams({
        action: "publish",
        body: "Updated body",
        description: "",
        id: String(ownPostId),
        image: "",
        keywords: "",
        slug: "authors-post",
        slugMode: "custom",
        title: "Updated author's post",
      }).toString(),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(update.status, 303);
  assert.equal(
    (await getPostById(db, ownPostId))?.title,
    "Updated author's post",
  );

  const forbiddenUpdate = await app.request(
    "/admin/write",
    {
      body: new URLSearchParams({
        action: "publish",
        body: "Changed",
        description: "",
        id: String(otherPostId),
        image: "",
        keywords: "",
        slug: "others-post",
        slugMode: "custom",
        title: "Changed",
      }).toString(),
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(forbiddenUpdate.status, 403);
  assert.equal((await getPostById(db, otherPostId))?.title, "Other's post");
});

test("account update verifies the current password and forces sign-in", async () => {
  const db = createTestDb();
  const passwordHash = await hashPassword("Old-password!1");
  const userId = await seedUser(db, {
    email: "member@example.com",
    passwordHash,
    username: "member",
  });
  const token = await createSession(db, userId);

  const response = await app.request(
    "/admin/account",
    {
      body: new URLSearchParams({
        biography: "I build useful things.",
        currentPassword: "Old-password!1",
        email: "updated@example.com",
        label: "Updated Member",
        newPassword: "New-password!2",
        newPasswordConfirmation: "New-password!2",
        username: "updated-member",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("Location"), "/login?password=updated");
  assert.match(response.headers.get("Set-Cookie") ?? "", /shipping_session=;/);
  assert.equal(await getSessionUser(db, token), null);

  const updated = await findUserByLogin(db, "updated-member");
  assert.equal(updated?.email, "updated@example.com");
  assert.equal(updated?.label, "Updated Member");
  assert.equal(
    updated && await verifyPassword("New-password!2", updated.password_hash),
    true,
  );
  assert.equal(
    updated && await verifyPassword("Old-password!1", updated.password_hash),
    false,
  );
  assert.deepEqual(await getPublicProfileByUsername(db, "updated-member"), {
    biography: "I build useful things.",
    id: userId,
    label: "Updated Member",
    username: "updated-member",
  });
});

test("account update rejects invalid credentials without leaking passwords", async () => {
  const db = createTestDb();
  const passwordHash = await hashPassword("Old-password!1");
  const userId = await seedUser(db, {
    email: "member@example.com",
    passwordHash,
    username: "member",
  });
  const token = await createSession(db, userId);
  const submittedCurrentPassword = "Wrong-password!1";
  const submittedNewPassword = "New-password!2";

  const response = await app.request(
    "/admin/account",
    {
      body: new URLSearchParams({
        currentPassword: submittedCurrentPassword,
        email: "changed@example.com",
        newPassword: submittedNewPassword,
        newPasswordConfirmation: submittedNewPassword,
        username: "changed-member",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(response.status, 422);
  const html = await response.text();
  assert.match(html, /Current password is incorrect\./);
  assert.doesNotMatch(html, new RegExp(submittedCurrentPassword));
  assert.doesNotMatch(html, new RegExp(submittedNewPassword));
  assert.ok(await getSessionUser(db, token));
  assert.ok(await findUserByLogin(db, "member"));
  assert.equal(await findUserByLogin(db, "changed-member"), null);
});

test("account update enforces password rules on the server", async () => {
  const db = createTestDb();
  const passwordHash = await hashPassword("Old-password!1");
  const userId = await seedUser(db, {
    email: "member@example.com",
    passwordHash,
    username: "member",
  });
  const token = await createSession(db, userId);

  const response = await app.request(
    "/admin/account",
    {
      body: new URLSearchParams({
        currentPassword: "Old-password!1",
        email: "member@example.com",
        newPassword: "NoSpecial123",
        newPasswordConfirmation: "NoSpecial123",
        username: "member",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(response.status, 422);
  assert.match(
    await response.text(),
    /Include at least one special character\./,
  );
  assert.ok(await getSessionUser(db, token));
});

test("admin can invite a user who activates their account", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const email = createEmailCapture();
  const adminRole = await getRoleByName(db, ADMIN_ROLE);
  assert.ok(adminRole);

  const response = await app.request(
    "/admin/users",
    {
      body: new URLSearchParams({
        email: "writer@example.com",
        label: "New Writer",
        roleIds: String(adminRole.id),
        username: "writer",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db, EMAIL: email.binding } as Env,
  );

  assert.equal(response.status, 303);
  const writer = await findUserByLogin(db, "writer");
  assert.equal(writer?.email, "writer@example.com");
  assert.equal(writer?.label, "New Writer");
  assert.equal(writer?.active, 0);
  assert.deepEqual((await getUserById(db, writer?.id ?? 0))?.roles, ["admin"]);
  assert.equal(email.messages.length, 1);
  assert.equal(email.messages[0].to, "writer@example.com");
  assert.match(email.messages[0].subject, /invited/i);

  const inviteToken = tokenFromEmail(email.messages[0], "/invite");
  const stored = await db.prepare(
    "SELECT token_hash FROM auth_tokens WHERE user_id = ?1",
  ).bind(writer?.id).first<{ token_hash: string }>();
  assert.notEqual(stored?.token_hash, inviteToken);

  const accept = await app.request(
    "/invite",
    {
      body: new URLSearchParams({
        password: "correct horse battery staple",
        passwordConfirmation: "correct horse battery staple",
        token: inviteToken,
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
    { DB: db, EMAIL: email.binding } as Env,
  );

  assert.equal(accept.status, 303);
  assert.equal(accept.headers.get("Location"), "/login?password=updated");
  const activated = await findUserByLogin(db, "writer");
  assert.equal(activated?.active, 1);
  assert.equal(
    activated && await verifyPassword(
      "correct horse battery staple",
      activated.password_hash,
    ),
    true,
  );

  const reused = await app.request(
    `/invite?token=${inviteToken}`,
    {},
    { DB: db, EMAIL: email.binding } as Env,
  );
  assert.equal(reused.status, 400);
});

test("password reset is generic, single-use, and revokes sessions", async () => {
  const db = createTestDb();
  const passwordHash = await hashPassword("old password phrase");
  const userId = await seedUser(db, {
    email: "writer@example.com",
    passwordHash,
    username: "writer",
  });
  const session = await createSession(db, userId);
  const email = createEmailCapture();

  const request = await app.request(
    "/forgot-password",
    {
      body: new URLSearchParams({ email: "writer@example.com" }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
    { DB: db, EMAIL: email.binding } as Env,
  );
  assert.equal(request.status, 200);
  assert.match(await request.text(), /If an active account matches/);
  assert.equal(email.messages.length, 1);

  const unknown = await app.request(
    "/forgot-password",
    {
      body: new URLSearchParams({ email: "missing@example.com" }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
    { DB: db, EMAIL: email.binding } as Env,
  );
  assert.equal(unknown.status, 200);
  assert.match(await unknown.text(), /If an active account matches/);
  assert.equal(email.messages.length, 1);

  const resetToken = tokenFromEmail(email.messages[0], "/reset-password");
  const reset = await app.request(
    "/reset-password",
    {
      body: new URLSearchParams({
        password: "new password phrase",
        passwordConfirmation: "new password phrase",
        token: resetToken,
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
    { DB: db, EMAIL: email.binding } as Env,
  );

  assert.equal(reset.status, 303);
  assert.equal(await getSessionUser(db, session), null);
  const updated = await findUserByLogin(db, "writer");
  assert.equal(
    updated &&
      await verifyPassword("new password phrase", updated.password_hash),
    true,
  );

  const reused = await app.request(
    `/reset-password?token=${resetToken}`,
    {},
    { DB: db, EMAIL: email.binding } as Env,
  );
  assert.equal(reused.status, 400);
});
