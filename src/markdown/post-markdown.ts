// The Shipping Binaries Markdown serializer and importer.
//
// One implementation, two consumers: the Worker imports it directly (the bulk
// post export), and `npm run build:js` bundles src/markdown/browser.ts into
// public/js/post-markdown.js for the editor's per-post export and import.
// Keep it free of node builtins and dependencies so the Worker still builds
// without `nodejs_compat`.

export type EditorSnapshot = {
  blocks: unknown[];
  time?: number;
  version?: string;
};

export type EditorBlock = {
  data: Record<string, unknown>;
  type: string;
};

export type PostFields = {
  description: string;
  draft: boolean;
  image: string;
  keywords: string;
  slug: string;
  slugMode: "auto" | "custom";
  title: string;
};

export type PostSnapshot = {
  editor: EditorSnapshot;
  post: Partial<PostFields>;
};

export type PostMarkdownFlavor = "bear" | "obsidian";

export type PostMarkdownOptions = {
  flavor?: PostMarkdownFlavor;
  // Appends the base64 `shipping-binaries-export` trailer that restores every
  // editor block on import. Defaults to true; the bulk export turns it off so
  // the files are plain frontmatter Markdown.
  includeEditorData?: boolean;
};

export type PackagedPost = {
  editor: EditorSnapshot;
  format: string;
  post: PostFields;
  version: number;
};

export type MarkdownImport = {
  blocks: EditorBlock[];
  post: Partial<PostFields>;
};

export type YamlValue = string | number | boolean | YamlValue[];

export type YamlFields = Record<string, YamlValue>;

// `String(value || "")` without the loose typing.
const asText = (value: unknown): string => value ? String(value) : "";

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const backtick = String.fromCharCode(96);
const inlineCodePattern = new RegExp(
  backtick + "([^" + backtick + "]+)" + backtick,
  "g",
);
const codeFence = backtick.repeat(3);

export const markdownInline = (value: string): string =>
  escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_]+)__/g, "<b>$1</b>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>")
    .replace(/(^|[^_])_([^_\n]+)_/g, "$1<i>$2</i>")
    .replace(inlineCodePattern, "<code>$1</code>");

// Our exports open with YAML frontmatter, as do Obsidian and Bear notes
// generally. Without this the "---" fences import as delimiter blocks with a
// paragraph of raw keys between them.
const frontmatterPattern =
  /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const stripFrontmatter = (value: string): string =>
  asText(value).replace(frontmatterPattern, "");

const parseYamlScalar = (value: string): YamlValue => {
  const text = value.trim();
  if (text === "" || text === "~" || text === "null") return "";
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+$/.test(text)) return Number(text);
  if (text.startsWith("[") && text.endsWith("]")) {
    return text
      .slice(1, -1)
      .split(",")
      .map(parseYamlScalar)
      .filter((item) => item !== "");
  }
  if (text.startsWith('"')) {
    try {
      return JSON.parse(text);
    } catch {
      return text.replace(/^"|"$/g, "");
    }
  }
  if (text.startsWith("'")) return text.replace(/^'|'$/g, "");
  return text;
};

// A deliberately small YAML reader: the scalars and block sequences our own
// frontmatter uses, which is also all Obsidian properties need.
const parseFrontmatter = (
  source: string,
): { body: string; fields: YamlFields } | null => {
  const text = asText(source);
  const match = text.match(frontmatterPattern);
  if (!match) return null;

  const fields: YamlFields = {};
  let listKey = "";
  match[1].split(/\r?\n/).forEach((line) => {
    const item = line.match(/^[ \t]+-[ \t]+(.*)$/);
    if (item && listKey) {
      (fields[listKey] as YamlValue[]).push(parseYamlScalar(item[1] ?? ""));
      return;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):[ \t]*(.*)$/);
    if (!pair) return;

    if ((pair[2] ?? "").trim() === "") {
      listKey = pair[1] ?? "";
      fields[listKey] = [];
      return;
    }

    listKey = "";
    fields[pair[1] ?? ""] = parseYamlScalar(pair[2] ?? "");
  });

  return { body: text.slice(match[0].length), fields };
};

