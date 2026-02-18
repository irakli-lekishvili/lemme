-- ============================================================
-- AI-tagged media content: schema + vector similarity support
-- Stores imported media with CLIP embeddings and normalized tags
-- ============================================================

-- pgvector is enabled by default on Supabase Cloud.
-- For local dev: ensure supabase/config.toml enables it, or run:
--   CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- media: primary table for AI-tagged imported content
-- id is TEXT to preserve original IDs from the SQLite source
-- ============================================================
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  thumbnail_url TEXT,
  media_url TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- media_tags: normalized AI-generated tags per media item
-- AI tag categories: hair, ethnicity, style, body, setting,
--   clothing, pose, expression, scene, content, age_style
-- One row per (media_id, category, value) — allows multi-value
-- ============================================================
CREATE TABLE media_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  tag_category TEXT NOT NULL,
  tag_value TEXT NOT NULL,
  UNIQUE (media_id, tag_category, tag_value)
);

-- ============================================================
-- media_embeddings: 512-dim CLIP vectors for similarity search
-- ============================================================
CREATE TABLE media_embeddings (
  media_id TEXT PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
  embedding vector(512) NOT NULL
);

-- ============================================================
-- Indexes
-- ============================================================

-- Feed ordering (primary sort key)
CREATE INDEX media_created_at_idx ON media (created_at DESC, id);

-- Tag lookups
CREATE INDEX media_tags_media_id_idx ON media_tags (media_id);
CREATE INDEX media_tags_value_idx ON media_tags (tag_value);
CREATE INDEX media_tags_cat_val_idx ON media_tags (tag_category, tag_value);

-- HNSW index for fast approximate nearest-neighbour search
-- m=16, ef_construction=64 are good defaults for ~1k–100k rows
CREATE INDEX media_embeddings_hnsw_idx ON media_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- Row Level Security
-- Public read; all writes go through the service-role client
-- ============================================================
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media is publicly readable"
  ON media FOR SELECT USING (true);

CREATE POLICY "Media tags are publicly readable"
  ON media_tags FOR SELECT USING (true);

CREATE POLICY "Media embeddings are publicly readable"
  ON media_embeddings FOR SELECT USING (true);

-- ============================================================
-- Function: filter_media_by_tags
-- Returns media IDs that have ALL of the requested tag values
-- (AND logic across tag_value, ignoring category)
-- ============================================================
CREATE OR REPLACE FUNCTION filter_media_by_tags(tag_values TEXT[])
RETURNS TABLE (id TEXT)
LANGUAGE sql STABLE
AS $$
  SELECT media_id AS id
  FROM media_tags
  WHERE tag_value = ANY(tag_values)
  GROUP BY media_id
  HAVING COUNT(DISTINCT tag_value) = array_length(tag_values, 1);
$$;

-- ============================================================
-- Function: find_similar_media
-- Cosine similarity via CLIP embeddings (pgvector <=> operator)
-- Returns items ordered by similarity descending
-- ============================================================
CREATE OR REPLACE FUNCTION find_similar_media(
  query_media_id TEXT,
  match_limit INT DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  media_type TEXT,
  thumbnail_url TEXT,
  media_url TEXT,
  title TEXT,
  created_at TIMESTAMPTZ,
  similarity FLOAT8
)
LANGUAGE sql STABLE
AS $$
  SELECT
    m.id,
    m.media_type,
    m.thumbnail_url,
    m.media_url,
    m.title,
    m.created_at,
    1 - (me.embedding <=> qe.embedding) AS similarity
  FROM media m
  JOIN media_embeddings me ON m.id = me.media_id
  CROSS JOIN (
    SELECT embedding FROM media_embeddings WHERE media_id = query_media_id
  ) qe
  WHERE m.id != query_media_id
  ORDER BY me.embedding <=> qe.embedding
  LIMIT match_limit;
$$;

-- ============================================================
-- Function: get_tag_counts
-- Returns each (category, value) pair with its occurrence count
-- Used by the /api/tag-categories endpoint for filter UI
-- ============================================================
CREATE OR REPLACE FUNCTION get_tag_counts()
RETURNS TABLE (tag_category TEXT, tag_value TEXT, count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT tag_category, tag_value, COUNT(*) AS count
  FROM media_tags
  GROUP BY tag_category, tag_value
  ORDER BY tag_category, count DESC;
$$;
