import { type Context, Hono, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  hashPassword,
  validateAccountPassword,
  verifyPassword,
} from "../auth/password.js";
import { getSignedInPath, hasAdminRole } from "../auth/viewer.js";
import { sendInvitationEmail, sendPasswordResetEmail } from "../email/auth.js";
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
import {
  INDEFINITE_DENIAL_EXPIRES_AT,
  Permission,
  POSTS_CREATE_PERMISSION,
  POSTS_READ_PERMISSION,
  POSTS_UPDATE_PERMISSION,
  USERS_CREATE_PERMISSION,
  USERS_DELETE_PERMISSION,
  USERS_READ_PERMISSION,
  USERS_UPDATE_PERMISSION,
} from "../models/permission.js";
import {
  getProfileForUser,
  MAX_PROFILE_BIOGRAPHY_LENGTH,
  updateAccountProfile,
  updateProfileBiography,
} from "../models/profile.js";
import {
  ADMIN_ROLE,
  createRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  getRoleByName,
  getRolesForUser,
  GUEST_ROLE,
  isProtectedRole,
  setRolesForUser,
  updateRole,
} from "../models/role.js";
import {
  activateUserWithPassword,
  createUser,
  findUserByEmail,
  findUserByLogin,
  getAllUsers,
  getUserById,
  getUserPasswordHashById,
  hasUserIdentifierCollision,
  setUserActive,
  setUserPassword,
  updateManagedUser,
  updateUserLabel,
  type User,
  type UserSort,
  type UserSortDirection,
} from "../models/user.js";
import { Account } from "../views/Account.js";
import { AdminHome } from "../views/AdminHome.js";
import { AdminPosts } from "../views/AdminPosts.js";
import { AdminRoles } from "../views/AdminRoles.js";
import { AdminUserAccess } from "../views/AdminUserAccess.js";
import { AdminUserEdit } from "../views/AdminUserEdit.js";
import { AdminUsers } from "../views/AdminUsers.js";
import { ForgotPassword } from "../views/ForgotPassword.js";
import { Login } from "../views/Login.js";
import { Logout } from "../views/Logout.js";
import { SetPassword } from "../views/SetPassword.js";
import { Signup, type SignupValues } from "../views/Signup.js";
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
const PERMISSION_NAME_PATTERN =
  /^[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*(?::[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*)+$/;
const ROLE_NAME_PATTERN = /^[a-z](?:[a-z0-9]|-(?=[a-z0-9])){0,31}$/;

const formStrings = (body: Record<string, unknown>, name: string): string[] => {
  const value = body[name];
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item): item is string => typeof item === "string");
};

const formString = (
  body: Record<string, unknown>,
  name: string,
  trim = false,
): string => {
  const value = formStrings(body, name)[0] ?? "";
  return trim ? value.trim() : value;
};

const formRoleIds = (body: Record<string, unknown>): number[] =>
  formStrings(body, "roleIds")
    .map((value) => Number.parseInt(value, 10))
    .filter((id) => Number.isInteger(id) && id > 0);

// Assigning the `admin` role is reserved to admins — role administration is not
// delegatable through the `users:*` permissions. Given a set of submitted role
// ids for `target`, return the ids actually safe to persist: a non-admin editor
// can neither grant admin (privilege escalation) nor strip it from someone, so
// the target's admin membership is forced to its current value; an admin editor
// chooses freely but cannot strip their own admin role. `target` is null when
// creating a fresh user (no current roles to preserve).
const resolveAdminSafeRoleIds = async (
  db: D1Database,
  editor: { readonly id: number; readonly roles: readonly string[] },
  target: { readonly id: number; readonly roles: readonly string[] } | null,
  submittedRoleIds: number[],
): Promise<number[]> => {
  const adminRole = await getRoleByName(db, ADMIN_ROLE);
  if (!adminRole) return submittedRoleIds;

  const withoutAdmin = submittedRoleIds.filter((id) => id !== adminRole.id);
  const editorIsAdmin = editor.roles.includes(ADMIN_ROLE);

  let keepAdmin: boolean;
  if (editorIsAdmin) {
    // Admins set the admin role freely, but cannot strip their own.
    keepAdmin = target?.id === editor.id
      ? true
      : submittedRoleIds.includes(adminRole.id);
  } else {
    // Non-admins cannot change the admin bit; preserve the target's state.
    keepAdmin = target?.roles.includes(ADMIN_ROLE) ?? false;
  }

  return keepAdmin ? [...withoutAdmin, adminRole.id] : withoutAdmin;
};

