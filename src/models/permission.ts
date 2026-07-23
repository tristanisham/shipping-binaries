export const POSTS_CREATE_PERMISSION = "posts:create";
export const POSTS_READ_PERMISSION = "posts:read";
export const POSTS_UPDATE_PERMISSION = "posts:update";
export const POSTS_DELETE_PERMISSION = "posts:delete";
export const COMMENTS_CREATE_PERMISSION = "comments:create";
export const COMMENTS_READ_PERMISSION = "comments:read";
export const COMMENTS_UPDATE_PERMISSION = "comments:update";
export const COMMENTS_DELETE_PERMISSION = "comments:delete";
export const USERS_CREATE_PERMISSION = "users:create";
export const USERS_READ_PERMISSION = "users:read";
export const USERS_UPDATE_PERMISSION = "users:update";
export const USERS_DELETE_PERMISSION = "users:delete";

export interface PermissionRecord {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface PermissionRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

const permissionFromRow = (row: PermissionRow): PermissionRecord => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class Permission {
  static async can(
    name: string,
    db: D1Database,
    userId: number | null | undefined,
  ): Promise<boolean> {
    if (!userId || !name) return false;

    const row = await db
      .prepare(
        `SELECT 1 AS allowed
         FROM user_roles
         JOIN role_permissions
           ON role_permissions.role_id = user_roles.role_id
         JOIN permissions
           ON permissions.id = role_permissions.permission_id
         WHERE user_roles.user_id = ?1
           AND permissions.name = ?2
         LIMIT 1`,
      )
      .bind(userId, name)
      .first<{ allowed: number }>();

    return row?.allowed === 1;
  }

  static async cannot(
    name: string,
    db: D1Database,
    userId: number | null | undefined,
  ): Promise<boolean> {
    return !(await Permission.can(name, db, userId));
  }
}

export const getAllPermissions = async (
  db: D1Database,
): Promise<readonly PermissionRecord[]> => {
  const result = await db
    .prepare(
      `SELECT id, name, created_at, updated_at
       FROM permissions
       ORDER BY name ASC`,
    )
    .all<PermissionRow>();

  return result.results.map(permissionFromRow);
};

export const createPermission = async (
  db: D1Database,
  name: string,
): Promise<number> => {
  const result = await db
    .prepare("INSERT INTO permissions (name) VALUES (?1)")
    .bind(name)
    .run();

  return result.meta.last_row_id;
};

export const getPermissionById = async (
  db: D1Database,
  id: number,
): Promise<PermissionRecord | null> => {
  const row = await db
    .prepare(
      `SELECT id, name, created_at, updated_at
       FROM permissions
       WHERE id = ?1
       LIMIT 1`,
    )
    .bind(id)
    .first<PermissionRow>();

  return row ? permissionFromRow(row) : null;
};

export const getPermissionsForRole = async (
  db: D1Database,
  roleId: number,
): Promise<readonly PermissionRecord[]> => {
  const result = await db
    .prepare(
      `SELECT permissions.id, permissions.name, permissions.created_at,
              permissions.updated_at
       FROM role_permissions
       JOIN permissions
         ON permissions.id = role_permissions.permission_id
       WHERE role_permissions.role_id = ?1
       ORDER BY permissions.name ASC`,
    )
    .bind(roleId)
    .all<PermissionRow>();

  return result.results.map(permissionFromRow);
};

export const getPermissionsForUser = async (
  db: D1Database,
  userId: number,
): Promise<readonly PermissionRecord[]> => {
  const result = await db
    .prepare(
      `SELECT DISTINCT permissions.id, permissions.name,
              permissions.created_at, permissions.updated_at
       FROM user_roles
       JOIN role_permissions
         ON role_permissions.role_id = user_roles.role_id
       JOIN permissions
         ON permissions.id = role_permissions.permission_id
       WHERE user_roles.user_id = ?1
       ORDER BY permissions.name ASC`,
    )
    .bind(userId)
    .all<PermissionRow>();

  return result.results.map(permissionFromRow);
};

export const assignPermissionToRole = async (
  db: D1Database,
  roleId: number,
  permissionName: string,
): Promise<void> => {
  await db
    .prepare(
      `INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
       SELECT ?1, id
       FROM permissions
       WHERE name = ?2`,
    )
    .bind(roleId, permissionName)
    .run();
};

export const setPermissionForRole = async (
  db: D1Database,
  roleId: number,
  permissionId: number,
  assigned: boolean,
): Promise<void> => {
  if (assigned) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
         VALUES (?1, ?2)`,
      )
      .bind(roleId, permissionId)
      .run();
    return;
  }

  await db
    .prepare(
      `DELETE FROM role_permissions
       WHERE role_id = ?1 AND permission_id = ?2`,
    )
    .bind(roleId, permissionId)
    .run();
};

export const setPermissionsForRole = async (
  db: D1Database,
  roleId: number,
  permissionIds: readonly number[],
): Promise<void> => {
  const uniquePermissionIds = [
    ...new Set(permissionIds.filter(Number.isInteger)),
  ];

  if (uniquePermissionIds.length === 0) {
    await db
      .prepare("DELETE FROM role_permissions WHERE role_id = ?1")
      .bind(roleId)
      .run();
    return;
  }

  const placeholders = uniquePermissionIds.map((_, index) => `?${index + 2}`);
  await db
    .prepare(
      `DELETE FROM role_permissions
       WHERE role_id = ?1
         AND permission_id NOT IN (${placeholders.join(", ")})`,
    )
    .bind(roleId, ...uniquePermissionIds)
    .run();
  await db
    .prepare(
      `INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
       SELECT ?1, id
       FROM permissions
       WHERE id IN (${placeholders.join(", ")})`,
    )
    .bind(roleId, ...uniquePermissionIds)
    .run();
};
