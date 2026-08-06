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

test("new editor data starts with an email capture after the writing block", () => {
  assert.deepEqual(normalizeEditorData("", true), {
    blocks: [
      { type: "paragraph", data: { text: "" } },
      { type: "emailCapture", data: {} },
    ],
  });
  assert.deepEqual(
    normalizeEditorData(JSON.stringify({ blocks: [] }), true),
    { blocks: [] },
  );
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
  assert.match(html, /data-editorjs-tool="emailCapture"/);
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
  assert.match(inlineScript, /class EmailCaptureTool/);
  assert.match(inlineScript, /emailCapture: EmailCaptureTool/);
  assert.match(inlineScript, /Email capture title/);
  assert.match(inlineScript, /Email capture description/);
  assert.match(inlineScript, /contentEditable = String\(!this\.readOnly\)/);
  assert.match(inlineScript, /Edit the title and description in place/);
  assert.match(inlineScript, /description: this\.description\?\.textContent/);
  assert.match(inlineScript, /title: this\.title\?\.textContent/);
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
    createShippingBinariesMarkdown?: (
      snapshot: {
        editor: {
          blocks: Array<{ data: Record<string, unknown>; type: string }>;
          time?: number;
          version?: string;
        };
        post: {
          description: string;
          draft: boolean;
          image: string;
          keywords: string;
          slug: string;
          slugMode: "auto" | "custom";
          title: string;
        };
      },
      options?: { flavor?: "bear" | "obsidian"; includeEditorData?: boolean },
    ) => string;
    markdownToEditorBlocks?: (markdown: string) => {
      blocks: Array<{ type: string }>;
    };
    parseMarkdownImport?: (markdown: string) => {
      blocks: Array<{ data: Record<string, unknown>; type: string }>;
      post: Partial<{
        description: string;
        draft: boolean;
        image: string;
        keywords: string;
        slug: string;
        slugMode: "auto" | "custom";
        title: string;
      }>;
    };
    parseShippingBinariesMarkdown?: (markdown: string) => {
      editor: {
        blocks: Array<{ data: Record<string, unknown>; type: string }>;
        time?: number;
        version?: string;
      };
      format: string;
      post: {
        description: string;
        draft: boolean;
        image: string;
        keywords: string;
        slug: string;
        slugMode: "auto" | "custom";
        title: string;
      };
      version: number;
    } | null;
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

  const captureBlock = browserWindow.markdownToEditorBlocks?.(
    "Before\n\n<!-- sb::email-capture -->\n\nAfter",
  );
  assert.deepEqual(captureBlock?.blocks.map((block) => block.type), [
    "paragraph",
    "emailCapture",
    "paragraph",
  ]);

  // Frontmatter is metadata, not body: it must not import as delimiter blocks
  // wrapped around a paragraph of raw keys.
  const withFrontmatter = browserWindow.markdownToEditorBlocks?.(
    '---\ntitle: "Kept out"\ntags:\n  - one\n---\n\nBody only.',
  );
  assert.deepEqual(withFrontmatter?.blocks.map((block) => block.type), [
    "paragraph",
  ]);
  assert.doesNotMatch(JSON.stringify(withFrontmatter), /Kept out/);

  // A lone rule in the body is still a delimiter.
  const rule = browserWindow.markdownToEditorBlocks?.("Above\n\n---\n\nBelow");
  assert.deepEqual(rule?.blocks.map((block) => block.type), [
    "paragraph",
    "delimiter",
    "paragraph",
  ]);

  // Exports written before the sb:: namespace still import.
  const legacyCaptureBlock = browserWindow.markdownToEditorBlocks?.(
    "Before\n\n<!-- email-capture -->\n\nAfter",
  );
  assert.deepEqual(legacyCaptureBlock?.blocks.map((block) => block.type), [
    "paragraph",
    "emailCapture",
    "paragraph",
  ]);

  const snapshot = {
    editor: {
      blocks: [
        {
          type: "paragraph",
          data: {
            custom: { preserved: true },
            text: "Unicode café with <b>exact</b> data.",
          },
        },
        { type: "emailCapture", data: {} },
      ],
      time: 1_753_370_400_000,
      version: "2.31.6",
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
  const markdown = browserWindow.createShippingBinariesMarkdown?.(snapshot);
  assert.match(markdown ?? "", /^---\ntitle: "Exact export"/);
  assert.match(markdown ?? "", /Unicode café with \*\*exact\*\* data\./);
  assert.match(
    markdown ?? "",
    /<!-- shipping-binaries-export:v1:[A-Za-z0-9+/=]+ -->\n$/,
  );
  const restored = browserWindow.parseShippingBinariesMarkdown?.(
    markdown ?? "",
  );
  assert.deepEqual(restored, {
    editor: snapshot.editor,
    format: "shipping-binaries-markdown",
    post: snapshot.post,
    version: 1,
  });

  // Obsidian keeps tags in a frontmatter property, so keywords become a YAML
  // list with the spaces Obsidian tags cannot contain replaced.
  const obsidian = browserWindow.createShippingBinariesMarkdown?.(snapshot, {
    flavor: "obsidian",
    includeEditorData: false,
  });
  assert.match(obsidian ?? "", /^---\ntitle: "Exact export"/);
  assert.match(obsidian ?? "", /\ntags:\n  - markdown\n  - round-trip\n/);
  assert.doesNotMatch(obsidian ?? "", /keywords:/);
  assert.match(obsidian ?? "", /---\n\nUnicode café with \*\*exact\*\* data\./);
  assert.match(obsidian ?? "", /\n\n<!-- sb::email-capture -->\n$/);
  assert.doesNotMatch(obsidian ?? "", /shipping-binaries-export/);
  assert.equal(
    browserWindow.parseShippingBinariesMarkdown?.(obsidian ?? ""),
    null,
  );

  // Bear names a note from its first line and only sees the heading when no
  // blank line separates it from the frontmatter; its tags are inline, and a
  // multi-word tag needs a closing hash.
  const bear = browserWindow.createShippingBinariesMarkdown?.(snapshot, {
    flavor: "bear",
    includeEditorData: false,
  });
  assert.match(bear ?? "", /\n---\n# Exact export\n\nUnicode café/);
  assert.doesNotMatch(bear ?? "", /\ntags:/);
  assert.match(bear ?? "", /\n\n#markdown #round trip#\n$/);
  assert.doesNotMatch(bear ?? "", /shipping-binaries-export/);

  // Both flavors come back through the plain import path with their post
  // fields intact.
  const fromObsidian = browserWindow.parseMarkdownImport?.(obsidian ?? "");
  assert.deepEqual(fromObsidian?.post, {
    description: "A precise export",
    draft: true,
    image: "https://example.com/image.png",
    keywords: "markdown, round trip",
    slug: "exact-export",
    slugMode: "custom",
    title: "Exact export",
  });
  assert.deepEqual(fromObsidian?.blocks.map((block) => block.type), [
    "paragraph",
    "emailCapture",
  ]);

  const fromBear = browserWindow.parseMarkdownImport?.(bear ?? "");
  assert.deepEqual(fromBear?.post, fromObsidian?.post);
  // Bear's title heading and trailing tag line are metadata, not body.
  assert.deepEqual(fromBear?.blocks.map((block) => block.type), [
    "paragraph",
    "emailCapture",
  ]);
});

test("Markdown import reads frontmatter without clobbering absent fields", () => {
  const html = renderToString(EditorJs({ name: "body" }));
  const inlineScript = html.match(/<script>\n([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);

  const browserWindow = {} as {
    parseMarkdownImport?: (markdown: string) => {
      blocks: Array<{ data: Record<string, unknown>; type: string }>;
      post: Record<string, unknown>;
    };
  };
  new Function("window", inlineScript)(browserWindow);

  // A note that only names a title leaves every other field untouched.
  const sparse = browserWindow.parseMarkdownImport?.(
    '---\ntitle: "Only a title"\n---\n\nBody.',
  );
  assert.deepEqual(sparse?.post, { title: "Only a title" });

  // Obsidian hyphenates multi-word tags; they come back as keywords.
  const tagged = browserWindow.parseMarkdownImport?.(
    "---\ntags:\n  - ai\n  - shipping-binaries\n---\n\nBody.",
  );
  assert.deepEqual(tagged?.post, { keywords: "ai, shipping binaries" });

  const emptyTags = browserWindow.parseMarkdownImport?.(
    "---\ntags: []\ndraft: false\n---\n\nBody.",
  );
  assert.deepEqual(emptyTags?.post, { draft: false, keywords: "" });

  // Quoted scalars keep their escapes.
  const quoted = browserWindow.parseMarkdownImport?.(
    '---\ntitle: "She said \\"go\\""\n---\n\nBody.',
  );
  assert.equal(quoted?.post.title, 'She said "go"');

  // A bare note is still importable, and a trailing Bear tag line is read even
  // without frontmatter.
  const bare = browserWindow.parseMarkdownImport?.("Just a body.");
  assert.deepEqual(bare?.post, {});
  assert.deepEqual(bare?.blocks.map((block) => block.type), ["paragraph"]);

  const inlineTags = browserWindow.parseMarkdownImport?.(
    "Body.\n\n#ai #star wars#",
  );
  assert.equal(inlineTags?.post.keywords, "ai, star wars");
  assert.deepEqual(inlineTags?.blocks.map((block) => block.type), ["paragraph"]);

  // A note that is nothing but tags keeps them as body rather than emptying.
  const onlyTags = browserWindow.parseMarkdownImport?.("#ai");
  assert.deepEqual(onlyTags?.post, {});
  assert.deepEqual(onlyTags?.blocks.map((block) => block.type), ["paragraph"]);

  // A heading is not a tag line: "# Title" has a space after the hash.
  const heading = browserWindow.parseMarkdownImport?.("Body.\n\n# Not a tag");
  assert.deepEqual(heading?.post, {});
  assert.deepEqual(heading?.blocks.map((block) => block.type), [
    "paragraph",
    "header",
  ]);
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
  assert.match(html, /aria-label="Export Markdown"/);
  assert.match(html, /data-markdown-export/);
  assert.match(html, /data-markdown-export-menu-root/);
  assert.match(html, /aria-controls="markdown-export-menu"/);
  assert.match(html, /hidden="" id="markdown-export-menu"/);
  assert.match(html, /aria-label="Download Obsidian Markdown"/);
  assert.match(html, /data-markdown-export-obsidian/);
  assert.match(html, /aria-label="Download Bear Markdown"/);
  assert.match(html, /data-markdown-export-bear/);
  assert.match(html, /aria-label="Download Markdown with editor data"/);
  assert.match(html, /data-markdown-export-editor-data/);
  assert.match(html, /<ellipse cx="12" cy="5" rx="9" ry="3"><\/ellipse>/);
  assert.match(html, /&quot;type&quot;:&quot;emailCapture&quot;/);
  assert.match(html, /<path d="M12 18v-6"><\/path>/);
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
