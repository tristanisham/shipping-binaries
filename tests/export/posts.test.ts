import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePostExportAuthors } from "../../src/export/posts.js";

test("author selection reads only the two keywords and digit ids", () => {
  assert.equal(parsePostExportAuthors("all"), "all");
  assert.equal(parsePostExportAuthors("mine"), "mine");
  assert.deepEqual(parsePostExportAuthors("4"), [4]);
  assert.deepEqual(parsePostExportAuthors(" 4 , 9 "), [4, 9]);
  assert.deepEqual(parsePostExportAuthors("4,4,9"), [4, 9]);
});

test("author selection falls back to your own posts on unusable input", () => {
  for (
    const value of [
      undefined,
      null,
      42,
      "",
      "nonsense",
      "0",
      "-3",
      ",,",
      "abc,def",
      // Number.parseInt reads these as 1 and 2. A loose parser would turn
      // input that was never an id into a real author selection.
      "1e2",
      "2.5",
      "3px",
    ]
  ) {
    assert.equal(
      parsePostExportAuthors(value),
      "mine",
      JSON.stringify(value),
    );
  }
});

test("a usable id survives alongside unusable ones", () => {
  assert.deepEqual(parsePostExportAuthors("1e2,7"), [7]);
});
