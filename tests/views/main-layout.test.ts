import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { Layout } from "../../src/views/layouts/MainLayout.js";

test("Layout renders a responsive viewport by default", () => {
  const html = renderToString(Layout({ children: "Article" }));

  assert.match(
    html,
    /<meta name="viewport" content="width=device-width, initial-scale=1"\/>/,
  );
  assert.match(html, /data-toast-viewport/);
  assert.match(html, /window\.showToast/);
  assert.match(html, /window\.copyWithToast/);
  assert.match(html, /fixed right-4 bottom-4/);
});

test("Layout supports a custom viewport value", () => {
  const html = renderToString(Layout({
    children: "Article",
    meta: { viewport: "width=device-width, initial-scale=1.5" },
  }));

  assert.match(
    html,
    /<meta name="viewport" content="width=device-width, initial-scale=1.5"\/>/,
  );
});
