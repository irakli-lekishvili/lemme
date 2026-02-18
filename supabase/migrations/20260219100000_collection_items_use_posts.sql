-- Switch collection_items from media to posts

DROP TABLE IF EXISTS collection_items;

CREATE TABLE collection_items (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, post_id)
);

CREATE INDEX collection_items_collection_id_idx ON collection_items (collection_id, position);

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collection items are publicly readable"
  ON collection_items FOR SELECT USING (true);
