import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import { createPost } from "../../src/models/post.js";
import {
  createSession,
  SESSION_COOKIE_NAME,
} from "../../src/models/session.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("published posts render at their slug and drafts stay private", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
    label: "Site Owner",
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
  assert.match(html, /<h2[^>]*id="a-heading"[^>]*><span>A heading<\/span><\/h2>/);
  assert.match(html, /A <strong>public<\/strong> body/);
  assert.match(html, /id="post-table-of-contents"/);
  assert.match(html, /aria-controls="post-contents-panel"/);
  assert.match(html, /href="#a-heading"[^>]*title="A heading"/);
  assert.match(html, /href="\/@owner"/);
  assert.match(html, /Site Owner/);
  assert.match(html, /aria-label="Share Public post"/);
  assert.match(html, /aria-label="0 comments on Public post"/);
  assert.doesNotMatch(html, /aria-label="Edit Public post"/);
  assert.doesNotMatch(html, /aria-label="Read Public post"/);

  const authorToken = await createSession(db, userId);
  const authorResponse = await app.request(
    "/blog/public-post",
    { headers: { Cookie: `${SESSION_COOKIE_NAME}=${authorToken}` } },
    { DB: db } as Env,
  );
  const authorHtml = await authorResponse.text();
  assert.equal(authorResponse.status, 200);
  assert.match(authorHtml, /aria-label="Edit Public post"/);
  assert.match(authorHtml, /href="\/admin\/write\?id=1"/);

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
    label: "Site Owner",
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

test("blog index lists published posts and excludes drafts", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
    label: "Site Owner",
  });
  await createPost(db, {
    userId,
    slug: "listed-post",
    title: "Listed post",
    description: "Visible on the blog index",
    keywords: [],
    image: "",
    body: "",
    draft: false,
  });
  await createPost(db, {
    userId,
    slug: "unlisted-draft",
    title: "Unlisted draft",
    description: "",
    keywords: [],
    image: "",
    body: "",
    draft: true,
  });

  const response = await app.request("/blog", {}, { DB: db } as Env);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<title>Blog \| Shipping Binaries<\/title>/);
  assert.match(html, /aria-current="page"[^>]*href="\/blog"/);
  assert.match(html, /href="\/blog\/listed-post"/);
  assert.match(html, /font-sans text-3xl font-bold sm:text-4xl/);
  assert.match(html, /href="\/@owner"/);
  assert.match(html, /Site Owner/);
  assert.doesNotMatch(html, /Unlisted draft/);

  const authorResponse = await app.request(
    "/@owner",
    {},
    { DB: db } as Env,
  );
  const authorHtml = await authorResponse.text();
  assert.equal(authorResponse.status, 200);
  assert.match(authorHtml, /<h1[^>]*>Site Owner<\/h1>/);
  assert.match(authorHtml, /@owner/);
  assert.match(authorHtml, /href="\/blog\/listed-post"/);
  assert.doesNotMatch(authorHtml, /Unlisted draft/);

  const missingAuthorResponse = await app.request(
    "/@missing",
    {},
    { DB: db } as Env,
  );
  assert.equal(missingAuthorResponse.status, 404);
});

test("public navigation sends a non-admin user directly to account", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "member@example.com",
    username: "member",
  });
  const token = await createSession(db, userId);
  const response = await app.request(
    "/blog",
    { headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` } },
    { DB: db } as Env,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(
    html,
    /aria-label="Open account"[^>]*href="\/admin\/account"/,
  );
  assert.doesNotMatch(html, /role="menu"/);
  assert.doesNotMatch(html, /aria-label="Open admin dashboard"/);
});
