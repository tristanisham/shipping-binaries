import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import {
  EditorJs,
  normalizeEditorData,
} from "../../src/views/components/admin/EditorJs.js";
import { Write } from "../../src/views/Write.js";

test("legacy Markdown is safely wrapped for Editor.js", () => {
  const data = normalizeEditorData("# Title\n<script>alert(1)</script>");
  assert.deepEqual(data, {
    blocks: [{
      type: "paragraph",
      data: {
        text: "# Title<br>&lt;script&gt;alert(1)&lt;/script&gt;",
      },
    }],
  });
});

test("Editor.js renders a JSON body field and Markdown converter", () => {
  const html = renderToString(EditorJs({ name: "body", value: "# Legacy" }));
  assert.match(html, /name="body" type="hidden"/);
  assert.match(html, /data-editorjs-holder/);
  assert.match(html, /Convert Markdown/);
  assert.match(html, /<textarea[^>]*># Legacy<\/textarea>/);
  assert.match(html, /data-editorjs-tool="paragraph"/);
  assert.match(html, /data-editorjs-tool="header"/);
  assert.match(html, /data-editorjs-tool="list"/);
  assert.match(html, /data-editorjs-tool="quote"/);
  assert.match(html, /data-editorjs-tool="code"/);
  assert.match(html, /data-editorjs-tool="delimiter"/);
  assert.match(html, /data-editorjs-tool="footnote"/);
  assert.match(html, /data-editorjs-link/);
  assert.match(html, /bg-chocolate-500/);
  assert.match(html, /Google Drive and Obsidian footnotes/);
  assert.doesNotMatch(html, /<span>Autosave<\/span>/);
  assert.doesNotMatch(html, /data-md-input/);

  const inlineScript = html.match(/<script>\n([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);
  assert.doesNotThrow(() => new Function(inlineScript));
  assert.match(inlineScript, /editor\.blocks\.insert\(/);
  assert.match(inlineScript, /insertAt,\s+false/);
  assert.match(inlineScript, /dispatchChange\(\)/);
  assert.match(inlineScript, /class FootnoteTool/);
  assert.match(inlineScript, /footnote: FootnoteTool/);
  assert.match(inlineScript, /form\.getAttribute\("action"\)/);
  assert.doesNotMatch(inlineScript, /fetch\(form\.action/);

  const browserWindow = {} as {
    markdownToEditorBlocks?: (markdown: string) => {
      blocks: Array<{ type: string }>;
    };
  };
  new Function("window", inlineScript)(browserWindow);
  const converted = browserWindow.markdownToEditorBlocks?.(
    "## Heading[^source]\n\nObsidian inline note ^[Inline *citation*.]\n\n- one\n- two\n\n```ts\nconst ok = true;\n```\n\n[^source]: Google Drive citation\n  continued line",
  );
  assert.deepEqual(converted?.blocks.map((block) => block.type), [
    "header",
    "paragraph",
    "list",
    "code",
    "footnote",
    "footnote",
  ]);
  assert.deepEqual(converted?.blocks.at(-2), {
    type: "footnote",
    data: {
      id: "obsidian-inline-1",
      text: "Inline <i>citation</i>.",
    },
  });
  assert.deepEqual(converted?.blocks.at(-1), {
    type: "footnote",
    data: {
      id: "source",
      text: "Google Drive citation<br>continued line",
    },
  });
  assert.deepEqual(converted?.blocks[1], {
    type: "paragraph",
    data: {
      text: "Obsidian inline note [^obsidian-inline-1]",
    },
  });
});

test("new post form generates and validates a customizable slug", () => {
  const html = renderToString(Write({}));

  assert.match(html, /name="slugMode" type="hidden" value="auto"/);
  assert.match(html, /name="slug"/);
  assert.match(html, /pattern="\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\*"/);
  assert.match(html, /maxlength="100"/);
  assert.match(html, />Use title</);
  assert.match(html, /initPostSlugField\(\$el\)/);
  assert.match(html, /data-slot="card-action"/);
  assert.match(html, /aria-label="Import Markdown"/);
  assert.match(html, /name="postAction"/);
  assert.doesNotMatch(html, /name="action"/);

  const slugScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((script) => script.includes("window.initPostSlugField"));
  assert.ok(slugScript);
  assert.doesNotThrow(() => new Function(slugScript));
});
