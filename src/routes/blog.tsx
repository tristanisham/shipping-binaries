import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { getViewerState } from "../auth/viewer.js";
import {
  getPublishedPostBySlug,
  getPublishedPosts,
  getPublishedPostsForUser,
} from "../models/post.js";
import { SESSION_COOKIE_NAME } from "../models/session.js";
import { getPublicUserByUsername } from "../models/user.js";
import { Author } from "../views/Author.js";
import { BlogIndex } from "../views/BlogIndex.js";
import { BlogPost } from "../views/BlogPost.js";
import { parsePageParam } from "./page.js";

export const blogRoute = new Hono<{ Bindings: Env }>();

blogRoute.get("/blog", async (c) => {
  const [viewer, posts] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublishedPosts(c.env.DB),
  ]);

  return c.html(
    <BlogIndex
      currentPage={parsePageParam(c.req.query("page"))}
      posts={posts}
      {...viewer}
    />,
  );
});

blogRoute.get("/blog/:slug", async (c) => {
  const [viewer, post] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublishedPostBySlug(c.env.DB, c.req.param("slug")),
  ]);

  if (!post) {
    return c.notFound();
  }

  return c.html(
    <BlogPost
      post={post}
      {...viewer}
    />,
  );
});

blogRoute.get("/:handle{@[^/]+}", async (c) => {
  const handle = c.req.param("handle");
  const username = handle?.slice(1);
  if (!username) {
    return c.notFound();
  }

  const [viewer, author] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
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
      posts={posts}
      {...viewer}
    />,
  );
});
