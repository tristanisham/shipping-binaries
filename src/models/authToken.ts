import { createRandomToken, hashToken } from "../auth/token.js";

export type AuthTokenPurpose = "invite" | "password_reset";

export const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface AuthToken {
  id: number;
  userId: number;
  purpose: AuthTokenPurpose;
  expiresAt: string;
}

interface AuthTokenRow {
  id: number;
  user_id: number;
  purpose: AuthTokenPurpose;
  expires_at: string;
}

export const hashAuthToken = hashToken;

const authTokenFromRow = (row: AuthTokenRow): AuthToken => ({
  id: row.id,
  userId: row.user_id,
  purpose: row.purpose,
  expiresAt: row.expires_at,
});

export const createAuthToken = async (
  db: D1Database,
  userId: number,
  purpose: AuthTokenPurpose,
  ttlMs: number,
): Promise<string> => {
  const token = createRandomToken();
  const tokenHash = await hashAuthToken(token);
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  await db
    .prepare(
      `UPDATE auth_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = ?1 AND purpose = ?2 AND used_at IS NULL`,
    )
    .bind(userId, purpose)
    .run();

  await db
    .prepare(
      `INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at)
       VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(userId, purpose, tokenHash, expiresAt)
    .run();

  return token;
};

export const getValidAuthToken = async (
  db: D1Database,
  token: string,
  purpose: AuthTokenPurpose,
): Promise<AuthToken | null> => {
  const tokenHash = await hashAuthToken(token);
  const row = await db
    .prepare(
      `SELECT id, user_id, purpose, expires_at
       FROM auth_tokens
       WHERE token_hash = ?1 AND purpose = ?2 AND used_at IS NULL
         AND expires_at > ?3
       LIMIT 1`,
    )
    .bind(tokenHash, purpose, new Date().toISOString())
    .first<AuthTokenRow>();

  return row ? authTokenFromRow(row) : null;
};

export const claimAuthToken = async (
  db: D1Database,
  token: string,
  purpose: AuthTokenPurpose,
): Promise<AuthToken | null> => {
  const tokenHash = await hashAuthToken(token);
  const row = await db
    .prepare(
      `UPDATE auth_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE token_hash = ?1 AND purpose = ?2 AND used_at IS NULL
         AND expires_at > ?3
       RETURNING id, user_id, purpose, expires_at`,
    )
    .bind(tokenHash, purpose, new Date().toISOString())
    .first<AuthTokenRow>();

  return row ? authTokenFromRow(row) : null;
};
