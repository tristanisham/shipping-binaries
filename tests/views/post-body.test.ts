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
          text: '<b>Bold</b> <a href="https://example.com">safe</a> <img src=x onerror=alert(1)>',
        },
      }],
    }),
  }));

  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /href="https:\/\/example\.com\/"/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});
