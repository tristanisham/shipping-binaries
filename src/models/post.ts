export interface Post {
  id: number;
  draft: boolean;
  title: string;
  description: string;
  keywords: string[];
  image: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostRow {
  id: number;
  draft: 0 | 1;
  title: string;
  description: string;
  keywords: string;
  image: string;
  created_at: string;
  updated_at: string;
}

export const postFromRow = (row: PostRow): Post => ({
  id: row.id,
  draft: row.draft === 1,
  title: row.title,
  description: row.description,
  keywords: JSON.parse(row.keywords) as string[],
  image: row.image,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const postToRow = (post: Post): PostRow => ({
  id: post.id,
  draft: post.draft ? 1 : 0,
  title: post.title,
  description: post.description,
  keywords: JSON.stringify(post.keywords),
  image: post.image,
  created_at: post.createdAt,
  updated_at: post.updatedAt,
});
