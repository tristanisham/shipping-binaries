import assert from "node:assert/strict";
import { test } from "node:test";
import { gunzipSync } from "node:zlib";
import {
  archiveEntryName,
  createTarGz,
  createZip,
  encodeUtf8,
} from "../../src/export/archive.js";
import { readTarEntries, readZipEntries } from "../helpers/archive.js";

const entries = [
  { data: encodeUtf8("# First\n\nCafé.\n"), name: "first-post.md" },
  { data: encodeUtf8("# Second\n"), name: "second-post.md" },
];

test("the zip archive is a readable zip", async () => {
  const archive = await createZip(entries, new Date("2026-08-19T12:00:00Z"));

  assert.deepEqual([...archive.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  const files = readZipEntries(archive);
  assert.deepEqual([...files.keys()], ["first-post.md", "second-post.md"]);
  assert.equal(files.get("first-post.md"), "# First\n\nCafé.\n");
  assert.equal(files.get("second-post.md"), "# Second\n");
});

test("the tar.gz archive is a readable gzipped ustar tar", async () => {
  const archive = await createTarGz(entries, new Date("2026-08-19T12:00:00Z"));

  assert.deepEqual([...archive.subarray(0, 3)], [0x1f, 0x8b, 0x08]);
  const tar = gunzipSync(Buffer.from(archive));
  // Blocked to 512 bytes, and closed by two zero blocks.
  assert.equal(tar.length % 512, 0);
  assert.ok(tar.subarray(tar.length - 1024).every((byte) => byte === 0));

  const files = readTarEntries(tar);
  assert.deepEqual([...files.keys()], ["first-post.md", "second-post.md"]);
  assert.equal(files.get("first-post.md"), "# First\n\nCafé.\n");
  assert.equal(files.get("second-post.md"), "# Second\n");
});

test("an empty selection still produces a valid archive", async () => {
  const zip = await createZip([]);
  assert.equal(readZipEntries(zip).size, 0);

  const tarGz = await createTarGz([]);
  assert.equal(readTarEntries(gunzipSync(Buffer.from(tarGz))).size, 0);
});

test("entry names stay inside the ustar name field", () => {
  assert.equal(archiveEntryName("a post/slug", ".md"), "a-post-slug.md");
  assert.equal(archiveEntryName("", ".md"), "post.md");
  assert.equal(archiveEntryName("x".repeat(200), ".md").length, 100);
});
