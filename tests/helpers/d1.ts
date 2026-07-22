import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Minimal D1Database-compatible adapter backed by node:sqlite (the same
// SQLite engine D1 uses). Faithful enough to exercise real model SQL.
class FakeStatement {
  #db: DatabaseSync;
  #sql: string;
  #args: unknown[] = [];

  constructor(db: DatabaseSync, sql: string) {
    this.#db = db;
    this.#sql = sql;
  }

  bind(...values: unknown[]): FakeStatement {
    this.#args = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    const row = this.#db.prepare(this.#sql).get(...(this.#args as never[]));
    return (row ?? null) as T | null;
  }

  async all<T>(): Promise<{
    results: T[];
    success: true;
    meta: Record<string, unknown>;
  }> {
    const results = this.#db
      .prepare(this.#sql)
      .all(...(this.#args as never[])) as T[];
    return { results, success: true, meta: {} };
  }

  async run(): Promise<{
    success: true;
    meta: { last_row_id: number; changes: number };
  }> {
    const info = this.#db.prepare(this.#sql).run(...(this.#args as never[]));
    return {
      success: true,
      meta: {
        last_row_id: Number(info.lastInsertRowid),
        changes: Number(info.changes),
      },
    };
  }
}

class FakeD1 {
  #db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.#db = db;
  }

  prepare(sql: string): FakeStatement {
    return new FakeStatement(this.#db, sql);
  }
}

const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrations");

export const createTestDb = (): D1Database => {
  const db = new DatabaseSync(":memory:");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  return new FakeD1(db) as unknown as D1Database;
};

export const seedUser = async (
  db: D1Database,
  input: {
    email: string;
    username: string;
    passwordHash?: string;
    active?: 0 | 1;
  },
): Promise<number> => {
  const result = await db
    .prepare(
      `INSERT INTO users (email, username, password_hash, active)
       VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(
      input.email,
      input.username,
      input.passwordHash ?? "hash",
      input.active ?? 1,
    )
    .run();

  return result.meta.last_row_id;
};
