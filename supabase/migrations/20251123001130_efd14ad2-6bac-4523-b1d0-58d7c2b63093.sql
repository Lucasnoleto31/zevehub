-- Add image_urls column to community_posts table for multiple images support
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS image_urls TEXT[];