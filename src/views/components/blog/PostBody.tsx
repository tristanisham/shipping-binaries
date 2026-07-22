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
  "text-burgundy-700 underline visited:text-burgundy-600 hover:text-burgundy-600 focus-visible:text-burgundy-600 active:text-burgundy-600 dark:text-burgundy-300 dark:visited:text-burgundy-200 dark:hover:text-burgundy-200 dark:focus-visible:text-burgundy-200 dark:active:text-burgundy-200";

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
  const links: string[] = [];
  const withLinkTokens = value
    .replace(
      /<a\s+[^>]*href=(['"])(.*?)\1[^>]*>/gi,
      (_match, _quote: string, href: string) => {
        const safeHref = safeLink(href);
        if (!safeHref) {
          return "";
        }

        const token = `EDITORJSLINK${links.length}TOKEN`;
        links.push(
          `<a class="${publicLinkClass}" href="${
            escapeHtml(safeHref)
          }" rel="noreferrer">`,
        );
        return token;
      },
    )
    .replace(/<\/a>/gi, "EDITORJSLINKENDTOKEN");

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
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
    .replace(/EDITORJSLINKENDTOKEN/g, "</a>");

  links.forEach((link, index) => {
    sanitized = sanitized.replace(`EDITORJSLINK${index}TOKEN`, link);
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
}> = ({ block, footnoteReferences }) => {
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

    if (level === 2) return <h2 class="text-2xl font-bold">{content}</h2>;
    if (level === 3) return <h3 class="text-xl font-bold">{content}</h3>;
    if (level === 4) return <h4 class="text-lg font-bold">{content}</h4>;
    return <h2 class="text-2xl font-bold">{content}</h2>;
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
    footnotes.push({
      id,
      number: footnotes.length + 1,
      text: blockText(block),
    });
  }

  return footnotes;
};

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
              >
                ↩
              </a>
            )
            : null}
        </li>
      ))}
    </ol>
  </section>
);

export const PostBody: FC<PostBodyProps> = ({ body }) => {
  const data = parseBody(body);
  const footnotes = collectFootnotes(data.blocks);
  const footnoteReferences: FootnoteReferenceContext = {
    counts: new Map(),
    numbers: new Map(
      footnotes.map((footnote) => [footnote.id, footnote.number]),
    ),
  };
  const contentBlocks = data.blocks.filter((block) =>
    block.type !== "footnote"
  );

  return (
    <div class="space-y-4 leading-relaxed">
      {contentBlocks.map((block) => (
        <EditorBlockView
          block={block}
          footnoteReferences={footnoteReferences}
        />
      ))}
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
