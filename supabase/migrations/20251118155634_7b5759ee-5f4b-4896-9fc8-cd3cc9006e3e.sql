-- Criar tabela de notificações em tempo real
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow', 'reaction', 'comment', 'mention')),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DO $$ BEGIN
  CREATE POLICY "Usuários podem ver suas notificações"
    ON user_notifications FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Sistema pode criar notificações"
    ON user_notifications FOR INSERT
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Usuários podem atualizar suas notificações"
    ON user_notifications FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Função para criar notificação de follow
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_notifications (user_id, type, actor_id)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);
  RETURN NEW;
END;
$$;

-- Trigger para follow
DROP TRIGGER IF EXISTS on_new_follow ON user_follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();

-- Função para criar notificação de reação
CREATE OR REPLACE FUNCTION notify_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id UUID;
BEGIN
  SELECT user_id INTO v_post_author_id
  FROM community_posts
  WHERE id = NEW.post_id;
  
  IF NEW.user_id != v_post_author_id THEN
    INSERT INTO user_notifications (user_id, type, actor_id, post_id)
    VALUES (v_post_author_id, 'reaction', NEW.user_id, NEW.post_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para reações
DROP TRIGGER IF EXISTS on_new_reaction ON post_reactions;
CREATE TRIGGER on_new_reaction
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_reaction();

-- Função para criar notificação de comentário
CREATE OR REPLACE FUNCTION notify_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id UUID;
BEGIN
  SELECT user_id INTO v_post_author_id
  FROM community_posts
  WHERE id = NEW.post_id;
  
  IF NEW.user_id != v_post_author_id THEN
    INSERT INTO user_notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES (v_post_author_id, 'comment', NEW.user_id, NEW.post_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para comentários
DROP TRIGGER IF EXISTS on_new_comment ON community_comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON community_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment();