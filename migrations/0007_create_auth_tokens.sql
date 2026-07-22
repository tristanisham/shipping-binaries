CREATE TABLE auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('invite', 'password_reset')),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

CREATE UNIQUE INDEX auth_tokens_token_hash_unique
ON auth_tokens (token_hash);

CREATE INDEX auth_tokens_user_purpose_index
ON auth_tokens (user_id, purpose, created_at DESC);

CREATE INDEX auth_tokens_expires_at_index
ON auth_tokens (expires_at);
