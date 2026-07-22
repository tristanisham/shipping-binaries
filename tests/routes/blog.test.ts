import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import { createPost } from "../../src/models/post.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("published posts render at their slug and drafts stay private", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
  });
  await createPost(db, {
    userId,
    slug: "public-post",
    title: "Public post",
    description: "Public description",
    keywords: ["Editor.js"],
    image: "",
    body: JSON.stringify({
      blocks: [
        { type: "header", data: { level: 2, text: "A heading" } },
        { type: "paragraph", data: { text: "A <b>public</b> body" } },
      ],
    }),
    draft: false,
  });
  await createPost(db, {
    userId,
    slug: "private-draft",
    title: "Private draft",
    description: "",
    keywords: [],
    image: "",
    body: "Not public",
    draft: true,
  });

  const response = await app.request(
    "/blog/public-post",
    {},
    { DB: db } as Env,
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Public post/);
  assert.match(html, /<h2[^>]*><span>A heading<\/span><\/h2>/);
  assert.match(html, /A <strong>public<\/strong> body/);

  const draftResponse = await app.request(
    "/blog/private-draft",
    {},
    { DB: db } as Env,
  );
  assert.equal(draftResponse.status, 404);
});

test("home links published posts by slug", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
  });
  await createPost(db, {
    userId,
    slug: "linked-post",
    title: "Linked post",
    description: "",
    keywords: [],
    image: "",
    body: "",
    draft: false,
  });

  const response = await app.request("/", {}, { DB: db } as Env);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /href="\/blog\/linked-post"/);
});
