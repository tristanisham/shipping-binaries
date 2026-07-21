CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  draft INTEGER NOT NULL DEFAULT 1 CHECK (draft IN (0, 1)),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]',
  image TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX posts_user_id_index ON posts (user_id);
CREATE INDEX posts_created_at_index ON posts (created_at DESC);

-- TODO(auth): Decide how public commenters authenticate before adding comment mutation routes.
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  parent_id INTEGER,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id, post_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id, post_id) REFERENCES comments(id, post_id) ON DELETE CASCADE
) STRICT;

CREATE INDEX comments_post_created_at_index
  ON comments (post_id, created_at ASC);

CREATE INDEX comments_parent_id_index ON comments (parent_id);
