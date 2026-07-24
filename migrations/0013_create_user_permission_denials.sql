CREATE TABLE IF NOT EXISTS user_permission_denials (
  user_id       INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS user_permission_denials_user_id_index
  ON user_permission_denials(user_id);
