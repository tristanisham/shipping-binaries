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
  active?: boolean;
  email: string;
  label: string | null;
  passwordHash: string;
  username: string;
}

export type UserSort = "email" | "label" | "status" | "username";
export type UserSortDirection = "asc" | "desc";

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
): Promise<UserRow | null> => {
  const result = await db
    .prepare(
      `SELECT id, email, username, password_hash, label, active, created_at, updated_at
       FROM users
       WHERE email = ?1 OR username = ?1
       LIMIT 2`,
    )
    .bind(login)
    .all<UserRow>();

  return result.results.length === 1 ? result.results[0] : null;
};

export const findUserByEmail = async (
  db: D1Database,
  email: string,
): Promise<UserRow | null> =>
  db
    .prepare(
      `SELECT id, email, username, password_hash, label, active, created_at, updated_at
       FROM users
       WHERE email = ?1
       LIMIT 1`,
    )
    .bind(email)
    .first<UserRow>();

export const hasUserIdentifierCollision = async (
  db: D1Database,
  input: { email: string; excludeUserId?: number; username: string },
): Promise<boolean> => {
  const row = await db
    .prepare(
      `SELECT 1 AS collision
       FROM users
       WHERE id != ?3
         AND (
           email IN (?1, ?2)
           OR username IN (?1, ?2)
         )
       LIMIT 1`,
    )
    .bind(input.email, input.username, input.excludeUserId ?? -1)
    .first<{ collision: number }>();

  return row?.collision === 1;
};

export const getUserPasswordHashById = async (
  db: D1Database,
  id: number,
): Promise<string | null> => {
  const row = await db
    .prepare(
      "SELECT password_hash FROM users WHERE id = ?1 LIMIT 1",
    )
    .bind(id)
    .first<Pick<UserRow, "password_hash">>();

  return row?.password_hash ?? null;
};

// Creates a user (plus their profile row) in one batch. When `roleName` is
// given, the matching role is assigned in the same batch.
export const createUser = async (
  db: D1Database,
  input: CreateUserInput,
  roleName?: string,
): Promise<number> => {
  const statements = [
    db
      .prepare(
        `INSERT INTO users (email, username, password_hash, label, active)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      )
      .bind(
        input.email,
        input.username,
        input.passwordHash,
        input.label,
        input.active === false ? 0 : 1,
      ),
  ];

  if (roleName) {
    statements.push(
      db
        .prepare(
          `INSERT INTO user_roles (user_id, role_id)
           SELECT users.id, roles.id
           FROM users
           CROSS JOIN roles
           WHERE users.username = ?1
             AND roles.name = ?2`,
        )
        .bind(input.username, roleName),
    );
  }

  statements.push(
    db
      .prepare(
        `INSERT INTO profiles (user_id)
         SELECT id
         FROM users
         WHERE username = ?1`,
      )
      .bind(input.username),
  );

  const results = await db.batch(statements);

  return results[0].meta.last_row_id;
};

export const getAllUsers = async (
  db: D1Database,
  options: { direction?: UserSortDirection; sort?: UserSort } = {},
): Promise<readonly User[]> => {
  const sortColumns: Record<UserSort, string> = {
    email: "users.email",
    label: "COALESCE(users.label, '')",
    status: "users.active",
    username: "users.username",
  };
  const sortColumn = options.sort ? sortColumns[options.sort] : "users.id";
  const direction = options.direction === "desc" ? "DESC" : "ASC";
  const result = await db
    .prepare(
      `SELECT users.id, users.email, users.username, users.password_hash,
              users.label, users.active, users.created_at, users.updated_at,
              (SELECT GROUP_CONCAT(roles.name, ',')
               FROM user_roles
               JOIN roles ON roles.id = user_roles.role_id
               WHERE user_roles.user_id = users.id) AS roles
       FROM users
       ORDER BY ${sortColumn} ${direction}, users.id ASC`,
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

  return row ? { id: row.id, label: row.label, username: row.username } : null;
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

export type ManagedUserUpdateInput = {
  active?: boolean;
  email: string;
  label: string | null;
  passwordHash?: string;
  roleIds?: readonly number[];
  username: string;
};

export const updateManagedUser = async (
  db: D1Database,
  id: number,
  input: ManagedUserUpdateInput,
): Promise<void> => {
  const statements = [
    db
      .prepare(
        `UPDATE users
         SET email = ?2,
             username = ?3,
             label = ?4,
             active = COALESCE(?5, active),
             password_hash = COALESCE(?6, password_hash),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?1`,
      )
      .bind(
        id,
        input.email,
        input.username,
        input.label,
        input.active === undefined ? null : input.active ? 1 : 0,
        input.passwordHash ?? null,
      ),
  ];

  if (input.roleIds !== undefined) {
    const roleIds = [
      ...new Set(
        input.roleIds.filter((roleId) =>
          Number.isInteger(roleId) && roleId > 0
        ),
      ),
    ];
    statements.push(
      db.prepare("DELETE FROM user_roles WHERE user_id = ?1").bind(id),
    );

    if (roleIds.length > 0) {
      const placeholders = roleIds.map((_, index) => `?${index + 2}`);
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO user_roles (user_id, role_id)
             SELECT ?1, id
             FROM roles
             WHERE id IN (${placeholders.join(", ")})`,
          )
          .bind(id, ...roleIds),
      );
    }
  }

  if (input.passwordHash !== undefined) {
    statements.push(
      db.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(id),
    );
  }

  await db.batch(statements);
};

export const updateUserAccount = async (
  db: D1Database,
  id: number,
  input: { email: string; passwordHash: string; username: string },
): Promise<void> => {
  await db
    .prepare(
      `UPDATE users
       SET email = ?2, username = ?3, password_hash = ?4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, input.email, input.username, input.passwordHash)
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

export const activateUserWithPassword = async (
  db: D1Database,
  id: number,
  passwordHash: string,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE users
       SET password_hash = ?2, active = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, passwordHash)
    .run();
};
