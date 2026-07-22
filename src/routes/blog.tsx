import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  getPublishedPostBySlug,
  getPublishedPosts,
  getPublishedPostsForUser,
} from "../models/post.js";
import { getSessionUser, SESSION_COOKIE_NAME } from "../models/session.js";
import { getPublicUserByUsername } from "../models/user.js";
import { Author } from "../views/Author.js";
import { BlogIndex } from "../views/BlogIndex.js";
import { BlogPost } from "../views/BlogPost.js";
import { parsePageParam } from "./page.js";

export const blogRoute = new Hono<{ Bindings: Env }>();

const hasActiveSession = async (
  db: D1Database,
  token: string | undefined,
): Promise<boolean> => Boolean(token && await getSessionUser(db, token));

blogRoute.get("/blog", async (c) => {
  const [isAuthenticated, posts] = await Promise.all([
    hasActiveSession(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublishedPosts(c.env.DB),
  ]);

  return c.html(
    <BlogIndex
      currentPage={parsePageParam(c.req.query("page"))}
      isAuthenticated={isAuthenticated}
      posts={posts}
    />,
  );
});

blogRoute.get("/blog/:slug", async (c) => {
  const [isAuthenticated, post] = await Promise.all([
    hasActiveSession(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublishedPostBySlug(c.env.DB, c.req.param("slug")),
  ]);

  if (!post) {
    return c.notFound();
  }

  return c.html(
    <BlogPost isAuthenticated={isAuthenticated} post={post} />,
  );
});

blogRoute.get("/:handle{@[^/]+}", async (c) => {
  const handle = c.req.param("handle");
  const username = handle?.slice(1);
  if (!username) {
    return c.notFound();
  }

  const [isAuthenticated, author] = await Promise.all([
    hasActiveSession(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublicUserByUsername(c.env.DB, username),
  ]);

  if (!author) {
    return c.notFound();
  }

  const posts = await getPublishedPostsForUser(c.env.DB, author.id);
  return c.html(
    <Author
      author={author}
      currentPage={parsePageParam(c.req.query("page"))}
      isAuthenticated={isAuthenticated}
      posts={posts}
    />,
  );
});
