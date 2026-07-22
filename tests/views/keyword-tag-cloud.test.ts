import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { KeywordTagCloud } from "../../src/views/components/admin/KeywordTagCloud.js";

test("keyword tag cloud renders current comma-separated keywords", () => {
  const html = renderToString(
    KeywordTagCloud({ value: "Hono, Cloudflare, D1" }),
  );

  assert.match(html, /data-keyword-cloud/);
  assert.match(html, /aria-label="Remove keyword Hono"[^>]*>Hono<\/button>/);
  assert.match(
    html,
    /aria-label="Remove keyword Cloudflare"[^>]*>Cloudflare<\/button>/,
  );
  assert.match(html, /aria-label="Remove keyword D1"[^>]*>D1<\/button>/);
  assert.match(
    html,
    /name="keywords" type="hidden" value="Hono, Cloudflare, D1"/,
  );
  assert.match(html, /data-keyword-entry/);
  assert.match(html, /data-keyword-add/);
  assert.match(html, /aria-label="Add keyword"/);
  assert.match(html, /size-8 px-0 !text-amber-50/);
  assert.match(html, /class="size-4 fill-none stroke-current"/);
  assert.match(html, /<path d="M12 5v14"><\/path>/);
  assert.match(html, /aria-describedby="post-keywords-help"/);
  assert.match(html, /Click on a tag to remove it/);
});

test("keyword tag cloud adds and removes keywords through its hidden value", () => {
  const html = renderToString(KeywordTagCloud({ value: "one, two" }));
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /input\.addEventListener\("input", render\)/);
  assert.match(script, /addButton\.addEventListener\("click", addKeywords\)/);
  assert.match(script, /event\.key !== "Enter"/);
  assert.match(script, /keywords\.push\(keyword\)/);
  assert.match(script, /keyword\.toLowerCase\(\)/);
  assert.match(script, /currentKeywords\.splice\(index, 1\)/);
  assert.match(script, /currentKeywords\.join\(", "\)/);
  assert.match(
    script,
    /dispatchEvent\(new Event\("input", \{ bubbles: true \}\)\)/,
  );
  assert.match(
    script,
    /dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/,
  );
});
