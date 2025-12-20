-- Create post_images table for grouped images
CREATE TABLE post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Cloudflare image ID
  position INTEGER NOT NULL DEFAULT 0, -- Order within the group
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX post_images_post_id_idx ON post_images(post_id);
CREATE INDEX post_images_position_idx ON post_images(post_id, position);

-- Enable Row Level Security
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_images
CREATE POLICY "Post images are viewable by everyone" ON post_images
  FOR SELECT USING (true);

CREATE POLICY "Users can insert images to their own posts" ON post_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update images of their own posts" ON post_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images of their own posts" ON post_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_images.post_id
      AND posts.user_id = auth.uid()
    )
  );
