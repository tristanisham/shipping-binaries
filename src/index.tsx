import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "./models/session.js";
import { authRoute } from "./routes/auth.js";
import { weatherRoute } from "./routes/weather.js";
import { About } from "./views/About.js";
import { Home } from "./views/Home.js";

const app = new Hono<{ Bindings: Env }>();

const hasActiveSession = async (
  db: D1Database,
  token: string | undefined,
): Promise<boolean> => Boolean(token && await getSessionUser(db, token));

app.route("/", authRoute);
app.route("/", weatherRoute);

app.get("/", async (c) => {
  const isAuthenticated = await hasActiveSession(
    c.env.DB,
    getCookie(c, SESSION_COOKIE_NAME),
  );

  return c.html(<Home isAuthenticated={isAuthenticated} />);
});

app.get("/about", async (c) => {
  const isAuthenticated = await hasActiveSession(
    c.env.DB,
    getCookie(c, SESSION_COOKIE_NAME),
  );

  return c.html(<About isAuthenticated={isAuthenticated} />);
});

export default app;
