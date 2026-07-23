import { type BlogComment, getCommentsForPost } from "./comment.js";

const POST_COLUMNS =
  "id, user_id, slug, draft, title, description, keywords, image, body, created_at, updated_at";
const QUALIFIED_POST_COLUMNS = POST_COLUMNS.split(", ")
  .map((column) => `posts.${column}`)
  .join(", ");

export interface Post {
  id: number;
  userId: number;
  slug: string;
  draft: boolean;
  title: string;
  description: string;
  keywords: string[];
  image: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  comments: readonly BlogComment[];
}

export interface PostWithAuthor extends Post {
  authorLabel: string | null;
  authorUsername: string;
}

export interface PostRow {
  id: number;
  user_id: number;
  slug: string;
  draft: 0 | 1;
  title: string;
  description: string;
  keywords: string;
  image: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface PostWithAuthorRow extends PostRow {
  author_label: string | null;
  author_username: string;
}

export const postFromRow = (
  row: PostRow,
  comments: readonly BlogComment[] = [],
): Post => ({
  id: row.id,
  userId: row.user_id,
  slug: row.slug,
  draft: row.draft === 1,
  title: row.title,
  description: row.description,
  keywords: JSON.parse(row.keywords) as string[],
  image: row.image,
  body: row.body,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  comments,
});

const postWithAuthorFromRow = (
  row: PostWithAuthorRow,
  comments: readonly BlogComment[] = [],
): PostWithAuthor => ({
  ...postFromRow(row, comments),
  authorLabel: row.author_label,
  authorUsername: row.author_username,
});

export const postToRow = (post: Post): PostRow => ({
  id: post.id,
  user_id: post.userId,
  slug: post.slug,
  draft: post.draft ? 1 : 0,
  title: post.title,
  description: post.description,
  keywords: JSON.stringify(post.keywords),
  image: post.image,
  body: post.body,
  created_at: post.createdAt,
  updated_at: post.updatedAt,
});

export const getPostById = async (
  db: D1Database,
  postId: number,
): Promise<Post | null> => {
  const row = await db
    .prepare(
      `SELECT ${POST_COLUMNS}
       FROM posts
       WHERE id = ?1
       LIMIT 1`,
    )
    .bind(postId)
    .first<PostRow>();

  if (!row) {
    return null;
  }

  const comments = await getCommentsForPost(db, postId);
  return postFromRow(row, comments);
};

export const getPostsForUser = async (
  db: D1Database,
  userId: number,
): Promise<readonly Post[]> => {
  const result = await db
    .prepare(
      `SELECT ${POST_COLUMNS}
       FROM posts
       WHERE user_id = ?1
       ORDER BY created_at DESC, id DESC`,
    )
    .bind(userId)
    .all<PostRow>();

  return result.results.map((row) => postFromRow(row));
};

export const parseKeywords = (input: string): string[] =>
  input
    .split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

export const formatKeywords = (keywords: readonly string[]): string =>
  keywords.join(", ");

export const MAX_POST_SLUG_LENGTH = 100;

export const formatSlug = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_POST_SLUG_LENGTH)
    .replace(/-+$/g, "");

export const validatePostSlug = (input: string): string | null => {
  if (input.length === 0) {
    return "Enter a slug or generate one from the title.";
  }

  if (input.length > MAX_POST_SLUG_LENGTH) {
    return `Keep the slug to ${MAX_POST_SLUG_LENGTH} characters or fewer.`;
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input)) {
    return "Use lowercase letters, numbers, and single hyphens only.";
  }

  return null;
};

export const getUniquePostSlug = async (
  db: D1Database,
  requestedSlug: string,
  currentPostId?: number,
): Promise<string> => {
  let candidate = requestedSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .prepare(
        `SELECT id
         FROM posts
         WHERE slug = ?1
         LIMIT 1`,
      )
      .bind(candidate)
      .first<{ id: number }>();

    if (!existing || existing.id === currentPostId) {
      return candidate;
    }

    const suffixText = `-${suffix}`;
    const availableBaseLength = MAX_POST_SLUG_LENGTH - suffixText.length;
    const availableBase = requestedSlug
      .slice(0, availableBaseLength)
      .replace(/-+$/g, "");
    candidate = `${availableBase}${suffixText}`;
    suffix += 1;
  }
};

