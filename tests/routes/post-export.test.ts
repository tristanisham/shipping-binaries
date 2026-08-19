import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import { createPost } from "../../src/models/post.js";
import {
  Permission,
  POSTS_READ_PERMISSION,
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
import { readTarGzEntries, readZipEntries } from "../helpers/archive.js";

const body = (text: string): string =>
  JSON.stringify({ blocks: [{ type: "paragraph", data: { text } }] });

const seedPosts = async (db: D1Database) => {
  const ownerId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
  });
  const authorId = await seedUser(db, {
    email: "author@example.com",
    username: "author",
  });

  await createPost(db, {
    body: body("Owner published."),
    description: "Owner published post",
    draft: false,
    image: "",
    keywords: ["shipping", "binaries"],
    slug: "owner-live",
    title: "Owner live",
    userId: ownerId,
  });
  await createPost(db, {
    body: body("Owner draft."),
    description: "",
    draft: true,
    image: "",
    keywords: [],
    slug: "owner-draft",
    title: "Owner draft",
    userId: ownerId,
  });
  await createPost(db, {
    body: body("Author draft."),
    description: "",
    draft: true,
    image: "",
    keywords: [],
    slug: "author-draft",
    title: "Author draft",
    userId: authorId,
  });

  return { authorId, ownerId };
};

const signIn = async (db: D1Database, userId: number) => ({
  Cookie: `${SESSION_COOKIE_NAME}=${await createSession(db, userId)}`,
});

const exportZip = async (
  db: D1Database,
  headers: Record<string, string>,
  scope: string,
  authors = "all",
) => {
  const response = await app.request(
    `/admin/posts/export?scope=${scope}&authors=${authors}`,
    { headers },
    { DB: db } as Env,
  );
  assert.equal(response.status, 200);
  return readZipEntries(new Uint8Array(await response.arrayBuffer()));
};

const exportedNames = async (
  db: D1Database,
  headers: Record<string, string>,
  authors: string,
) => [...(await exportZip(db, headers, "all", authors)).keys()].sort();

test("each scope selects the right posts", async () => {
  const db = createTestDb();
  const { ownerId } = await seedPosts(db);
  await assignRoleToUser(db, ownerId, ADMIN_ROLE);
  const headers = await signIn(db, ownerId);

  assert.deepEqual([...(await exportZip(db, headers, "all")).keys()].sort(), [
    "author-draft.md",
    "owner-draft.md",
    "owner-live.md",
  ]);
  assert.deepEqual(
    [...(await exportZip(db, headers, "private")).keys()].sort(),
    ["author-draft.md", "owner-draft.md"],
  );
  assert.deepEqual([...(await exportZip(db, headers, "public")).keys()], [
    "owner-live.md",
  ]);
  // An unknown scope falls back to everything rather than erroring.
  assert.equal((await exportZip(db, headers, "nonsense")).size, 3);
});

test("exported posts are generic frontmatter Markdown", async () => {
  const db = createTestDb();
  const { ownerId } = await seedPosts(db);
  await assignRoleToUser(db, ownerId, ADMIN_ROLE);
  const headers = await signIn(db, ownerId);

  const markdown = (await exportZip(db, headers, "public")).get(
    "owner-live.md",
  );
  assert.ok(markdown);
  assert.match(markdown, /^---\ntitle: "Owner live"\n/);
  assert.match(markdown, /\ntags:\n  - shipping\n  - binaries\n/);
  assert.match(markdown, /\ndraft: false\n/);
  assert.match(markdown, /---\n\nOwner published\.\n$/);
  assert.doesNotMatch(markdown, /shipping-binaries-export/);
});

test("a non-admin only exports their own posts", async () => {
  const db = createTestDb();
  const { authorId, ownerId } = await seedPosts(db);
  const roleId = await createRole(db, "author-role");
  await Permission.assignToRole(db, roleId, POSTS_READ_PERMISSION);
  await assignRoleToUser(db, authorId, "author-role");
  const headers = await signIn(db, authorId);

  // The author parameter is parsed and then discarded for a non-admin: asking
  // for every author, or for someone else by id, still yields only their own.
  for (
    const authors of ["mine", "all", String(ownerId), `${ownerId},${authorId}`]
  ) {
    assert.deepEqual(
      await exportedNames(db, headers, authors),
      ["author-draft.md"],
      authors,
    );
  }
});

