import { type Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import { hashToken } from "../auth/token.js";
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
  confirmSubscription,
  getSubscriberByEmail,
  isValidSubscriberEmail,
  normalizeSubscriberEmail,
  preparePendingSubscription,
  releasePendingSubscription,
  subscribeUser,
} from "../models/subscriber.js";
import { findUserByEmail } from "../models/user.js";
import { Author } from "../views/Author.js";
import { BlogIndex } from "../views/BlogIndex.js";
import { BlogPost } from "../views/BlogPost.js";
import { Help } from "../views/Help.js";
import { toAbsoluteUrl } from "../views/components/SocialMeta.js";
import { editorDataHasText } from "../views/components/editorData.js";
import { parsePageParam } from "./page.js";
import {
  captureAnonymousEvent,
  captureAnonymousRequestEvent,
  capturePageServed,
  captureUserEvent,
} from "../posthog.js";

export const blogRoute = new Hono<{ Bindings: Env }>();

const subscriptionRedirect = (
  postPath: string,
  status: "invalid" | "pending" | "subscribed" | "unsubscribed",
): string => `${postPath}?subscription=${status}`;

const buildSubscriberConfirmationUrl = (
  requestUrl: string,
  token: string,
  postSlug: string,
): string => {
  const request = new URL(requestUrl);
  const origin = request.hostname === "localhost" ||
      request.hostname === "127.0.0.1"
    ? request.origin
    : "https://shippingbinaries.com";
  const confirmationUrl = new URL("/subscribe/confirm", origin);
  confirmationUrl.searchParams.set("token", token);
  confirmationUrl.searchParams.set("post", postSlug);
  return confirmationUrl.toString();
};

const allowAnonymousSubscriptionRequest = async (
  c: Context<{ Bindings: Env }>,
  email: string,
): Promise<boolean> => {
  const addressKey = await hashToken(email);
  const actorKey = c.req.header("cf-connecting-ip") ?? "unknown";
  const [address, actor] = await Promise.all([
    c.env.SUBSCRIBE_RATE_LIMITER.limit({
      key: `address:${addressKey}`,
    }),
    c.env.SUBSCRIBE_RATE_LIMITER.limit({
      key: `actor:${actorKey}`,
    }),
  ]);
  return address.success && actor.success;
};