export interface PostListItem {
  id: number;
  userId: number;
  slug: string;
  authorUsername: string;
  draft: boolean;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface PostListRow {
  id: number;
  user_id: number;
  slug: string;
  author_username: string;
  draft: 0 | 1;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export const getAllPosts = async (
  db: D1Database,
): Promise<readonly PostListItem[]> => {
  const result = await db
    .prepare(
      `SELECT p.id, p.user_id, p.slug, u.username AS author_username, p.draft,
              p.title, p.description, p.created_at, p.updated_at
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC, p.id DESC`,
    )
    .all<PostListRow>();

  return result.results.map((row) => ({
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    authorUsername: row.author_username,
    draft: row.draft === 1,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export interface CreatePostInput {
  userId: number;
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  image: string;
  body: string;
  draft: boolean;
}

export const createPost = async (
  db: D1Database,
  input: CreatePostInput,
): Promise<number> => {
  const result = await db
    .prepare(
      `INSERT INTO posts
         (user_id, slug, draft, title, description, keywords, image, body)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      input.userId,
      input.slug,
      input.draft ? 1 : 0,
      input.title,
      input.description,
      JSON.stringify(input.keywords),
      input.image,
      input.body,
    )
    .run();

  return result.meta.last_row_id;
};

export interface UpdatePostInput {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  image: string;
  body: string;
  draft: boolean;
}

export const updatePost = async (
  db: D1Database,
  id: number,
  input: UpdatePostInput,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE posts
       SET slug = ?2, draft = ?3, title = ?4, description = ?5, keywords = ?6,
           image = ?7, body = ?8, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(
      id,
      input.slug,
      input.draft ? 1 : 0,
      input.title,
      input.description,
      JSON.stringify(input.keywords),
      input.image,
      input.body,
    )
    .run();
};

export const getPublishedPosts = async (
  db: D1Database,
): Promise<readonly PostWithAuthor[]> => {
  const result = await db
    .prepare(
      `SELECT ${QUALIFIED_POST_COLUMNS},
              users.username AS author_username, users.label AS author_label
       FROM posts
       JOIN users ON users.id = posts.user_id
       WHERE posts.draft = 0
       ORDER BY posts.created_at DESC, posts.id DESC`,
    )
    .all<PostWithAuthorRow>();

  return result.results.map((row) => postWithAuthorFromRow(row));
};

export const getPublishedPostsForUser = async (
  db: D1Database,
  userId: number,
): Promise<readonly PostWithAuthor[]> => {
  const result = await db
    .prepare(
      `SELECT ${QUALIFIED_POST_COLUMNS},
              users.username AS author_username, users.label AS author_label
       FROM posts
       JOIN users ON users.id = posts.user_id
       WHERE posts.draft = 0 AND posts.user_id = ?1
       ORDER BY posts.created_at DESC, posts.id DESC`,
    )
    .bind(userId)
    .all<PostWithAuthorRow>();

  return result.results.map((row) => postWithAuthorFromRow(row));
};

export const getPublishedPostBySlug = async (
  db: D1Database,
  slug: string,
): Promise<PostWithAuthor | null> => {
  const row = await db
    .prepare(
      `SELECT ${QUALIFIED_POST_COLUMNS},
              users.username AS author_username, users.label AS author_label
       FROM posts
       JOIN users ON users.id = posts.user_id
       WHERE posts.slug = ?1 AND posts.draft = 0
       LIMIT 1`,
    )
    .bind(slug)
    .first<PostWithAuthorRow>();

  if (!row) {
    return null;
  }

  const comments = await getCommentsForPost(db, row.id);
  return postWithAuthorFromRow(row, comments);
};

// Resolves a published post's id and slug without loading its comment tree —
// for write paths (e.g. posting a comment) that only need the reference.
export const getPublishedPostRefBySlug = async (
  db: D1Database,
  slug: string,
): Promise<{ id: number; slug: string } | null> => {
  const row = await db
    .prepare("SELECT id, slug FROM posts WHERE slug = ?1 AND draft = 0 LIMIT 1")
    .bind(slug)
    .first<{ id: number; slug: string }>();

  return row ?? null;
};

export const setPostDraft = async (
  db: D1Database,
  id: number,
  draft: boolean,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE posts
       SET draft = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, draft ? 1 : 0)
    .run();
};
