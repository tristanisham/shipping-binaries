export const ADMIN_ROLE = "admin";
export const GUEST_ROLE = "guest";
export const PROTECTED_ROLES = [ADMIN_ROLE, GUEST_ROLE] as const;

export interface Role {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleWithUserCount extends Role {
  userCount: number;
}

// Actually stored in the database.
export interface RoleRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface RoleWithUserCountRow extends RoleRow {
  user_count: number;
}

export const roleFromRow = (row: RoleRow): Role => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const roleWithUserCountFromRow = (
  row: RoleWithUserCountRow,
): RoleWithUserCount => ({
  ...roleFromRow(row),
  userCount: row.user_count,
});

export const getAllRoles = async (
  db: D1Database,
): Promise<readonly RoleWithUserCount[]> => {
  const result = await db
    .prepare(
      `SELECT roles.id, roles.name, roles.created_at, roles.updated_at,
              COUNT(user_roles.user_id) AS user_count
       FROM roles
       LEFT JOIN user_roles ON user_roles.role_id = roles.id
       GROUP BY roles.id
       ORDER BY roles.name ASC`,
    )
    .all<RoleWithUserCountRow>();

  return result.results.map(roleWithUserCountFromRow);
};

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

export const getRoleById = async (
  db: D1Database,
  id: number,
): Promise<Role | null> => {
  const row = await db
    .prepare(
      `SELECT id, name, created_at, updated_at
       FROM roles
       WHERE id = ?1
       LIMIT 1`,
    )
    .bind(id)
    .first<RoleRow>();

  return row ? roleFromRow(row) : null;
};

export const createRole = async (
  db: D1Database,
  name: string,
): Promise<number> => {
  const result = await db
    .prepare("INSERT INTO roles (name) VALUES (?1)")
    .bind(name)
    .run();

  return result.meta.last_row_id;
};

export const updateRole = async (
  db: D1Database,
  id: number,
  name: string,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE roles
       SET name = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, name)
    .run();
};

export const deleteRole = async (
  db: D1Database,
  id: number,
): Promise<void> => {
  await db.prepare("DELETE FROM role_permissions WHERE role_id = ?1").bind(id)
    .run();
  await db.prepare("DELETE FROM user_roles WHERE role_id = ?1").bind(id).run();
  await db.prepare("DELETE FROM roles WHERE id = ?1").bind(id).run();
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

export const setRolesForUser = async (
  db: D1Database,
  userId: number,
  roleIds: readonly number[],
): Promise<void> => {
  const uniqueRoleIds = [...new Set(roleIds.filter(Number.isInteger))];

  if (uniqueRoleIds.length === 0) {
    await db.prepare("DELETE FROM user_roles WHERE user_id = ?1").bind(userId)
      .run();
    return;
  }

  const placeholders = uniqueRoleIds.map((_, index) => `?${index + 2}`);
  await db
    .prepare(
      `DELETE FROM user_roles
       WHERE user_id = ?1 AND role_id NOT IN (${placeholders.join(", ")})`,
    )
    .bind(userId, ...uniqueRoleIds)
    .run();
  await db
    .prepare(
      `INSERT OR IGNORE INTO user_roles (user_id, role_id)
       SELECT ?1, id FROM roles WHERE id IN (${placeholders.join(", ")})`,
    )
    .bind(userId, ...uniqueRoleIds)
    .run();
};
