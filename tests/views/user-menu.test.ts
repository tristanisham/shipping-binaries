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
    /href="\/logout"[^>]*role="menuitem">[\s\S]*?Log out<\/a>/,
  );
  assert.match(
    html,
    /class="[^"]*bg-burgundy-700[^"]*text-amber-50[^"]*dark:bg-burgundy-400[^"]*"[^>]*href="\/logout"/,
  );
  assert.match(html, /<path d="m16 17 5-5-5-5"><\/path>/);
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
    /href="\/logout"[^>]*role="menuitem">[\s\S]*?Log out<\/a>/,
  );
  assert.match(html, /<path d="m16 17 5-5-5-5"><\/path>/);
});

test("slim header moves mobile navigation into one hamburger menu", () => {
  const html = renderToString(HeaderSlim({
    isAdmin: true,
    isAuthenticated: true,
    nav: defaultHeaderNav,
    viewerUsername: "owner",
  }));

  assert.match(
    html,
    /class="ml-auto hidden items-center gap-4 text-xl lg:flex"/,
  );
  assert.match(
    html,
    /class="ml-8 hidden items-center gap-2 pr-4 lg:flex"/,
  );
  assert.match(html, /id="slim-desktop-theme-toggle"/);
  assert.match(html, /id="slim-mobile-theme-toggle"/);
  assert.match(
    html,
    /<details[^>]*class="group relative ml-auto lg:hidden"[^>]*data-slim-mobile-menu/,
  );
  assert.match(
    html,
    /<summary[^>]*aria-label="Open navigation menu"[^>]*>[\s\S]*?<path d="M4 5h16"><\/path>[\s\S]*?<path d="M4 12h16"><\/path>[\s\S]*?<path d="M4 19h16"><\/path>/,
  );

  const mobileMenu = html.slice(html.indexOf('id="slim-mobile-navigation"'));
  const primaryIndex = mobileMenu.indexOf(">Home</a>");
  const accountIndex = mobileMenu.indexOf(">Dashboard</a>");
  const weatherIndex = mobileMenu.indexOf(
    'data-weather-icon-prefix="weather-slim-mobile-"',
  );
  const logoutIndex = mobileMenu.indexOf('href="/logout"');

  assert.ok(primaryIndex >= 0);
  assert.ok(accountIndex > primaryIndex);
  assert.ok(weatherIndex > accountIndex);
  assert.ok(logoutIndex > weatherIndex);
  assert.equal(
    (mobileMenu.match(/border-t border-amber-50\/20/g) ?? []).length,
    2,
  );
  assert.match(mobileMenu, />Profile<\/a>/);
  assert.match(mobileMenu, />Account<\/a>/);
  assert.match(
    mobileMenu,
    /class="[^"]*bg-burgundy-700[^"]*text-amber-50[^"]*dark:bg-burgundy-400[^"]*"[^>]*href="\/logout"/,
  );
  assert.match(mobileMenu, /<path d="m16 17 5-5-5-5"><\/path>/);
  assert.match(html, /!menu\.contains\(event\.target\)/);
  assert.match(html, /event\.key === "Escape"/);
});
