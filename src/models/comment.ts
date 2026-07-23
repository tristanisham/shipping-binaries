export interface BlogComment {
  id: number;
  postId: number;
  parentId: number | null;
  userId: number | null;
  authorUsername: string | null;
  displayName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  children: readonly BlogComment[];
}

export interface CommentRow {
  id: number;
  post_id: number;
  parent_id: number | null;
  user_id: number | null;
  author: string;
  author_username: string | null;
  author_label: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

type MutableBlogComment = Omit<BlogComment, "children"> & {
  children: MutableBlogComment[];
};

export const commentFromRow = (row: CommentRow): MutableBlogComment => ({
  id: row.id,
  postId: row.post_id,
  parentId: row.parent_id,
  userId: row.user_id,
  authorUsername: row.author_username,
  displayName: row.author_label ?? row.author_username ?? row.author,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  children: [],
});

export const commentsFromRows = (
  rows: readonly CommentRow[],
): readonly BlogComment[] => {
  const comments = new Map<number, MutableBlogComment>();
  const orderedRows = [...rows].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  for (const row of orderedRows) {
    comments.set(row.id, commentFromRow(row));
  }

  const roots: MutableBlogComment[] = [];

  for (const comment of comments.values()) {
    if (comment.parentId === null) {
      roots.push(comment);
      continue;
    }

    const parent = comments.get(comment.parentId);

    if (!parent || parent.postId !== comment.postId) {
      roots.push(comment);
      continue;
    }

    parent.children.push(comment);
  }

  return roots;
};

export const getCommentsForPost = async (
  db: D1Database,
  postId: number,
): Promise<readonly BlogComment[]> => {
  const result = await db
    .prepare(
      `SELECT comments.id, comments.post_id, comments.parent_id,
              comments.user_id, comments.author, comments.content,
              comments.created_at, comments.updated_at,
              users.username AS author_username,
              users.label AS author_label
       FROM comments
       LEFT JOIN users ON users.id = comments.user_id
       WHERE comments.post_id = ?1
       ORDER BY comments.created_at ASC, comments.id ASC`,
    )
    .bind(postId)
    .all<CommentRow>();

  return commentsFromRows(result.results);
};

export const createComment = async (
  db: D1Database,
  input: {
    postId: number;
    parentId?: number | null;
    userId: number;
    content: string;
  },
): Promise<number | null> => {
  const result = await db
    .prepare(
      `INSERT INTO comments (post_id, parent_id, user_id, author, content)
       SELECT ?1, ?2, users.id, users.username, ?4
       FROM users
       WHERE users.id = ?3
         AND (
           ?2 IS NULL
           OR EXISTS (
             SELECT 1
             FROM comments AS parent
             WHERE parent.id = ?2 AND parent.post_id = ?1
           )
         )`,
    )
    .bind(
      input.postId,
      input.parentId ?? null,
      input.userId,
      input.content,
    )
    .run();

  return result.meta.changes > 0 ? result.meta.last_row_id : null;
};
