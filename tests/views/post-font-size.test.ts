import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import {
  POST_FONT_SIZE_DEFAULT,
  POST_FONT_SIZES,
  PostFontScaleScript,
} from "../../src/views/components/blog/PostFontScale.js";

test("the reader text size ladder is the CSS absolute-size keywords", () => {
  // Keywords rather than a rem multiplier: the browser resolves each one
  // against the reader's own font-size preference, and the default keyword is
  // exactly that preference.
  assert.deepEqual(POST_FONT_SIZES, [
    "x-small",
    "small",
    "medium",
    "large",
    "x-large",
    "xx-large",
  ]);
  assert.equal(POST_FONT_SIZE_DEFAULT, "medium");
  assert.ok(POST_FONT_SIZES.includes(POST_FONT_SIZE_DEFAULT));
});

test("stepping the text size clamps to the ends of the ladder", () => {
  const html = renderToString(PostFontScaleScript({}));

  assert.match(html, /Math\.min\(SIZES\.length - 1, Math\.max\(0,/);
  assert.match(html, /localStorage\.setItem\("postFontSize", SIZES\[next\]\)/);
  assert.match(html, /--post-font-size/);
  // Refits the action bar, whose byline width moves with the text size.
  assert.match(html, /postfontsizechange/);
  // The old rem-multiplier scheme is gone.
  assert.doesNotMatch(html, /post-font-scale/);
  assert.doesNotMatch(html, /postFontScale"/);
});
