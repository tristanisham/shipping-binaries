ALTER TABLE posts ADD COLUMN slug TEXT;

UPDATE posts
SET slug = 'post-' || id
WHERE slug IS NULL OR trim(slug) = '';

CREATE UNIQUE INDEX posts_slug_unique ON posts (slug);
