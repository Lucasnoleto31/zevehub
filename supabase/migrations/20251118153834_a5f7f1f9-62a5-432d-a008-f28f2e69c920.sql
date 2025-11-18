-- Adicionar campo de status para moderação de posts
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

-- Tabela de denúncias
CREATE TABLE public.post_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, reported_by)
);

-- Tabela de menções
CREATE TABLE public.post_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT mention_source_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;

-- Políticas para denúncias
CREATE POLICY "Usuários autenticados podem criar denúncias"
ON public.post_reports FOR INSERT
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins podem ver todas as denúncias"
ON public.post_reports FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar denúncias"
ON public.post_reports FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Usuários podem ver suas próprias denúncias"
ON public.post_reports FOR SELECT
USING (auth.uid() = reported_by);

-- Políticas para menções
CREATE POLICY "Usuários podem ver menções direcionadas a eles"
ON public.post_mentions FOR SELECT
USING (auth.uid() = mentioned_user_id);

CREATE POLICY "Sistema pode criar menções"
ON public.post_mentions FOR INSERT
WITH CHECK (auth.uid() = mentioned_by);

CREATE POLICY "Usuários podem atualizar suas menções (marcar como lida)"
ON public.post_mentions FOR UPDATE
USING (auth.uid() = mentioned_user_id);

-- Índices
CREATE INDEX idx_post_reports_post_id ON public.post_reports(post_id);
CREATE INDEX idx_post_reports_status ON public.post_reports(status);
CREATE INDEX idx_post_mentions_user_id ON public.post_mentions(mentioned_user_id);
CREATE INDEX idx_post_mentions_read ON public.post_mentions(is_read);
CREATE INDEX idx_community_posts_status ON public.community_posts(status);

-- Função para processar menções
CREATE OR REPLACE FUNCTION public.process_mentions(
  p_content TEXT,
  p_post_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_mentioned_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mention TEXT;
  v_username TEXT;
  v_user_id UUID;
BEGIN
  -- Extrair todas as menções @username do conteúdo
  FOR v_mention IN
    SELECT unnest(regexp_matches(p_content, '@([a-zA-Z0-9_]+)', 'g'))
  LOOP
    -- Remover o @ do username
    v_username := v_mention;
    
    -- Buscar o user_id pelo full_name ou email
    SELECT id INTO v_user_id
    FROM profiles
    WHERE 
      LOWER(full_name) = LOWER(v_username) OR
      LOWER(email) LIKE LOWER(v_username || '%')
    LIMIT 1;
    
    -- Se encontrou o usuário, criar a menção
    IF v_user_id IS NOT NULL THEN
      INSERT INTO post_mentions (
        post_id,
        comment_id,
        mentioned_user_id,
        mentioned_by
      )
      VALUES (
        p_post_id,
        p_comment_id,
        v_user_id,
        COALESCE(p_mentioned_by, auth.uid())
      )
      ON CONFLICT DO NOTHING;
      
      -- Criar notificação
      INSERT INTO messages (
        user_id,
        title,
        content,
        priority,
        is_global
      )
      VALUES (
        v_user_id,
        'Nova Menção',
        'Você foi mencionado em um ' || 
        CASE 
          WHEN p_post_id IS NOT NULL THEN 'post'
          ELSE 'comentário'
        END,
        'normal',
        false
      );
    END IF;
  END LOOP;
END;
$$;