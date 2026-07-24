import type { FC } from "hono/jsx";
import { escapeHtml } from "../ui/utils.js";
import { parseEditorData } from "../editorData.js";

type EditorBlock = {
  type?: string;
  data?: Record<string, unknown>;
};

type EditorData = {
  blocks: EditorBlock[];
};

type PostBodyProps = {
  body: string;
  headings?: readonly PostHeading[];
};

export type PostHeading = {
  id: string;
  label: string;
  level: 2 | 3 | 4;
};

type ListItem = {
  content: string;
  items: ListItem[];
};

type Footnote = {
  id: string;
  number: number;
  text: string;
};

type FootnoteReferenceContext = {
  counts: Map<string, number>;
  numbers: ReadonlyMap<string, number>;
};

const publicLinkClass =
  "inline-flex items-baseline gap-1 text-burgundy-700 underline visited:text-burgundy-600 hover:text-burgundy-600 focus-visible:text-burgundy-600 active:text-burgundy-600 dark:text-burgundy-300 dark:visited:text-burgundy-200 dark:hover:text-burgundy-200 dark:focus-visible:text-burgundy-200 dark:active:text-burgundy-200";

const externalLinkIcon =
  '<svg aria-hidden="true" class="size-3.5 shrink-0 self-center fill-none stroke-current" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>';

const safeLink = (value: string): string | null => {
  if (/^#[A-Za-z0-9_-]+$/.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
};

const sanitizeInlineHtml = (
  value: string,
  footnoteReferences?: FootnoteReferenceContext,
): string => {
  const links: { close: string; open: string }[] = [];
  let closingLinkIndex = 0;
  const withLinkTokens = value
    .replace(
      /<a\s+[^>]*href=(['"])(.*?)\1[^>]*>/gi,
      (_match, _quote: string, href: string) => {
        const safeHref = safeLink(href);
        if (!safeHref) {
          return "";
        }

        const token = `EDITORJSLINK${links.length}TOKEN`;
        const external = /^https?:\/\//.test(safeHref);
        links.push({
          close: external ? `${externalLinkIcon}</a>` : "</a>",
          open: `<a class="${publicLinkClass}" href="${escapeHtml(safeHref)}"${
            external ? ' rel="noopener noreferrer" target="_blank"' : ""
          }>`,
        });
        return token;
      },
    )
    .replace(
      /<\/a>/gi,
      () => `EDITORJSLINKEND${closingLinkIndex++}TOKEN`,
    );

  let sanitized = escapeHtml(withLinkTokens)
    .replace(/&lt;(?:b|strong)&gt;/gi, "<strong>")
    .replace(/&lt;\/(?:b|strong)&gt;/gi, "</strong>")
    .replace(/&lt;(?:i|em)&gt;/gi, "<em>")
    .replace(/&lt;\/(?:i|em)&gt;/gi, "</em>")
    .replace(/&lt;u&gt;/gi, "<u>")
    .replace(/&lt;\/u&gt;/gi, "</u>")
    .replace(/&lt;(?:s|del)&gt;/gi, "<del>")
    .replace(/&lt;\/(?:s|del)&gt;/gi, "</del>")
    .replace(/&lt;code&gt;/gi, "<code>")
    .replace(/&lt;\/code&gt;/gi, "</code>")
    .replace(/&lt;sup&gt;/gi, "<sup>")
    .replace(/&lt;\/sup&gt;/gi, "</sup>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>");

  links.forEach((link, index) => {
    sanitized = sanitized
      .replace(`EDITORJSLINK${index}TOKEN`, link.open)
      .replace(`EDITORJSLINKEND${index}TOKEN`, link.close);
  });

  if (footnoteReferences) {
    sanitized = sanitized.replace(
      /\[\^([A-Za-z0-9_-]+)\]/g,
      (marker, id: string) => {
        const number = footnoteReferences.numbers.get(id);
        if (!number) {
          return marker;
        }

        const referenceCount = (footnoteReferences.counts.get(id) ?? 0) + 1;
        footnoteReferences.counts.set(id, referenceCount);
        const referenceId = referenceCount === 1
          ? `footnote-reference-${id}`
          : `footnote-reference-${id}-${referenceCount}`;

        return `<sup><a aria-label="Footnote ${number}" class="${publicLinkClass}" href="#footnote-${id}" id="${referenceId}">${number}</a></sup>`;
      },
    );
  }

  return sanitized;
};

const parseBody = (body: string): EditorData => {
  const parsed = parseEditorData(body);
  if (parsed) {
    return { blocks: parsed.blocks as EditorBlock[] };
  }

  // Legacy post bodies are rendered as plain text.
  return {
    blocks: [{ type: "legacy", data: { text: body } }],
  };
};

const blockText = (block: EditorBlock, key = "text"): string => {
  const value = block.data?.[key];
  return typeof value === "string" ? value : "";
};

const decodeHeadingText = (value: string): string =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const headingLevel = (block: EditorBlock): PostHeading["level"] => {
  const level = Number(block.data?.level);
  return level === 3 || level === 4 ? level : 2;
};

const headingSlug = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

export const getPostHeadings = (body: string): PostHeading[] => {
  const counts = new Map<string, number>();

  return parseBody(body).blocks.flatMap((block) => {
    if (block.type !== "header") {
      return [];
    }

    const label = decodeHeadingText(blockText(block));
    if (!label) {
      return [];
    }

    const baseId = headingSlug(label);
    const count = (counts.get(baseId) ?? 0) + 1;
    counts.set(baseId, count);

    return [{
      id: count === 1 ? baseId : `${baseId}-${count}`,
      label,
      level: headingLevel(block),
    }];
  });
};

const InlineText: FC<{
  footnoteReferences?: FootnoteReferenceContext;
  value: string;
}> = ({ footnoteReferences, value }) => (
  <span
    dangerouslySetInnerHTML={{
      __html: sanitizeInlineHtml(value, footnoteReferences),
    }}
  />
);

const normalizeListItems = (value: unknown): ListItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string") {
      return [{ content: item, items: [] }];
    }

    if (typeof item !== "object" || item === null) {
      return [];
    }

    const content = "content" in item && typeof item.content === "string"
      ? item.content
      : "";
    const children = "items" in item ? normalizeListItems(item.items) : [];
    return [{ content, items: children }];
  });
};

