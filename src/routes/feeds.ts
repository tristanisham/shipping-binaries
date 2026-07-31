import { type Context, Hono } from "hono";
import {
  authorFeedPaths,
  BLOG_FEED_PATHS,
  FEED_CACHE_CONTROL,
  FEED_CONTENT_TYPES,
  type FeedFormat,
  renderFeed,
} from "../feeds/feed.js";
import { getPublishedPosts, getPublishedPostsForUser } from "../models/post.js";
import { getPublicProfileByUsername } from "../models/profile.js";
import { captureAnonymousRequestEvent } from "../posthog.js";

export const feedsRoute = new Hono<{ Bindings: Env }>();

const feedResponse = (c: Context, format: FeedFormat, body: string) =>
  c.body(body, 200, {
    "Cache-Control": FEED_CACHE_CONTROL,
    "Content-Type": FEED_CONTENT_TYPES[format],
  });

const feedClientFamily = (userAgent: string | undefined): string => {
  if (!userAgent) return "unknown";
  if (/feedly/i.test(userAgent)) return "Feedly";
  if (/inoreader/i.test(userAgent)) return "Inoreader";
  if (/netnewswire/i.test(userAgent)) return "NetNewsWire";
  if (/newsblur/i.test(userAgent)) return "NewsBlur";
  if (/freshrss/i.test(userAgent)) return "FreshRSS";
  if (/miniflux/i.test(userAgent)) return "Miniflux";
  if (/thunderbird/i.test(userAgent)) return "Thunderbird";
  if (/feed|rss|atom/i.test(userAgent)) return "other feed reader";
  return "browser or unknown client";
};

// One handler per format over the same whole-blog source. Each rendering
// advertises all three paths, so a reader can move between formats.
const blogFeed =
  (format: FeedFormat) => async (c: Context<{ Bindings: Env }>) => {
    const posts = await getPublishedPosts(c.env.DB);
    await captureAnonymousRequestEvent(c, "feed requested", {
      feed_client: feedClientFamily(c.req.header("user-agent")),
      feed_format: format,
      feed_scope: "blog",
      post_count: posts.length,
    });

    return feedResponse(
      c,
      format,
      renderFeed(format, {
        description: "Software development articles from Shipping Binaries.",
        feedPaths: BLOG_FEED_PATHS,
        pagePath: "/blog",
        posts,
        title: "Shipping Binaries",
      }),
    );
  };

feedsRoute.get(BLOG_FEED_PATHS.rss, blogFeed("rss"));
feedsRoute.get(BLOG_FEED_PATHS.atom, blogFeed("atom"));
feedsRoute.get(BLOG_FEED_PATHS.json, blogFeed("json"));

// Author feeds mirror the whole-blog formats under the author's handle.
const authorFeed =
  (format: FeedFormat) => async (c: Context<{ Bindings: Env }>) => {
    // Typed as optional here: the handler is generic over the route, so the
    // param is not inferred from the path pattern the way an inline one is.
    const username = c.req.param("handle")?.slice(1);
    if (!username) {
      return c.notFound();
    }

    const author = await getPublicProfileByUsername(c.env.DB, username);
    if (!author) {
      return c.notFound();
    }

    const displayName = author.label ?? author.username;
    const posts = await getPublishedPostsForUser(c.env.DB, author.id);
    await captureAnonymousRequestEvent(c, "feed requested", {
      author_username: author.username,
      feed_client: feedClientFamily(c.req.header("user-agent")),
      feed_format: format,
      feed_scope: "author",
      post_count: posts.length,
    });

    return feedResponse(
      c,
      format,
      renderFeed(format, {
        description: `Posts by ${displayName} on Shipping Binaries.`,
        feedPaths: authorFeedPaths(author.username),
        pagePath: `/@${encodeURIComponent(author.username)}`,
        posts,
        title: `${displayName} | Shipping Binaries`,
      }),
    );
  };

feedsRoute.get("/:handle{@[^/]+}/rss", authorFeed("rss"));
feedsRoute.get("/:handle{@[^/]+}/feed.xml", authorFeed("atom"));
feedsRoute.get("/:handle{@[^/]+}/feed.json", authorFeed("json"));
