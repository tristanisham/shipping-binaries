import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { Signup } from "../../src/views/Signup.js";

test("signup form exposes identity fields and client password validation", () => {
  const html = renderToString(Signup({}));

  assert.match(html, /action="\/signup"/);
  assert.match(html, /name="label"/);
  assert.match(html, /name="username"/);
  assert.match(html, /oninput="this\.value = this\.value\.toLowerCase\(\)"/);
  assert.match(html, /name="email"/);
  assert.match(html, /name="password"/);
  assert.match(html, /name="passwordConfirmation"/);
  assert.match(html, /At least one special character/);
  assert.match(html, /TextEncoder/);
  assert.match(html, /setCustomValidity/);
});
