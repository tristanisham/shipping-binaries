import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { getViewerState } from "../auth/viewer.js";
import { sendSubscriberConfirmationEmail } from "../email/subscriber.js";
import { createComment } from "../models/comment.js";
import {
  COMMENTS_CREATE_PERMISSION,
  Permission,
} from "../models/permission.js";
import {
  getPublishedPostBySlug,
  getPublishedPostRefBySlug,
  getPublishedPosts,
  getPublishedPostsByKeyword,
  getPublishedPostsForUser,
} from "../models/post.js";
import { getPublicProfileByUsername } from "../models/profile.js";
import { getSessionUser, SESSION_COOKIE_NAME } from "../models/session.js";
import {
  deleteSubscriber,
  getSubscriberByEmail,
  isValidSubscriberEmail,
  normalizeSubscriberEmail,
  subscribe,
} from "../models/subscriber.js";
import { findUserByEmail } from "../models/user.js";
import { Author } from "../views/Author.js";
import { BlogIndex } from "../views/BlogIndex.js";
import { BlogPost } from "../views/BlogPost.js";
import { Help } from "../views/Help.js";
import type { EmailCaptureStatus } from "../views/components/blog/EmailCapture.js";
import { toAbsoluteUrl } from "../views/components/SocialMeta.js";
import { editorDataHasText } from "../views/components/editorData.js";
import { parsePageParam } from "./page.js";
import {
  captureAnonymousEvent,
  capturePageView,
  captureUserEvent,
} from "../posthog.js";

export const blogRoute = new Hono<{ Bindings: Env }>();

blogRoute.get("/blog", async (c) => {
  const [viewer, posts] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublishedPosts(c.env.DB),
  ]);

  await capturePageView(c, viewer, { page_type: "blog index" });

  return c.html(
    <BlogIndex
      currentPage={parsePageParam(c.req.query("page"))}
      posts={posts}
      {...viewer}
    />,
  );
});

blogRoute.get("/help", async (c) => {
  const [viewer, posts] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublishedPostsByKeyword(c.env.DB, "page:help"),
  ]);

  await capturePageView(c, viewer, {
    page_type: "help",
    post_count: posts.length,
  });

  return c.html(
    <Help
      currentPage={parsePageParam(c.req.query("page"))}
      posts={posts}
      {...viewer}
    />,
  );
});

blogRoute.get("/blog/:slug", async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const [viewer, currentUser, post] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    token ? getSessionUser(c.env.DB, token) : null,
    getPublishedPostBySlug(c.env.DB, c.req.param("slug")),
  ]);

  if (!post) {
    return c.notFound();
  }

  const requestedStatus = c.req.query("subscription");
  const requestEmailCaptureStatus: EmailCaptureStatus | undefined =
    requestedStatus === "invalid" || requestedStatus === "subscribed"
      ? requestedStatus
      : undefined;
  const currentSubscriber = currentUser
    ? await getSubscriberByEmail(c.env.DB, currentUser.email)
    : null;
  const emailCaptureStatus: EmailCaptureStatus | undefined = currentSubscriber
    ? "subscribed"
    : requestEmailCaptureStatus;

  if (currentUser || emailCaptureStatus) {
    c.header("Cache-Control", "private, no-store");
  }

  const canComment = await Permission.can(
    COMMENTS_CREATE_PERMISSION,
    c.env.DB,
    viewer.viewerUserId,
  );

  await capturePageView(c, viewer, {
    page_type: "blog post",
    post_id: post.id,
    post_slug: post.slug,
    post_title: post.title,
    post_published_at: post.createdAt,
    comment_count: post.comments.length,
  });

  return c.html(
    <BlogPost
      canComment={canComment}
      emailCaptureStatus={emailCaptureStatus}
      post={post}
      {...viewer}
    />,
  );
});

blogRoute.post("/blog/:slug/subscribe", async (c) => {
  const [body, post] = await Promise.all([
    c.req.parseBody(),
    getPublishedPostRefBySlug(c.env.DB, c.req.param("slug")),
  ]);
  if (!post) {
    return c.notFound();
  }

  const token = getCookie(c, SESSION_COOKIE_NAME);
  const currentUser = token ? await getSessionUser(c.env.DB, token) : null;
  const postPath = `/blog/${post.slug}`;
  const captureLabelValue = typeof body.captureLabel === "string"
    ? body.captureLabel.trim()
    : "";
  const captureLabel = captureLabelValue.slice(0, 100) ||
    "Email subscription";
  let email: string;

  if (currentUser) {
    email = currentUser.email;
  } else {
    const submittedEmail = typeof body.email === "string" ? body.email : "";
    if (!isValidSubscriberEmail(submittedEmail)) {
      return c.redirect(
        `${postPath}?subscription=invalid#email-capture`,
        303,
      );
    }

    email = normalizeSubscriberEmail(submittedEmail);
    if (await findUserByEmail(c.env.DB, email)) {
      return c.redirect("/login", 303);
    }
  }

  const result = await subscribe(c.env.DB, email);
  if (!result.created) {
    return c.redirect(
      `${postPath}?subscription=subscribed#email-capture`,
      303,
    );
  }

  if (!currentUser) {
    try {
      await sendSubscriberConfirmationEmail(c.env.EMAIL, {
        accountUrl: toAbsoluteUrl("/signup"),
        to: result.subscriber.email,
      });
    } catch (error) {
      await deleteSubscriber(c.env.DB, result.subscriber.id);
      throw error;
    }
  }

  const analyticsProperties = {
    form_label: captureLabel,
    post_id: post.id,
    post_slug: post.slug,
  };
  if (currentUser) {
    await captureUserEvent(
      c,
      currentUser,
      "email subscription captured",
      analyticsProperties,
    );
  } else {
    await captureAnonymousEvent(
      c,
      `email_subscriber_${result.subscriber.id}`,
      "email subscription captured",
      analyticsProperties,
    );
  }

  return c.redirect(
    `${postPath}?subscription=subscribed#email-capture`,
    303,
  );
});

blogRoute.post("/blog/:slug/comments", async (c) => {
  const slug = c.req.param("slug");
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const user = token ? await getSessionUser(c.env.DB, token) : null;

  if (!user) {
    return c.redirect("/login", 303);
  }

  const [forbidden, post] = await Promise.all([
    Permission.cannot(COMMENTS_CREATE_PERMISSION, c.env.DB, user.id),
    getPublishedPostRefBySlug(c.env.DB, slug),
  ]);

  if (forbidden) {
    return c.text("Forbidden", 403);
  }

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

  await captureUserEvent(c, user, "comment submitted", {
    post_slug: post.slug,
    post_id: post.id,
    is_reply: parentId !== null,
  });

  return c.redirect(`/blog/${post.slug}#comment-${commentId}`, 303);
});

blogRoute.get("/:handle{@[^/]+}", async (c) => {
  const handle = c.req.param("handle");
  const username = handle?.slice(1);
  if (!username) {
    return c.notFound();
  }

  const [viewer, author] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublicProfileByUsername(c.env.DB, username),
  ]);

  if (!author) {
    return c.notFound();
  }

  const posts = await getPublishedPostsForUser(c.env.DB, author.id);

  await capturePageView(c, viewer, {
    page_type: "author profile",
    author_username: author.username,
    author_post_count: posts.length,
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
