ALTER TABLE comments
ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX comments_user_id_index ON comments (user_id);
