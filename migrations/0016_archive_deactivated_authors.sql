-- Deactivating a user archives their posts rather than deleting them: the
-- posts leave every public listing, feed, and page, but stay in the database
-- and stay readable to anyone holding posts:view-archived. Admin holds every
-- permission; moderator is the role that exists to hold this one.
INSERT OR IGNORE INTO permissions (name) VALUES ('posts:view-archived');

INSERT OR IGNORE INTO roles (name) VALUES ('moderator');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'admin'
  AND permissions.name = 'posts:view-archived';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'moderator'
  AND permissions.name IN ('posts:read', 'posts:view-archived');
