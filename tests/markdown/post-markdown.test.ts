import assert from "node:assert/strict";
import { test } from "node:test";
import {
  editorDataToMarkdown,
  parseShippingBinariesMarkdown,
  postToMarkdown,
} from "../../src/markdown/post-markdown.js";

const snapshot = {
  editor: {
    blocks: [
      { type: "header", data: { level: 2, text: "Section" } },
      { type: "paragraph", data: { text: "Unicode café with <b>bold</b>." } },
      { type: "emailCapture", data: {} },
    ],
  },
  post: {
    description: "A precise export",
    draft: true,
    image: "https://example.com/image.png",
    keywords: "markdown, round trip",
    slug: "exact-export",
    slugMode: "custom" as const,
    title: "Exact export",
  },
};

test("the bulk export flavor is generic frontmatter Markdown", () => {
  const markdown = postToMarkdown(snapshot, {
    flavor: "obsidian",
    includeEditorData: false,
  });

  assert.match(markdown, /^---\ntitle: "Exact export"\n/);
  assert.match(markdown, /\ndescription: "A precise export"\n/);
  assert.match(markdown, /\nslug: "exact-export"\n/);
  assert.match(markdown, /\ntags:\n  - markdown\n  - round-trip\n/);
  assert.match(markdown, /\ndraft: true\n/);
  assert.match(
    markdown,
    /---\n\n## Section\n\nUnicode café with \*\*bold\*\*\./,
  );

  // No packaged editor data: this is the plain Markdown flavor.
  assert.doesNotMatch(markdown, /shipping-binaries-export/);
  assert.equal(parseShippingBinariesMarkdown(markdown), null);
  // Bear's inline tag line belongs to the other flavor.
  assert.doesNotMatch(markdown, /#markdown/);
  // Dropped blocks stay dropped.
  assert.doesNotMatch(markdown, /email-capture/i);
});

test("the packaged flavor still carries the editor data trailer", () => {
  const markdown = postToMarkdown(snapshot);
  assert.match(
    markdown,
    /<!-- shipping-binaries-export:v1:[A-Za-z0-9+/=]+ -->\n$/,
  );
  assert.deepEqual(
    parseShippingBinariesMarkdown(markdown)?.post,
    snapshot.post,
  );
});

test("nested list items keep their nesting", () => {
  const markdown = editorDataToMarkdown({
    blocks: [{
      type: "list",
      data: {
        style: "unordered",
        items: [
          { content: "one", items: [{ content: "sub", items: [] }] },
          { content: "two", items: [] },
        ],
      },
    }],
  });

  assert.equal(markdown, "- one\n  - sub\n- two");
});
