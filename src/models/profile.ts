export const MAX_PROFILE_BIOGRAPHY_LENGTH = 2_000;

export interface Profile {
  biography: string;
  createdAt: string;
  id: number;
  updatedAt: string;
  userId: number;
}

export interface PublicProfile {
  biography: string;
  id: number;
  label: string | null;
  username: string;
}

interface ProfileRow {
  biography: string;
  created_at: string;
  id: number;
  updated_at: string;
  user_id: number;
}

interface PublicProfileRow {
  biography: string | null;
  id: number;
  label: string | null;
  username: string;
}

const profileFromRow = (row: ProfileRow): Profile => ({
  biography: row.biography,
  createdAt: row.created_at,
  id: row.id,
  updatedAt: row.updated_at,
  userId: row.user_id,
});

export const getProfileForUser = async (
  db: D1Database,
  userId: number,
): Promise<Profile | null> => {
  const row = await db
    .prepare(
      `SELECT id, user_id, biography, created_at, updated_at
       FROM profiles
       WHERE user_id = ?1
       LIMIT 1`,
    )
    .bind(userId)
    .first<ProfileRow>();

  return row ? profileFromRow(row) : null;
};

export const getPublicProfileByUsername = async (
  db: D1Database,
  username: string,
): Promise<PublicProfile | null> => {
  const row = await db
    .prepare(
      `SELECT users.id, users.username, users.label, profiles.biography
       FROM users
       LEFT JOIN profiles ON profiles.user_id = users.id
       WHERE users.username = ?1
       LIMIT 1`,
    )
    .bind(username)
    .first<PublicProfileRow>();

  return row
    ? {
      biography: row.biography ?? "",
      id: row.id,
      label: row.label,
      username: row.username,
    }
    : null;
};

export const updateAccountProfile = async (
  db: D1Database,
  userId: number,
  input: {
    biography: string;
    email: string;
    label: string | null;
    passwordHash: string;
    username: string;
  },
): Promise<void> => {
  await db.batch([
    db
      .prepare(
        `UPDATE users
         SET email = ?2, username = ?3, label = ?4, password_hash = ?5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?1`,
      )
      .bind(
        userId,
        input.email,
        input.username,
        input.label,
        input.passwordHash,
      ),
    db
      .prepare(
        `INSERT INTO profiles (user_id, biography)
         VALUES (?1, ?2)
         ON CONFLICT(user_id) DO UPDATE
         SET biography = excluded.biography,
             updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(userId, input.biography),
  ]);
};
