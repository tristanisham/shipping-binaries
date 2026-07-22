import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword } from "../auth/password.js";

let email = process.env.OWNER_EMAIL?.trim();
let username = process.env.OWNER_USERNAME?.trim();
let password = process.env.OWNER_PASSWORD;
const supportedFlags = new Set(["--prod", "--remote"]);
let role = process.env.OWNER_ROLE?.trim();
const databaseFlags: string[] = [];
const rawFlags = process.argv.slice(2);

for (let i = 0; i < rawFlags.length; i++) {
  const flag = rawFlags[i];

  if (flag === "--role") {
    role = rawFlags[++i]?.trim();
    continue;
  }

  if (flag.startsWith("--role=")) {
    role = flag.slice("--role=".length).trim();
    continue;
  }

  databaseFlags.push(flag);
}

const unsupportedFlags = databaseFlags.filter(
  (flag) => !supportedFlags.has(flag),
);

if (unsupportedFlags.length > 0) {
  throw new Error(
    `Unsupported account:create flag: ${unsupportedFlags.join(", ")}. ` +
      "Use --prod or --remote for the production database, and " +
      "--role <name> (or OWNER_ROLE) to assign a role.",
  );
}

const database = databaseFlags.some((flag) => supportedFlags.has(flag))
  ? "remote"
  : "local";

if ((!email || !username || !password) && process.stdin.isTTY) {
  let outputMuted = false;
  const terminalOutput = new Writable({
    write(chunk, encoding, callback) {
      if (!outputMuted) {
        process.stdout.write(chunk, encoding);
      }

      callback();
    },
  });
  const prompt = createInterface({
    input: process.stdin,
    output: terminalOutput,
    terminal: true,
  });

  try {
    email ||= (await prompt.question("Owner email: ")).trim();
    username ||= (await prompt.question("Owner username: ")).trim();

    if (!password) {
      process.stdout.write("Owner password: ");
      outputMuted = true;
      password = await prompt.question("");
      outputMuted = false;
      process.stdout.write("\n");
    }
  } finally {
    outputMuted = false;
    prompt.close();
  }
}

if (!email || !username || !password) {
  throw new Error(
    "An owner email, username, and password are required.",
  );
}

const sqlValue = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;
const passwordHash = await hashPassword(password);

const executeSql = (sql: string) => {
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

  return spawnSync("npx", args, {
    encoding: "utf8",
    stdio: "inherit",
  });
};

const upsert = executeSql(`
  INSERT INTO users (email, username, password_hash)
  VALUES (${sqlValue(email)}, ${sqlValue(username)}, ${sqlValue(passwordHash)})
  ON CONFLICT(email) DO UPDATE SET
    username = excluded.username,
    password_hash = excluded.password_hash,
    updated_at = CURRENT_TIMESTAMP;
`);

if (upsert.error) {
  throw upsert.error;
}

if (upsert.status !== 0) {
  process.exitCode = upsert.status ?? 1;
} else if (role) {
  // Assign the role via the user_roles join table. If the role name does not
  // exist, the role_id subquery is NULL and the NOT NULL constraint fails,
  // surfacing a non-zero status (loud failure rather than a silent no-op).
  const assignment = executeSql(`
    INSERT INTO user_roles (user_id, role_id)
    VALUES (
      (SELECT id FROM users WHERE email = ${sqlValue(email)}),
      (SELECT id FROM roles WHERE name = ${sqlValue(role)})
    )
    ON CONFLICT(user_id, role_id) DO NOTHING;
  `);

  if (assignment.error) {
    throw assignment.error;
  }

  if (assignment.status !== 0) {
    process.exitCode = assignment.status ?? 1;
    console.error(
      `Failed to assign role "${role}". Ensure a role with that name ` +
        "exists in the roles table.",
    );
  } else {
    console.log(
      `Owner ${username} (${email}) saved with role "${role}" ` +
        `on the ${database} D1 database.`,
    );
  }
} else {
  console.log(`Owner ${username} (${email}) saved to the ${database} D1 database.`);
}
