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

-- Preserve the intent of any roles that were assigned the earlier broad
-- management permissions.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT role_permissions.role_id, granular.id
FROM role_permissions
JOIN permissions AS legacy
  ON legacy.id = role_permissions.permission_id
JOIN permissions AS granular
  ON granular.name IN (
    'posts:create',
    'posts:read',
    'posts:update',
    'posts:delete'
  )
WHERE legacy.name = 'posts:manage';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT role_permissions.role_id, granular.id
FROM role_permissions
JOIN permissions AS legacy
  ON legacy.id = role_permissions.permission_id
JOIN permissions AS granular
  ON granular.name IN (
    'users:create',
    'users:read',
    'users:update',
    'users:delete'
  )
WHERE legacy.name = 'users:manage';

-- The built-in admin role starts with every granular capability.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'admin'
  AND (
    permissions.name LIKE 'posts:%'
    OR permissions.name LIKE 'comments:%'
    OR permissions.name LIKE 'users:%'
  );

DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id
  FROM permissions
  WHERE name IN (
    'dashboard:view',
    'posts:manage',
    'roles:manage',
    'users:manage'
  )
);

DELETE FROM permissions
WHERE name IN (
  'dashboard:view',
  'posts:manage',
  'roles:manage',
  'users:manage'
);
