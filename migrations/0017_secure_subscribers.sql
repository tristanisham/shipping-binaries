ALTER TABLE subscribers
  ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE subscribers ADD COLUMN confirmation_token_hash TEXT;
ALTER TABLE subscribers ADD COLUMN confirmation_expires_at TEXT;
ALTER TABLE subscribers ADD COLUMN confirmation_sent_at TEXT;
ALTER TABLE subscribers ADD COLUMN confirmed_at TEXT;
ALTER TABLE subscribers ADD COLUMN unsubscribed_at TEXT;

-- Before verification state existed, the route only allowed a subscriber row
-- that matched a user email when that user was signed in. Preserve those as
-- confirmed and linked; anonymous legacy rows remain pending and must request
-- a fresh confirmation.
UPDATE subscribers
SET user_id = (
      SELECT users.id
      FROM users
      WHERE users.email = subscribers.email
    ),
    confirmed_at = created_at
WHERE EXISTS (
  SELECT 1
  FROM users
  WHERE users.email = subscribers.email
);

CREATE UNIQUE INDEX subscribers_confirmation_token_unique
  ON subscribers (confirmation_token_hash)
  WHERE confirmation_token_hash IS NOT NULL;
CREATE INDEX subscribers_user_id_index ON subscribers (user_id);

-- A subscriber created before its matching account is attached when that
-- account is created. This keeps the relationship atomic with every user
-- creation path, including signup and admin invitations.
CREATE TRIGGER subscribers_attach_after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  UPDATE subscribers
  SET user_id = NEW.id,
      updated_at = CURRENT_TIMESTAMP
  WHERE email = NEW.email AND user_id IS NULL;
END;

-- A linked subscription follows the account's primary address. If that
-- address already has a subscriber row, the uniqueness constraint aborts the
-- account change rather than leaving two contradictory subscription records.
CREATE TRIGGER subscribers_follow_user_email
AFTER UPDATE OF email ON users
FOR EACH ROW
WHEN NEW.email <> OLD.email
BEGIN
  UPDATE subscribers
  SET email = NEW.email,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = NEW.id AND email = OLD.email;

  UPDATE subscribers
  SET user_id = NEW.id,
      updated_at = CURRENT_TIMESTAMP
  WHERE email = NEW.email AND user_id IS NULL;
END;
