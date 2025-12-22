-- Remove existing default categories
DELETE FROM categories;

-- Insert new categories
INSERT INTO categories (name, slug, icon, color) VALUES
  -- Style
  ('Photorealistic', 'photorealistic', 'camera', '#6366f1'),
  ('Anime', 'anime', 'star', '#ec4899'),
  ('Illustrated', 'illustrated', 'pencil', '#f97316'),
  ('Hentai', 'hentai', 'flame', '#ef4444'),
  ('Semi-realistic', 'semi-realistic', 'blend', '#8b5cf6'),

  -- Subject
  ('Solo', 'solo', 'user', '#22c55e'),
  ('Couple', 'couple', 'heart', '#e85d75'),
  ('Threesome', 'threesome', 'users', '#a855f7'),
  ('Group/Gangbang', 'group-gangbang', 'users', '#7c3aed'),
  ('Lesbian', 'lesbian', 'heart', '#f472b6'),
  ('Gay', 'gay', 'heart', '#3b82f6'),

  -- Action
  ('Blowjob', 'blowjob', 'circle', '#f59e0b'),
  ('Anal', 'anal', 'circle', '#ef4444'),
  ('Creampie', 'creampie', 'droplet', '#fbbf24'),
  ('Facial', 'facial', 'droplet', '#fcd34d'),
  ('Hardcore', 'hardcore', 'zap', '#dc2626'),
  ('Softcore', 'softcore', 'feather', '#fb7185'),
  ('POV', 'pov', 'eye', '#0ea5e9'),
  ('Bondage/BDSM', 'bondage-bdsm', 'link', '#991b1b'),
  ('Masturbation', 'masturbation', 'hand', '#f472b6'),
  ('Handjob', 'handjob', 'hand', '#fbbf24'),
  ('Titjob', 'titjob', 'circle', '#f9a8d4'),
  ('Footjob', 'footjob', 'footprints', '#a78bfa'),

  -- Scenario/Roleplay
  ('Stepmom', 'stepmom', 'home', '#b45309'),
  ('Stepdaughter', 'stepdaughter', 'home', '#d97706'),
  ('Stepsis', 'stepsis', 'home', '#f59e0b'),
  ('Hotwife', 'hotwife', 'flame', '#ef4444'),
  ('Cuckold', 'cuckold', 'eye', '#64748b'),
  ('Cheating', 'cheating', 'eye-off', '#78716c'),
  ('Boss/Secretary', 'boss-secretary', 'briefcase', '#475569'),
  ('Teacher/Student', 'teacher-student', 'book', '#7c3aed'),
  ('Doctor/Nurse', 'doctor-nurse', 'activity', '#14b8a6'),
  ('Maid', 'maid', 'home', '#0d9488'),
  ('Babysitter', 'babysitter', 'baby', '#f472b6'),
  ('Neighbor', 'neighbor', 'home', '#84cc16'),
  ('Massage', 'massage', 'hand', '#a855f7'),
  ('Casting', 'casting', 'video', '#6366f1'),
  ('Office', 'office', 'briefcase', '#64748b'),
  ('Gym', 'gym', 'dumbbell', '#22c55e'),

  -- Genre
  ('Fantasy', 'fantasy', 'sparkles', '#a855f7'),
  ('Cosplay', 'cosplay', 'mask', '#ec4899'),
  ('Furry', 'furry', 'cat', '#f97316'),
  ('Monster', 'monster', 'ghost', '#7c3aed'),
  ('Milf', 'milf', 'heart', '#e11d48'),
  ('Teen (18+)', 'teen-18', 'sparkle', '#f472b6'),
  ('Mature', 'mature', 'wine', '#b45309'),
  ('BBW', 'bbw', 'heart', '#f43f5e'),
  ('Petite', 'petite', 'minimize', '#fb7185'),
  ('Asian', 'asian', 'globe', '#eab308'),
  ('Ebony', 'ebony', 'globe', '#78350f'),
  ('Latina', 'latina', 'globe', '#ea580c'),
  ('Redhead', 'redhead', 'flame', '#dc2626');
