import { createRandomToken, hashToken } from "../auth/token.js";
import { parseRoleList, type User } from "./user.js";

export const SESSION_COOKIE_NAME = "shipping_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const createSession = async (
  db: D1Database,
  userId: number,
): Promise<string> => {
  const token = createRandomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await db
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES (?1, ?2, ?3)`,
    )
    .bind(tokenHash, userId, expiresAt)
    .run();

  return token;
};

export const destroySession = async (
  db: D1Database,
  token: string,
): Promise<void> => {
  const tokenHash = await hashToken(token);

  await db
    .prepare("DELETE FROM sessions WHERE token_hash = ?1")
    .bind(tokenHash)
    .run();
};

export const destroySessionsForUser = async (
  db: D1Database,
  userId: number,
): Promise<void> => {
  await db.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(userId).run();
};

interface SessionUserRow {
  id: number;
  email: string;
  username: string;
  label: string | null;
  active: 0 | 1;
  roles: string | null;
  created_at: string;
  updated_at: string;
}

export const getSessionUser = async (
  db: D1Database,
  token: string,
): Promise<User | null> => {
  const tokenHash = await hashToken(token);

  const row = await db
    .prepare(
      `SELECT users.id, users.email, users.username, users.label, users.active,
              users.created_at, users.updated_at,
              (SELECT GROUP_CONCAT(roles.name, ',')
               FROM user_roles
               JOIN roles ON roles.id = user_roles.role_id
               WHERE user_roles.user_id = users.id) AS roles
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?1 AND sessions.expires_at > ?2
         AND users.active = 1
       LIMIT 1`,
    )
    .bind(tokenHash, new Date().toISOString())
    .first<SessionUserRow>();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    label: row.label,
    active: row.active === 1,
    roles: parseRoleList(row.roles),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
