-- ============================================================
-- Collections: curated groups of media items
-- ============================================================

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX collections_slug_idx ON collections (slug);
CREATE INDEX collections_created_at_idx ON collections (created_at DESC);

-- ============================================================
-- Collection items: maps media to collections with ordering
-- ============================================================

CREATE TABLE collection_items (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, media_id)
);

CREATE INDEX collection_items_collection_id_idx ON collection_items (collection_id, position);

-- ============================================================
-- Row Level Security
-- Public read; writes go through the service-role client
-- ============================================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections are publicly readable"
  ON collections FOR SELECT USING (true);

CREATE POLICY "Collection items are publicly readable"
  ON collection_items FOR SELECT USING (true);
