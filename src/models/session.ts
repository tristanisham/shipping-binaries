import type { User } from "./user.js";

export const SESSION_COOKIE_NAME = "shipping_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const createSessionToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
};

const hashSessionToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return bytesToHex(new Uint8Array(digest));
};

export const createSession = async (
  db: D1Database,
  userId: number,
): Promise<string> => {
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);
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
  const tokenHash = await hashSessionToken(token);

  await db
    .prepare("DELETE FROM sessions WHERE token_hash = ?1")
    .bind(tokenHash)
    .run();
};

export const getSessionUser = async (
  db: D1Database,
  token: string,
): Promise<User | null> => {
  const tokenHash = await hashSessionToken(token);

  return db
    .prepare(
      `SELECT users.id, users.email, users.username,
              users.created_at AS createdAt, users.updated_at AS updatedAt
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?1 AND sessions.expires_at > ?2
       LIMIT 1`,
    )
    .bind(tokenHash, new Date().toISOString())
    .first<User>();
};
