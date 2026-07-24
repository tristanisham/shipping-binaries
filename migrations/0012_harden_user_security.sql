CREATE TRIGGER users_login_identifier_collision_insert
BEFORE INSERT ON users
WHEN EXISTS (
  SELECT 1
  FROM users
  WHERE email = NEW.username
     OR username = NEW.email
)
BEGIN
  SELECT RAISE(ABORT, 'login identifier collision');
END;

CREATE TRIGGER users_login_identifier_collision_update
BEFORE UPDATE OF email, username ON users
WHEN EXISTS (
  SELECT 1
  FROM users
  WHERE id != NEW.id
    AND (
      email = NEW.username
      OR username = NEW.email
    )
)
BEGIN
  SELECT RAISE(ABORT, 'login identifier collision');
END;

CREATE TRIGGER users_keep_last_active_admin
BEFORE UPDATE OF active ON users
WHEN OLD.active = 1
  AND NEW.active = 0
  AND EXISTS (
    SELECT 1
    FROM user_roles
    JOIN roles ON roles.id = user_roles.role_id
    WHERE user_roles.user_id = OLD.id
      AND roles.name = 'admin'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM users
    JOIN user_roles ON user_roles.user_id = users.id
    JOIN roles ON roles.id = user_roles.role_id
    WHERE users.id != OLD.id
      AND users.active = 1
      AND roles.name = 'admin'
  )
BEGIN
  SELECT RAISE(ABORT, 'cannot deactivate last active admin');
END;
