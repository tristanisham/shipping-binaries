import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { getViewerState } from "../auth/viewer.js";
import { createComment } from "../models/comment.js";
import {
  COMMENTS_CREATE_PERMISSION,
  Permission,
  POSTS_VIEW_ARCHIVED_PERMISSION,
} from "../models/permission.js";
import {
  getPublishedPostBySlug,
  getPublishedPostRefBySlug,
  getPublishedPosts,
  getPublishedPostsForUser,
} from "../models/post.js";
import { getPublicProfileByUsername } from "../models/profile.js";
import { getSessionUser, SESSION_COOKIE_NAME } from "../models/session.js";
import { Author } from "../views/Author.js";
import { BlogIndex } from "../views/BlogIndex.js";
import { BlogPost } from "../views/BlogPost.js";
import { editorDataHasText } from "../views/components/editorData.js";
import { parsePageParam } from "./page.js";

export const blogRoute = new Hono<{ Bindings: Env }>();

blogRoute.get("/blog", async (c) => {
  const viewer = await getViewerState(
    c.env.DB,
    getCookie(c, SESSION_COOKIE_NAME),
  );
  const posts = await getPublishedPosts(c.env.DB, {
    includeArchived: viewer.canViewArchived,
  });

  return c.html(
    <BlogIndex
      currentPage={parsePageParam(c.req.query("page"))}
      posts={posts}
      {...viewer}
    />,
  );
});

blogRoute.get("/blog/:slug", async (c) => {
  const viewer = await getViewerState(
    c.env.DB,
    getCookie(c, SESSION_COOKIE_NAME),
  );
  const post = await getPublishedPostBySlug(c.env.DB, c.req.param("slug"), {
    includeArchived: viewer.canViewArchived,
  });

  if (!post) {
    return c.notFound();
  }

  const canComment = await Permission.can(
    COMMENTS_CREATE_PERMISSION,
    c.env.DB,
    viewer.viewerUserId,
  );

  return c.html(
    <BlogPost
      canComment={canComment}
      post={post}
      {...viewer}
    />,
  );
});

blogRoute.post("/blog/:slug/comments", async (c) => {
  const slug = c.req.param("slug");
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const user = token ? await getSessionUser(c.env.DB, token) : null;

  if (!user) {
    return c.redirect("/login", 303);
  }

  const [forbidden, canViewArchived] = await Promise.all([
    Permission.cannot(COMMENTS_CREATE_PERMISSION, c.env.DB, user.id),
    Permission.can(POSTS_VIEW_ARCHIVED_PERMISSION, c.env.DB, user.id),
  ]);

  if (forbidden) {
    return c.text("Forbidden", 403);
  }

  // Commenting follows visibility: an archived post accepts comments only from
  // someone who can still see it.
  const post = await getPublishedPostRefBySlug(c.env.DB, slug, {
    includeArchived: canViewArchived,
  });

  if (!post) {
    return c.notFound();
  }

  const body = await c.req.parseBody();
  const content = typeof body.content === "string" ? body.content : "";
  const parentIdValue = typeof body.parentId === "string"
    ? body.parentId.trim()
    : "";
  const parentId = parentIdValue ? Number.parseInt(parentIdValue, 10) : null;

  if (
    content.length > 50_000 ||
    !editorDataHasText(content) ||
    (parentId !== null && (!Number.isInteger(parentId) || parentId < 1))
  ) {
    return c.text("Invalid comment", 422);
  }

  const commentId = await createComment(c.env.DB, {
    content,
    parentId,
    postId: post.id,
    userId: user.id,
  });

  if (!commentId) {
    return c.text("Invalid comment", 422);
  }

  return c.redirect(`/blog/${post.slug}#comment-${commentId}`, 303);
});

blogRoute.get("/:handle{@[^/]+}", async (c) => {
  const handle = c.req.param("handle");
  const username = handle?.slice(1);
  if (!username) {
    return c.notFound();
  }

  const viewer = await getViewerState(
    c.env.DB,
    getCookie(c, SESSION_COOKIE_NAME),
  );
  const author = await getPublicProfileByUsername(c.env.DB, username, {
    includeArchived: viewer.canViewArchived,
  });

  if (!author) {
    return c.notFound();
  }

  const posts = await getPublishedPostsForUser(c.env.DB, author.id, {
    includeArchived: viewer.canViewArchived,
  });
  return c.html(
    <Author
      author={author}
      currentPage={parsePageParam(c.req.query("page"))}
      posts={posts}
      {...viewer}
    />,
  );
});
