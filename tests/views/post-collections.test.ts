import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import type { PostWithAuthor } from "../../src/models/post.js";
import { PostGrid } from "../../src/views/components/blog/posts/PostGrid.js";
import { PostList } from "../../src/views/components/blog/posts/PostList.js";

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
  assert.match(html, /aria-label="0 comments on Post 6"/);
  assert.match(html, /href="\/blog\/post-6#comments"/);
  assert.match(html, /aria-label="Read Post 6"/);
  assert.match(html, /ml-auto flex shrink-0 items-center gap-2/);
  assert.match(html, /href="\/blog\?page=2"[^>]*rel="next"/);
  assert.match(html, /font-black-ops-one text-4xl sm:text-6xl/);
});

test("PostGrid defaults to twelve posts with one featured card", () => {
  const html = renderToString(PostGrid({ posts: makePosts(13) }));

  assert.match(html, />Post 13<\/h2>/);
  assert.match(html, />Post 2<\/h2>/);
  assert.doesNotMatch(html, />Post 1<\/h2>/);
  assert.match(html, /md:col-span-3/);
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