const keywordsFromFields = (fields: YamlFields): string | undefined => {
  const tags = fields.tags !== undefined ? fields.tags : fields.keywords;
  if (tags === undefined) return undefined;
  if (!Array.isArray(tags)) return String(tags);
  return tags
    .map((tag) => String(tag).replace(/^#/, "").replace(/-/g, " ").trim())
    .filter(Boolean)
    .join(", ");
};

const postFromFrontmatter = (fields: YamlFields): Partial<PostFields> => {
  const post: Partial<PostFields> = {};
  const text = (key: "description" | "image" | "slug" | "title"): void => {
    if (fields[key] === undefined) return;
    post[key] = String(fields[key]);
  };

  text("title");
  text("description");
  text("slug");
  text("image");
  if (fields.slugMode !== undefined) {
    post.slugMode = fields.slugMode === "auto" ? "auto" : "custom";
  }
  if (fields.draft !== undefined) {
    post.draft = fields.draft === true || fields.draft === "true";
  }

  const keywords = keywordsFromFields(fields);
  if (keywords !== undefined) post.keywords = keywords;
  return post;
};

// Bear keeps tags inline instead of in frontmatter, so its exports trail a
// line of them. A heading is safe: "# Title" has a space after the hash.
// A closing hash only closes at a word boundary, otherwise "#one #two#"
// reads the second tag's opening hash as the first tag's closer.
const bearTagToken = /#([^#\n]+?)#(?=[ \t]|$)|#([^#\s]+)/g;
const bearTagPart = "(?:#[^#\\n]+?#(?=[ \\t]|$)|#[^#\\s]+)";
const bearTagLine = new RegExp(
  "^[ \\t]*" + bearTagPart + "(?:[ \\t]+" + bearTagPart + ")*[ \\t]*$",
);

const splitBearTagLine = (
  source: string,
): { body: string; keywords: string } | null => {
  const lines = asText(source).replace(/\s+$/, "").split(/\r?\n/);
  const last = lines[lines.length - 1];
  if (lines.length < 2 || !last || !bearTagLine.test(last)) return null;

  const tags = Array.from(
    last.matchAll(bearTagToken),
    (match) => (match[1] || match[2] || "").trim(),
  ).filter(Boolean);
  if (tags.length === 0) return null;

  return {
    body: lines.slice(0, -1).join("\n").replace(/\s+$/, ""),
    keywords: tags.join(", "),
  };
};

export const markdownToBlocks = (source: string): { blocks: EditorBlock[] } => {
  const markdown = stripFrontmatter(source);
  const usedFootnoteIds = new Set(
    Array.from(
      markdown.matchAll(/^\[\^([A-Za-z0-9_-]+)\]:/gm),
      (match) => match[1],
    ),
  );
  const inlineFootnotes: Array<{ id: string; text: string }> = [];
  let inlineFootnoteNumber = 1;
  const normalizedMarkdown = markdown.replace(
    /\^\[([^\]\n]+)\]/g,
    (_match, text) => {
      let id = "obsidian-inline-" + inlineFootnoteNumber;
      while (usedFootnoteIds.has(id)) {
        inlineFootnoteNumber += 1;
        id = "obsidian-inline-" + inlineFootnoteNumber;
      }
      inlineFootnoteNumber += 1;
      usedFootnoteIds.add(id);
      inlineFootnotes.push({ id, text });
      return "[^" + id + "]";
    },
  );
  const lines = normalizedMarkdown
    .replace(/\r\n/g, "\n")
    .split("\n");
  const blocks: EditorBlock[] = [];
  const footnotes: EditorBlock[] = inlineFootnotes.map((footnote) => ({
    type: "footnote",
    data: {
      id: footnote.id,
      text: markdownInline(footnote.text),
    },
  }));
  let paragraph: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({
      type: "paragraph",
      data: { text: paragraph.map(markdownInline).join("<br>") },
    });
    paragraph = [];
  };

  const flushCode = () => {
    blocks.push({ type: "code", data: { code: code.join("\n") } });
    code = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    const footnote = line.match(/^\[\^([A-Za-z0-9_-]+)\]:\s*(.*)$/);
    if (footnote && !inCode) {
      flushParagraph();
      const definition = [footnote[2] ?? ""];
      while (
        index + 1 < lines.length &&
        /^(?: {2,}|\t)\S/.test(lines[index + 1])
      ) {
        index += 1;
        definition.push((lines[index] ?? "").trim());
      }
      footnotes.push({
        type: "footnote",
        data: {
          id: footnote[1] ?? "",
          text: definition.map(markdownInline).join("<br>"),
        },
      });
      continue;
    }

    if (line.trimStart().startsWith(codeFence)) {
      if (inCode) flushCode();
      else flushParagraph();
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "header",
        data: {
          level: Math.min(4, Math.max(2, (heading[1] ?? "").length)),
          text: markdownInline(heading[2] ?? ""),
        },
      });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? "")) {
        quote.push((lines[index] ?? "").replace(/^\s*>\s?/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push({
        type: "quote",
        data: {
          alignment: "left",
          caption: "",
          text: quote.map(markdownInline).join("<br>"),
        },
      });
      continue;
    }

    const unordered = line.match(/^\s*[-+*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const style = ordered ? "ordered" : "unordered";
      const items: Array<{ content: string; items: never[]; meta: object }> =
        [];
      const pattern = ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-+*]\s+(.+)$/;
      while (index < lines.length) {
        const item = (lines[index] ?? "").match(pattern);
        if (!item) break;
        items.push({
          content: markdownInline(item[1] ?? ""),
          items: [],
          meta: {},
        });
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "list", data: { items, meta: {}, style } });
      continue;
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ type: "delimiter", data: {} });
      continue;
    }

    // Ignore email-capture markers left in older exports.
    if (/^<!--\s*(?:sb::)?email-capture\s*-->$/.test(line.trim())) {
      flushParagraph();
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  if (inCode) flushCode();
  flushParagraph();
  return { blocks: blocks.concat(footnotes) };
};

