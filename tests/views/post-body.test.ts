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
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
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
  assert.match(html, /href="#footnote-source"[^>]*>1<\/a>/);
  assert.match(html, /id="footnote-source"/);
  assert.match(html, /role="note"/);
  assert.match(html, /id="footnotes-heading">Footnotes<\/h2>/);
  assert.match(html, /href="#footnote-reference-source"/);
  assert.match(html, /Back to footnote 1 reference/);
  assert.match(html, /<strong>Source<\/strong>/);
  assert.doesNotMatch(html, />\[source\]</);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
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