const normalizeRoleName = (value: string): string => value.trim().toLowerCase();

const normalizePermissionName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s*:\s*/g, ":");

const isUniquePermissionError = (error: unknown): boolean =>
  error instanceof Error &&
  /UNIQUE constraint failed: permissions\.name/.test(error.message);

const isUniqueRoleError = (error: unknown): boolean =>
  error instanceof Error && /UNIQUE constraint failed: roles\.name/.test(
    error.message,
  );

const isUniqueUserError = (error: unknown): boolean =>
  error instanceof Error &&
  /UNIQUE constraint failed: users\.(email|username)|login identifier collision/
    .test(error.message);

const isLastActiveAdminError = (error: unknown): boolean =>
  error instanceof Error &&
  /cannot deactivate last active admin/.test(error.message);

const noStore: MiddlewareHandler<AuthEnv> = async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
};

const clearSessionCookie = (c: Context<AuthEnv>): void => {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: "/",
    secure: new URL(c.req.url).protocol === "https:",
  });
};

const SNOOZE_DURATIONS_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

// Maps a duration form value to an ISO expiry: a preset window from now, or the
// far-future sentinel for an indefinite deny. Returns null for anything else.
const denialExpiresAt = (duration: string): string | null => {
  if (duration === "indefinite") return INDEFINITE_DENIAL_EXPIRES_AT;
  const ms = SNOOZE_DURATIONS_MS[duration];
  return ms ? new Date(Date.now() + ms).toISOString() : null;
};

const setSessionCookie = (c: Context<AuthEnv>, token: string): void => {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "Strict",
    secure: new URL(c.req.url).protocol === "https:",
  });
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
authRoute.use("/signup", noStore);
authRoute.use("/forgot-password", noStore);
authRoute.use("/reset-password", noStore);
authRoute.use("/invite", noStore);

authRoute.get("/login", async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const user = token ? await getSessionUser(c.env.DB, token) : null;

  if (user) {
    return c.redirect(getSignedInPath(user.roles));
  }

  const notice = c.req.query("password") === "updated"
    ? "Your password has been updated. You can log in now."
    : undefined;
  return c.html(<Login notice={notice} />);
});

authRoute.get("/signup", async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const user = token ? await getSessionUser(c.env.DB, token) : null;

  if (user) {
    return c.redirect(getSignedInPath(user.roles));
  }

  return c.html(<Signup />);
});

