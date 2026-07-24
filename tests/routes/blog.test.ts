import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import { createPost } from "../../src/models/post.js";
import {
  ADMIN_ROLE,
  assignRoleToUser,
} from "../../src/models/role.js";
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
        { type: "header", data: { level: 3, text: "A subheading" } },
        { type: "header", data: { level: 4, text: "A detail" } },
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
  assert.match(
    html,
    /hover:bg-mist-600 hover:text-amber-50[^"]*dark:hover:bg-amber-50 dark:hover:text-mist-600/,
  );
  assert.doesNotMatch(
    html,
    /<button[^>]*hover:text-chocolate-500[^>]*data-toc-toggle/,
  );
  assert.doesNotMatch(html, /text-chocolate-500/);
  assert.match(html, /data-toc-container/);
  assert.match(html, /!root\.contains\(target\)/);
  assert.doesNotMatch(html, /peer-hover:visible/);
  assert.doesNotMatch(html, /group-hover:visible/);
  assert.match(html, /invisible pointer-events-none/);
  assert.equal(html.match(/<line /g)?.length, 3);
  assert.match(html, /y1="50" y2="50"/);
  assert.match(html, /y1="56" y2="56"/);
  assert.match(html, /y1="62" y2="62"/);
  assert.match(html, /<line class="stroke-current"/);
  assert.match(html, /<line class="stroke-current opacity-40"/);
  assert.match(html, /<li class="pl-2 font-normal">/);
  assert.match(html, /<li class="pl-4 font-normal">/);
  assert.match(html, /<li class="pl-6 font-normal">/);
  assert.match(html, /opacity-50 hover:opacity-100/);
  assert.match(
    html,
    /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/,
  );
  assert.match(html, /duration: 3000/);
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
  await db
    .prepare(
      `UPDATE profiles
       SET biography = ?2
       WHERE user_id = ?1`,
    )
    .bind(userId, "I write about software and the people who build it.")
    .run();

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
  assert.match(
    authorHtml,
    /<header class="mt-10">/,
  );
  assert.match(
    authorHtml,
    /<h1 class="font-black-ops-one text-2xl leading-none">Site Owner<\/h1>/,
  );
  assert.match(authorHtml, />\s*@owner\s*<\/p>/);
  assert.match(
    authorHtml,
    /I write about software and the people who build it\./,
  );
  assert.match(
    authorHtml,
    /<hr class="mt-6 border-mist-600\/25 dark:border-amber-50\/25"\/>/,
  );
  assert.match(
    authorHtml,
    /aria-label="Blog posts" class="w-full mx-auto mt-8 max-w-\[60rem\]"/,
  );
  assert.match(authorHtml, /grid grid-cols-1 gap-6 md:grid-cols-3/);
  assert.match(authorHtml, /href="\/blog\/listed-post"/);
  assert.doesNotMatch(authorHtml, /Unlisted draft/);

  const missingAuthorResponse = await app.request(
    "/@missing",
    {},
    { DB: db } as Env,
  );
  assert.equal(missingAuthorResponse.status, 404);
});

test("public navigation gives a non-admin user profile and account links", async () => {
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
  assert.match(html, /aria-label="Open user menu"/);
  assert.match(html, /role="menu"/);
  assert.match(html, /href="\/@member"[^>]*>Profile<\/a>/);
  assert.match(html, /href="\/admin\/account"[^>]*>Account<\/a>/);
  assert.doesNotMatch(html, />Dashboard<\/a>/);
});

test("users with comment permission can post and reply with Editor.js", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "commenter@example.com",
    username: "commenter",
    label: "Comment Author",
  });
  await assignRoleToUser(db, userId, ADMIN_ROLE);
  await createPost(db, {
    body: JSON.stringify({ blocks: [] }),
    description: "",
    draft: false,
    image: "",
    keywords: [],
    slug: "comments-enabled",
    title: "Comments enabled",
    userId,
  });
  const token = await createSession(db, userId);
  const cookie = `${SESSION_COOKIE_NAME}=${token}`;

  const editorResponse = await app.request(
    "/blog/comments-enabled",
    { headers: { Cookie: cookie } },
    { DB: db } as Env,
  );
  const editorHtml = await editorResponse.text();
  assert.equal(editorResponse.status, 200);
  assert.match(editorHtml, /data-comment-editor/);
  assert.match(editorHtml, /textarea[^>]*name="content"/);
  assert.match(editorHtml, /min-h-32 w-full resize-y/);
  assert.match(
    editorHtml,
    /\[&amp;_\.ce-toolbar\]:!hidden/,
  );
  assert.match(editorHtml, /@editorjs\/editorjs@2\.31\.6/);
  assert.match(editorHtml, />Cancel<\/button>/);
  assert.match(editorHtml, />Comment<\/button>/);

  const content = JSON.stringify({
    blocks: [{
      type: "paragraph",
      data: { text: "A <b>useful</b> comment." },
    }],
  });
  const created = await app.request(
    "/blog/comments-enabled/comments",
    {
      body: new URLSearchParams({ content }).toString(),
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
    "/blog/comments-enabled#comment-1",
  );

  const reply = await app.request(
    "/blog/comments-enabled/comments",
    {
      body: new URLSearchParams({
        content: JSON.stringify({
          blocks: [{
            type: "paragraph",
            data: { text: "A reply." },
          }],
        }),
        parentId: "1",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(reply.status, 303);
  assert.equal(
    reply.headers.get("location"),
    "/blog/comments-enabled#comment-2",
  );

  const response = await app.request(
    "/blog/comments-enabled",
    { headers: { Cookie: cookie } },
    { DB: db } as Env,
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /id="comment-1"/);
  assert.match(html, /id="comment-2"/);
  assert.match(html, /href="\/@commenter"[^>]*>Comment Author<\/a>/);
  assert.match(html, /A <strong>useful<\/strong> comment\./);
  assert.match(html, /A reply\./);
  assert.match(html, /aria-label="Upvote comment"/);
  assert.match(html, /aria-label="Downvote comment"/);
  assert.match(html, />Reply<\/button>/);
  assert.match(html, /data-comment-path="\/blog\/comments-enabled#comment-1"/);
  assert.match(html, /Comment link copied/);
  assert.match(html, /mt-4 ml-6 space-y-4/);
});

test("comment creation requires a signed-in user with permission", async () => {
  const db = createTestDb();
  const ownerId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
  });
  await createPost(db, {
    body: JSON.stringify({ blocks: [] }),
    description: "",
    draft: false,
    image: "",
    keywords: [],
    slug: "protected-comments",
    title: "Protected comments",
    userId: ownerId,
  });
  const content = JSON.stringify({
    blocks: [{ type: "paragraph", data: { text: "No access." } }],
  });

  const anonymous = await app.request(
    "/blog/protected-comments/comments",
    {
      body: new URLSearchParams({ content }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(anonymous.status, 303);
  assert.equal(anonymous.headers.get("location"), "/login");

  const token = await createSession(db, ownerId);
  const forbidden = await app.request(
    "/blog/protected-comments/comments",
    {
      body: new URLSearchParams({ content }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(forbidden.status, 403);
});
