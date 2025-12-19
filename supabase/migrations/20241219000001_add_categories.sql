-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create post_categories junction table (many-to-many)
CREATE TABLE post_categories (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- Create indexes
CREATE INDEX post_categories_post_id_idx ON post_categories(post_id);
CREATE INDEX post_categories_category_id_idx ON post_categories(category_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;

-- Categories policies (read-only for all, admin can modify)
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

-- Post categories policies
CREATE POLICY "Post categories are viewable by everyone" ON post_categories
  FOR SELECT USING (true);

CREATE POLICY "Users can add categories to their own posts" ON post_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can remove categories from their own posts" ON post_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid())
  );

-- Insert default categories
INSERT INTO categories (name, slug, icon, color) VALUES
  ('Portrait', 'portrait', 'user', '#e85d75'),
  ('Landscape', 'landscape', 'mountain', '#22c55e'),
  ('Abstract', 'abstract', 'shapes', '#a855f7'),
  ('Fantasy', 'fantasy', 'sparkles', '#f59e0b'),
  ('Sci-Fi', 'sci-fi', 'rocket', '#3b82f6'),
  ('Anime', 'anime', 'star', '#ec4899'),
  ('Photorealistic', 'photorealistic', 'camera', '#6366f1'),
  ('Digital Art', 'digital-art', 'palette', '#14b8a6'),
  ('Concept Art', 'concept-art', 'lightbulb', '#f97316'),
  ('Character', 'character', 'users', '#8b5cf6'),
  ('Environment', 'environment', 'trees', '#10b981'),
  ('Architecture', 'architecture', 'building', '#64748b');
