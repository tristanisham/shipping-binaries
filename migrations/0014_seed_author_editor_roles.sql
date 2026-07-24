INSERT OR IGNORE INTO roles (name) VALUES ('author'), ('editor');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'author'
  AND permissions.name IN ('posts:create', 'posts:read');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'editor'
  AND permissions.name IN
    ('posts:create', 'posts:read', 'posts:update', 'posts:delete');
