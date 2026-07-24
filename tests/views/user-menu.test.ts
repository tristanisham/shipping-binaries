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

test("non-admin users get a hover menu with profile and account", () => {
  const html = renderToString(UserMenu({
    isAuthenticated: true,
    username: "member",
  }));

  assert.match(
    html,
    /<button[^>]*aria-haspopup="menu"[^>]*aria-label="Open user menu"[^>]*type="button"/,
  );
  assert.match(html, /<circle cx="12" cy="8" r="5"><\/circle>/);
  assert.match(html, /role="menu"/);
  assert.match(html, /href="\/@member"[^>]*role="menuitem">Profile<\/a>/);
  assert.match(
    html,
    /href="\/admin\/account"[^>]*role="menuitem">Account<\/a>/,
  );
  assert.match(
    html,
    /href="\/logout"[^>]*role="menuitem">Log out<\/a>/,
  );
  assert.doesNotMatch(html, />Dashboard<\/a>/);
});

test("admin users retain the shield icon and dashboard menu", () => {
  const html = renderToString(UserMenu({
    isAdmin: true,
    isAuthenticated: true,
    username: "owner",
  }));

  assert.match(
    html,
    /<button[^>]*aria-haspopup="menu"[^>]*aria-label="Open user menu"[^>]*type="button"/,
  );
  assert.match(html, /role="menu"/);
  assert.match(html, />Dashboard<\/a>/);
  assert.match(html, /href="\/@owner"[^>]*role="menuitem">Profile<\/a>/);
  assert.match(html, /href="\/admin\/account"[^>]*role="menuitem"/);
  assert.match(
    html,
    /href="\/logout"[^>]*role="menuitem">Log out<\/a>/,
  );
});

test("slim header separates nav from a tightly spaced icon group", () => {
  const html = renderToString(HeaderSlim({
    isAdmin: true,
    isAuthenticated: true,
    nav: defaultHeaderNav,
    viewerUsername: "owner",
  }));

  assert.match(html, /class="ml-8 flex items-center gap-2 pr-4"/);
  assert.match(
    html,
    /id="light-dark-toggle"[^>]*class="cursor-pointer"/,
  );
  assert.match(
    html,
    /aria-label="Open user menu"[^>]*class="inline-flex cursor-pointer"/,
  );
});
