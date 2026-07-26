import { Feed } from "feed";
import type { PostWithAuthor } from "../models/post.js";
import { toIsoTimestamp } from "../views/components/date.js";
import { parseEditorData } from "../views/components/editorData.js";
import { SITE_NAME, toAbsoluteUrl } from "../views/components/SocialMeta.js";

export type FeedFormat = "atom" | "json" | "rss";

// Bare media types, for the `type` attribute of a <link rel="alternate">.
export const FEED_MIME_TYPES: Record<FeedFormat, string> = {
  atom: "application/atom+xml",
  json: "application/feed+json",
  rss: "application/rss+xml",
};

// The same types with an encoding, for the response header.
export const FEED_CONTENT_TYPES: Record<FeedFormat, string> = {
  atom: `${FEED_MIME_TYPES.atom}; charset=utf-8`,
  json: `${FEED_MIME_TYPES.json}; charset=utf-8`,
  rss: `${FEED_MIME_TYPES.rss}; charset=utf-8`,
};

// Feeds are polled on a schedule, so serve them from the edge for a while.
export const FEED_CACHE_CONTROL =
  "public, max-age=1800, stale-while-revalidate=3600";

// Whole-blog feeds, one path per format. Kept here rather than in the router so
// views can link them without importing a route module.
export const BLOG_FEED_PATHS: Record<FeedFormat, string> = {
  atom: "/feed.xml",
  json: "/feed.json",
  rss: "/rss",
};

// Author feeds mirror the whole-blog formats, under the author's handle.
export const authorFeedPaths = (
  username: string,
): Record<FeedFormat, string> => {
  const handle = `/@${encodeURIComponent(username)}`;
  return {
    atom: `${handle}/feed.xml`,
    json: `${handle}/feed.json`,
    rss: `${handle}/rss`,
  };
};

const FEED_FORMATS = ["rss", "atom", "json"] as const;

const DC_NAMESPACE = "http://purl.org/dc/elements/1.1/";

const FEED_LABELS: Record<FeedFormat, string> = {
  atom: "Atom",
  json: "JSON Feed",
  rss: "RSS",
};

export type FeedLink = { href: string; title: string; type: string };

// Autodiscovery links for LayoutMeta.feeds. RSS leads, since it is the format
// most readers assume when a page offers exactly one feed.
export const blogFeedLinks = (): FeedLink[] =>
  FEED_FORMATS.map((format) => ({
    href: toAbsoluteUrl(BLOG_FEED_PATHS[format]),
    title: `${SITE_NAME} (${FEED_LABELS[format]})`,
    type: FEED_MIME_TYPES[format],
  }));

export const authorFeedLinks = (
  username: string,
  displayName: string,
): FeedLink[] => {
  const paths = authorFeedPaths(username);
  return FEED_FORMATS.map((format) => ({
    href: toAbsoluteUrl(paths[format]),
    title: `Posts by ${displayName} (${FEED_LABELS[format]})`,
    type: FEED_MIME_TYPES[format],
  }));
};

// Cap the feed so a long archive does not turn into a multi-megabyte response.
const MAX_FEED_ITEMS = 50;
const MAX_EXCERPT_LENGTH = 300;

// The feed package escapes markup for us, but does not drop the control
// characters XML 1.0 forbids outright (tab/newline/return stay legal), which
// would otherwise produce a feed no parser accepts.
const stripInvalidXmlChars = (value: string): string =>
  value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

// D1 timestamps are UTC strings; the feed package wants real Dates.
const toDate = (value: string): Date => {
  const iso = toIsoTimestamp(value);
  return iso ? new Date(iso) : new Date();
};

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, limit: number): string => {
  if (value.length <= limit) {
    return value;
  }

  const clipped = value.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(" ");
  const trimmed = lastSpace > limit / 2 ? clipped.slice(0, lastSpace) : clipped;
  return `${trimmed.replace(/[\s.,;:]+$/, "")}…`;
};

