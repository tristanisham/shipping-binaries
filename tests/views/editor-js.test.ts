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
  assert.match(
    html,
    /class="[^"]*capitalize !text-amber-50[^"]*"[^>]*data-markdown-convert/,
  );
  assert.match(
    html,
    /autosaveEnabled \? &#39;!bg-chocolate-500 !text-amber-50 hover:!bg-chocolate-400&#39; : &#39;!bg-transparent !text-amber-50 !shadow-none hover:!bg-amber-50\/10 dark:!text-mist-600 dark:hover:!bg-mist-600\/10&#39;/,
  );
  assert.match(html, /Google Drive and Obsidian footnotes/);
  assert.match(html, /Autosave off/);
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
  assert.match(inlineScript, /class InlineFootnoteTool/);
  assert.match(inlineScript, /footnoteInline: InlineFootnoteTool/);
  assert.match(inlineScript, /style="height:14px;width:14px"/);
  assert.match(
    inlineScript,
    /static get shortcut\(\) \{\s+return "CTRL\+ALT\+I"/,
  );
  assert.match(inlineScript, /Footnote label/);
  assert.match(inlineScript, /Footnote note/);
  assert.match(
    inlineScript,
    /classList\.add\("!w-96", "!max-w-\[calc\(100vw-2rem\)\]"\)/,
  );
  assert.match(inlineScript, /classList\.add\("!overflow-x-visible"\)/);
  assert.match(inlineScript, /actions\.className = "w-full space-y-2 p-2"/);
  assert.doesNotMatch(inlineScript, /actions\.style\.minWidth/);
  assert.match(inlineScript, /inlineToolbar: true/);
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
  assert.match(html, />Controls<span/);
  assert.match(html, />Save Draft<\/button>/);
  assert.ok(html.indexOf(">Controls<span") > html.indexOf(">Image<span"));
  assert.match(
    html,
    /class="[^"]*capitalize !text-amber-50[^"]*"[^>]*name="postAction"[^>]*value="publish"/,
  );
  assert.doesNotMatch(html, /name="action"/);
  assert.doesNotMatch(html, /data-view-live-post/);

  const slugScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((script) => script.includes("window.initPostSlugField"));
  assert.ok(slugScript);
  assert.doesNotThrow(() => new Function(slugScript));
});

test("saved post editor links to the live post before Markdown import", () => {
  const html = renderToString(Write({
    post: {
      body: JSON.stringify({ blocks: [] }),
      comments: [],
      createdAt: "2026-07-22 12:00:00",
      description: "Description",
      draft: true,
      id: 7,
      image: "",
      keywords: [],
      slug: "live-post",
      title: "Live post",
      updatedAt: "2026-07-22 12:00:00",
      userId: 1,
    },
  }));

  assert.match(
    html,
    /data-view-live-post[^>]*href="\/blog\/live-post"[^>]*title="View live post"/,
  );
  assert.match(
    html,
    /data-view-live-post[\s\S]*aria-label="Import Markdown"/,
  );
});
