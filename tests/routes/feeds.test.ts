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
  assert.match(xml, /^<\?xml version="1\.0" encoding="utf-8"\?>\n<rss version="2\.0"/);
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
    /<guid[^>]*>https:\/\/shippingbinaries\.com\/blog\/guest-post<\/guid>/,
  );
  assert.match(xml, /<author>Site Owner<\/author>/);
  assert.match(xml, /<author>guest<\/author>/);
  assert.match(xml, /<category>Deployment<\/category>/);
  assert.match(xml, /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} /);
  assert.match(xml, /<lastBuildDate>/);
  // Drafts never reach the feed.
  assert.doesNotMatch(xml, /Unpublished draft/);
});

test("/feed.xml serves the same posts as Atom", async () => {
  const db = await seedFeedFixtures();
  const response = await app.request("/feed.xml", {}, { DB: db } as Env);

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "application/atom+xml; charset=utf-8",
  );

  const xml = await response.text();
  assert.match(xml, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom">/);
  assert.match(
    xml,
    /<link rel="self" href="https:\/\/shippingbinaries\.com\/feed\.xml"\/>/,
  );
  assert.match(
    xml,
    /<id>https:\/\/shippingbinaries\.com\/blog\/shipping-fast<\/id>/,
  );
  assert.match(xml, /<name>Site Owner<\/name>/);
  assert.match(xml, /<published>\d{4}-\d{2}-\d{2}T/);
  assert.doesNotMatch(xml, /Unpublished draft/);
});

test("/feed.json serves the same posts as JSON Feed", async () => {
  const db = await seedFeedFixtures();
  const response = await app.request("/feed.json", {}, { DB: db } as Env);

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "application/feed+json; charset=utf-8",
  );

  const feed = await response.json() as {
    feed_url: string;
    home_page_url: string;
    items: {
      author: { name: string };
      content_html: string;
      id: string;
      tags?: string[];
      title: string;
      url: string;
    }[];
    title: string;
    version: string;
  };

  assert.match(feed.version, /^https:\/\/jsonfeed\.org\/version\//);
  assert.equal(feed.title, "Shipping Binaries");
  assert.equal(feed.feed_url, "https://shippingbinaries.com/feed.json");
  assert.equal(feed.home_page_url, "https://shippingbinaries.com/blog");
  assert.deepEqual(feed.items.map((item) => item.title), [
    "Guest post",
    "Shipping <fast> & often",
  ]);

  const [, post] = feed.items;
  assert.equal(post.url, "https://shippingbinaries.com/blog/shipping-fast");
  assert.equal(post.id, post.url);
  assert.equal(post.author.name, "Site Owner");
  assert.equal(post.content_html, 'Why we ship "small" changes.');
  assert.deepEqual(post.tags, ["Deployment", "Workers"]);
});

test("/blog/rss is not a feed path", async () => {
  const db = await seedFeedFixtures();
  const response = await app.request("/blog/rss", {}, { DB: db } as Env);

  assert.equal(response.status, 404);
});

test("feed items carry escaped text and fall back to a body excerpt", async () => {
  const db = await seedFeedFixtures();
  const xml = await (await app.request("/rss", {}, { DB: db } as Env)).text();

  assert.match(
    xml,
    /<title><!\[CDATA\[Shipping <fast> & often\]\]><\/title>/,
  );
  assert.match(
    xml,
    /<description><!\[CDATA\[Why we ship "small" changes\.\]\]><\/description>/,
  );
  // No description stored: the excerpt comes from the Editor.js body, stripped
  // of its inline markup.
  assert.match(
    xml,
    /<description><!\[CDATA\[Intro A guest body\.\]\]><\/description>/,
  );
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

test("pages advertise every feed they offer for autodiscovery", async () => {
  const db = await seedFeedFixtures();
  const [home, blog, post, author] = await Promise.all([
    app.request("/", {}, { DB: db } as Env),
    app.request("/blog", {}, { DB: db } as Env),
    app.request("/blog/shipping-fast", {}, { DB: db } as Env),
    app.request("/@owner", {}, { DB: db } as Env),
  ]);

  const siteFeedLinks = [
    /type="application\/rss\+xml" title="Shipping Binaries \(RSS\)" href="https:\/\/shippingbinaries\.com\/rss"/,
    /type="application\/atom\+xml" title="Shipping Binaries \(Atom\)" href="https:\/\/shippingbinaries\.com\/feed\.xml"/,
    /type="application\/feed\+json" title="Shipping Binaries \(JSON Feed\)" href="https:\/\/shippingbinaries\.com\/feed\.json"/,
  ];
  const homeHtml = await home.text();
  const blogHtml = await blog.text();
  const postHtml = await post.text();
  for (const link of siteFeedLinks) {
    assert.match(homeHtml, link);
    assert.match(blogHtml, link);
    assert.match(postHtml, link);
  }

  const authorFeedLink =
    /title="Posts by Site Owner \(RSS\)" href="https:\/\/shippingbinaries\.com\/@owner\/rss"/;
  assert.match(postHtml, authorFeedLink);
  assert.match(await author.text(), authorFeedLink);
});