authRoute.post("/signup", async (c) => {
  const body = await c.req.parseBody();
  const values: SignupValues = {
    email: formString(body, "email", true),
    label: formString(body, "label", true),
    username: formString(body, "username", true).toLowerCase(),
  };
  const password = formString(body, "password");
  const passwordConfirmation = formString(body, "passwordConfirmation");

  if (!values.label || !values.username || !values.email) {
    return c.html(
      <Signup error="Complete all required fields." values={values} />,
      400,
    );
  }

  if (!/^[^\s@]+@[^\s@]+$/.test(values.email)) {
    return c.html(
      <Signup error="Enter a valid email address." values={values} />,
      422,
    );
  }

  const passwordError = validateAccountPassword(password);
  if (passwordError) {
    return c.html(
      <Signup error={passwordError} values={values} />,
      422,
    );
  }

  if (password !== passwordConfirmation) {
    return c.html(
      <Signup error="Passwords must match." values={values} />,
      422,
    );
  }

  if (
    await hasUserIdentifierCollision(c.env.DB, {
      email: values.email,
      username: values.username,
    })
  ) {
    return c.html(
      <Signup
        error="An account with that email or username already exists."
        values={values}
      />,
      409,
    );
  }

  const passwordHash = await hashPassword(password);
  let userId: number;

  try {
    userId = await createUser(c.env.DB, {
      email: values.email,
      label: values.label,
      passwordHash,
      username: values.username,
    }, GUEST_ROLE);
  } catch (error) {
    if (isUniqueUserError(error)) {
      return c.html(
        <Signup
          error="An account with that email or username already exists."
          values={values}
        />,
        409,
      );
    }
    throw error;
  }

  const token = await createSession(c.env.DB, userId);
  setSessionCookie(c, token);
  return c.redirect(getSignedInPath([GUEST_ROLE]), 303);
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
  const roles = await getRolesForUser(c.env.DB, user.id);
  setSessionCookie(c, token);

  return c.redirect(getSignedInPath(roles), 303);
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

type SetPasswordMode = "invite" | "reset";

const handleSetPassword = async (
  c: Context<AuthEnv>,
  mode: SetPasswordMode,
) => {
  const body = await c.req.parseBody();
  const token = formString(body, "token");
  const password = formString(body, "password");
  const passwordConfirmation = formString(body, "passwordConfirmation");
  const purpose = mode === "invite" ? "invite" : "password_reset";
  const tokenRecord = token
    ? await getValidAuthToken(c.env.DB, token, purpose)
    : null;
  const error = validatePassword(password, passwordConfirmation);

  if (!tokenRecord) {
    return c.html(
      <SetPassword mode={mode} token={token} valid={false} />,
      400,
    );
  }

  if (error) {
    return c.html(
      <SetPassword error={error} mode={mode} token={token} valid />,
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
        mode={mode}
        token={token}
        valid
      />,
      422,
    );
  }

  const claimed = await claimAuthToken(c.env.DB, token, purpose);
  if (!claimed) {
    return c.html(
      <SetPassword mode={mode} token={token} valid={false} />,
      400,
    );
  }

  if (mode === "invite") {
    await activateUserWithPassword(c.env.DB, claimed.userId, passwordHash);
  } else {
    await setUserPassword(c.env.DB, claimed.userId, passwordHash);
    await destroySessionsForUser(c.env.DB, claimed.userId);
  }

  return c.redirect("/login?password=updated", 303);
};

authRoute.post("/reset-password", (c) => handleSetPassword(c, "reset"));

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

authRoute.post("/invite", (c) => handleSetPassword(c, "invite"));

const requireSession: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  const user = token ? await getSessionUser(c.env.DB, token) : null;

  if (!user) {
    clearSessionCookie(c);
    return c.redirect("/login");
  }

  c.set("currentUser", user);
  await next();
};

// Runs after requireSession, so c.var.currentUser is populated. Only the
// signed-in user's account page is available without the admin role.
// Per-handler RBAC guards live on Permission (Permission.require /
// Permission.requireAny). requireSession (below) runs first and populates
// c.var.currentUser, which those guards read. The admin role is seeded with
// every permission (migration 0012), so it clears all of them without any
// special-casing here.

// Write access to a post: its author may always edit it; otherwise creating a
// new post needs posts:create and editing an existing one needs posts:update.
const canWritePost = async (
  c: Context<AuthEnv>,
  post: Post | undefined,
): Promise<boolean> => {
  const userId = c.var.currentUser.id;
  if (post) {
    if (post.userId === userId) return true;
    return Permission.can(POSTS_UPDATE_PERMISSION, c.env.DB, userId);
  }
  return Permission.can(POSTS_CREATE_PERMISSION, c.env.DB, userId);
};

// Role and permission administration is reserved to the admin role itself, not
// delegatable through a permission: whoever can edit role→permission mappings
// could otherwise grant their own role any capability (privilege escalation).
const requireAdminRole: MiddlewareHandler<AuthEnv> = async (c, next) => {
  if (!hasAdminRole(c.var.currentUser.roles)) {
    return c.text("Forbidden", 403);
  }
  await next();
};

const requirePermission = (
  permission: string,
): MiddlewareHandler<AuthEnv> =>
async (c, next) => {
  if (
    await Permission.cannot(
      permission,
      c.env.DB,
      c.var.currentUser.id,
    )
  ) {
    return c.text("Forbidden", 403);
  }

  await next();
};

authRoute.use("/admin", requireSession);
authRoute.use("/admin/*", requireSession);

authRoute.get(
  "/admin",
  Permission.requireAny(
    POSTS_READ_PERMISSION,
    USERS_READ_PERMISSION,
  ),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const [posts, roles, users] = await Promise.all([
      getAllPosts(c.env.DB),
      getAllRoles(c.env.DB),
      getAllUsers(c.env.DB),
    ]);

    return c.html(
      <AdminHome
        posts={posts}
        roles={roles}
        users={users}
        viewerUsername={c.var.currentUser.username}
      />,
    );
  },
);

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

  if (!(await canWritePost(c, post))) {
    return c.text("Forbidden", 403);
  }

  return c.html(
    <Write post={post} viewerUsername={c.var.currentUser.username} />,
  );
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
  const currentPost = currentPostId === undefined
    ? undefined
    : (await getPostById(c.env.DB, currentPostId)) ?? undefined;

  if (!(await canWritePost(c, currentPost))) {
    return c.text("Forbidden", 403);
  }

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
    return c.html(
      <Write
        post={currentPost}
        slugError={slugError}
        values={values}
        viewerUsername={c.var.currentUser.username}
      />,
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

authRoute.get(
  "/admin/posts",
  Permission.require(POSTS_READ_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const posts = await getAllPosts(c.env.DB);

    return c.html(
      <AdminPosts
        posts={posts}
        viewerUsername={c.var.currentUser.username}
      />,
    );
  },
);

authRoute.post(
  "/admin/posts/:id/draft",
  Permission.require(POSTS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);

    if (Number.isInteger(id)) {
      const body = await c.req.parseBody();
      await setPostDraft(c.env.DB, id, body.draft === "1");
    }

    return c.redirect("/admin/posts", 303);
  },
);

