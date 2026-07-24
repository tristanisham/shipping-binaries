import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { Account } from "../../src/views/Account.js";

test("account form exposes identity fields and password guidance without values", () => {
  const html = renderToString(Account({
    biography: "Software developer.",
    email: "member@example.com",
    label: "Member Name",
    username: "member",
  }));

  assert.match(html, /action="\/admin\/account"/);
  assert.match(html, /data-slot="card"/);
  assert.match(html, /data-slot="card-header"[^>]*border-b/);
  assert.match(html, />Update your profile and password\.<\/div>/);
  assert.match(
    html,
    /<input(?=[^>]*name="label")(?=[^>]*class="[^"]*h-11[^"]*bg-amber-50\/10)[^>]*>/,
  );
  assert.match(html, /name="label"[^>]*value="Member Name"/);
  assert.match(html, /name="username"[^>]*value="member"/);
  assert.match(html, /name="email"[^>]*value="member@example\.com"/);
  assert.match(
    html,
    /<textarea(?=[^>]*name="biography")(?=[^>]*class="[^"]*bg-amber-50\/10)[^>]*>Software developer\.<\/textarea>/,
  );
  assert.match(
    html,
    /<textarea(?=[^>]*name="biography")(?=[^>]*maxlength="5000")[^>]*>/,
  );
  assert.doesNotMatch(html, /data-account-biography/);
  assert.match(
    html,
    /<input(?=[^>]*name="currentPassword")(?=[^>]*type="password")[^>]*>/,
  );
  assert.match(
    html,
    /<input(?=[^>]*name="newPassword")(?=[^>]*type="password")[^>]*>/,
  );
  assert.match(
    html,
    /<input(?=[^>]*name="newPasswordConfirmation")(?=[^>]*type="password")[^>]*>/,
  );
  assert.match(html, /id="password-rule-length"/);
  assert.match(html, /At least one special character/);
  assert.match(html, /id="password-rule-match"/);
  assert.match(html, /setCustomValidity/);
  assert.match(
    html,
    /<button(?=[^>]*class="[^"]*h-11 w-full)(?=[^>]*type="submit")[^>]*>Save changes<\/button>/,
  );
  assert.match(
    html,
    /<a[^>]*class="[^"]*text-amber-50\/70[^"]*"[^>]*href="\/logout">Log out<\/a>/,
  );
  assert.doesNotMatch(html, /console\.(log|debug|info|warn|error)/);
});
