-- Idempotently restore the fixed roles and permission grants. This is
-- intentionally additive so running it does not remove custom assignments.
INSERT OR IGNORE INTO roles (name) VALUES
  ('admin'),
  ('guest'),
  ('author'),
  ('editor');

INSERT OR IGNORE INTO permissions (name) VALUES
  ('posts:create'),
  ('posts:read'),
  ('posts:update'),
  ('posts:delete'),
  ('comments:create'),
  ('comments:read'),
  ('comments:update'),
  ('comments:delete'),
  ('users:create'),
  ('users:read'),
  ('users:update'),
  ('users:delete');

-- Admin receives every permission currently present, including custom
-- permissions created through the role-management UI.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'admin';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'author'
  AND permissions.name IN ('posts:create', 'posts:read');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'editor'
  AND permissions.name IN (
    'posts:create',
    'posts:read',
    'posts:update',
    'posts:delete'
  );