const ListItems: FC<{
  footnoteReferences: FootnoteReferenceContext;
  items: ListItem[];
  ordered: boolean;
}> = ({
  footnoteReferences,
  items,
  ordered,
}) => {
  const className = ordered
    ? "list-decimal space-y-2 pl-6"
    : "list-disc space-y-2 pl-6";
  const children = items.map((item) => (
    <li>
      <InlineText
        footnoteReferences={footnoteReferences}
        value={item.content}
      />
      {item.items.length > 0
        ? (
          <ListItems
            footnoteReferences={footnoteReferences}
            items={item.items}
            ordered={ordered}
          />
        )
        : null}
    </li>
  ));

  return ordered
    ? <ol class={className}>{children}</ol>
    : <ul class={className}>{children}</ul>;
};

const EditorBlockView: FC<{
  block: EditorBlock;
  footnoteReferences: FootnoteReferenceContext;
  heading?: PostHeading;
}> = ({ block, footnoteReferences, heading }) => {
  if (block.type === "legacy") {
    return <p class="whitespace-pre-wrap">{blockText(block)}</p>;
  }

  if (block.type === "header") {
    const level = Number(block.data?.level);
    const content = (
      <InlineText
        footnoteReferences={footnoteReferences}
        value={blockText(block)}
      />
    );

    if (level === 3) {
      return (
        <h3 class="scroll-mt-8 text-xl font-bold" id={heading?.id}>
          {content}
        </h3>
      );
    }
    if (level === 4) {
      return (
        <h4 class="scroll-mt-8 text-lg font-bold" id={heading?.id}>
          {content}
        </h4>
      );
    }
    return (
      <h2 class="scroll-mt-8 text-2xl font-bold" id={heading?.id}>
        {content}
      </h2>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote class="border-l-4 border-chocolate-500 pl-4">
        <p>
          <InlineText
            footnoteReferences={footnoteReferences}
            value={blockText(block)}
          />
        </p>
        {blockText(block, "caption")
          ? (
            <cite class="mt-2 block text-sm opacity-70">
              <InlineText
                footnoteReferences={footnoteReferences}
                value={blockText(block, "caption")}
              />
            </cite>
          )
          : null}
      </blockquote>
    );
  }

  if (block.type === "list") {
    return (
      <ListItems
        footnoteReferences={footnoteReferences}
        items={normalizeListItems(block.data?.items)}
        ordered={block.data?.style === "ordered"}
      />
    );
  }

  if (block.type === "code") {
    return (
      <pre class="overflow-x-auto rounded-md bg-onyx-950 p-4 text-amber-50">
        <code>{blockText(block, "code")}</code>
      </pre>
    );
  }

  if (block.type === "delimiter") {
    return <hr class="border-amber-50/30 dark:border-mist-600/30" />;
  }

  return (
    <p>
      <InlineText
        footnoteReferences={footnoteReferences}
        value={blockText(block)}
      />
    </p>
  );
};