const renderRolesPage = async (
  c: Context<AuthEnv>,
  options: {
    error?: string;
    name?: string;
    newPermissionName?: string;
    permissionError?: string;
    selectedRoleId?: number;
    status?: 400 | 409;
  } = {},
) => {
  const roles = await getAllRoles(c.env.DB);
  const requestedRoleId = options.selectedRoleId ??
    Number.parseInt(c.req.query("role") ?? "", 10);
  const selectedRole = roles.find((role) => role.id === requestedRoleId) ??
    roles[0] ??
    null;
  const [permissions, selectedPermissions] = selectedRole
    ? await Promise.all([
      Permission.all(c.env.DB),
      Permission.forRole(c.env.DB, selectedRole.id),
    ])
    : [[], []];

  return c.html(
    <AdminRoles
      error={options.error}
      newPermissionName={options.newPermissionName}
      newRoleName={options.name}
      permissionError={options.permissionError}
      permissions={permissions}
      roles={roles}
      selectedPermissionIds={selectedPermissions.map(({ id }) => id)}
      selectedRoleId={selectedRole?.id}
      viewerUsername={c.var.currentUser.username}
    />,
    options.status ?? 200,
  );
};

authRoute.get(
  "/admin/roles",
  requireAdminRole,
  (c) => {
    c.header("Cache-Control", "no-store");
    return renderRolesPage(c);
  },
);