// Feeds are summary-only: the post's own description when it has one, otherwise
// the opening text of the body. Legacy plain-text bodies fall back to the raw
// string, matching how they render on the site.
const postSummary = (post: PostWithAuthor): string => {
  if (post.description.trim().length > 0) {
    return post.description.trim();
  }

  const data = parseEditorData(post.body);
  if (!data) {
    return truncate(stripHtml(post.body), MAX_EXCERPT_LENGTH);
  }

  const text = data.blocks
    .map((block) => {
      if (typeof block !== "object" || block === null || !("data" in block)) {
        return "";
      }

      const blockData = block.data;
      if (typeof blockData !== "object" || blockData === null) {
        return "";
      }

      return "text" in blockData && typeof blockData.text === "string"
        ? stripHtml(blockData.text)
        : "";
    })
    .filter((value) => value.length > 0)
    .join(" ");

  return truncate(text, MAX_EXCERPT_LENGTH);
};

export type FeedOptions = {
  description: string;
  // Site-relative feed paths by format. Every entry becomes a feedLink, which
  // is what the package uses for each format's rel="self".
  feedPaths: Partial<Record<FeedFormat, string>>;
  // Site-relative path of the page this feed mirrors.
  pagePath: string;
  posts: readonly PostWithAuthor[];
  title: string;
};

const buildFeed = (
  format: FeedFormat,
  { description, feedPaths, pagePath, posts, title }: FeedOptions,
): Feed => {
  const items = posts.slice(0, MAX_FEED_ITEMS);
  // Items are ordered by publication date, so the most recent edit can be any
  // of them.
  const latestUpdate = items.map((post) => post.updatedAt).sort().at(-1);
  const pageUrl = toAbsoluteUrl(pagePath);

  const feed = new Feed({
    id: pageUrl,
    title: stripInvalidXmlChars(title),
    description: stripInvalidXmlChars(description),
    link: pageUrl,
    language: "en-us",
    generator: SITE_NAME,
    updated: latestUpdate ? toDate(latestUpdate) : undefined,
    copyright: `© ${new Date().getFullYear()} ${SITE_NAME}`,
    feedLinks: Object.fromEntries(
      Object.entries(feedPaths).map((
        [format, path],
      ) => [format, toAbsoluteUrl(path)]),
    ),
  });

  for (const post of items) {
    const url = toAbsoluteUrl(`/blog/${post.slug}`);
    const authorName = stripInvalidXmlChars(
      post.authorLabel ?? post.authorUsername,
    );

    feed.addItem({
      id: url,
      title: stripInvalidXmlChars(post.title),
      link: url,
      description: stripInvalidXmlChars(postSummary(post)),
      // published drives RSS pubDate and Atom <published>; date drives Atom
      // <updated> and JSON date_modified.
      published: toDate(post.createdAt),
      date: toDate(post.updatedAt),
      // RSS 2.0 requires <author> to be an email address, and we do not publish
      // author emails, so RSS carries the name as <dc:creator> instead — the
      // element aggregators already read for exactly this. Atom and JSON both
      // model a named author natively.
      ...(format === "rss"
        ? {
          extensions: [{
            name: "dc:creator",
            objects: { _cdata: authorName },
          }],
        }
        : { author: [{ name: authorName }] }),
      category: post.keywords.map((keyword) => ({
        name: stripInvalidXmlChars(keyword),
      })),
    });
  }

  return feed;
};

// The package declares xmlns:dc only when an item carries content:encoded, and
// gives no hook for attributes on the root element, so the declaration for the
// dc:creator extension above has to be spliced in.
const withDublinCoreNamespace = (xml: string): string =>
  xml.replace(
    /<rss\b(?![^>]*\bxmlns:dc=)([^>]*)>/,
    `<rss$1 xmlns:dc="${DC_NAMESPACE}">`,
  );

export const renderFeed = (
  format: FeedFormat,
  options: FeedOptions,
): string => {
  const feed = buildFeed(format, options);

  switch (format) {
    case "atom":
      return feed.atom1();
    case "json":
      return feed.json1();
    default:
      return withDublinCoreNamespace(feed.rss2());
  }
};