blogRoute.get("/blog", async (c) => {
  const [viewer, posts] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublishedPosts(c.env.DB),
  ]);

  await capturePageServed(c, viewer, { page_type: "blog index" });

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

  await capturePageServed(c, viewer, {
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

  if (currentUser) {
    c.header("Cache-Control", "private, no-store");
  }

  const canComment = await Permission.can(
    COMMENTS_CREATE_PERMISSION,
    c.env.DB,
    viewer.viewerUserId,
  );

  await capturePageServed(c, viewer, {
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
    await captureAnonymousRequestEvent(c, "email subscription failed", {
      reason: "post not found",
    });
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
  if (currentUser) {
    const subscriber = await subscribeUser(
      c.env.DB,
      currentUser.id,
      currentUser.email,
    );
    await captureUserEvent(
      c,
      currentUser,
      "email subscription captured",
      {
        form_label: captureLabel,
        post_id: post.id,
        post_slug: post.slug,
        subscription_status: subscriber.unsubscribedAt
          ? "unsubscribed"
          : "subscribed",
      },
    );
    return c.redirect(
      subscriptionRedirect(
        postPath,
        subscriber.unsubscribedAt ? "unsubscribed" : "subscribed",
      ),
      303,
    );
  }

  const submittedEmail = typeof body.email === "string" ? body.email : "";
  if (!isValidSubscriberEmail(submittedEmail)) {
    await captureAnonymousRequestEvent(c, "email subscription failed", {
      form_label: captureLabel,
      post_id: post.id,
      post_slug: post.slug,
      reason: "invalid email",
    });
    return c.redirect(
      subscriptionRedirect(postPath, "invalid"),
      303,
    );
  }

  const email = normalizeSubscriberEmail(submittedEmail);
  if (await findUserByEmail(c.env.DB, email)) {
    await captureAnonymousRequestEvent(c, "email subscription failed", {
      form_label: captureLabel,
      post_id: post.id,
      post_slug: post.slug,
      reason: "account login required",
    });
    return c.redirect("/login", 303);
  }

  if (!await allowAnonymousSubscriptionRequest(c, email)) {
    await captureAnonymousRequestEvent(c, "email subscription failed", {
      form_label: captureLabel,
      post_id: post.id,
      post_slug: post.slug,
      reason: "rate limited",
    });
    c.header("Retry-After", "60");
    return c.text("Too many subscription requests. Try again shortly.", 429);
  }

  const result = await preparePendingSubscription(c.env.DB, email);
  if (result.confirmationToken) {
    try {
      await sendSubscriberConfirmationEmail(c.env.EMAIL, {
        accountUrl: toAbsoluteUrl("/signup"),
        confirmationUrl: buildSubscriberConfirmationUrl(
          c.req.url,
          result.confirmationToken,
          post.slug,
        ),
        to: result.subscriber.email,
      });
    } catch (error) {
      await releasePendingSubscription(
        c.env.DB,
        result.subscriber.id,
        result.confirmationToken,
      );
      await captureAnonymousEvent(
        c,
        `email_subscriber_${result.subscriber.id}`,
        "email subscription failed",
        {
          form_label: captureLabel,
          post_id: post.id,
          post_slug: post.slug,
          reason: "confirmation delivery failed",
        },
      );
      throw error;
    }
  }

  await captureAnonymousEvent(
    c,
    `email_subscriber_${result.subscriber.id}`,
    "email subscription requested",
    {
      confirmation_sent: result.confirmationToken !== null,
      form_label: captureLabel,
      post_id: post.id,
      post_slug: post.slug,
    },
  );

  return c.redirect(
    subscriptionRedirect(
      postPath,
      result.subscriber.confirmedAt
        ? result.subscriber.unsubscribedAt
          ? "unsubscribed"
          : "subscribed"
        : "pending",
    ),
    303,
  );
});

blogRoute.get("/subscribe/confirm", async (c) => {
  c.header("Cache-Control", "no-store");
  const token = c.req.query("token") ?? "";
  const postSlug = c.req.query("post") ?? "";
  const post = postSlug
    ? await getPublishedPostRefBySlug(c.env.DB, postSlug)
    : null;
  const postPath = post ? `/blog/${post.slug}` : "/blog";

  if (!/^[a-f0-9]{64}$/.test(token)) {
    await captureAnonymousRequestEvent(
      c,
      "email subscription confirmation failed",
      {
        post_slug: post?.slug,
        reason: "invalid token",
      },
    );
    return c.redirect(postPath, 303);
  }

  const subscriber = await confirmSubscription(c.env.DB, token);
  if (!subscriber) {
    await captureAnonymousRequestEvent(
      c,
      "email subscription confirmation failed",
      {
        post_slug: post?.slug,
        reason: "expired or used token",
      },
    );
    return c.redirect(postPath, 303);
  }

  await captureAnonymousEvent(
    c,
    `email_subscriber_${subscriber.id}`,
    "email subscription confirmed",
    post
      ? {
        post_id: post.id,
        post_slug: post.slug,
      }
      : undefined,
  );

  return c.redirect(
    post
      ? subscriptionRedirect(postPath, "subscribed")
      : "/blog?subscription=subscribed",
    303,
  );
});

blogRoute.post("/blog/:slug/comments", async (c) => {
  const slug = c.req.param("slug");
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const user = token ? await getSessionUser(c.env.DB, token) : null;

  if (!user) {
    await captureAnonymousRequestEvent(c, "comment submission failed", {
      post_slug: slug,
      reason: "authentication required",
    });
    return c.redirect("/login", 303);
  }

  const [forbidden, post] = await Promise.all([
    Permission.cannot(COMMENTS_CREATE_PERMISSION, c.env.DB, user.id),
    getPublishedPostRefBySlug(c.env.DB, slug),
  ]);

  if (forbidden) {
    await captureUserEvent(c, user, "comment submission failed", {
      post_slug: slug,
      reason: "permission denied",
    });
    return c.text("Forbidden", 403);
  }

  if (!post) {
    await captureUserEvent(c, user, "comment submission failed", {
      post_slug: slug,
      reason: "post not found",
    });
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
    await captureUserEvent(c, user, "comment submission failed", {
      post_id: post.id,
      post_slug: post.slug,
      reason: "invalid content",
    });
    return c.text("Invalid comment", 422);
  }

  const commentId = await createComment(c.env.DB, {
    content,
    parentId,
    postId: post.id,
    userId: user.id,
  });

  if (!commentId) {
    await captureUserEvent(c, user, "comment submission failed", {
      post_id: post.id,
      post_slug: post.slug,
      reason: "invalid parent",
    });
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

  await capturePageServed(c, viewer, {
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
