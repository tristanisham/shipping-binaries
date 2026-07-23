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
  assert.match(html, /name="label"[^>]*value="Member Name"/);
  assert.match(html, /name="username"[^>]*value="member"/);
  assert.match(html, /name="email"[^>]*value="member@example\.com"/);
  assert.match(html, /name="biography"[^>]*>Software developer\.<\/textarea>/);
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
  assert.doesNotMatch(html, /console\.(log|debug|info|warn|error)/);
});
