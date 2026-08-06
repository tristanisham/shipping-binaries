import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { PostHogSnippet } from "../../src/views/components/analytics/PostHog.js";
import { Layout } from "../../src/views/layouts/MainLayout.js";

test("PostHog snippet initializes against the first-party ingest proxy", () => {
  const html = renderToString(PostHogSnippet({}));

  assert.match(html, /posthog\.init\("phc_[A-Za-z0-9]+"/);
  // Capture goes through our own domain so ad blockers can't filter it by the
  // `*.i.posthog.com` name; `ui_host` keeps in-app links on PostHog Cloud.
  assert.match(html, /api_host: "https:\/\/shippingbinaries\.com\/ingest"/);
  assert.match(html, /ui_host: "https:\/\/us\.posthog\.com"/);
  assert.match(html, /"-assets\.i\.posthog\.com"\)\+"\/static\/array\.js"/);
});

test("PostHog snippet captures pageleave so bounce rate stays accurate", () => {
  const html = renderToString(PostHogSnippet({}));

  assert.match(html, /capture_pageleave: true/);
});

test("PostHog snippet skips local development hostnames", () => {
  const html = renderToString(PostHogSnippet({}));

  assert.match(
    html,
    /if \(!\/\^\(localhost\|127[^)]*\)\$\/\.test\(window\.location\.hostname\) &&/,
  );
});

test("PostHog snippet excludes authentication and admin pages", () => {
  const html = renderToString(PostHogSnippet({}));

  assert.match(html, /admin\(\?:\\\/\|\$\)/);
  assert.match(html, /login\$/);
  assert.match(html, /window\.location\.pathname/);
});

test("Layout loads PostHog inside the document head", () => {
  const html = renderToString(Layout({ children: "Article" }));
  const head = html.slice(0, html.indexOf("</head>"));

  assert.match(head, /posthog\.init\(/);
});

test("Layout delegates meaningful interaction and form events to PostHog", () => {
  const html = renderToString(Layout({ children: "Article" }));

  assert.match(html, /\[data-analytics-event\]/);
  assert.match(html, /form\[data-analytics-start-event\]/);
  assert.match(html, /form\.dataset\.analyticsSubmitEvent/);
  assert.match(html, /window\.posthog\?\.capture/);
});