authRoute.post(
  "/admin/roles",
  requireAdminRole,
  async (c) => {
    c.header("Cache-Control", "no-store");
    const body = await c.req.parseBody();
    const name = normalizeRoleName(formString(body, "name"));

    if (!ROLE_NAME_PATTERN.test(name)) {
      return renderRolesPage(c, {
        error: "Use 1–32 lowercase letters, numbers, and single hyphens.",
        name,
        status: 400,
      });
    }

    try {
      const roleId = await createRole(c.env.DB, name);
      return c.redirect(`/admin/roles?role=${roleId}`, 303);
    } catch (error) {
      if (isUniqueRoleError(error)) {
        return renderRolesPage(c, {
          error: "That role already exists.",
          name,
          status: 409,
        });
      }
      throw error;
    }
  },
);

authRoute.post(
  "/admin/roles/permissions",
  requireAdminRole,
  async (c) => {
    c.header("Cache-Control", "no-store");
    const body = await c.req.parseBody();
    const name = normalizePermissionName(formString(body, "name"));
    const selectedRoleId = Number.parseInt(c.req.query("role") ?? "", 10);

    if (name.length > 96 || !PERMISSION_NAME_PATTERN.test(name)) {
      return renderRolesPage(c, {
        newPermissionName: name,
        permissionError:
          "Use lowercase colon-separated names such as posts:publish.",
        selectedRoleId,
        status: 400,
      });
    }

    try {
      await Permission.create(c.env.DB, name);
    } catch (error) {
      if (isUniquePermissionError(error)) {
        return renderRolesPage(c, {
          newPermissionName: name,
          permissionError: "That permission already exists.",
          selectedRoleId,
          status: 409,
        });
      }
      throw error;
    }

    const roleQuery = Number.isInteger(selectedRoleId)
      ? `?role=${selectedRoleId}`
      : "";
    return c.redirect(`/admin/roles${roleQuery}`, 303);
  },
);

authRoute.post(
  "/admin/roles/:id",
  requireAdminRole,
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    const role = Number.isInteger(id) ? await getRoleById(c.env.DB, id) : null;
    if (!role) return c.notFound();
    if (isProtectedRole(role.name)) {
      return c.text("That role is protected.", 400);
    }

    const body = await c.req.parseBody();
    const name = normalizeRoleName(formString(body, "name"));
    if (!ROLE_NAME_PATTERN.test(name)) {
      return c.text(
        "Use 1–32 lowercase letters, numbers, and single hyphens.",
        400,
      );
    }

    try {
      await updateRole(c.env.DB, id, name);
    } catch (error) {
      if (isUniqueRoleError(error)) {
        return c.text("That role already exists.", 409);
      }
      throw error;
    }

    return c.redirect(`/admin/roles?role=${id}`, 303);
  },
);

authRoute.post(
  "/admin/roles/:id/delete",
  requireAdminRole,
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    const role = Number.isInteger(id) ? await getRoleById(c.env.DB, id) : null;
    if (!role) return c.notFound();
    if (isProtectedRole(role.name)) {
      return c.text("That role is protected.", 400);
    }

    await deleteRole(c.env.DB, id);
    return c.redirect("/admin/roles", 303);
  },
);

authRoute.post(
  "/admin/roles/:roleId/permissions/:permissionId",
  requireAdminRole,
  async (c) => {
    c.header("Cache-Control", "no-store");
    const roleId = Number.parseInt(c.req.param("roleId"), 10);
    const permissionId = Number.parseInt(c.req.param("permissionId"), 10);
    const [role, permission] = await Promise.all([
      Number.isInteger(roleId) ? getRoleById(c.env.DB, roleId) : null,
      Number.isInteger(permissionId)
        ? Permission.byId(c.env.DB, permissionId)
        : null,
    ]);

    if (!role || !permission) return c.notFound();

    const body = await c.req.parseBody();
    const assigned = formString(body, "assigned") === "1";
    await Permission.setForRole(c.env.DB, role.id, permission.id, assigned);

    if (c.req.header("Accept")?.includes("application/json")) {
      return c.json({ assigned });
    }

    return c.redirect(`/admin/roles?role=${role.id}`, 303);
  },
);

authRoute.get(
  "/admin/users",
  Permission.require(USERS_READ_PERMISSION),
  async (c) => {
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
      <AdminUsers
        direction={direction}
        sort={sort}
        users={users}
        viewerUsername={c.var.currentUser.username}
      />,
    );
  },
);

