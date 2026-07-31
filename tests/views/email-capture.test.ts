import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import {
  EmailCapture,
  EmailCaptureAlignment,
} from "../../src/views/components/blog/EmailCapture.js";

const props = {
  alignment: EmailCaptureAlignment.Right,
  description: "A short description.",
  label: "Footer subscription",
  postSlug: "source-post",
};

test("email capture uses its custom label for the form", () => {
  const html = renderToString(EmailCapture(props));

  assert.match(html, /text-right/);
  assert.match(html, />Footer subscription<\/h2>/);
  assert.match(html, /aria-label="Footer subscription"/);
  assert.match(
    html,
    /name="captureLabel" type="hidden" value="Footer subscription"/,
  );
  assert.match(html, /name="email"/);
});

test("email capture scopes labels and fields to a custom id", () => {
  const html = renderToString(EmailCapture({
    ...props,
    id: "email-capture-2",
  }));

  assert.match(html, /aria-labelledby="email-capture-2-title"/);
  assert.match(html, /id="email-capture-2-title"/);
  assert.match(html, /for="email-capture-2-address"/);
  assert.match(html, /id="email-capture-2-address"/);
});

test("signed-in capture renders the email-help rectangle without an input", () => {
  const html = renderToString(EmailCapture({
    ...props,
    isAuthenticated: true,
  }));

  assert.match(html, /bg-amber-50\/70/);
  assert.match(html, /justify-between/);
  assert.match(html, /href="\/help">via Email<\/a>/);
  assert.match(html, />Subscribe<\/button>/);
  assert.doesNotMatch(html, /name="email"/);
});

test("subscribed capture replaces both forms with its status", () => {
  const html = renderToString(EmailCapture({
    ...props,
    isAuthenticated: true,
    status: "subscribed",
  }));

  assert.match(html, /role="status">You&#39;re subscribed\./);
  assert.doesNotMatch(html, /<form/);
});

test("pending and unsubscribed states do not render another capture form", () => {
  const pending = renderToString(EmailCapture({
    ...props,
    status: "pending",
  }));
  const unsubscribed = renderToString(EmailCapture({
    ...props,
    isAuthenticated: true,
    status: "unsubscribed",
  }));

  assert.match(pending, /Check your email to confirm your subscription\./);
  assert.doesNotMatch(pending, /<form/);
  assert.match(unsubscribed, /currently unsubscribed\./);
  assert.doesNotMatch(unsubscribed, /<form/);
});
