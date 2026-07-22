import {
  getCommentsForPost,
  type BlogComment,
} from "./comment.js";

export interface Post {
  id: number;
  userId: number;
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

export interface PostRow {
  id: number;
  user_id: number;
  draft: 0 | 1;
  title: string;
  description: string;
  keywords: string;
  image: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export const postFromRow = (
  row: PostRow,
  comments: readonly BlogComment[] = [],
): Post => ({
  id: row.id,
  userId: row.user_id,
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

export const postToRow = (post: Post): PostRow => ({
  id: post.id,
  user_id: post.userId,
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
      `SELECT id, user_id, draft, title, description, keywords, image, body,
              created_at, updated_at
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
      `SELECT id, user_id, draft, title, description, keywords, image, body,
              created_at, updated_at
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

export interface PostListItem {
  id: number;
  userId: number;
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
      `SELECT p.id, p.user_id, u.username AS author_username, p.draft,
              p.title, p.description, p.created_at, p.updated_at
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC, p.id DESC`,
    )
    .all<PostListRow>();

  return result.results.map((row) => ({
    id: row.id,
    userId: row.user_id,
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
      `INSERT INTO posts (user_id, draft, title, description, keywords, image, body)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      input.userId,
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
       SET draft = ?2, title = ?3, description = ?4, keywords = ?5,
           image = ?6, body = ?7, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(
      id,
      input.draft ? 1 : 0,
      input.title,
      input.description,
      JSON.stringify(input.keywords),
      input.image,
      input.body,
    )
    .run();
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
