// TODO(auth): Decide how public commenters authenticate before adding comment mutation routes.
export interface BlogComment {
  id: number;
  postId: number;
  parentId: number | null;
  author: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  children: readonly BlogComment[];
}

export interface CommentRow {
  id: number;
  post_id: number;
  parent_id: number | null;
  author: string;
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
  author: row.author,
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
    a.created_at.localeCompare(b.created_at),
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
      `SELECT id, post_id, parent_id, author, content, created_at, updated_at
       FROM comments
       WHERE post_id = ?1
       ORDER BY created_at ASC, id ASC`,
    )
    .bind(postId)
    .all<CommentRow>();

  return commentsFromRows(result.results);
};