export const inlineHtmlToMarkdown = (value: unknown): string => {
  const render = (source: unknown): string =>
    asText(source)
      .replace(
        /<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
        (_match, _quote, href, text) => "[" + render(text) + "](" + href + ")",
      )
      .replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**")
      .replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*")
      .replace(/<(?:del|s)>([\s\S]*?)<\/(?:del|s)>/gi, "~~$1~~")
      .replace(/<code>([\s\S]*?)<\/code>/gi, backtick + "$1" + backtick)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&");

  return render(value);
};

export const listItemsToMarkdown = (
  items: unknown,
  style: "ordered" | "unordered",
  depth = 0,
): string =>
  (Array.isArray(items) ? items as unknown[] : []).flatMap((item, index) => {
    const prefix = style === "ordered" ? String(index + 1) + "." : "-";
    const indentation = "  ".repeat(depth);
    const lines = [
      indentation + prefix + " " + inlineHtmlToMarkdown(asRecord(item).content),
    ];
    const nested = asRecord(item).items;
    if (Array.isArray(nested) && nested.length > 0) {
      lines.push(listItemsToMarkdown(nested, style, depth + 1));
    }
    return lines;
  }).join("\n");

export const editorDataToMarkdown = (data: EditorSnapshot): string =>
  (Array.isArray(data.blocks) ? data.blocks : [])
    .filter((block) => asRecord(block).type !== "emailCapture")
    .map((block) => {
      const blockData = asRecord(asRecord(block).data);
      switch (asRecord(block).type) {
        case "paragraph":
          return inlineHtmlToMarkdown(blockData.text);
        case "header": {
          const level = Math.min(6, Math.max(1, Number(blockData.level) || 2));
          return "#".repeat(level) + " " + inlineHtmlToMarkdown(blockData.text);
        }
        case "list":
          return listItemsToMarkdown(
            blockData.items,
            blockData.style === "ordered" ? "ordered" : "unordered",
          );
        case "quote": {
          const quote = inlineHtmlToMarkdown(blockData.text)
            .split("\n")
            .map((line) => "> " + line)
            .join("\n");
          const caption = inlineHtmlToMarkdown(blockData.caption);
          return caption ? quote + "\n>\n> — " + caption : quote;
        }
        case "code": {
          const code = asText(blockData.code);
          const fence = code.includes(codeFence)
            ? backtick.repeat(4)
            : codeFence;
          return fence + "\n" + code + "\n" + fence;
        }
        case "delimiter":
          return "---";
        case "footnote":
          return "[^" + asText(blockData.id) + "]: " +
            inlineHtmlToMarkdown(blockData.text).replace(/\n/g, "\n  ");
        default:
          return "<!-- Unsupported Editor.js block: " +
            asText(asRecord(block).type || "unknown") + " -->";
      }
    }).join("\n\n");

export const encodeUtf8Base64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + 0x8000),
    );
  }
  return btoa(binary);
};

