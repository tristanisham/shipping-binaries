import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { getViewerState } from "./auth/viewer.js";
import { SESSION_COOKIE_NAME } from "./models/session.js";
import { getPublishedPosts } from "./models/post.js";
import { authRoute } from "./routes/auth.js";
import { blogRoute } from "./routes/blog.js";
import { parsePageParam } from "./routes/page.js";
import { weatherRoute } from "./routes/weather.js";
import { About } from "./views/About.js";
import { Home } from "./views/Home.js";

const app = new Hono<{ Bindings: Env }>();

app.route("/", authRoute);
app.route("/", blogRoute);
app.route("/", weatherRoute);

app.get("/", async (c) => {
  const [viewer, posts] = await Promise.all([
    getViewerState(c.env.DB, getCookie(c, SESSION_COOKIE_NAME)),
    getPublishedPosts(c.env.DB),
  ]);

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

  return c.html(<About {...viewer} />);
});

export default app;
