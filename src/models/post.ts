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
  created_at: post.createdAt,
  updated_at: post.updatedAt,
});

export const getPostById = async (
  db: D1Database,
  postId: number,
): Promise<Post | null> => {
  const row = await db
    .prepare(
      `SELECT id, user_id, draft, title, description, keywords, image,
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
      `SELECT id, user_id, draft, title, description, keywords, image,
              created_at, updated_at
       FROM posts
       WHERE user_id = ?1
       ORDER BY created_at DESC, id DESC`,
    )
    .bind(userId)
    .all<PostRow>();

  return result.results.map((row) => postFromRow(row));
};
