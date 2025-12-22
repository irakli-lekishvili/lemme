-- Add media_type column to post_images table to support videos
-- Default to 'image' for backwards compatibility with existing records

-- Add media_type column
ALTER TABLE post_images ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image';

-- Add thumbnail_url for video thumbnails
ALTER TABLE post_images ADD COLUMN thumbnail_url TEXT;

-- Add constraint to ensure valid media types
ALTER TABLE post_images ADD CONSTRAINT valid_media_type
  CHECK (media_type IN ('image', 'video', 'gif'));

-- Add index for filtering by media type
CREATE INDEX post_images_media_type_idx ON post_images(media_type);

-- Also add media_type to the main posts table for cover media
ALTER TABLE posts ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image';
ALTER TABLE posts ADD COLUMN thumbnail_url TEXT;
ALTER TABLE posts ADD CONSTRAINT posts_valid_media_type
  CHECK (media_type IN ('image', 'video', 'gif'));
