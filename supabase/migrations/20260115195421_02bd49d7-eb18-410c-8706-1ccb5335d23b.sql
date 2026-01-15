-- Drop storage policies for reels bucket
DROP POLICY IF EXISTS "Public can view reels" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload reels" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update reels" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete reels" ON storage.objects;

-- Delete reels bucket
DELETE FROM storage.buckets WHERE id = 'reels';

-- Drop tables
DROP TABLE IF EXISTS public.reel_interactions;
DROP TABLE IF EXISTS public.reels;