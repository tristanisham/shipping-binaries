export interface User {
  id: number;
  email: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

// Actually stored in the database.
export interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
}

export interface CreateUserRow {
  email: string;
  username: string;
  password_hash: string;
}

export const userFromRow = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  username: row.username,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findUserByLogin = async (
  db: D1Database,
  login: string,
): Promise<UserRow | null> =>
  db
    .prepare(
      `SELECT id, email, username, password_hash, created_at, updated_at
       FROM users
       WHERE email = ?1 OR username = ?1
       LIMIT 1`,
    )
    .bind(login)
    .first<UserRow>();
