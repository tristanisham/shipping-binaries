import type { PostWithAuthor } from "../models/post.js";
import { toIsoTimestamp } from "../views/components/date.js";
import { parseEditorData } from "../views/components/editorData.js";
import { SITE_NAME, toAbsoluteUrl } from "../views/components/SocialMeta.js";

export const RSS_CONTENT_TYPE = "application/rss+xml; charset=utf-8";
// Feeds are polled on a schedule, so serve them from the edge for a while.
export const RSS_CACHE_CONTROL =
  "public, max-age=1800, stale-while-revalidate=3600";

// `/rss` and `/blog/rss` serve the same feed; both advertise `/rss` as their
// self link so aggregators subscribed through either path dedupe to one feed.
export const BLOG_FEED_PATH = "/rss";

export const authorFeedPath = (username: string): string =>
  `/@${encodeURIComponent(username)}/rss`;

// Cap the feed so a long archive does not turn into a multi-megabyte response.
const MAX_FEED_ITEMS = 50;
const MAX_EXCERPT_LENGTH = 300;

// XML escaping, not HTML escaping: the five predefined entities plus a strip of
// the control characters XML 1.0 forbids outright (tab/newline/return stay).
const escapeXml = (value: string): string =>
  value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// RSS 2.0 wants RFC 822 dates; toUTCString emits the RFC 1123 form readers want.
const toRfc822 = (value: string): string | undefined => {
  const iso = toIsoTimestamp(value);
  return iso ? new Date(iso).toUTCString() : undefined;
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

const renderItem = (post: PostWithAuthor): string => {
  const url = toAbsoluteUrl(`/blog/${post.slug}`);
  const publishedAt = toRfc822(post.createdAt);
  const summary = postSummary(post);
  const author = post.authorLabel ?? post.authorUsername;

  return [
    "    <item>",
    `      <title>${escapeXml(post.title)}</title>`,
    `      <link>${escapeXml(url)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
    ...(publishedAt ? [`      <pubDate>${publishedAt}</pubDate>`] : []),
    `      <dc:creator>${escapeXml(author)}</dc:creator>`,
    ...post.keywords.map(
      (keyword) => `      <category>${escapeXml(keyword)}</category>`,
    ),
    ...(summary
      ? [`      <description>${escapeXml(summary)}</description>`]
      : []),
    "    </item>",
  ].join("\n");
};

export type RssFeedOptions = {
  description: string;
  // Site-relative path the feed itself is served from (rel="self").
  feedPath: string;
  // Site-relative path of the page this feed mirrors.
  pagePath: string;
  posts: readonly PostWithAuthor[];
  title: string;
};

export const renderRssFeed = (
  { description, feedPath, pagePath, posts, title }: RssFeedOptions,
): string => {
  const items = posts.slice(0, MAX_FEED_ITEMS);
  // Items are ordered by publication date, so the most recent edit can be any
  // of them.
  const latestUpdate = items
    .map((post) => post.updatedAt)
    .sort()
    .at(-1);
  const lastBuildDate = latestUpdate ? toRfc822(latestUpdate) : undefined;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(toAbsoluteUrl(pagePath))}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    "    <language>en-us</language>",
    `    <generator>${escapeXml(SITE_NAME)}</generator>`,
    ...(lastBuildDate
      ? [`    <lastBuildDate>${lastBuildDate}</lastBuildDate>`]
      : []),
    `    <atom:link href="${
      escapeXml(toAbsoluteUrl(feedPath))
    }" rel="self" type="application/rss+xml" />`,
    ...items.map(renderItem),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
};
