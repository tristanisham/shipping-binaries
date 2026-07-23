import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { PostBody } from "../../src/views/components/blog/PostBody.js";

test("PostBody preserves safe inline formatting and escapes unsafe HTML", () => {
  const html = renderToString(PostBody({
    body: JSON.stringify({
      blocks: [{
        type: "paragraph",
        data: {
          text:
            '<b>Bold</b> <a href="https://example.com">safe</a> <img src=x onerror=alert(1)>',
        },
      }],
    }),
  }));

  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /href="https:\/\/example\.com\/"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /<path d="M15 3h6v6"><\/path>/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("PostBody keeps internal links in the current tab without an icon", () => {
  const html = renderToString(PostBody({
    body: JSON.stringify({
      blocks: [{
        type: "paragraph",
        data: { text: '<a href="/about">About</a>' },
      }],
    }),
  }));

  assert.match(html, /href="\/about"/);
  assert.doesNotMatch(html, /target="_blank"/);
  assert.doesNotMatch(html, /M15 3h6v6/);
});

test("PostBody links footnote references to safely rendered definitions", () => {
  const html = renderToString(PostBody({
    body: JSON.stringify({
      blocks: [
        {
          type: "paragraph",
          data: { text: "A supported claim[^source]." },
        },
        {
          type: "footnote",
          data: {
            id: "source",
            text: "<b>Source</b> <script>alert(1)</script>",
          },
        },
      ],
    }),
  }));

  assert.match(html, /href="#footnote-source"/);
  assert.match(html, /id="footnote-reference-source"/);
  assert.match(html, /aria-label="Footnote source, note 1"/);
  assert.match(html, /href="#footnote-source"[^>]*>source<\/a>/);
  assert.match(html, /id="footnote-source"/);
  assert.match(html, /role="note"/);
  assert.match(html, /id="footnotes-heading">Footnotes<\/h2>/);
  assert.match(html, /href="#footnote-reference-source"/);
  assert.match(html, /Back to footnote 1 reference/);
  assert.match(html, /<strong>Source<\/strong>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("PostBody renders auto-generated footnote ids as their order number", () => {
  const html = renderToString(PostBody({
    body: JSON.stringify({
      blocks: [
        {
          type: "paragraph",
          data: {
            text: "First[^inline-footnote-1], labeled[^source]," +
              " imported[^obsidian-inline-2].",
          },
        },
        { type: "footnote", data: { id: "inline-footnote-1", text: "One" } },
        { type: "footnote", data: { id: "source", text: "Two" } },
        { type: "footnote", data: { id: "obsidian-inline-2", text: "Three" } },
      ],
    }),
  }));

  assert.match(html, /href="#footnote-inline-footnote-1"[^>]*>1<\/a><\/sup>/);
  assert.match(html, /href="#footnote-source"[^>]*>source<\/a><\/sup>/);
  assert.match(html, /href="#footnote-obsidian-inline-2"[^>]*>3<\/a><\/sup>/);
  assert.match(html, /aria-label="Footnote 1, note 1"/);
  assert.match(html, /aria-label="Footnote source, note 2"/);
  assert.match(html, /aria-label="Footnote 3, note 3"/);
  assert.doesNotMatch(html, /\[inline-footnote-1\]/);
});

test("PostBody leaves references visible when no definition exists", () => {
  const html = renderToString(PostBody({
    body: JSON.stringify({
      blocks: [{
        type: "paragraph",
        data: { text: "Missing definition[^missing]." },
      }],
    }),
  }));

  assert.match(html, /Missing definition\[\^missing\]\./);
  assert.doesNotMatch(html, /href="#footnote-missing"/);
  assert.doesNotMatch(html, /footnotes-heading/);
});
