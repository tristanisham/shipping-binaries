-- Role/permission administration is reserved to the admin role itself (an
-- admin-role route guard), not delegatable through a permission. Remove the
-- roles:read / roles:update permissions introduced in 0012 so they no longer
-- linger in the role-permission assignment UI implying a delegation that the
-- routes no longer honor. FK CASCADE clears their role_permissions rows.
DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE name IN ('roles:read', 'roles:update')
);

DELETE FROM permissions WHERE name IN ('roles:read', 'roles:update');
