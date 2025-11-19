-- Adicionar campo de anexo nos posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Atualizar trigger para dar 5 pontos ao criar post
CREATE OR REPLACE FUNCTION handle_new_post_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Adicionar 5 pontos ao criar post
  UPDATE profiles
  SET points = points + 5
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_created_points ON community_posts;
CREATE TRIGGER on_post_created_points
  AFTER INSERT ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_post_points();

-- Atualizar triggers de comentários para dar 2 pontos
CREATE OR REPLACE FUNCTION handle_new_comment_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_id UUID;
BEGIN
  -- Buscar o dono do post
  SELECT user_id INTO v_post_owner_id
  FROM community_posts
  WHERE id = NEW.post_id;
  
  -- Adicionar 2 pontos ao dono do post quando receber comentário
  IF v_post_owner_id != NEW.user_id THEN
    UPDATE profiles
    SET points = points + 2
    WHERE id = v_post_owner_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created_points ON community_comments;
CREATE TRIGGER on_comment_created_points
  AFTER INSERT ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_comment_points();

-- Atualizar triggers de curtidas em posts para dar 1 ponto
CREATE OR REPLACE FUNCTION handle_reaction_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_id UUID;
BEGIN
  -- Buscar o dono do post
  SELECT user_id INTO v_post_owner_id
  FROM community_posts
  WHERE id = NEW.post_id;

  -- Adicionar 1 ponto ao dono do post
  IF v_post_owner_id != NEW.user_id THEN
    UPDATE profiles
    SET points = points + 1
    WHERE id = v_post_owner_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reaction_created_points ON post_reactions;
CREATE TRIGGER on_reaction_created_points
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_reaction_points();

-- Remover pontos ao deletar reação
CREATE OR REPLACE FUNCTION handle_remove_reaction_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_id UUID;
BEGIN
  -- Buscar o dono do post
  SELECT user_id INTO v_post_owner_id
  FROM community_posts
  WHERE id = OLD.post_id;

  -- Remover 1 ponto
  IF v_post_owner_id != OLD.user_id THEN
    UPDATE profiles
    SET points = GREATEST(points - 1, 0)
    WHERE id = v_post_owner_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_reaction_deleted_points ON post_reactions;
CREATE TRIGGER on_reaction_deleted_points
  AFTER DELETE ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_remove_reaction_points();

-- Atualizar triggers de curtidas em comentários para dar 1 ponto
CREATE OR REPLACE FUNCTION handle_comment_like_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_owner_id UUID;
BEGIN
  -- Buscar o dono do comentário
  SELECT user_id INTO v_comment_owner_id
  FROM community_comments
  WHERE id = NEW.comment_id;

  -- Adicionar 1 ponto ao dono do comentário
  IF v_comment_owner_id != NEW.user_id THEN
    UPDATE profiles
    SET points = points + 1
    WHERE id = v_comment_owner_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_like_created_points ON comment_likes;
CREATE TRIGGER on_comment_like_created_points
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_like_points();

-- Remover pontos ao deletar curtida em comentário
CREATE OR REPLACE FUNCTION handle_remove_comment_like_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_owner_id UUID;
BEGIN
  -- Buscar o dono do comentário
  SELECT user_id INTO v_comment_owner_id
  FROM community_comments
  WHERE id = OLD.comment_id;

  -- Remover 1 ponto
  IF v_comment_owner_id != OLD.user_id THEN
    UPDATE profiles
    SET points = GREATEST(points - 1, 0)
    WHERE id = v_comment_owner_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_like_deleted_points ON comment_likes;
CREATE TRIGGER on_comment_like_deleted_points
  AFTER DELETE ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_remove_comment_like_points();