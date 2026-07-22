import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { defaultHeaderNav } from "../../src/views/components/header/Header.js";
import { HeaderSlim } from "../../src/views/components/header/Slim.js";
import { UserMenu } from "../../src/views/components/header/UserMenu.js";

test("logged-out visitors get a person icon linking to login", () => {
  const html = renderToString(UserMenu({}));

  assert.match(html, /aria-label="Log in"[^>]*href="\/login"/);
  assert.match(html, /<circle cx="12" cy="8" r="5"><\/circle>/);
  assert.doesNotMatch(html, /role="menu"/);
});

test("non-admin users get a person icon linking directly to account", () => {
  const html = renderToString(UserMenu({ isAuthenticated: true }));

  assert.match(
    html,
    /aria-label="Open account"[^>]*href="\/admin\/account"/,
  );
  assert.match(html, /<circle cx="12" cy="8" r="5"><\/circle>/);
  assert.doesNotMatch(html, /aria-haspopup="menu"/);
  assert.doesNotMatch(html, /role="menu"/);
  assert.doesNotMatch(html, />Dashboard<\/a>/);
});

test("admin users retain the shield icon and dashboard menu", () => {
  const html = renderToString(UserMenu({
    isAdmin: true,
    isAuthenticated: true,
  }));

  assert.match(
    html,
    /aria-haspopup="menu"[^>]*aria-label="Open admin dashboard"[^>]*href="\/admin"/,
  );
  assert.match(html, /role="menu"/);
  assert.match(html, />Dashboard<\/a>/);
  assert.match(html, /href="\/admin\/account"[^>]*role="menuitem"/);
});

test("slim header separates nav from a tightly spaced icon group", () => {
  const html = renderToString(HeaderSlim({
    isAdmin: true,
    isAuthenticated: true,
    nav: defaultHeaderNav,
  }));

  assert.match(html, /class="ml-8 flex items-center gap-2 pr-4"/);
  assert.match(
    html,
    /id="light-dark-toggle"[^>]*class="cursor-pointer"/,
  );
  assert.match(
    html,
    /aria-label="Open admin dashboard"[^>]*class="inline-flex cursor-pointer"/,
  );
});