const collectFootnotes = (blocks: readonly EditorBlock[]): Footnote[] => {
  const seen = new Set<string>();
  const footnotes: Footnote[] = [];

  for (const block of blocks) {
    if (block.type !== "footnote") continue;

    const id = blockText(block, "id");
    if (!/^[A-Za-z0-9_-]+$/.test(id) || seen.has(id)) continue;

    seen.add(id);
    const number = footnotes.length + 1;
    footnotes.push({
      id,
      number,
      text: blockText(block),
    });
  }

  return footnotes;
};

const valueReferencesFootnote = (value: unknown, id: string): boolean => {
  if (typeof value === "string") {
    return value.includes(`[^${id}]`);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueReferencesFootnote(item, id));
  }
  if (value && typeof value === "object") {
    return Object.values(value).some((item) =>
      valueReferencesFootnote(item, id)
    );
  }
  return false;
};

const addImplicitFootnoteReferences = (
  blocks: readonly EditorBlock[],
  footnotes: readonly Footnote[],
): EditorBlock[] => {
  const renderedBlocks = [...blocks];

  for (const footnote of footnotes) {
    const explicitlyReferenced = blocks.some((block) =>
      block.type !== "footnote" &&
      valueReferencesFootnote(block.data, footnote.id)
    );
    if (explicitlyReferenced) continue;

    const definitionIndex = blocks.findIndex((block) =>
      block.type === "footnote" && blockText(block, "id") === footnote.id
    );
    for (let index = definitionIndex - 1; index >= 0; index -= 1) {
      const block = renderedBlocks[index];
      if (block.type === "footnote" || typeof block.data?.text !== "string") {
        continue;
      }

      renderedBlocks[index] = {
        ...block,
        data: {
          ...block.data,
          text: `${block.data.text}[^${footnote.id}]`,
        },
      };
      break;
    }
  }

  return renderedBlocks;
};

const Undo2Icon: FC = () => (
  <svg
    aria-hidden="true"
    class="size-4 fill-none stroke-current"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
  >
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
  </svg>
);

const FootnotesSection: FC<{
  footnoteReferences: FootnoteReferenceContext;
  footnotes: readonly Footnote[];
}> = ({ footnoteReferences, footnotes }) => (
  <section
    aria-labelledby="footnotes-heading"
    class="mt-10 border-t border-mist-600/25 pt-5 dark:border-amber-50/25"
  >
    <h2 class="mb-3 text-lg font-bold" id="footnotes-heading">Footnotes</h2>
    <ol class="list-decimal space-y-3 pl-6 text-sm">
      {footnotes.map((footnote) => (
        <li id={`footnote-${footnote.id}`} role="note">
          <InlineText
            footnoteReferences={footnoteReferences}
            value={footnote.text}
          />
          {footnoteReferences.counts.has(footnote.id)
            ? (
              <a
                aria-label={`Back to footnote ${footnote.number} reference`}
                class={`ml-2 ${publicLinkClass}`}
                href={`#footnote-reference-${footnote.id}`}
                title={`Back to footnote ${footnote.number} reference`}
              >
                <Undo2Icon />
              </a>
            )
            : null}
        </li>
      ))}
    </ol>
  </section>
);

export const PostBody: FC<PostBodyProps> = ({ body, headings }) => {
  const data = parseBody(body);
  const footnotes = collectFootnotes(data.blocks);
  const renderedBlocks = addImplicitFootnoteReferences(
    data.blocks,
    footnotes,
  );
  const footnoteReferences: FootnoteReferenceContext = {
    counts: new Map(),
    numbers: new Map(
      footnotes.map((footnote) => [footnote.id, footnote.number]),
    ),
  };
  const contentBlocks = renderedBlocks.filter((block) =>
    block.type !== "footnote"
  );
  let headingIndex = 0;

  return (
    <div class="space-y-4 leading-relaxed">
      {contentBlocks.map((block) => {
        const heading = block.type === "header" &&
            decodeHeadingText(blockText(block))
          ? headings?.[headingIndex++]
          : undefined;

        return (
          <EditorBlockView
            block={block}
            footnoteReferences={footnoteReferences}
            heading={heading}
          />
        );
      })}
      {footnotes.length > 0
        ? (
          <FootnotesSection
            footnoteReferences={footnoteReferences}
            footnotes={footnotes}
          />
        )
        : null}
    </div>
  );
};
