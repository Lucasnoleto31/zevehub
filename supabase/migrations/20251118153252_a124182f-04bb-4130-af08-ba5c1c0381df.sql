-- Criar bucket para imagens de posts da comunidade
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-posts', 'community-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para community-posts
CREATE POLICY "Qualquer um pode visualizar imagens de posts"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-posts');

CREATE POLICY "Usuários autenticados podem fazer upload de imagens"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem deletar suas próprias imagens"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Tabela para rastreamento de conquistas de badges
CREATE TABLE public.badge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  current_progress INTEGER NOT NULL DEFAULT 0,
  target_progress INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Enable RLS
ALTER TABLE public.badge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio progresso"
ON public.badge_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode gerenciar progresso"
ON public.badge_progress FOR ALL
USING (true);

-- Índices
CREATE INDEX idx_badge_progress_user_id ON public.badge_progress(user_id);

-- Trigger para updated_at
CREATE TRIGGER update_badge_progress_updated_at
  BEFORE UPDATE ON public.badge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar e atribuir badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS TABLE(
  badge_id TEXT,
  badge_name TEXT,
  badge_description TEXT,
  newly_awarded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_count INTEGER;
  v_total_likes INTEGER;
  v_comment_likes INTEGER;
  v_login_streak INTEGER;
  v_badge_exists BOOLEAN;
BEGIN
  -- Contar posts do usuário
  SELECT COUNT(*) INTO v_post_count
  FROM community_posts
  WHERE user_id = p_user_id;

  -- Contar curtidas recebidas em posts
  SELECT COALESCE(SUM(likes), 0) INTO v_total_likes
  FROM community_posts
  WHERE user_id = p_user_id;

  -- Contar curtidas recebidas em comentários
  SELECT COALESCE(SUM(likes), 0) INTO v_comment_likes
  FROM community_comments
  WHERE user_id = p_user_id;

  -- Obter sequência de login
  SELECT COALESCE(daily_login_streak, 0) INTO v_login_streak
  FROM profiles
  WHERE id = p_user_id;

  -- Badge: Primeiro Post
  IF v_post_count >= 1 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges 
      WHERE user_id = p_user_id AND badge_id = 'primeiro_post'
    ) INTO v_badge_exists;
    
    IF NOT v_badge_exists THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, 'primeiro_post');
      
      RETURN QUERY SELECT 
        'primeiro_post'::TEXT,
        'Primeira Contribuição'::TEXT,
        'Criou o primeiro post na comunidade'::TEXT,
        true;
    END IF;
  END IF;

  -- Badge: Helper (100 curtidas em comentários)
  IF v_comment_likes >= 100 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges 
      WHERE user_id = p_user_id AND badge_id = 'helper'
    ) INTO v_badge_exists;
    
    IF NOT v_badge_exists THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, 'helper');
      
      RETURN QUERY SELECT 
        'helper'::TEXT,
        'Traders Helper'::TEXT,
        '100 curtidas recebidas em comentários'::TEXT,
        true;
    END IF;
  END IF;

  -- Badge: Analista (10 posts)
  IF v_post_count >= 10 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges 
      WHERE user_id = p_user_id AND badge_id = 'analista'
    ) INTO v_badge_exists;
    
    IF NOT v_badge_exists THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, 'analista');
      
      RETURN QUERY SELECT 
        'analista'::TEXT,
        'Analista Pro'::TEXT,
        '10 análises completas publicadas'::TEXT,
        true;
    END IF;
  END IF;

  -- Badge: Consistência (15 dias consecutivos)
  IF v_login_streak >= 15 THEN
    SELECT EXISTS(
      SELECT 1 FROM user_badges 
      WHERE user_id = p_user_id AND badge_id = 'consistencia'
    ) INTO v_badge_exists;
    
    IF NOT v_badge_exists THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, 'consistencia');
      
      RETURN QUERY SELECT 
        'consistencia'::TEXT,
        'Herói da Recorrência'::TEXT,
        '15 dias consecutivos de login'::TEXT,
        true;
    END IF;
  END IF;

  RETURN;
END;
$$;