authRoute.post(
  "/admin/users",
  Permission.require(USERS_CREATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const body = await c.req.parseBody({ all: true });
    const email = formString(body, "email", true);
    const username = formString(body, "username", true);
    const labelValue = formString(body, "label", true);

    if (!email || !username) {
      return c.text("Email and username are required.", 400);
    }

    if (await hasUserIdentifierCollision(c.env.DB, { email, username })) {
      return c.text("That username or email is already in use.", 409);
    }

    let userId: number;
    try {
      userId = await createUser(c.env.DB, {
        active: false,
        email,
        label: labelValue || null,
        passwordHash: await hashPassword(
          `${crypto.randomUUID()}${crypto.randomUUID()}`,
        ),
        username,
      });
    } catch (error) {
      if (isUniqueUserError(error)) {
        return c.text("That username or email is already in use.", 409);
      }
      throw error;
    }

    await setRolesForUser(
      c.env.DB,
      userId,
      await resolveAdminSafeRoleIds(
        c.env.DB,
        c.var.currentUser,
        null,
        formRoleIds(body),
      ),
    );
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

    return c.redirect("/admin/users", 303);
  },
);

authRoute.post(
  "/admin/users/:id/invite",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
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
  },
);

authRoute.post("/admin/users/:id/active", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);

  if (!Number.isInteger(id)) {
    return c.notFound();
  }

  const body = await c.req.parseBody();
  const active = formString(body, "active") === "1";
  const permission = active ? USERS_UPDATE_PERMISSION : USERS_DELETE_PERMISSION;

  if (await Permission.cannot(permission, c.env.DB, c.var.currentUser.id)) {
    return c.text("Forbidden", 403);
  }

  if (!active && id === c.var.currentUser.id) {
    return c.text("You cannot deactivate your own account.", 400);
  }

  try {
    await setUserActive(c.env.DB, id, active);
  } catch (error) {
    if (isLastActiveAdminError(error)) {
      return c.text("At least one administrator must remain active.", 409);
    }
    throw error;
  }

  if (!active) {
    await destroySessionsForUser(c.env.DB, id);
  }

  return c.redirect("/admin/users", 303);
});

authRoute.get(
  "/admin/users/:id/edit",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    const user = Number.isInteger(id) ? await getUserById(c.env.DB, id) : null;

    if (!user) {
      return c.notFound();
    }

    return c.html(
      <AdminUserEdit
        user={user}
        viewerUsername={c.var.currentUser.username}
      />,
    );
  },
);

authRoute.post(
  "/admin/users/:id",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);

    if (!Number.isInteger(id)) {
      return c.redirect("/admin/users", 303);
    }

    const body = await c.req.parseBody({ all: true });
    const email = formString(body, "email", true);
    const username = formString(body, "username", true);
    const labelValue = formString(body, "label", true);
    const label = labelValue.length > 0 ? labelValue : null;
    const password = formString(body, "password");
    const inlineSave = c.req.header("Accept")?.includes("application/json") ??
      false;
    const fail = (status: 400 | 409 | 422 | 500, message: string) =>
      inlineSave ? c.json({ saved: false }, status) : c.text(message, status);

    if (!email || !username) {
      return fail(400, "Email and username are required.");
    }

    if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
      return fail(422, "Enter a valid email address.");
    }

    if (
      await hasUserIdentifierCollision(c.env.DB, {
        email,
        excludeUserId: id,
        username,
      })
    ) {
      return fail(409, "That username or email is already in use.");
    }

    let passwordHash: string | undefined;
    if (password.length > 0) {
      const passwordError = validateAccountPassword(password);
      if (passwordError) {
        return fail(422, passwordError);
      }
      passwordHash = await hashPassword(password);
    }

    try {
      await updateManagedUser(c.env.DB, id, {
        email,
        label,
        passwordHash,
        username,
      });
    } catch (error) {
      if (isUniqueUserError(error)) {
        return fail(409, "That username or email is already in use.");
      }
      if (inlineSave) return c.json({ saved: false }, 500);
      throw error;
    }

    if (passwordHash && id === c.var.currentUser.id) {
      clearSessionCookie(c);
    }

    if (inlineSave) return c.json({ saved: true });
    if (passwordHash && id === c.var.currentUser.id) {
      return c.redirect("/login?password=updated", 303);
    }
    return c.redirect("/admin/users", 303);
  },
);

