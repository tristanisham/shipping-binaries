CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE UNIQUE INDEX roles_name_unique ON roles (name);

INSERT INTO roles (name) VALUES ('admin');

CREATE TABLE user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX user_roles_role_id_index ON user_roles (role_id);

-- Grant the admin role to the existing owner (the earliest-created user), if
-- any user exists. Runs once per database the migration is applied to.
INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT (SELECT MIN(id) FROM users), (SELECT id FROM roles WHERE name = 'admin')
WHERE EXISTS (SELECT 1 FROM users);
