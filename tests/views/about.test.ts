import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { About } from "../../src/views/About.js";

test("about page includes the human-authorship notice", () => {
  const html = renderToString(About({}));

  assert.match(
    html,
    /No LLM was use to create, edit, revise, or generate the content on this website\./,
  );
  assert.match(
    html,
    /All work on this website was 100% human produced and is the copyright of © Tristan Isham/,
  );
  assert.doesNotMatch(html, /\(c\) Tristan Isham/);
});
