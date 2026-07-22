export const ADMIN_ROLE = "admin";

export interface Role {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Actually stored in the database.
export interface RoleRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export const roleFromRow = (row: RoleRow): Role => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getRoleByName = async (
  db: D1Database,
  name: string,
): Promise<Role | null> => {
  const row = await db
    .prepare(
      `SELECT id, name, created_at, updated_at
       FROM roles
       WHERE name = ?1
       LIMIT 1`,
    )
    .bind(name)
    .first<RoleRow>();

  return row ? roleFromRow(row) : null;
};

export const getRolesForUser = async (
  db: D1Database,
  userId: number,
): Promise<string[]> => {
  const result = await db
    .prepare(
      `SELECT roles.name AS name
       FROM user_roles
       JOIN roles ON roles.id = user_roles.role_id
       WHERE user_roles.user_id = ?1
       ORDER BY roles.name ASC`,
    )
    .bind(userId)
    .all<{ name: string }>();

  return result.results.map((row) => row.name);
};

export const assignRoleToUser = async (
  db: D1Database,
  userId: number,
  roleName: string,
): Promise<void> => {
  await db
    .prepare(
      `INSERT OR IGNORE INTO user_roles (user_id, role_id)
       SELECT ?1, id FROM roles WHERE name = ?2`,
    )
    .bind(userId, roleName)
    .run();
};
