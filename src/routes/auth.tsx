import { Hono, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { verifyPassword } from "../auth/password.js";
import {
  createSession,
  destroySession,
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "../models/session.js";
import { findUserByLogin, type User } from "../models/user.js";
import { Account } from "../views/Account.js";
import { Login } from "../views/Login.js";
import { Logout } from "../views/Logout.js";

type AuthEnv = {
  Bindings: Env;
  Variables: {
    currentUser: User;
  };
};

const INVALID_LOGIN_HASH =
  "$2b$10$5Ke5raq.wTNcQYIzdbmwu.jqOhEFvUpOFy08jNOAbk5ausJSJy5Py";
const INVALID_LOGIN_MESSAGE = "Invalid email, username, or password.";

export const authRoute = new Hono<AuthEnv>();

authRoute.use("/login", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

authRoute.get("/login", async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);

  if (token && await getSessionUser(c.env.DB, token)) {
    return c.redirect("/admin");
  }

  return c.html(<Login />);
});

authRoute.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const login = typeof body.login === "string" ? body.login.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!login || !password) {
    return c.html(
      <Login error={INVALID_LOGIN_MESSAGE} login={login} />,
      400,
    );
  }

  const user = await findUserByLogin(c.env.DB, login);
  const passwordMatches = await verifyPassword(
    password,
    user?.password_hash ?? INVALID_LOGIN_HASH,
  );

  if (!user || !passwordMatches) {
    return c.html(
      <Login error={INVALID_LOGIN_MESSAGE} login={login} />,
      401,
    );
  }

  const existingToken = getCookie(c, SESSION_COOKIE_NAME);

  if (existingToken) {
    await destroySession(c.env.DB, existingToken);
  }

  const token = await createSession(c.env.DB, user.id);
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "Strict",
    secure: new URL(c.req.url).protocol === "https:",
  });

  return c.redirect("/admin", 303);
});

const requireSession: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const user = token ? await getSessionUser(c.env.DB, token) : null;

  if (!user) {
    deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
    return c.redirect("/login");
  }

  c.set("currentUser", user);
  await next();
};

authRoute.use("/admin", requireSession);
authRoute.use("/admin/*", requireSession);

authRoute.get("/admin", (c) => {
  c.header("Cache-Control", "no-store");
  return c.html(<Account email={c.var.currentUser.email} />);
});

authRoute.get("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);

  if (token) {
    await destroySession(c.env.DB, token);
  }

  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: "/",
    secure: new URL(c.req.url).protocol === "https:",
  });
  c.header("Cache-Control", "no-store");

  return c.html(<Logout />);
});
