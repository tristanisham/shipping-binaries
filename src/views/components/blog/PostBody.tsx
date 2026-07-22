import type { FC } from "hono/jsx";

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

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeLink = (value: string): string | null => {
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

const sanitizeInlineHtml = (value: string): string => {
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
          `<a class="text-burgundy-700 underline visited:text-burgundy-600 hover:text-burgundy-600 focus-visible:text-burgundy-600 active:text-burgundy-600" href="${
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
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>")
    .replace(/EDITORJSLINKENDTOKEN/g, "</a>");

  links.forEach((link, index) => {
    sanitized = sanitized.replace(`EDITORJSLINK${index}TOKEN`, link);
  });

  return sanitized;
};

const parseBody = (body: string): EditorData => {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "blocks" in parsed &&
      Array.isArray(parsed.blocks)
    ) {
      return { blocks: parsed.blocks as EditorBlock[] };
    }
  } catch {
    // Legacy post bodies are rendered as plain text below.
  }

  return {
    blocks: [{ type: "legacy", data: { text: body } }],
  };
};

const blockText = (block: EditorBlock, key = "text"): string => {
  const value = block.data?.[key];
  return typeof value === "string" ? value : "";
};

const InlineText: FC<{ value: string }> = ({ value }) => (
  <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(value) }} />
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

const ListItems: FC<{ items: ListItem[]; ordered: boolean }> = ({
  items,
  ordered,
}) => {
  const className = ordered
    ? "list-decimal space-y-2 pl-6"
    : "list-disc space-y-2 pl-6";
  const children = items.map((item) => (
    <li>
      <InlineText value={item.content} />
      {item.items.length > 0
        ? <ListItems items={item.items} ordered={ordered} />
        : null}
    </li>
  ));

  return ordered
    ? <ol class={className}>{children}</ol>
    : <ul class={className}>{children}</ul>;
};

const EditorBlockView: FC<{ block: EditorBlock }> = ({ block }) => {
  if (block.type === "legacy") {
    return <p class="whitespace-pre-wrap">{blockText(block)}</p>;
  }

  if (block.type === "header") {
    const level = Number(block.data?.level);
    const content = <InlineText value={blockText(block)} />;

    if (level === 2) return <h2 class="text-2xl font-bold">{content}</h2>;
    if (level === 3) return <h3 class="text-xl font-bold">{content}</h3>;
    if (level === 4) return <h4 class="text-lg font-bold">{content}</h4>;
    return <h2 class="text-2xl font-bold">{content}</h2>;
  }

  if (block.type === "quote") {
    return (
      <blockquote class="border-l-4 border-chocolate-500 pl-4">
        <p>
          <InlineText value={blockText(block)} />
        </p>
        {blockText(block, "caption")
          ? (
            <cite class="mt-2 block text-sm opacity-70">
              <InlineText value={blockText(block, "caption")} />
            </cite>
          )
          : null}
      </blockquote>
    );
  }

  if (block.type === "list") {
    return (
      <ListItems
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
      <InlineText value={blockText(block)} />
    </p>
  );
};

export const PostBody: FC<PostBodyProps> = ({ body }) => {
  const data = parseBody(body);

  return (
    <div class="space-y-4 leading-relaxed">
      {data.blocks.map((block) => <EditorBlockView block={block} />)}
    </div>
  );
};
