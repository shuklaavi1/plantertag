-- SQL script to set up database schema for Palamu Tiger Reserve (PTR) Tree Tracker
-- Safe to re-run on existing databases (idempotent)

-- ============================================================
-- 1. Create tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trees (
  id integer PRIMARY KEY,
  planter_name text NOT NULL,
  species text NOT NULL,
  planted_date date NOT NULL,
  main_photo_url text,
  latitude numeric,
  longitude numeric,
  status text DEFAULT 'Healthy' CHECK (status IN ('Healthy', 'Needs Attention', 'Dead')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tree_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id integer REFERENCES public.trees(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('photo', 'visit')),
  photo_url text,
  note text,
  log_latitude numeric,
  log_longitude numeric,
  staff_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  -- Enforce that every photo log must have a photo_url
  CONSTRAINT photo_requires_url CHECK (type != 'photo' OR photo_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS tree_logs_tree_id_idx ON public.tree_logs (tree_id);

-- ============================================================
-- 2. Idempotently add columns (safe re-runs on existing DBs)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='trees' AND column_name='status'
  ) THEN
    ALTER TABLE public.trees ADD COLUMN status text DEFAULT 'Healthy'
      CHECK (status IN ('Healthy', 'Needs Attention', 'Dead'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='tree_logs' AND column_name='log_latitude'
  ) THEN
    ALTER TABLE public.tree_logs ADD COLUMN log_latitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='tree_logs' AND column_name='log_longitude'
  ) THEN
    ALTER TABLE public.tree_logs ADD COLUMN log_longitude numeric;
  END IF;
END $$;

-- ============================================================
-- 3. Data integrity fixes  (run on existing databases)
--    Safe to re-run — UPDATE affects 0 rows if already clean
-- ============================================================

-- Fix 1: photo logs that were seeded without a photo_url → demote to visit type
--   (these show as "Growth Photo" in the timeline but have no image, causing blank cards)
UPDATE public.tree_logs
SET type = 'visit'
WHERE type = 'photo' AND photo_url IS NULL;

-- Fix 2: remove placeholder/test URLs (placehold.co) that cause Next.js Image 400 errors
--   Demote these to visit logs so the note is preserved but no broken image renders
UPDATE public.tree_logs
SET type = 'visit', photo_url = NULL
WHERE photo_url LIKE '%placehold.co%';

-- Fix 3: add the constraint to the existing table if it was created without it
ALTER TABLE public.tree_logs
  DROP CONSTRAINT IF EXISTS photo_requires_url;
ALTER TABLE public.tree_logs
  ADD CONSTRAINT photo_requires_url
  CHECK (type != 'photo' OR photo_url IS NOT NULL);

-- ============================================================
-- 4. Row Level Security
-- ============================================================

ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

DROP POLICY IF EXISTS "Allow public read trees" ON public.trees;
DROP POLICY IF EXISTS "Allow authenticated insert trees" ON public.trees;
DROP POLICY IF EXISTS "Allow authenticated update trees" ON public.trees;
DROP POLICY IF EXISTS "Allow public read tree_logs" ON public.tree_logs;
DROP POLICY IF EXISTS "Allow authenticated insert tree_logs" ON public.tree_logs;
DROP POLICY IF EXISTS "Allow authenticated update tree_logs" ON public.tree_logs;

-- Trees: anyone can read; only authenticated staff can write
CREATE POLICY "Allow public read trees" ON public.trees
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert trees" ON public.trees
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update trees" ON public.trees
  FOR UPDATE TO authenticated WITH CHECK (true);

-- Tree logs: anyone can read; only authenticated staff can insert or correct entries
CREATE POLICY "Allow public read tree_logs" ON public.tree_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert tree_logs" ON public.tree_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allows staff to correct a log they submitted (e.g. fix a note or type)
CREATE POLICY "Allow authenticated update tree_logs" ON public.tree_logs
  FOR UPDATE TO authenticated WITH CHECK (true);

-- ============================================================
-- 6. Storage bucket: tree-photos
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('tree-photos', 'tree-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read tree-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload tree-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete tree-photos" ON storage.objects;

CREATE POLICY "Allow public read tree-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tree-photos');

CREATE POLICY "Allow authenticated upload tree-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tree-photos');

-- Allows staff to remove a photo they uploaded by mistake
CREATE POLICY "Allow authenticated delete tree-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tree-photos');

-- ============================================================
-- 7. Seed 50 Trees  (ON CONFLICT DO NOTHING — safe to re-run)
-- ============================================================

INSERT INTO public.trees (id, planter_name, species, planted_date, main_photo_url, latitude, longitude, status) VALUES
(1,  'Birsa Oraon',     'Sal (Shorea robusta)',           '2026-06-25', '/demo/tree_mature.png',  23.85412, 84.12345, 'Healthy'),
(2,  'Karmi Munda',     'Mahua (Madhuca longifolia)',     '2026-06-25', '/demo/tree_mature.png',  23.86125, 84.13560, 'Healthy'),
(3,  'Sukhram Ho',      'Arjun (Terminalia arjuna)',      '2026-06-25', '/demo/tree_growing.png', 23.84234, 84.11234, 'Healthy'),
(4,  'Phulo Soren',     'Neem (Azadirachta indica)',      '2026-06-25', '/demo/tree_sapling.png', 23.87112, 84.14876, 'Healthy'),
(5,  'Lakhiram Tudu',   'Teak (Tectona grandis)',         '2026-06-25', '/demo/tree_growing.png', 23.85900, 84.12990, 'Healthy'),
(6,  'Ramesh Oraon',    'Semal (Bombax ceiba)',           '2026-03-10', '/demo/tree_mature.png',  23.85500, 84.12500, 'Healthy'),
(7,  'Sita Devi',       'Jamun (Syzygium cumini)',        '2026-03-12', '/demo/tree_growing.png', 23.85610, 84.12610, 'Healthy'),
(8,  'Sunil Munda',     'Bel (Aegle marmelos)',           '2026-03-15', '/demo/tree_sapling.png', 23.85720, 84.12720, 'Needs Attention'),
(9,  'Gita Kisku',      'Karanj (Millettia pinnata)',     '2026-03-18', '/demo/tree_growing.png', 23.85830, 84.12830, 'Healthy'),
(10, 'Anil Hembrom',    'Bamboo (Dendrocalamus strictus)','2026-03-20', '/demo/tree_mature.png',  23.85940, 84.12940, 'Healthy'),
(11, 'Rajesh Oraon',    'Sal (Shorea robusta)',           '2026-04-01', '/demo/tree_growing.png', 23.86050, 84.13050, 'Healthy'),
(12, 'Meena Munda',     'Mahua (Madhuca longifolia)',     '2026-04-03', '/demo/tree_mature.png',  23.86160, 84.13160, 'Healthy'),
(13, 'Suman Ho',        'Arjun (Terminalia arjuna)',      '2026-04-05', '/demo/tree_sapling.png', 23.86270, 84.13270, 'Healthy'),
(14, 'Sanjay Soren',    'Neem (Azadirachta indica)',      '2026-04-08', '/demo/tree_growing.png', 23.86380, 84.13380, 'Healthy'),
(15, 'Asha Tudu',       'Teak (Tectona grandis)',         '2026-04-10', '/demo/tree_mature.png',  23.86490, 84.13490, 'Healthy'),
(16, 'Vijay Oraon',     'Semal (Bombax ceiba)',           '2026-04-15', '/demo/tree_sapling.png', 23.86600, 84.13600, 'Dead'),
(17, 'Puja Devi',       'Jamun (Syzygium cumini)',        '2026-04-18', '/demo/tree_growing.png', 23.86710, 84.13710, 'Healthy'),
(18, 'Santosh Munda',   'Bel (Aegle marmelos)',           '2026-04-20', '/demo/tree_mature.png',  23.86820, 84.13820, 'Healthy'),
(19, 'Sunita Kisku',    'Karanj (Millettia pinnata)',     '2026-04-22', '/demo/tree_sapling.png', 23.86930, 84.13930, 'Healthy'),
(20, 'Amit Hembrom',    'Bamboo (Dendrocalamus strictus)','2026-04-25', '/demo/tree_growing.png', 23.87040, 84.14040, 'Healthy'),
(21, 'Kiran Oraon',     'Sal (Shorea robusta)',           '2026-05-01', '/demo/tree_mature.png',  23.87150, 84.14150, 'Healthy'),
(22, 'Sanjay Munda',    'Mahua (Madhuca longifolia)',     '2026-05-03', '/demo/tree_growing.png', 23.87260, 84.14260, 'Needs Attention'),
(23, 'Jyoti Ho',        'Arjun (Terminalia arjuna)',      '2026-05-05', '/demo/tree_sapling.png', 23.87370, 84.14370, 'Healthy'),
(24, 'Rakesh Soren',    'Neem (Azadirachta indica)',      '2026-05-08', '/demo/tree_growing.png', 23.87480, 84.14480, 'Healthy'),
(25, 'Priyanka Tudu',   'Teak (Tectona grandis)',         '2026-05-10', '/demo/tree_mature.png',  23.87590, 84.14590, 'Healthy'),
(26, 'Suresh Oraon',    'Semal (Bombax ceiba)',           '2026-05-12', '/demo/tree_sapling.png', 23.87700, 84.14700, 'Healthy'),
(27, 'Kavita Devi',     'Jamun (Syzygium cumini)',        '2026-05-15', '/demo/tree_growing.png', 23.87810, 84.14810, 'Healthy'),
(28, 'Manoj Munda',     'Bel (Aegle marmelos)',           '2026-05-18', '/demo/tree_mature.png',  23.87920, 84.14920, 'Healthy'),
(29, 'Babita Kisku',    'Karanj (Millettia pinnata)',     '2026-05-20', '/demo/tree_sapling.png', 23.88030, 84.15030, 'Healthy'),
(30, 'Deepak Hembrom',  'Bamboo (Dendrocalamus strictus)','2026-05-22', '/demo/tree_growing.png', 23.88140, 84.15140, 'Healthy'),
(31, 'Lalita Oraon',    'Sal (Shorea robusta)',           '2026-05-25', '/demo/tree_mature.png',  23.88250, 84.15250, 'Healthy'),
(32, 'Vikram Munda',    'Mahua (Madhuca longifolia)',     '2026-05-28', '/demo/tree_growing.png', 23.88360, 84.15360, 'Healthy'),
(33, 'Rupa Ho',         'Arjun (Terminalia arjuna)',      '2026-06-01', '/demo/tree_sapling.png', 23.88470, 84.15470, 'Healthy'),
(34, 'Ajay Soren',      'Neem (Azadirachta indica)',      '2026-06-03', '/demo/tree_growing.png', 23.88580, 84.15580, 'Healthy'),
(35, 'Nisha Tudu',      'Teak (Tectona grandis)',         '2026-06-05', '/demo/tree_mature.png',  23.88690, 84.15690, 'Healthy'),
(36, 'Manish Oraon',    'Semal (Bombax ceiba)',           '2026-06-08', '/demo/tree_sapling.png', 23.88800, 84.15800, 'Healthy'),
(37, 'Soni Devi',       'Jamun (Syzygium cumini)',        '2026-06-10', '/demo/tree_growing.png', 23.88910, 84.15910, 'Healthy'),
(38, 'Rajendra Munda',  'Bel (Aegle marmelos)',           '2026-06-12', '/demo/tree_mature.png',  23.89020, 84.16020, 'Needs Attention'),
(39, 'Poonam Kisku',    'Karanj (Millettia pinnata)',     '2026-06-15', '/demo/tree_sapling.png', 23.89130, 84.16130, 'Healthy'),
(40, 'Vinod Hembrom',   'Bamboo (Dendrocalamus strictus)','2026-06-18', '/demo/tree_growing.png', 23.89240, 84.16240, 'Healthy'),
(41, 'Aarti Oraon',     'Sal (Shorea robusta)',           '2026-06-20', '/demo/tree_mature.png',  23.89350, 84.16350, 'Healthy'),
(42, 'Dinesh Munda',    'Mahua (Madhuca longifolia)',     '2026-06-22', '/demo/tree_growing.png', 23.89460, 84.16460, 'Healthy'),
(43, 'Reena Ho',        'Arjun (Terminalia arjuna)',      '2026-06-23', '/demo/tree_sapling.png', 23.89570, 84.16570, 'Healthy'),
(44, 'Subhash Soren',   'Neem (Azadirachta indica)',      '2026-06-24', '/demo/tree_growing.png', 23.89680, 84.16680, 'Healthy'),
(45, 'Sapna Tudu',      'Teak (Tectona grandis)',         '2026-06-25', '/demo/tree_mature.png',  23.89790, 84.16790, 'Healthy'),
(46, 'Alok Oraon',      'Semal (Bombax ceiba)',           '2026-06-25', '/demo/tree_sapling.png', 23.89900, 84.16900, 'Healthy'),
(47, 'Kusum Devi',      'Jamun (Syzygium cumini)',        '2026-06-25', '/demo/tree_growing.png', 23.90010, 84.17010, 'Healthy'),
(48, 'Pankaj Munda',    'Bel (Aegle marmelos)',           '2026-06-25', '/demo/tree_mature.png',  23.90120, 84.17120, 'Healthy'),
(49, 'Champa Kisku',    'Karanj (Millettia pinnata)',     '2026-06-25', '/demo/tree_sapling.png', 23.90230, 84.17230, 'Healthy'),
(50, 'Sanjay Hembrom',  'Bamboo (Dendrocalamus strictus)','2026-06-25', '/demo/tree_growing.png', 23.90340, 84.17340, 'Healthy')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. Seed sample logs for Trees 1 & 2
--    Photo logs now include photo_url to satisfy the constraint
-- ============================================================

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 1, 'visit', 'Initial base fertilization complete.', 'Ramesh Kerketta', now() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 1 AND note LIKE '%fertilization%');

INSERT INTO public.tree_logs (tree_id, type, photo_url, note, staff_name, created_at)
SELECT 1, 'photo', '/demo/tree_sapling.png', 'Planting day snapshot.', 'Sunita Tigga', now() - INTERVAL '1 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 1 AND type = 'photo');

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 1, 'visit', 'Watered in the evening, soil moisture verified.', 'Ajay Lakra', now() - INTERVAL '12 hours'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 1 AND note LIKE '%soil moisture%');

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 1, 'visit', 'Checked trunk health. Clear.', 'Poonam Minz', now()
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 1 AND note LIKE '%trunk health%');

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 2, 'visit', 'Soil aerated and watered.', 'Sunita Tigga', now() - INTERVAL '3 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 2 AND note LIKE '%aerated%');

INSERT INTO public.tree_logs (tree_id, type, photo_url, note, staff_name, created_at)
SELECT 2, 'photo', '/demo/tree_growing.png', 'Initial health checkup photo.', 'Ajay Lakra', now() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 2 AND type = 'photo');

INSERT INTO public.tree_logs (tree_id, type, note, staff_name, created_at)
SELECT 2, 'visit', 'Evening checking. Watering complete.', 'Deepak Toppo', now() - INTERVAL '1 days'
WHERE NOT EXISTS (SELECT 1 FROM public.tree_logs WHERE tree_id = 2 AND note LIKE '%Evening checking%');
