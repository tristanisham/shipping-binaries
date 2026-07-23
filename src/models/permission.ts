import type { MiddlewareHandler } from "hono";

// Indefinite denials store a far-future expiry rather than NULL, so the
// permission query never needs an IS NULL branch. Sorts after any real ISO date.
export const INDEFINITE_DENIAL_EXPIRES_AT = "9999-12-31T23:59:59.999Z";

export interface UserPermissionDenial {
  permissionId: number;
  expiresAt: string;
}

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
export const ROLES_READ_PERMISSION = "roles:read";
export const ROLES_UPDATE_PERMISSION = "roles:update";

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

// Env shape the route guards need: a DB binding plus an authenticated user id
// on the context (populated by session middleware upstream). Kept minimal so
// this model file stays independent of the route layer's own env type.
type GuardEnv = {
  Bindings: Env;
  Variables: { currentUser: { id: number } };
};

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

  // Route guard: responds 403 unless the current user holds `name`. Generic
  // over the env so it infers the caller's env (e.g. AuthEnv) at the call site.
  static require<E extends GuardEnv>(name: string): MiddlewareHandler<E> {
    return async (c, next) => {
      if (await Permission.cannot(name, c.env.DB, c.var.currentUser.id)) {
        return c.text("Forbidden", 403);
      }
      await next();
    };
  }

  // Route guard for pages spanning multiple resources (e.g. the admin
  // dashboard): 403 unless the user holds at least one of `names`.
  static requireAny<E extends GuardEnv>(
    ...names: string[]
  ): MiddlewareHandler<E> {
    return async (c, next) => {
      const userId = c.var.currentUser.id;
      const allowed = await Promise.all(
        names.map((name) => Permission.can(name, c.env.DB, userId)),
      );
      if (!allowed.some(Boolean)) {
        return c.text("Forbidden", 403);
      }
      await next();
    };
  }

  static async all(db: D1Database): Promise<readonly PermissionRecord[]> {
    const result = await db
      .prepare(
        `SELECT id, name, created_at, updated_at
         FROM permissions
         ORDER BY name ASC`,
      )
      .all<PermissionRow>();

    return result.results.map(permissionFromRow);
  }

  static async create(db: D1Database, name: string): Promise<number> {
    const result = await db
      .prepare("INSERT INTO permissions (name) VALUES (?1)")
      .bind(name)
      .run();

    return result.meta.last_row_id;
  }

  static async byId(
    db: D1Database,
    id: number,
  ): Promise<PermissionRecord | null> {
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
  }

  static async forRole(
    db: D1Database,
    roleId: number,
  ): Promise<readonly PermissionRecord[]> {
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
  }

  static async forUser(
    db: D1Database,
    userId: number,
  ): Promise<readonly PermissionRecord[]> {
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
  }

  static async assignToRole(
    db: D1Database,
    roleId: number,
    permissionName: string,
  ): Promise<void> {
    await db
      .prepare(
        `INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
         SELECT ?1, id
         FROM permissions
         WHERE name = ?2`,
      )
      .bind(roleId, permissionName)
      .run();
  }

  static async setForRole(
    db: D1Database,
    roleId: number,
    permissionId: number,
    assigned: boolean,
  ): Promise<void> {
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
  }

  static async deny(
    db: D1Database,
    userId: number,
    permissionId: number,
    expiresAt: string,
  ): Promise<void> {
    await db
      .prepare(
        `INSERT INTO user_permission_denials (user_id, permission_id, expires_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(user_id, permission_id)
         DO UPDATE SET expires_at = ?3`,
      )
      .bind(userId, permissionId, expiresAt)
      .run();
  }

  static async restore(
    db: D1Database,
    userId: number,
    permissionId: number,
  ): Promise<void> {
    await db
      .prepare(
        `DELETE FROM user_permission_denials
         WHERE user_id = ?1 AND permission_id = ?2`,
      )
      .bind(userId, permissionId)
      .run();
  }

  static async denialsForUser(
    db: D1Database,
    userId: number,
  ): Promise<readonly UserPermissionDenial[]> {
    const result = await db
      .prepare(
        `SELECT permission_id, expires_at
         FROM user_permission_denials
         WHERE user_id = ?1`,
      )
      .bind(userId)
      .all<{ permission_id: number; expires_at: string }>();

    return result.results.map((row) => ({
      permissionId: row.permission_id,
      expiresAt: row.expires_at,
    }));
  }
}
