import { Hono, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { verifyPassword } from "../auth/password.js";
import {
  createSession,
  destroySession,
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "../models/session.js";
import {
  createPost,
  getAllPosts,
  getPostById,
  parseKeywords,
  type Post,
  setPostDraft,
  updatePost,
} from "../models/post.js";
import { findUserByLogin, getAllUsers, type User } from "../models/user.js";
import { Account } from "../views/Account.js";
import { AdminHome } from "../views/AdminHome.js";
import { AdminPosts } from "../views/AdminPosts.js";
import { Login } from "../views/Login.js";
import { Logout } from "../views/Logout.js";
import { Write } from "../views/Write.js";

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

authRoute.get("/admin", async (c) => {
  c.header("Cache-Control", "no-store");
  const [posts, users] = await Promise.all([
    getAllPosts(c.env.DB),
    getAllUsers(c.env.DB),
  ]);

  return c.html(<AdminHome posts={posts} userCount={users.length} />);
});

authRoute.get("/admin/write", async (c) => {
  c.header("Cache-Control", "no-store");
  const idParam = c.req.query("id");
  let post: Post | undefined;

  if (idParam) {
    const id = Number.parseInt(idParam, 10);
    if (Number.isInteger(id)) {
      post = (await getPostById(c.env.DB, id)) ?? undefined;
    }
  }

  return c.html(<Write post={post} />);
});

authRoute.post("/admin/write", async (c) => {
  c.header("Cache-Control", "no-store");
  const body = await c.req.parseBody();

  const input = {
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    keywords: parseKeywords(
      typeof body.keywords === "string" ? body.keywords : "",
    ),
    image: typeof body.image === "string" ? body.image : "",
    body: typeof body.body === "string" ? body.body : "",
    draft: body.action !== "publish",
  };

  const idRaw = typeof body.id === "string" ? body.id : "";
  const id = idRaw ? Number.parseInt(idRaw, 10) : Number.NaN;

  if (idRaw && Number.isInteger(id)) {
    await updatePost(c.env.DB, id, input);
    return c.redirect(`/admin/write?id=${id}`, 303);
  }

  const newId = await createPost(c.env.DB, {
    userId: c.var.currentUser.id,
    ...input,
  });

  return c.redirect(`/admin/write?id=${newId}`, 303);
});

authRoute.get("/admin/posts", async (c) => {
  c.header("Cache-Control", "no-store");
  const posts = await getAllPosts(c.env.DB);

  return c.html(<AdminPosts posts={posts} />);
});

authRoute.post("/admin/posts/:id/draft", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);

  if (Number.isInteger(id)) {
    const body = await c.req.parseBody();
    await setPostDraft(c.env.DB, id, body.draft === "1");
  }

  return c.redirect("/admin/posts", 303);
});

authRoute.get("/admin/account", (c) => {
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
