export interface User {
  id: number;
  email: string;
  username: string;
  label: string | null;
  active: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Pick<User, "id" | "label" | "username">;

// Actually stored in the database.
export interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  label: string | null;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

// A user row joined with its comma-joined role names (from user_roles).
export interface UserWithRolesRow extends UserRow {
  roles: string | null;
}

// Parse the GROUP_CONCAT of role names into a list. Role names never contain
// commas, so a plain split is safe.
export const parseRoleList = (roles: string | null | undefined): string[] =>
  roles ? roles.split(",") : [];

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

export const userFromRow = (row: UserRow, roles: string[] = []): User => ({
  id: row.id,
  email: row.email,
  username: row.username,
  label: row.label,
  active: row.active === 1,
  roles,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findUserByLogin = async (
  db: D1Database,
  login: string,
): Promise<UserRow | null> =>
  db
    .prepare(
      `SELECT id, email, username, password_hash, label, active, created_at, updated_at
       FROM users
       WHERE email = ?1 OR username = ?1
       LIMIT 1`,
    )
    .bind(login)
    .first<UserRow>();

export const getAllUsers = async (
  db: D1Database,
): Promise<readonly User[]> => {
  const result = await db
    .prepare(
      `SELECT users.id, users.email, users.username, users.password_hash,
              users.label, users.active, users.created_at, users.updated_at,
              (SELECT GROUP_CONCAT(roles.name, ',')
               FROM user_roles
               JOIN roles ON roles.id = user_roles.role_id
               WHERE user_roles.user_id = users.id) AS roles
       FROM users
       ORDER BY users.id ASC`,
    )
    .all<UserWithRolesRow>();

  return result.results.map((row) =>
    userFromRow(row, parseRoleList(row.roles))
  );
};

export const getUserById = async (
  db: D1Database,
  id: number,
): Promise<User | null> => {
  const row = await db
    .prepare(
      `SELECT users.id, users.email, users.username, users.password_hash,
              users.label, users.active, users.created_at, users.updated_at,
              (SELECT GROUP_CONCAT(roles.name, ',')
               FROM user_roles
               JOIN roles ON roles.id = user_roles.role_id
               WHERE user_roles.user_id = users.id) AS roles
       FROM users
       WHERE users.id = ?1
       LIMIT 1`,
    )
    .bind(id)
    .first<UserWithRolesRow>();

  return row ? userFromRow(row, parseRoleList(row.roles)) : null;
};

export const getPublicUserByUsername = async (
  db: D1Database,
  username: string,
): Promise<PublicUser | null> => {
  const row = await db
    .prepare(
      `SELECT id, username, label
       FROM users
       WHERE username = ?1
       LIMIT 1`,
    )
    .bind(username)
    .first<PublicUser>();

  return row
    ? { id: row.id, label: row.label, username: row.username }
    : null;
};

export const updateUser = async (
  db: D1Database,
  id: number,
  input: { email: string; username: string; label: string | null },
): Promise<void> => {
  await db
    .prepare(
      `UPDATE users
       SET email = ?2, username = ?3, label = ?4, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, input.email, input.username, input.label)
    .run();
};

export const setUserActive = async (
  db: D1Database,
  id: number,
  active: boolean,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE users
       SET active = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, active ? 1 : 0)
    .run();
};

export const setUserPassword = async (
  db: D1Database,
  id: number,
  passwordHash: string,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE users
       SET password_hash = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, passwordHash)
    .run();
};
