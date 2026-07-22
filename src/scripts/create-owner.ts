import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword } from "../auth/password.js";

let email = process.env.OWNER_EMAIL?.trim();
let username = process.env.OWNER_USERNAME?.trim();
let password = process.env.OWNER_PASSWORD;
const commandFlags = process.argv.slice(2);
const supportedFlags = new Set(["--prod", "--remote"]);
const unsupportedFlags = commandFlags.filter(
  (flag) => !supportedFlags.has(flag),
);

if (unsupportedFlags.length > 0) {
  throw new Error(
    `Unsupported account:create flag: ${unsupportedFlags.join(", ")}. ` +
      "Use --prod or --remote for the production database.",
  );
}

const database = commandFlags.some((flag) => supportedFlags.has(flag))
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
