import { spawnSync } from "node:child_process";
import { hashPassword } from "../auth/password.js";

const email = process.env.OWNER_EMAIL?.trim();
const username = process.env.OWNER_USERNAME?.trim();
const password = process.env.OWNER_PASSWORD;
const database = process.env.OWNER_DATABASE ?? "local";

if (!email || !username || !password) {
  throw new Error(
    "OWNER_EMAIL, OWNER_USERNAME, and OWNER_PASSWORD are required.",
  );
}

if (database !== "local" && database !== "remote") {
  throw new Error('OWNER_DATABASE must be either "local" or "remote".');
}

const sqlValue = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;
const passwordHash = await hashPassword(password);
const sql = `
  INSERT INTO users (email, username, password_hash)
  VALUES (${sqlValue(email)}, ${sqlValue(username)}, ${sqlValue(passwordHash)})
  ON CONFLICT(email) DO UPDATE SET
    username = excluded.username,
    password_hash = excluded.password_hash,
    updated_at = CURRENT_TIMESTAMP;
`;
const args = [
  "wrangler",
  "d1",
  "execute",
  "shipping-binaries",
  `--${database}`,
  "--command",
  sql,
];

if (database === "local" && process.env.DATABASE_URL) {
  args.push(`--persist-to=${process.env.DATABASE_URL}`);
}

const result = spawnSync("npx", args, {
  encoding: "utf8",
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
} else {
  console.log(`Owner ${username} (${email}) saved to the ${database} D1 database.`);
}
