import { type Context, Hono } from "hono";
import {
  authorFeedPath,
  BLOG_FEED_PATH,
  renderRssFeed,
  RSS_CACHE_CONTROL,
  RSS_CONTENT_TYPE,
} from "../feeds/rss.js";
import { getPublishedPosts, getPublishedPostsForUser } from "../models/post.js";
import { getPublicProfileByUsername } from "../models/profile.js";

export const rssRoute = new Hono<{ Bindings: Env }>();

const feedResponse = (c: Context, xml: string) =>
  c.body(xml, 200, {
    "Cache-Control": RSS_CACHE_CONTROL,
    "Content-Type": RSS_CONTENT_TYPE,
  });

const blogFeed = async (c: Context<{ Bindings: Env }>) => {
  const posts = await getPublishedPosts(c.env.DB);

  return feedResponse(
    c,
    renderRssFeed({
      description: "Software development articles from Shipping Binaries.",
      feedPath: BLOG_FEED_PATH,
      pagePath: "/blog",
      posts,
      title: "Shipping Binaries",
    }),
  );
};

rssRoute.get(BLOG_FEED_PATH, blogFeed);

rssRoute.get("/:handle{@[^/]+}/rss", async (c) => {
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
    renderRssFeed({
      description: `Posts by ${displayName} on Shipping Binaries.`,
      feedPath: authorFeedPath(author.username),
      pagePath: `/@${encodeURIComponent(author.username)}`,
      posts,
      title: `${displayName} | Shipping Binaries`,
    }),
  );
});
