import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPost,
  formatKeywords,
  formatSlug,
  getAllPosts,
  getPostById,
  getPublishedPostBySlug,
  getPublishedPosts,
  getUniquePostSlug,
  MAX_POST_SLUG_LENGTH,
  parseKeywords,
  setPostDraft,
  updatePost,
  validatePostSlug,
} from "../../src/models/post.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("parseKeywords splits, trims, and drops blanks", () => {
  assert.deepEqual(parseKeywords("Hono, Cloudflare ,, D1 "), [
    "Hono",
    "Cloudflare",
    "D1",
  ]);
  assert.deepEqual(parseKeywords(""), []);
});

test("formatKeywords joins with a comma and space", () => {
  assert.equal(formatKeywords(["Hono", "Cloudflare"]), "Hono, Cloudflare");
});

test("formatSlug creates a URL-safe slug", () => {
  assert.equal(formatSlug("  My First Post!  "), "my-first-post");
  assert.equal(formatSlug("a".repeat(120)).length, MAX_POST_SLUG_LENGTH);
});

test("validatePostSlug accepts URL slugs and explains invalid values", () => {
  assert.equal(validatePostSlug("my-first-post"), null);
  assert.equal(
    validatePostSlug("My First Post"),
    "Use lowercase letters, numbers, and single hyphens only.",
  );
  assert.equal(
    validatePostSlug("a".repeat(MAX_POST_SLUG_LENGTH + 1)),
    `Keep the slug to ${MAX_POST_SLUG_LENGTH} characters or fewer.`,
  );
});

test("getUniquePostSlug suffixes collisions but preserves the current post", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const id = await createPost(db, {
    userId,
    slug: "same-post",
    title: "Same post",
    description: "",
    keywords: [],
    image: "",
    body: "",
    draft: true,
  });

  assert.equal(await getUniquePostSlug(db, "same-post"), "same-post-2");
  assert.equal(await getUniquePostSlug(db, "same-post", id), "same-post");
});

test("createPost then getPostById round-trips fields", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const id = await createPost(db, {
    userId,
    slug: "first",
    title: "First",
    description: "desc",
    keywords: ["a", "b"],
    image: "https://img",
    body: "hello world",
    draft: true,
  });
  const post = await getPostById(db, id);
  assert.ok(post);
  assert.equal(post.title, "First");
  assert.equal(post.slug, "first");
  assert.equal(post.body, "hello world");
  assert.equal(post.image, "https://img");
  assert.equal(post.draft, true);
  assert.deepEqual(post.keywords, ["a", "b"]);
});

test("updatePost overwrites fields and draft state", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const id = await createPost(db, {
    userId,
    slug: "t",
    title: "t",
    description: "d",
    keywords: [],
    image: "",
    body: "b",
    draft: true,
  });
  await updatePost(db, id, {
    slug: "t2",
    title: "t2",
    description: "d2",
    keywords: ["x"],
    image: "i",
    body: "b2",
    draft: false,
  });
  const post = await getPostById(db, id);
  assert.equal(post?.title, "t2");
  assert.equal(post?.slug, "t2");
  assert.equal(post?.body, "b2");
  assert.equal(post?.draft, false);
  assert.deepEqual(post?.keywords, ["x"]);
});

test("setPostDraft toggles only the draft flag", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const id = await createPost(db, {
    userId,
    slug: "t",
    title: "t",
    description: "d",
    keywords: [],
    image: "",
    body: "b",
    draft: false,
  });
  await setPostDraft(db, id, true);
  assert.equal((await getPostById(db, id))?.draft, true);
});

test("getAllPosts includes author username, newest id first", async () => {
  const db = createTestDb();
  const alice = await seedUser(db, { email: "a@x.com", username: "alice" });
  const bob = await seedUser(db, { email: "b@x.com", username: "bob" });
  const first = await createPost(db, {
    userId: alice,
    slug: "first",
    title: "first",
    description: "",
    keywords: [],
    image: "",
    body: "",
    draft: false,
  });
  const second = await createPost(db, {
    userId: bob,
    slug: "second",
    title: "second",
    description: "",
    keywords: [],
    image: "",
    body: "",
    draft: true,
  });
  const posts = await getAllPosts(db);
  assert.equal(posts.length, 2);
  // created_at has 1s resolution, so the id DESC tiebreak decides order.
  assert.equal(posts[0].id, second);
  assert.equal(posts[0].authorUsername, "bob");
  assert.equal(posts[1].id, first);
  assert.equal(posts[1].authorUsername, "alice");
});

test("published post queries exclude drafts and resolve slugs", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  await createPost(db, {
    userId,
    slug: "public-post",
    title: "Public",
    description: "",
    keywords: [],
    image: "",
    body: '{"blocks":[]}',
    draft: false,
  });
  await createPost(db, {
    userId,
    slug: "draft-post",
    title: "Draft",
    description: "",
    keywords: [],
    image: "",
    body: '{"blocks":[]}',
    draft: true,
  });

  const posts = await getPublishedPosts(db);
  assert.deepEqual(posts.map((post) => post.slug), ["public-post"]);
  assert.equal(
    (await getPublishedPostBySlug(db, "public-post"))?.title,
    "Public",
  );
  assert.equal(await getPublishedPostBySlug(db, "draft-post"), null);
});
