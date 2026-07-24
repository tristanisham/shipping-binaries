import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const supportedFlags = new Set(["--prod", "--remote"]);
const flags = process.argv.slice(2);
const unsupportedFlags = flags.filter((flag) => !supportedFlags.has(flag));

if (unsupportedFlags.length > 0) {
  throw new Error(
    `Unsupported db:seed:access flag: ${unsupportedFlags.join(", ")}. ` +
      "Run without a flag for local D1, or use --prod or --remote for " +
      "the production database.",
  );
}

const database = flags.some((flag) => supportedFlags.has(flag))
  ? "remote"
  : "local";
const seedFile = fileURLToPath(new URL("./seed-access.sql", import.meta.url));
const args = [
  "wrangler",
  "d1",
  "execute",
  "shipping-binaries",
  `--${database}`,
  "--file",
  seedFile,
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
  console.log(
    `Fixed roles and permissions seeded on the ${database} D1 database.`,
  );
}
