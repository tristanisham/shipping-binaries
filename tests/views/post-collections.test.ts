import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import type { PostWithAuthor } from "../../src/models/post.js";
import { PostGrid } from "../../src/views/components/blog/posts/PostGrid.js";
import { PostList } from "../../src/views/components/blog/posts/PostList.js";
import { formatCommentCount } from "../../src/views/components/blog/posts/PostActions.js";

const makePosts = (count: number): PostWithAuthor[] =>
  Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const day = String(number).padStart(2, "0");
    return {
      authorLabel: "Alice Author",
      authorUsername: "alice",
      body: '{"blocks":[]}',
      comments: [],
      createdAt: `2026-07-${day} 12:00:00`,
      description: "",
      draft: false,
      id: number,
      image: `https://example.com/header-${number}.jpg`,
      keywords: [],
      slug: `post-${number}`,
      title: `Post ${number}`,
      updatedAt: `2026-07-${day} 13:00:00`,
      userId: 1,
    };
  });

test("PostList defaults to five posts and links author and pagination", () => {
  const html = renderToString(PostList({ posts: makePosts(6) }));

  assert.match(html, />Post 6<\/h2>/);
  assert.match(html, />Post 2<\/h2>/);
  assert.doesNotMatch(html, />Post 1<\/h2>/);
  assert.match(html, /href="\/@alice"/);
  assert.match(html, /Alice Author/);
  assert.match(html, /Published July 6, 2026/);
  assert.match(html, /aria-label="Share Post 6"/);
  assert.match(html, /data-share-path="\/blog\/post-6"/);
  assert.match(html, /classList\.add\(&#39;share-cycling&#39;\)/);
  assert.match(
    html,
    /copyWithToast\(url,&#39;Link to post copied…&#39;,\{delay:900,icon:&#39;link&#39;\}\)/,
  );
  // Sharing is copy-only now, so the native share sheet is no longer involved.
  assert.doesNotMatch(html, /navigator\.share/);
  assert.doesNotMatch(html, /data-share-status/);
  assert.match(html, /aria-label="0 comments on Post 6"/);
  assert.match(html, /text-xs tabular-nums">0<\/span>/);
  assert.match(html, /href="\/blog\/post-6#comments"/);
  assert.match(html, /aria-label="Read Post 6"/);
  assert.match(html, /bg-chocolate-500 text-amber-50/);
  assert.match(html, /<span>Read<\/span>/);
  assert.match(html, /ml-auto flex shrink-0 items-center gap-2/);
  assert.match(html, /href="\/blog\?page=2"[^>]*rel="next"/);
  assert.match(html, /mx-auto mt-16 w-full max-w-\[60rem\]/);
  assert.match(html, /flex w-full flex-col rounded-b-2xl/);
  assert.match(html, /font-sans text-3xl font-bold sm:text-4xl/);
  assert.match(html, /mt-4 block w-fit font-semibold text-chocolate-500/);
  assert.match(html, /href="\/blog\/post-6"[^>]*>Read more\.\.\.<\/a>/);
});

test("PostList adjusts body depth to the number of posts", () => {
  const posts = makePosts(3).map((post) => ({
    ...post,
    body: JSON.stringify({
      blocks: [
        { type: "paragraph", data: { text: `<b>First ${post.id}</b>` } },
        { type: "paragraph", data: { text: `Second ${post.id}` } },
        { type: "paragraph", data: { text: `Third ${post.id}` } },
        { type: "paragraph", data: { text: `Fourth ${post.id}` } },
      ],
    }),
  }));

  const single = renderToString(PostList({ posts: [posts[0]] }));
  assert.match(single, /<strong>First 1<\/strong>/);
  assert.match(single, /Fourth 1/);
  assert.doesNotMatch(single, /Read more\.\.\./);

  const pair = renderToString(PostList({ posts: posts.slice(0, 2) }));
  assert.match(pair, /<p>First 2<\/p>/);
  assert.match(pair, /<p>Second 2<\/p>/);
  assert.match(pair, /<p>Third 2<\/p>/);
  assert.doesNotMatch(pair, /Fourth 2/);
  assert.doesNotMatch(pair, /line-clamp-4/);
  assert.equal(pair.match(/>Read more\.\.\.<\/a>/g)?.length, 2);

  const compact = renderToString(PostList({ posts }));
  assert.match(compact, /line-clamp-4/);
  assert.equal(compact.match(/>Read more\.\.\.<\/a>/g)?.length, 3);
});

test("PostList shows Edit first for the post author or an admin", () => {
  const [post] = makePosts(1);
  const author = renderToString(PostList({
    posts: [post],
    viewerUserId: post.userId,
  }));
  const admin = renderToString(PostList({
    isAdmin: true,
    posts: [post],
    viewerUserId: 99,
  }));
  const otherViewer = renderToString(PostList({
    posts: [post],
    viewerUserId: 99,
  }));

  assert.match(author, /aria-label="Edit Post 1"/);
  assert.match(author, /href="\/admin\/write\?id=1"/);
  assert.ok(
    author.indexOf('aria-label="Edit Post 1"') <
      author.indexOf('aria-label="Share Post 1"'),
  );
  assert.match(admin, /aria-label="Edit Post 1"/);
  assert.doesNotMatch(otherViewer, /aria-label="Edit Post 1"/);
});

test("comment counts use compact lowercase notation", () => {
  assert.equal(formatCommentCount(999), "999");
  assert.equal(formatCommentCount(1_100), "1.1k");
  assert.equal(formatCommentCount(12_500), "12.5k");
});

test("PostGrid defaults to twelve posts with one featured card", () => {
  const html = renderToString(PostGrid({ posts: makePosts(13) }));

  assert.match(html, />Post 13<\/h2>/);
  assert.match(html, />Post 2<\/h2>/);
  assert.doesNotMatch(html, />Post 1<\/h2>/);
  assert.match(html, /md:col-span-3/);
  assert.match(html, /font-sans text-4xl font-bold sm:text-8xl/);
  assert.match(html, /absolute inset-0 size-full object-cover object-left/);
  assert.match(html, /w-2\/5 shrink-0/);
  assert.match(html, /Published July 13, 2026/);
  assert.match(html, /aria-label="Share Post 13"/);
  assert.match(html, /aria-label="Read Post 13"/);
  assert.match(html, /href="\/\?page=2"[^>]*rel="next"/);

  const secondPage = renderToString(
    PostGrid({ currentPage: 2, posts: makePosts(13) }),
  );
  assert.match(secondPage, />Post 1<\/h2>/);
  assert.doesNotMatch(secondPage, />Post 2<\/h2>/);
  assert.match(secondPage, /href="\/"[^>]*rel="prev"/);
});

test("post collections show an author label or fall back to @username", () => {
  const [post] = makePosts(1);
  const labelled = renderToString(PostGrid({ posts: [post] }));
  const fallback = renderToString(PostList({
    posts: [{ ...post, authorLabel: null }],
  }));

  assert.match(labelled, />Alice Author<\/a>/);
  assert.doesNotMatch(labelled, />@alice<\/span>/);
  assert.match(fallback, />@alice<\/a>/);
});
