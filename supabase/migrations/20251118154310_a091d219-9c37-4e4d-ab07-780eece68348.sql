-- Remover tabela antiga de curtidas
DROP TABLE IF EXISTS public.post_likes CASCADE;

-- Criar tabela de reações com tipos específicos
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('love', 'like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Políticas para reações
CREATE POLICY "Todos podem ver reações"
ON public.post_reactions FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem reagir"
ON public.post_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas reações"
ON public.post_reactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem remover suas reações"
ON public.post_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON public.post_reactions(user_id);
CREATE INDEX idx_post_reactions_type ON public.post_reactions(reaction_type);

-- Remover coluna likes da tabela de posts
ALTER TABLE public.community_posts DROP COLUMN IF EXISTS likes;

-- Função para contar reações por tipo
CREATE OR REPLACE FUNCTION public.get_post_reactions(p_post_id UUID)
RETURNS TABLE(
  love_count BIGINT,
  like_count BIGINT,
  dislike_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN reaction_type = 'love' THEN 1 ELSE 0 END), 0) as love_count,
    COALESCE(SUM(CASE WHEN reaction_type = 'like' THEN 1 ELSE 0 END), 0) as like_count,
    COALESCE(SUM(CASE WHEN reaction_type = 'dislike' THEN 1 ELSE 0 END), 0) as dislike_count
  FROM post_reactions
  WHERE post_id = p_post_id;
$$;

-- Trigger para adicionar pontos quando receber um "love"
CREATE OR REPLACE FUNCTION public.handle_love_reaction()
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

  -- Se for um "love", adicionar 1 ponto
  IF NEW.reaction_type = 'love' THEN
    UPDATE profiles
    SET points = points + 1
    WHERE id = v_post_owner_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER post_reaction_love_points
AFTER INSERT ON public.post_reactions
FOR EACH ROW
WHEN (NEW.reaction_type = 'love')
EXECUTE FUNCTION public.handle_love_reaction();

-- Trigger para remover ponto se remover "love"
CREATE OR REPLACE FUNCTION public.handle_remove_love_reaction()
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

  -- Se era um "love", remover 1 ponto
  IF OLD.reaction_type = 'love' THEN
    UPDATE profiles
    SET points = GREATEST(points - 1, 0)
    WHERE id = v_post_owner_id;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER post_reaction_remove_love_points
AFTER DELETE ON public.post_reactions
FOR EACH ROW
WHEN (OLD.reaction_type = 'love')
EXECUTE FUNCTION public.handle_remove_love_reaction();

-- Trigger para atualizar pontos quando mudar reação
CREATE OR REPLACE FUNCTION public.handle_update_love_reaction()
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

  -- Se mudou de love para outra coisa, remover ponto
  IF OLD.reaction_type = 'love' AND NEW.reaction_type != 'love' THEN
    UPDATE profiles
    SET points = GREATEST(points - 1, 0)
    WHERE id = v_post_owner_id;
  END IF;

  -- Se mudou para love, adicionar ponto
  IF OLD.reaction_type != 'love' AND NEW.reaction_type = 'love' THEN
    UPDATE profiles
    SET points = points + 1
    WHERE id = v_post_owner_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER post_reaction_update_love_points
AFTER UPDATE ON public.post_reactions
FOR EACH ROW
WHEN (OLD.reaction_type IS DISTINCT FROM NEW.reaction_type)
EXECUTE FUNCTION public.handle_update_love_reaction();