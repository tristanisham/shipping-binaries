-- Represent the roles/permissions admin surface as first-class permissions so
-- access to it flows through the same RBAC checks as posts and users. (The
-- earlier coarse roles:manage permission was dropped in 0009; these granular
-- successors back the per-handler guards on the role-management routes.)
INSERT OR IGNORE INTO permissions (name) VALUES
  ('roles:read'),
  ('roles:update');

-- The built-in admin role holds every permission. Re-run the grant over all
-- permissions (including the two added above and any created through the admin
-- UI) so "admin can do everything" needs no special-casing in the app code.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.name = 'admin';
