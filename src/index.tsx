import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { getViewerState } from "./auth/viewer.js";
import { SESSION_COOKIE_NAME } from "./models/session.js";
import { getPublishedPosts } from "./models/post.js";
import { authRoute } from "./routes/auth.js";
import { blogRoute } from "./routes/blog.js";
import { parsePageParam } from "./routes/page.js";
import { feedsRoute } from "./routes/feeds.js";
import { weatherRoute } from "./routes/weather.js";
import { captureError, capturePageServed } from "./posthog.js";
import { About } from "./views/About.js";
import { Home } from "./views/Home.js";

const app = new Hono<{ Bindings: Env }>();

app.route("/", authRoute);
app.route("/", feedsRoute);
app.route("/", blogRoute);
app.route("/", weatherRoute);

app.get("/", async (c) => {
  const [viewer, posts] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublishedPosts(c.env.DB),
  ]);

  await capturePageServed(c, viewer, { page_type: "home" });

  return c.html(
    <Home
      currentPage={parsePageParam(c.req.query("page"))}
      posts={posts}
      {...viewer}
    />,
  );
});

app.get("/about", async (c) => {
  const viewer = await getViewerState(
    c.env.DB,
    getCookie(c, SESSION_COOKIE_NAME),
  );

  await capturePageServed(c, viewer, { page_type: "about" });

  return c.html(<About {...viewer} />);
});

// Unhandled route errors reach PostHog's error tracking before the 500 goes
// out. Attributed to the signed-in user when the auth router got far enough to
// resolve one, so a crash can be traced back to who hit it.
app.onError(async (error, c) => {
  console.error(error);

  // `currentUser` is set by the auth router's requireSession, which types its
  // own Variables; from the root app it has to be read defensively.
  const { currentUser } = c.var as { currentUser?: { id: number } };
  await captureError(
    c,
    error,
    currentUser ? String(currentUser.id) : undefined,
    {
      http_method: c.req.method,
      pathname: new URL(c.req.url).pathname,
    },
  );

  return c.text("Internal Server Error", 500);
});

export default app;
