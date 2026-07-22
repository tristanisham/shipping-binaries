import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPost,
  formatKeywords,
  getAllPosts,
  getPostById,
  parseKeywords,
  setPostDraft,
  updatePost,
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

test("createPost then getPostById round-trips fields", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const id = await createPost(db, {
    userId,
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
    title: "t",
    description: "d",
    keywords: [],
    image: "",
    body: "b",
    draft: true,
  });
  await updatePost(db, id, {
    title: "t2",
    description: "d2",
    keywords: ["x"],
    image: "i",
    body: "b2",
    draft: false,
  });
  const post = await getPostById(db, id);
  assert.equal(post?.title, "t2");
  assert.equal(post?.body, "b2");
  assert.equal(post?.draft, false);
  assert.deepEqual(post?.keywords, ["x"]);
});

test("setPostDraft toggles only the draft flag", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const id = await createPost(db, {
    userId,
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
    title: "first",
    description: "",
    keywords: [],
    image: "",
    body: "",
    draft: false,
  });
  const second = await createPost(db, {
    userId: bob,
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
