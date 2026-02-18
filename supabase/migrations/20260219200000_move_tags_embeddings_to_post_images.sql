-- ============================================================
-- Move tags & embeddings from media to post_images
-- Drop the media tables entirely
-- ============================================================

-- pgvector must be available
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. Relax constraints on posts/post_images for imported content
-- ============================================================

ALTER TABLE posts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE posts ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE posts ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE post_images ALTER COLUMN storage_path DROP NOT NULL;

-- ============================================================
-- 2. Create post_image_tags
-- ============================================================

CREATE TABLE post_image_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_image_id UUID NOT NULL REFERENCES post_images(id) ON DELETE CASCADE,
  tag_category TEXT NOT NULL,
  tag_value TEXT NOT NULL,
  UNIQUE (post_image_id, tag_category, tag_value)
);

CREATE INDEX post_image_tags_post_image_id_idx ON post_image_tags (post_image_id);
CREATE INDEX post_image_tags_value_idx ON post_image_tags (tag_value);
CREATE INDEX post_image_tags_cat_val_idx ON post_image_tags (tag_category, tag_value);

-- ============================================================
-- 3. Create post_image_embeddings
-- ============================================================

CREATE TABLE post_image_embeddings (
  post_image_id UUID PRIMARY KEY REFERENCES post_images(id) ON DELETE CASCADE,
  embedding vector(512) NOT NULL
);

CREATE INDEX post_image_embeddings_hnsw_idx ON post_image_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- 4. RLS — public read, writes via service-role
-- ============================================================

ALTER TABLE post_image_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_image_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post image tags are publicly readable"
  ON post_image_tags FOR SELECT USING (true);

CREATE POLICY "Post image embeddings are publicly readable"
  ON post_image_embeddings FOR SELECT USING (true);

-- ============================================================
-- 5. Replace RPC functions
-- ============================================================

DROP FUNCTION IF EXISTS filter_media_by_tags(TEXT[]);
DROP FUNCTION IF EXISTS find_similar_media(TEXT, INT);
DROP FUNCTION IF EXISTS get_tag_counts();

-- Returns post_image IDs that match ALL requested tags (AND logic)
CREATE OR REPLACE FUNCTION filter_post_images_by_tags(tag_values TEXT[])
RETURNS TABLE (id UUID)
LANGUAGE sql STABLE
AS $$
  SELECT post_image_id AS id
  FROM post_image_tags
  WHERE tag_value = ANY(tag_values)
  GROUP BY post_image_id
  HAVING COUNT(DISTINCT tag_value) = array_length(tag_values, 1);
$$;

-- Cosine similarity search via CLIP embeddings
CREATE OR REPLACE FUNCTION find_similar_post_images(
  query_post_image_id UUID,
  match_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  image_url TEXT,
  media_type TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT8
)
LANGUAGE sql STABLE
AS $$
  SELECT
    pi.id,
    pi.post_id,
    pi.image_url,
    pi.media_type,
    pi.thumbnail_url,
    pi.created_at,
    1 - (pe.embedding <=> qe.embedding) AS similarity
  FROM post_images pi
  JOIN post_image_embeddings pe ON pi.id = pe.post_image_id
  CROSS JOIN (
    SELECT embedding FROM post_image_embeddings WHERE post_image_id = query_post_image_id
  ) qe
  WHERE pi.id != query_post_image_id
  ORDER BY pe.embedding <=> qe.embedding
  LIMIT match_limit;
$$;

-- Tag counts grouped by category
CREATE OR REPLACE FUNCTION get_post_image_tag_counts()
RETURNS TABLE (tag_category TEXT, tag_value TEXT, count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT tag_category, tag_value, COUNT(*) AS count
  FROM post_image_tags
  GROUP BY tag_category, tag_value
  ORDER BY tag_category, count DESC;
$$;

-- ============================================================
-- 6. Drop old media tables
-- ============================================================

DROP TABLE IF EXISTS media_embeddings CASCADE;
DROP TABLE IF EXISTS media_tags CASCADE;
DROP TABLE IF EXISTS media CASCADE;
