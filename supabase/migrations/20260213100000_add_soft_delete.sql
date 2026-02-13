-- Add soft delete column to posts
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering out deleted posts
CREATE INDEX posts_deleted_at_idx ON posts(deleted_at) WHERE deleted_at IS NULL;

-- Update the public-facing SELECT policy to exclude soft-deleted posts
DROP POLICY "Posts are viewable by everyone" ON posts;

CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (deleted_at IS NULL);
