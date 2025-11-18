-- Drop existing constraints if they exist
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_user_id_fkey;
ALTER TABLE post_mentions DROP CONSTRAINT IF EXISTS post_mentions_mentioned_by_fkey;

-- Add foreign keys para permitir joins
ALTER TABLE community_posts
ADD CONSTRAINT community_posts_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE post_mentions
ADD CONSTRAINT post_mentions_mentioned_by_fkey
FOREIGN KEY (mentioned_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- Trigger para remover pontos quando um post é deletado
CREATE OR REPLACE FUNCTION handle_post_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_love_count INTEGER;
BEGIN
  -- Contar quantas reações "love" o post tinha
  SELECT COUNT(*) INTO v_love_count
  FROM post_reactions
  WHERE post_id = OLD.id AND reaction_type = 'love';
  
  -- Remover pontos do autor do post
  IF v_love_count > 0 THEN
    UPDATE profiles
    SET points = GREATEST(points - v_love_count, 0)
    WHERE id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Criar trigger para execução antes de deletar post
DROP TRIGGER IF EXISTS on_post_delete ON community_posts;
CREATE TRIGGER on_post_delete
  BEFORE DELETE ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_deletion();