authRoute.get(
  "/admin/users/:id/permissions",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    const user = Number.isInteger(id) ? await getUserById(c.env.DB, id) : null;
    if (!user) {
      return c.notFound();
    }

    const [roles, permissions, denials] = await Promise.all([
      getAllRoles(c.env.DB),
      Permission.forUser(c.env.DB, user.id),
      Permission.denialsForUser(c.env.DB, user.id),
    ]);

    return c.html(
      <AdminUserAccess
        denials={denials}
        permissions={permissions}
        roles={roles}
        user={user}
        viewerUsername={c.var.currentUser.username}
      />,
    );
  },
);

authRoute.post(
  "/admin/users/:id/roles",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    if (!Number.isInteger(id)) {
      return c.redirect("/admin/users", 303);
    }

    const target = await getUserById(c.env.DB, id);
    if (!target) {
      return c.redirect("/admin/users", 303);
    }

    const body = await c.req.parseBody({ all: true });
    const roleIds = await resolveAdminSafeRoleIds(
      c.env.DB,
      c.var.currentUser,
      target,
      formRoleIds(body),
    );

    await setRolesForUser(c.env.DB, id, roleIds);
    return c.redirect(`/admin/users/${id}/permissions`, 303);
  },
);

authRoute.post(
  "/admin/users/:id/denials",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);

    // Nobody manages their own denials: denying your own users:update would
    // 403 you out of this very page (self-lockout), and self-restore would let
    // a user lift a denial an admin placed on them. Both directions are the
    // admin's job, on someone else.
    if (id === c.var.currentUser.id) {
      return c.redirect(`/admin/users/${id}/permissions`, 303);
    }

    const body = await c.req.parseBody();
    const permissionId = Number.parseInt(formString(body, "permissionId"), 10);
    const expiresAt = denialExpiresAt(formString(body, "duration"));

    if (Number.isInteger(id) && Number.isInteger(permissionId) && expiresAt) {
      const permission = await Permission.byId(c.env.DB, permissionId);
      if (permission) {
        await Permission.deny(c.env.DB, id, permission.id, expiresAt);
      }
    }

    return c.redirect(`/admin/users/${id}/permissions`, 303);
  },
);

authRoute.post(
  "/admin/users/:id/denials/:permissionId/delete",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    const permissionId = Number.parseInt(c.req.param("permissionId"), 10);

    // A user cannot lift denials on themselves — see the deny route above.
    if (id === c.var.currentUser.id) {
      return c.redirect(`/admin/users/${id}/permissions`, 303);
    }

    if (Number.isInteger(id) && Number.isInteger(permissionId)) {
      await Permission.restore(c.env.DB, id, permissionId);
    }

    return c.redirect(`/admin/users/${id}/permissions`, 303);
  },
);

authRoute.get("/admin/account", async (c) => {
  c.header("Cache-Control", "no-store");
  const profile = await getProfileForUser(c.env.DB, c.var.currentUser.id);
  return c.html(
    <Account
      biography={profile?.biography ?? ""}
      email={c.var.currentUser.email}
      isAdmin={hasAdminRole(c.var.currentUser.roles)}
      label={c.var.currentUser.label ?? ""}
      username={c.var.currentUser.username}
    />,
  );
});

