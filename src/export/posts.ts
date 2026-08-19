// Bulk post export: posts in, Markdown files in an archive out.

import { type Post } from "../models/post.js";
import { formatKeywords } from "../models/post.js";
import { postToMarkdown } from "../markdown/post-markdown.js";
import { normalizeEditorData } from "../views/components/admin/EditorJs.js";
import {
  type ArchiveEntry,
  archiveEntryName,
  createTarGz,
  createZip,
  encodeUtf8,
  TAR_GZ_CONTENT_TYPE,
  ZIP_CONTENT_TYPE,
} from "./archive.js";

export type PostExportFormat = "targz" | "zip";

// Who a bulk export covers: the signed-in user, every author, or the listed
// author ids. Only the admin role may ask for anything but "mine" — the route
// parses this from the query either way and then discards it for everyone
// else.
export type PostExportAuthors = "all" | "mine" | readonly number[];

export const parsePostExportAuthors = (value: unknown): PostExportAuthors => {
  if (value === "all") return "all";

  if (typeof value === "string" && value !== "" && value !== "mine") {
    const ids = [
      ...new Set(
        value
          .split(",")
          // Digits only. Number.parseInt would read "1e2" as 1 and select a
          // real author from input that was never an id.
          .filter((part) => /^\d+$/.test(part.trim()))
          .map((part) => Number.parseInt(part.trim(), 10))
          .filter((id) => id > 0),
      ),
    ];
    if (ids.length > 0) return ids;
  }

  // Absent, empty, or unparseable: the safe default.
  return "mine";
};

export const parsePostExportFormat = (value: unknown): PostExportFormat =>
  value === "targz" ? "targz" : "zip";

// Plain frontmatter Markdown: no base64 editor trailer, and the Obsidian
// flavor's `tags:` list rather than Bear's inline tag line.
export const postToExportMarkdown = (post: Post): string =>
  postToMarkdown({
    editor: normalizeEditorData(post.body),
    post: {
      description: post.description,
      draft: post.draft,
      image: post.image,
      keywords: formatKeywords(post.keywords),
      slug: post.slug,
      slugMode: "custom",
      title: post.title,
    },
  }, { flavor: "obsidian", includeEditorData: false });

export const postExportEntries = (
  posts: readonly Post[],
): ArchiveEntry[] => {
  const used = new Set<string>();

  return posts.map((post) => {
    const base = post.slug || `post-${post.id}`;
    let name = archiveEntryName(base, ".md");
    // Slugs are unique, but truncating a long one to the ustar name limit
    // could still collide.
    let suffix = 2;
    while (used.has(name)) {
      name = archiveEntryName(`${base}-${suffix}`, ".md");
      suffix += 1;
    }
    used.add(name);

    return { data: encodeUtf8(postToExportMarkdown(post)), name };
  });
};

export const postExportContentType = (format: PostExportFormat): string =>
  format === "targz" ? TAR_GZ_CONTENT_TYPE : ZIP_CONTENT_TYPE;

export const postExportFilename = (
  scope: string,
  format: PostExportFormat,
  now: Date = new Date(),
): string => {
  const day = now.toISOString().slice(0, 10);
  const extension = format === "targz" ? "tar.gz" : "zip";
  return `shipping-binaries-posts-${scope}-${day}.${extension}`;
};

export const createPostArchive = (
  entries: readonly ArchiveEntry[],
  format: PostExportFormat,
): Promise<Uint8Array> =>
  format === "targz" ? createTarGz(entries) : createZip(entries);
