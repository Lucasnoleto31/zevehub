-- Criar tabela de seguidores
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Habilitar RLS
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Todos podem ver seguidores"
  ON user_follows FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem seguir outros"
  ON user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Usuários podem deixar de seguir"
  ON user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Adicionar contadores de seguidores e seguindo no perfil
ALTER TABLE profiles
ADD COLUMN followers_count INTEGER DEFAULT 0,
ADD COLUMN following_count INTEGER DEFAULT 0;

-- Função para atualizar contadores
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrementar contador de seguidores do seguido
    UPDATE profiles SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;
    
    -- Incrementar contador de seguindo do seguidor
    UPDATE profiles SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrementar contador de seguidores do seguido
    UPDATE profiles SET followers_count = GREATEST(followers_count - 1, 0)
    WHERE id = OLD.following_id;
    
    -- Decrementar contador de seguindo do seguidor
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0)
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
END;
$$;

-- Trigger para atualizar contadores
CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_counts();