test("an admin chooses between their own posts, a list, and everyone", async () => {
  const db = createTestDb();
  const { authorId, ownerId } = await seedPosts(db);
  await assignRoleToUser(db, ownerId, ADMIN_ROLE);
  const headers = await signIn(db, ownerId);

  assert.deepEqual(await exportedNames(db, headers, "mine"), [
    "owner-draft.md",
    "owner-live.md",
  ]);
  assert.deepEqual(await exportedNames(db, headers, "all"), [
    "author-draft.md",
    "owner-draft.md",
    "owner-live.md",
  ]);
  assert.deepEqual(await exportedNames(db, headers, String(authorId)), [
    "author-draft.md",
  ]);
  assert.deepEqual(
    await exportedNames(db, headers, `${authorId},${ownerId}`),
    ["author-draft.md", "owner-draft.md", "owner-live.md"],
  );
});

test("an unusable author selection falls back to your own posts", async () => {
  const db = createTestDb();
  const { ownerId } = await seedPosts(db);
  await assignRoleToUser(db, ownerId, ADMIN_ROLE);
  const headers = await signIn(db, ownerId);

  for (const authors of ["", "nonsense", "0", "-3", ",,", "abc,def"]) {
    assert.deepEqual(
      await exportedNames(db, headers, encodeURIComponent(authors)),
      ["owner-draft.md", "owner-live.md"],
      JSON.stringify(authors),
    );
  }

  // An absent parameter is the same default.
  const response = await app.request(
    "/admin/posts/export?scope=all",
    { headers },
    { DB: db } as Env,
  );
  assert.deepEqual(
    [...readZipEntries(new Uint8Array(await response.arrayBuffer())).keys()]
      .sort(),
    ["owner-draft.md", "owner-live.md"],
  );
});

test("the export needs posts:read and a session", async () => {
  const db = createTestDb();
  const { authorId } = await seedPosts(db);

  const anonymous = await app.request(
    "/admin/posts/export",
    {},
    { DB: db } as Env,
  );
  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.get("Location"), "/login");

  const headers = await signIn(db, authorId);
  const forbidden = await app.request(
    "/admin/posts/export",
    { headers },
    { DB: db } as Env,
  );
  assert.equal(forbidden.status, 403);
});

test("the archive is served as a named download in both formats", async () => {
  const db = createTestDb();
  const { ownerId } = await seedPosts(db);
  await assignRoleToUser(db, ownerId, ADMIN_ROLE);
  const headers = await signIn(db, ownerId);

  const zip = await app.request(
    "/admin/posts/export?scope=public&format=zip",
    { headers },
    { DB: db } as Env,
  );
  assert.equal(zip.headers.get("Content-Type"), "application/zip");
  assert.match(
    zip.headers.get("Content-Disposition") ?? "",
    /^attachment; filename="shipping-binaries-posts-public-\d{4}-\d{2}-\d{2}\.zip"$/,
  );
  assert.equal(zip.headers.get("Cache-Control"), "no-store");

  const tarGz = await app.request(
    "/admin/posts/export?scope=all&format=targz&authors=all",
    { headers },
    { DB: db } as Env,
  );
  assert.equal(tarGz.headers.get("Content-Type"), "application/gzip");
  assert.match(
    tarGz.headers.get("Content-Disposition") ?? "",
    /^attachment; filename="shipping-binaries-posts-all-\d{4}-\d{2}-\d{2}\.tar\.gz"$/,
  );
  assert.deepEqual(
    [...readTarGzEntries(new Uint8Array(await tarGz.arrayBuffer())).keys()]
      .sort(),
    ["author-draft.md", "owner-draft.md", "owner-live.md"],
  );
});