authRoute.post("/admin/account/biography", async (c) => {
  c.header("Cache-Control", "no-store");
  const biography = formString(await c.req.parseBody(), "biography").trim();

  if (biography.length > MAX_PROFILE_BIOGRAPHY_LENGTH) {
    return c.text(
      `Biography cannot exceed ${MAX_PROFILE_BIOGRAPHY_LENGTH.toLocaleString()} characters.`,
      422,
    );
  }

  await updateProfileBiography(c.env.DB, c.var.currentUser.id, biography);
  return c.redirect(
    `/@${encodeURIComponent(c.var.currentUser.username)}`,
    303,
  );
});

authRoute.post("/admin/account/label", async (c) => {
  c.header("Cache-Control", "no-store");
  const label = formString(await c.req.parseBody(), "label", true);

  await updateUserLabel(
    c.env.DB,
    c.var.currentUser.id,
    label || null,
  );
  return c.redirect(
    `/@${encodeURIComponent(c.var.currentUser.username)}`,
    303,
  );
});

authRoute.post("/admin/account", async (c) => {
  c.header("Cache-Control", "no-store");
  const currentUser = c.var.currentUser;
  const body = await c.req.parseBody();
  const biography = formString(body, "biography").trim();
  const email = formString(body, "email", true);
  const label = formString(body, "label", true);
  const username = formString(body, "username", true);
  const currentPassword = formString(body, "currentPassword");
  const newPassword = formString(body, "newPassword");
  const newPasswordConfirmation = formString(body, "newPasswordConfirmation");
  const isAdmin = hasAdminRole(currentUser.roles);
  const renderError = (error: string, status: 400 | 409 | 422) =>
    c.html(
      <Account
        biography={biography}
        email={email || currentUser.email}
        error={error}
        isAdmin={isAdmin}
        label={label}
        username={username || currentUser.username}
      />,
      status,
    );

  if (!email || !username) {
    return renderError("Complete every field.", 400);
  }

  if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
    return renderError("Enter a valid email address.", 422);
  }

  if (
    await hasUserIdentifierCollision(c.env.DB, {
      email,
      excludeUserId: currentUser.id,
      username,
    })
  ) {
    return renderError("That username or email is already in use.", 409);
  }

  if (biography.length > MAX_PROFILE_BIOGRAPHY_LENGTH) {
    return renderError(
      `Biography cannot exceed ${MAX_PROFILE_BIOGRAPHY_LENGTH.toLocaleString()} characters.`,
      422,
    );
  }

  const changingPassword = newPassword.length > 0 ||
    newPasswordConfirmation.length > 0;
  let passwordHash: string | undefined;

  if (changingPassword) {
    if (!currentPassword) {
      return renderError(
        "Enter your current password to set a new password.",
        422,
      );
    }

    const passwordError = validateAccountPassword(newPassword);
    if (passwordError) {
      return renderError(passwordError, 422);
    }

    if (newPassword !== newPasswordConfirmation) {
      return renderError("New passwords must match.", 422);
    }

    const currentPasswordHash = await getUserPasswordHashById(
      c.env.DB,
      currentUser.id,
    );
    const currentPasswordMatches = await verifyPassword(
      currentPassword,
      currentPasswordHash ?? INVALID_LOGIN_HASH,
    );

    if (!currentPasswordMatches) {
      return renderError("Current password is incorrect.", 422);
    }

    passwordHash = await hashPassword(newPassword);
  }

  try {
    await updateAccountProfile(c.env.DB, currentUser.id, {
      biography,
      email,
      label: label || null,
      passwordHash,
      username,
    });
  } catch (error) {
    if (isUniqueUserError(error)) {
      return renderError("That username or email is already in use.", 409);
    }
    throw error;
  }

  if (changingPassword) {
    await destroySessionsForUser(c.env.DB, currentUser.id);
    clearSessionCookie(c);
    return c.redirect("/login?password=updated", 303);
  }

  return c.redirect("/admin/account", 303);
});

authRoute.get("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);

  if (token) {
    await destroySession(c.env.DB, token);
  }

  clearSessionCookie(c);
  c.header("Cache-Control", "no-store");

  return c.html(<Logout />);
});