const decodeUtf8Base64 = (value: string): string => {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const splitKeywords = (value: unknown): string[] =>
  asText(value)
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

// Obsidian tags live in the "tags" property and cannot contain spaces;
// nesting is expressed with a slash.
export const obsidianTag = (keyword: string): string =>
  keyword
    .replace(/^#+/, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_/-]/g, "")
    .replace(/^-+|-+$/g, "");

// Bear tags are inline, and a multi-word tag has to be closed with a second
// hash or it stops at the first space.
export const bearTag = (keyword: string): string => {
  const tag = keyword.replace(/#/g, "").trim();
  if (!tag) return "";
  return /\s/.test(tag) ? "#" + tag + "#" : "#" + tag;
};

// The canonical serializer. `createShippingBinariesMarkdown` is the name the
// browser bundle publishes on `window`.
export const postToMarkdown = (
  snapshot: PostSnapshot,
  options?: PostMarkdownOptions,
): string => {
  const post = snapshot.post || {};
  const editor: EditorSnapshot = snapshot.editor || { blocks: [] };
  const includeEditorData = options?.includeEditorData !== false;
  const bear = options?.flavor === "bear";
  const title = String(post.title || "");
  const keywords = splitKeywords(post.keywords);
  const frontmatterLines = [
    "---",
    "title: " + JSON.stringify(title),
    "description: " + JSON.stringify(String(post.description || "")),
    "slug: " + JSON.stringify(String(post.slug || "")),
    "slugMode: " + JSON.stringify(
      post.slugMode === "auto" ? "auto" : "custom",
    ),
  ];

  if (!bear) {
    const tags = keywords.map(obsidianTag).filter(Boolean);
    frontmatterLines.push(tags.length > 0 ? "tags:" : "tags: []");
    tags.forEach((tag) => frontmatterLines.push("  - " + tag));
  }

  frontmatterLines.push(
    "image: " + JSON.stringify(String(post.image || "")),
    "draft: " + (post.draft ? "true" : "false"),
    "shippingBinariesFormat: 1",
    "---",
  );

  const body = editorDataToMarkdown(editor).trim();
  const sections: string[] = [];

  if (bear) {
    // Bear names a note from its first line, and only picks the heading up
    // when it follows the frontmatter with no blank line between them.
    sections.push(
      frontmatterLines.join("\n") + (title ? "\n# " + title : ""),
    );
  } else {
    sections.push(frontmatterLines.join("\n"));
  }

  if (body) sections.push(body);

  if (bear) {
    const tags = keywords.map(bearTag).filter(Boolean);
    if (tags.length > 0) sections.push(tags.join(" "));
  }

  if (includeEditorData) {
    const payload = {
      editor,
      format: "shipping-binaries-markdown",
      post: {
        description: String(post.description || ""),
        draft: Boolean(post.draft),
        image: String(post.image || ""),
        keywords: String(post.keywords || ""),
        slug: String(post.slug || ""),
        slugMode: post.slugMode === "auto" ? "auto" : "custom",
        title: String(post.title || ""),
      },
      version: 1,
    };
    sections.push(
      "<!-- shipping-binaries-export:v1:" +
        encodeUtf8Base64(JSON.stringify(payload)) + " -->",
    );
  }

  return sections.join("\n\n") + "\n";
};

export const parseShippingBinariesMarkdown = (
  markdown: string,
): PackagedPost | null => {
  const marker = asText(markdown).match(
    /<!--\s*shipping-binaries-export:v1:([A-Za-z0-9+/=]+)\s*-->\s*$/,
  );
  if (!marker) return null;

  try {
    const payload = asRecord(
      JSON.parse(decodeUtf8Base64(marker[1] ?? "")) as unknown,
    );
    if (
      payload.format !== "shipping-binaries-markdown" ||
      payload.version !== 1 ||
      !Array.isArray(asRecord(payload.editor).blocks) ||
      typeof payload.post !== "object" ||
      payload.post === null
    ) {
      return null;
    }
    return payload as unknown as PackagedPost;
  } catch {
    return null;
  }
};

// The whole non-packaged import path: frontmatter into post fields, Bear's
// trailing tag line into keywords, and the rest into blocks.
export const parseMarkdownImport = (source: string): MarkdownImport => {
  const frontmatter = parseFrontmatter(source);
  const post: Partial<PostFields> = frontmatter
    ? postFromFrontmatter(frontmatter.fields)
    : {};
  let body = frontmatter ? frontmatter.body : asText(source);

  if (post.keywords === undefined) {
    const bearTags = splitBearTagLine(body);
    if (bearTags) {
      body = bearTags.body;
      post.keywords = bearTags.keywords;
    }
  }

  // The Bear flavor repeats the title as a leading heading so Bear can name
  // the note from it; don't import a second copy into the body.
  const title = post.title;
  if (title) {
    body = body.replace(
      /^[ \t\r\n]*#[ \t]+(.+?)[ \t]*(?:\r?\n|$)/,
      (match: string, heading: string) =>
        heading.trim() === title.trim() ? "" : match,
    );
  }

  return { blocks: markdownToBlocks(body).blocks, post };
};
