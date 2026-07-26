import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import { createPost } from "../../src/models/post.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

const seedFeedFixtures = async () => {
  const db = createTestDb();
  const ownerId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
    label: "Site Owner",
  });
  const guestId = await seedUser(db, {
    email: "guest@example.com",
    username: "guest",
  });

  await createPost(db, {
    userId: ownerId,
    slug: "shipping-fast",
    title: "Shipping <fast> & often",
    description: 'Why we ship "small" changes.',
    keywords: ["Deployment", "Workers"],
    image: "",
    body: JSON.stringify({
      blocks: [{ type: "paragraph", data: { text: "Body text" } }],
    }),
    draft: false,
  });
  await createPost(db, {
    userId: guestId,
    slug: "guest-post",
    title: "Guest post",
    description: "",
    keywords: [],
    image: "",
    body: JSON.stringify({
      blocks: [
        { type: "header", data: { level: 2, text: "Intro" } },
        { type: "paragraph", data: { text: "A <b>guest</b> body." } },
      ],
    }),
    draft: false,
  });
  await createPost(db, {
    userId: ownerId,
    slug: "unpublished",
    title: "Unpublished draft",
    description: "Still cooking",
    keywords: [],
    image: "",
    body: JSON.stringify({ blocks: [] }),
    draft: true,
  });

  return db;
};

test("/rss serves an RSS feed of every published post", async () => {
  const db = await seedFeedFixtures();
  const response = await app.request("/rss", {}, { DB: db } as Env);

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "application/rss+xml; charset=utf-8",
  );
  assert.match(response.headers.get("cache-control") ?? "", /max-age=1800/);

  const xml = await response.text();
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss /);
  assert.match(
    xml,
    /<atom:link href="https:\/\/shippingbinaries\.com\/rss" rel="self"/,
  );
  assert.match(xml, /<link>https:\/\/shippingbinaries\.com\/blog<\/link>/);
  assert.match(
    xml,
    /<link>https:\/\/shippingbinaries\.com\/blog\/shipping-fast<\/link>/,
  );
  assert.match(
    xml,
    /<guid isPermaLink="true">https:\/\/shippingbinaries\.com\/blog\/guest-post<\/guid>/,
  );
  assert.match(xml, /<dc:creator>Site Owner<\/dc:creator>/);
  assert.match(xml, /<dc:creator>guest<\/dc:creator>/);
  assert.match(xml, /<category>Deployment<\/category>/);
  assert.match(xml, /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} /);
  assert.match(xml, /<lastBuildDate>/);
  // Drafts never reach the feed.
  assert.doesNotMatch(xml, /Unpublished draft/);
});

test("/rss is the only whole-blog feed path", async () => {
  const db = await seedFeedFixtures();
  const response = await app.request("/blog/rss", {}, { DB: db } as Env);

  assert.equal(response.status, 404);
});

test("feed items escape XML and fall back to a body excerpt", async () => {
  const db = await seedFeedFixtures();
  const xml = await (await app.request("/rss", {}, { DB: db } as Env)).text();

  assert.match(xml, /<title>Shipping &lt;fast&gt; &amp; often<\/title>/);
  assert.match(
    xml,
    /<description>Why we ship &quot;small&quot; changes\.<\/description>/,
  );
  // No description stored: the excerpt comes from the Editor.js body, stripped
  // of its inline markup.
  assert.match(xml, /<description>Intro A guest body\.<\/description>/);
});

test("/@username/rss serves only that author's published posts", async () => {
  const db = await seedFeedFixtures();
  const response = await app.request("/@owner/rss", {}, { DB: db } as Env);

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "application/rss+xml; charset=utf-8",
  );

  const xml = await response.text();
  assert.match(xml, /<title>Site Owner \| Shipping Binaries<\/title>/);
  assert.match(
    xml,
    /<atom:link href="https:\/\/shippingbinaries\.com\/@owner\/rss" rel="self"/,
  );
  assert.match(xml, /<link>https:\/\/shippingbinaries\.com\/@owner<\/link>/);
  assert.match(
    xml,
    /<link>https:\/\/shippingbinaries\.com\/blog\/shipping-fast<\/link>/,
  );
  assert.doesNotMatch(xml, /guest-post/);
  assert.doesNotMatch(xml, /Unpublished draft/);
});

test("/@username/rss 404s for an unknown author", async () => {
  const db = await seedFeedFixtures();
  const response = await app.request("/@nobody/rss", {}, { DB: db } as Env);

  assert.equal(response.status, 404);
});

test("pages advertise their feeds for autodiscovery", async () => {
  const db = await seedFeedFixtures();
  const [home, blog, post, author] = await Promise.all([
    app.request("/", {}, { DB: db } as Env),
    app.request("/blog", {}, { DB: db } as Env),
    app.request("/blog/shipping-fast", {}, { DB: db } as Env),
    app.request("/@owner", {}, { DB: db } as Env),
  ]);

  const siteFeedLink =
    /<link rel="alternate" type="application\/rss\+xml" title="Shipping Binaries" href="https:\/\/shippingbinaries\.com\/rss"\/?>/;
  assert.match(await home.text(), siteFeedLink);
  assert.match(await blog.text(), siteFeedLink);

  const postHtml = await post.text();
  assert.match(postHtml, siteFeedLink);
  assert.match(
    postHtml,
    /title="Posts by Site Owner" href="https:\/\/shippingbinaries\.com\/@owner\/rss"/,
  );
  assert.match(
    await author.text(),
    /title="Posts by Site Owner" href="https:\/\/shippingbinaries\.com\/@owner\/rss"/,
  );
});
