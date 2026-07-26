import { type Context, Hono } from "hono";
import {
  authorFeedPath,
  BLOG_FEED_PATHS,
  FEED_CACHE_CONTROL,
  FEED_CONTENT_TYPES,
  type FeedFormat,
  renderFeed,
} from "../feeds/feed.js";
import { getPublishedPosts, getPublishedPostsForUser } from "../models/post.js";
import { getPublicProfileByUsername } from "../models/profile.js";

export const feedsRoute = new Hono<{ Bindings: Env }>();

const feedResponse = (c: Context, format: FeedFormat, body: string) =>
  c.body(body, 200, {
    "Cache-Control": FEED_CACHE_CONTROL,
    "Content-Type": FEED_CONTENT_TYPES[format],
  });

// One handler per format over the same whole-blog source. Each rendering
// advertises all three paths, so a reader can move between formats.
const blogFeed =
  (format: FeedFormat) => async (c: Context<{ Bindings: Env }>) => {
    const posts = await getPublishedPosts(c.env.DB);

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

feedsRoute.get("/:handle{@[^/]+}/rss", async (c) => {
  const username = c.req.param("handle").slice(1);
  if (!username) {
    return c.notFound();
  }

  const author = await getPublicProfileByUsername(c.env.DB, username);
  if (!author) {
    return c.notFound();
  }

  const displayName = author.label ?? author.username;
  const posts = await getPublishedPostsForUser(c.env.DB, author.id);

  return feedResponse(
    c,
    "rss",
    renderFeed("rss", {
      description: `Posts by ${displayName} on Shipping Binaries.`,
      feedPaths: { rss: authorFeedPath(author.username) },
      pagePath: `/@${encodeURIComponent(author.username)}`,
      posts,
      title: `${displayName} | Shipping Binaries`,
    }),
  );
});
