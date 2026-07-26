import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import { COMMENTS_CREATE_PERMISSION } from "../../src/models/permission.js";
import { createPost } from "../../src/models/post.js";
import {
  getPublishedPostBySlug,
  getPublishedPosts,
  getPublishedPostsForUser,
} from "../../src/models/post.js";
import { getPublicProfileByUsername } from "../../src/models/profile.js";
import { assignRoleToUser, MODERATOR_ROLE } from "../../src/models/role.js";
import {
  createSession,
  SESSION_COOKIE_NAME,
} from "../../src/models/session.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

const publish = (
  db: D1Database,
  userId: number,
  slug: string,
  title: string,
) =>
  createPost(db, {
    userId,
    slug,
    title,
    description: `${title} description`,
    keywords: [],
    image: "",
    body: JSON.stringify({
      blocks: [{ type: "paragraph", data: { text: "Body" } }],
    }),
    draft: false,
  });

const deactivate = (db: D1Database, userId: number) =>
  db.prepare("UPDATE users SET active = 0 WHERE id = ?1").bind(userId).run();

// One active author, one deactivated author whose post is therefore archived.
const seedArchive = async () => {
  const db = createTestDb();
  const activeId = await seedUser(db, {
    email: "active@example.com",
    username: "active",
  });
  const archivedId = await seedUser(db, {
    email: "gone@example.com",
    username: "gone",
    label: "Gone Author",
  });

  await publish(db, activeId, "live-post", "Live post");
  await publish(db, archivedId, "archived-post", "Archived post");
  await deactivate(db, archivedId);

  return { activeId, archivedId, db };
};

// A signed-in moderator, plus the cookie header their session needs.
const seedModerator = async (db: D1Database) => {
  const moderatorId = await seedUser(db, {
    email: "mod@example.com",
    username: "mod",
  });
  await assignRoleToUser(db, moderatorId, MODERATOR_ROLE);
  const token = await createSession(db, moderatorId);

  return {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
    moderatorId,
  };
};

test("deactivating an author hides their posts from the model's public reads", async () => {
  const { archivedId, db } = await seedArchive();

  assert.deepEqual(
    (await getPublishedPosts(db)).map((post) => post.slug),
    ["live-post"],
  );
  assert.deepEqual(await getPublishedPostsForUser(db, archivedId), []);
  assert.equal(await getPublishedPostBySlug(db, "archived-post"), null);
  assert.equal(await getPublicProfileByUsername(db, "gone"), null);
});

test("includeArchived opts a read back into archived posts", async () => {
  const { archivedId, db } = await seedArchive();
  const options = { includeArchived: true };

  assert.deepEqual(
    (await getPublishedPosts(db, options)).map((post) => post.slug),
    ["archived-post", "live-post"],
  );
  assert.deepEqual(
    (await getPublishedPostsForUser(db, archivedId, options)).map((post) =>
      post.slug
    ),
    ["archived-post"],
  );

  const post = await getPublishedPostBySlug(db, "archived-post", options);
  assert.equal(post?.title, "Archived post");
  assert.equal(post?.authorActive, false);
  assert.equal(
    (await getPublicProfileByUsername(db, "gone", options))?.active,
    false,
  );
});

test("archived posts and their author page are gone for readers", async () => {
  const { db } = await seedArchive();
  const [home, blog, post, author] = await Promise.all([
    app.request("/", {}, { DB: db } as Env),
    app.request("/blog", {}, { DB: db } as Env),
    app.request("/blog/archived-post", {}, { DB: db } as Env),
    app.request("/@gone", {}, { DB: db } as Env),
  ]);

  const homeHtml = await home.text();
  assert.match(homeHtml, /Live post/);
  assert.doesNotMatch(homeHtml, /Archived post/);
  assert.doesNotMatch(await blog.text(), /Archived post/);
  assert.equal(post.status, 404);
  assert.equal(author.status, 404);
});

test("a moderator still sees archived posts, badged as archived", async () => {
  const { db } = await seedArchive();
  const { headers } = await seedModerator(db);

  const [blog, post, author] = await Promise.all([
    app.request("/blog", { headers }, { DB: db } as Env),
    app.request("/blog/archived-post", { headers }, { DB: db } as Env),
    app.request("/@gone", { headers }, { DB: db } as Env),
  ]);

  const blogHtml = await blog.text();
  assert.match(blogHtml, /Archived post/);
  assert.match(blogHtml, /data-slot="badge"[^>]*>Archived</);

  assert.equal(post.status, 200);
  assert.match(await post.text(), /data-slot="badge"[^>]*>Archived</);

  assert.equal(author.status, 200);
  const authorHtml = await author.text();
  assert.match(authorHtml, /Gone Author/);
  assert.match(authorHtml, /<meta name="robots" content="noindex"/);
});

test("commenting on an archived post follows who can see it", async () => {
  const { db } = await seedArchive();
  const readerId = await seedUser(db, {
    email: "reader@example.com",
    username: "reader",
  });
  await db
    .prepare(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT roles.id, permissions.id
       FROM roles CROSS JOIN permissions
       WHERE roles.name = ?1 AND permissions.name = ?2`,
    )
    .bind(MODERATOR_ROLE, COMMENTS_CREATE_PERMISSION)
    .run();
  await assignRoleToUser(db, readerId, "guest");
  const readerToken = await createSession(db, readerId);
  const { headers: moderatorHeaders } = await seedModerator(db);

  const commentBody = (cookie: Record<string, string>) => ({
    body: new URLSearchParams({
      content: JSON.stringify({
        blocks: [{ type: "paragraph", data: { text: "Nice post" } }],
      }),
    }).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...cookie },
    method: "POST",
  });

  const readerResponse = await app.request(
    "/blog/archived-post/comments",
    commentBody({ Cookie: `${SESSION_COOKIE_NAME}=${readerToken}` }),
    { DB: db } as Env,
  );
  // No comments:create for a guest, so this stops at the permission check
  // rather than revealing whether the post exists.
  assert.equal(readerResponse.status, 403);

  const moderatorResponse = await app.request(
    "/blog/archived-post/comments",
    commentBody(moderatorHeaders),
    { DB: db } as Env,
  );
  assert.equal(moderatorResponse.status, 303);
  assert.match(
    moderatorResponse.headers.get("Location") ?? "",
    /^\/blog\/archived-post#comment-\d+$/,
  );
});
