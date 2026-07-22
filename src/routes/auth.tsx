import { Hono, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  sendInvitationEmail,
  sendPasswordResetEmail,
} from "../email/auth.js";
import {
  claimAuthToken,
  createAuthToken,
  getValidAuthToken,
  INVITE_TOKEN_TTL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "../models/authToken.js";
import {
  createSession,
  destroySession,
  destroySessionsForUser,
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "../models/session.js";
import {
  createPost,
  formatSlug,
  getAllPosts,
  getPostById,
  getUniquePostSlug,
  parseKeywords,
  type Post,
  setPostDraft,
  updatePost,
  validatePostSlug,
} from "../models/post.js";
import { ADMIN_ROLE, assignRoleToUser } from "../models/role.js";
import {
  activateUserWithPassword,
  createUser,
  findUserByEmail,
  findUserByLogin,
  getAllUsers,
  getUserById,
  setUserActive,
  setUserPassword,
  updateUser,
  type User,
  type UserSort,
  type UserSortDirection,
} from "../models/user.js";
import { Account } from "../views/Account.js";
import { AdminHome } from "../views/AdminHome.js";
import { AdminPosts } from "../views/AdminPosts.js";
import { AdminUserEdit } from "../views/AdminUserEdit.js";
import { AdminUsers } from "../views/AdminUsers.js";
import { ForgotPassword } from "../views/ForgotPassword.js";
import { Login } from "../views/Login.js";
import { Logout } from "../views/Logout.js";
import { SetPassword } from "../views/SetPassword.js";
import { Write, type WriteFormValues } from "../views/Write.js";

type AuthEnv = {
  Bindings: Env;
  Variables: {
    currentUser: User;
  };
};

const INVALID_LOGIN_HASH =
  "$2b$10$5Ke5raq.wTNcQYIzdbmwu.jqOhEFvUpOFy08jNOAbk5ausJSJy5Py";
const INVALID_LOGIN_MESSAGE = "Invalid email, username, or password.";
const INVALID_PASSWORD_MESSAGE =
  "Use matching passwords between 12 characters and 72 UTF-8 bytes.";

const noStore: MiddlewareHandler<AuthEnv> = async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
};

const getActionOrigin = (requestUrl: string): string => {
  const url = new URL(requestUrl);
  return url.hostname === "localhost" || url.hostname === "127.0.0.1"
    ? url.origin
    : "https://shippingbinaries.com";
};

const buildActionUrl = (
  requestUrl: string,
  path: string,
  token: string,
): string => {
  const url = new URL(path, getActionOrigin(requestUrl));
  url.searchParams.set("token", token);
  return url.toString();
};

const validatePassword = (
  password: string,
  passwordConfirmation: string,
): string | null =>
  password.length >= 12 && password === passwordConfirmation
    ? null
    : INVALID_PASSWORD_MESSAGE;

export const authRoute = new Hono<AuthEnv>();

authRoute.use("/login", noStore);
authRoute.use("/forgot-password", noStore);
authRoute.use("/reset-password", noStore);
authRoute.use("/invite", noStore);

authRoute.get("/login", async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);

  if (token && await getSessionUser(c.env.DB, token)) {
    return c.redirect("/admin");
  }

  const notice = c.req.query("password") === "updated"
    ? "Your password has been updated. You can log in now."
    : undefined;
  return c.html(<Login notice={notice} />);
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

  if (!user || !user.active || !passwordMatches) {
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

authRoute.get("/forgot-password", (c) => c.html(<ForgotPassword />));

authRoute.post("/forgot-password", async (c) => {
  const body = await c.req.parseBody();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const user = email ? await findUserByEmail(c.env.DB, email) : null;

  if (user?.active === 1) {
    const token = await createAuthToken(
      c.env.DB,
      user.id,
      "password_reset",
      PASSWORD_RESET_TOKEN_TTL_MS,
    );
    await sendPasswordResetEmail(c.env.EMAIL, {
      actionUrl: buildActionUrl(c.req.url, "/reset-password", token),
      displayName: user.label ?? user.username,
      to: user.email,
    });
  }

  return c.html(<ForgotPassword sent />);
});

authRoute.get("/reset-password", async (c) => {
  const token = c.req.query("token") ?? "";
  const valid = Boolean(
    token && await getValidAuthToken(c.env.DB, token, "password_reset"),
  );
  return c.html(
    <SetPassword mode="reset" token={token} valid={valid} />,
    valid ? 200 : 400,
  );
});

authRoute.post("/reset-password", async (c) => {
  const body = await c.req.parseBody();
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirmation = typeof body.passwordConfirmation === "string"
    ? body.passwordConfirmation
    : "";
  const tokenRecord = token
    ? await getValidAuthToken(c.env.DB, token, "password_reset")
    : null;
  const error = validatePassword(password, passwordConfirmation);

  if (!tokenRecord) {
    return c.html(
      <SetPassword mode="reset" token={token} valid={false} />,
      400,
    );
  }

  if (error) {
    return c.html(
      <SetPassword error={error} mode="reset" token={token} valid />,
      422,
    );
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch {
    return c.html(
      <SetPassword
        error={INVALID_PASSWORD_MESSAGE}
        mode="reset"
        token={token}
        valid
      />,
      422,
    );
  }

  const claimed = await claimAuthToken(c.env.DB, token, "password_reset");
  if (!claimed) {
    return c.html(
      <SetPassword mode="reset" token={token} valid={false} />,
      400,
    );
  }

  await setUserPassword(c.env.DB, claimed.userId, passwordHash);
  await destroySessionsForUser(c.env.DB, claimed.userId);
  return c.redirect("/login?password=updated", 303);
});

authRoute.get("/invite", async (c) => {
  const token = c.req.query("token") ?? "";
  const valid = Boolean(
    token && await getValidAuthToken(c.env.DB, token, "invite"),
  );
  return c.html(
    <SetPassword mode="invite" token={token} valid={valid} />,
    valid ? 200 : 400,
  );
});

authRoute.post("/invite", async (c) => {
  const body = await c.req.parseBody();
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirmation = typeof body.passwordConfirmation === "string"
    ? body.passwordConfirmation
    : "";
  const tokenRecord = token
    ? await getValidAuthToken(c.env.DB, token, "invite")
    : null;
  const error = validatePassword(password, passwordConfirmation);

  if (!tokenRecord) {
    return c.html(
      <SetPassword mode="invite" token={token} valid={false} />,
      400,
    );
  }

  if (error) {
    return c.html(
      <SetPassword error={error} mode="invite" token={token} valid />,
      422,
    );
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch {
    return c.html(
      <SetPassword
        error={INVALID_PASSWORD_MESSAGE}
        mode="invite"
        token={token}
        valid
      />,
      422,
    );
  }

  const claimed = await claimAuthToken(c.env.DB, token, "invite");
  if (!claimed) {
    return c.html(
      <SetPassword mode="invite" token={token} valid={false} />,
      400,
    );
  }

  await activateUserWithPassword(c.env.DB, claimed.userId, passwordHash);
  return c.redirect("/login?password=updated", 303);
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

// Runs after requireSession, so c.var.currentUser is populated. Gates the
// admin area to users holding the admin role; everyone else gets 403.
const requireAdmin: MiddlewareHandler<AuthEnv> = async (c, next) => {
  if (!c.var.currentUser.roles.includes(ADMIN_ROLE)) {
    return c.text("Forbidden", 403);
  }

  await next();
};

authRoute.use("/admin", requireSession);
authRoute.use("/admin", requireAdmin);
authRoute.use("/admin/*", requireSession);
authRoute.use("/admin/*", requireAdmin);

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
  const action = typeof body.postAction === "string"
    ? body.postAction
    : typeof body.action === "string"
    ? body.action
    : "draft";
  const isAutosave = action === "autosave";
  const idRaw = typeof body.id === "string" ? body.id : "";
  const id = idRaw ? Number.parseInt(idRaw, 10) : Number.NaN;
  const title = typeof body.title === "string" ? body.title : "";
  const requestedSlug = typeof body.slug === "string" ? body.slug : "";
  const slugMode = body.slugMode === "auto" ? "auto" : "custom";
  const description = typeof body.description === "string"
    ? body.description
    : "";
  const keywords = typeof body.keywords === "string" ? body.keywords : "";
  const image = typeof body.image === "string" ? body.image : "";
  const postBody = typeof body.body === "string" ? body.body : "";
  const draft = isAutosave ? body.currentDraft === "1" : action !== "publish";
  const currentPostId = Number.isInteger(id) ? id : undefined;
  let slug: string;
  let slugError: string | null = null;

  if (slugMode === "auto") {
    const slugBase = formatSlug(title) || `draft-${crypto.randomUUID()}`;
    slug = await getUniquePostSlug(c.env.DB, slugBase, currentPostId);
  } else {
    slug = requestedSlug;
    slugError = validatePostSlug(slug);

    if (!slugError) {
      const uniqueSlug = await getUniquePostSlug(c.env.DB, slug, currentPostId);
      if (uniqueSlug !== slug) {
        slugError = "That slug is already used by another post.";
      }
    }
  }

  if (slugError) {
    if (isAutosave) {
      return c.json({ error: { slug: slugError }, saved: false }, 422);
    }

    const values: WriteFormValues = {
      body: postBody,
      description,
      draft,
      id: idRaw,
      image,
      keywords,
      slug: requestedSlug,
      slugMode,
      title,
    };
    const post = currentPostId
      ? (await getPostById(c.env.DB, currentPostId)) ?? undefined
      : undefined;

    return c.html(
      <Write post={post} slugError={slugError} values={values} />,
      422,
    );
  }

  const input = {
    slug,
    title,
    description,
    keywords: parseKeywords(keywords),
    image,
    body: postBody,
    draft,
  };

  if (currentPostId !== undefined) {
    await updatePost(c.env.DB, currentPostId, input);

    if (isAutosave) {
      return c.json({ id: currentPostId, saved: true, slug });
    }

    return c.redirect(`/admin/write?id=${currentPostId}`, 303);
  }

  const newId = await createPost(c.env.DB, {
    userId: c.var.currentUser.id,
    ...input,
  });

  if (isAutosave) {
    return c.json({ id: newId, saved: true, slug }, 201);
  }

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

authRoute.get("/admin/users", async (c) => {
  c.header("Cache-Control", "no-store");
  const requestedSort = c.req.query("sort");
  const requestedDirection = c.req.query("direction");
  const sorts = new Set<UserSort>(["email", "label", "status", "username"]);
  const sort = requestedSort && sorts.has(requestedSort as UserSort)
    ? requestedSort as UserSort
    : undefined;
  const direction: UserSortDirection = requestedDirection === "desc"
    ? "desc"
    : "asc";
  const users = await getAllUsers(c.env.DB, { direction, sort });

  return c.html(
    <AdminUsers direction={direction} sort={sort} users={users} />,
  );
});

authRoute.post("/admin/users", async (c) => {
  c.header("Cache-Control", "no-store");
  const body = await c.req.parseBody();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const username = typeof body.username === "string"
    ? body.username.trim()
    : "";
  const labelValue = typeof body.label === "string" ? body.label.trim() : "";
  if (email && username) {
    const userId = await createUser(c.env.DB, {
      active: false,
      email,
      label: labelValue || null,
      passwordHash: await hashPassword(
        `${crypto.randomUUID()}${crypto.randomUUID()}`,
      ),
      username,
    });
    await assignRoleToUser(c.env.DB, userId, ADMIN_ROLE);
    const token = await createAuthToken(
      c.env.DB,
      userId,
      "invite",
      INVITE_TOKEN_TTL_MS,
    );
    await sendInvitationEmail(c.env.EMAIL, {
      actionUrl: buildActionUrl(c.req.url, "/invite", token),
      displayName: labelValue || username,
      to: email,
    });
  }

  return c.redirect("/admin/users", 303);
});

authRoute.post("/admin/users/:id/invite", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);
  const user = Number.isInteger(id) ? await getUserById(c.env.DB, id) : null;

  if (user && !user.active) {
    const token = await createAuthToken(
      c.env.DB,
      user.id,
      "invite",
      INVITE_TOKEN_TTL_MS,
    );
    await sendInvitationEmail(c.env.EMAIL, {
      actionUrl: buildActionUrl(c.req.url, "/invite", token),
      displayName: user.label ?? user.username,
      to: user.email,
    });
  }

  return c.redirect("/admin/users", 303);
});

authRoute.post("/admin/users/:id/active", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);

  if (Number.isInteger(id)) {
    const body = await c.req.parseBody();
    await setUserActive(c.env.DB, id, body.active === "1");
  }

  return c.redirect("/admin/users", 303);
});

authRoute.get("/admin/users/:id/edit", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);
  const user = Number.isInteger(id) ? await getUserById(c.env.DB, id) : null;

  if (!user) {
    return c.notFound();
  }

  return c.html(<AdminUserEdit user={user} />);
});

authRoute.post("/admin/users/:id", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);

  if (!Number.isInteger(id)) {
    return c.redirect("/admin/users", 303);
  }

  const body = await c.req.parseBody();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const username = typeof body.username === "string"
    ? body.username.trim()
    : "";
  const labelValue = typeof body.label === "string" ? body.label.trim() : "";
  const label = labelValue.length > 0 ? labelValue : null;
  const password = typeof body.password === "string" ? body.password : "";

  await updateUser(c.env.DB, id, { email, username, label });
  if (typeof body.active === "string") {
    await setUserActive(c.env.DB, id, body.active === "1");
  }

  if (password.length > 0) {
    await setUserPassword(c.env.DB, id, await hashPassword(password));
  }

  return c.redirect("/admin/users", 303);
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
