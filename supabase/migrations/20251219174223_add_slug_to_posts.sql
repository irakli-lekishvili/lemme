-- Add short_id column for user-friendly URLs (8 char nanoid)
ALTER TABLE posts ADD COLUMN short_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_posts_short_id ON posts(short_id);
