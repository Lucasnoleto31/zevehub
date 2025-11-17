-- Criar tabela de logs de atividades
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas rápidas por usuário
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id, created_at DESC);

-- RLS para activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios logs"
ON activity_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode inserir logs"
ON activity_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Adicionar colunas para 2FA na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMP WITH TIME ZONE;

-- Função para registrar atividades automaticamente
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log de alteração de perfil
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.full_name IS DISTINCT FROM NEW.full_name) THEN
      INSERT INTO activity_logs (user_id, activity_type, description)
      VALUES (NEW.id, 'profile_update', 'Nome alterado');
    END IF;
    
    IF (OLD.phone IS DISTINCT FROM NEW.phone) THEN
      INSERT INTO activity_logs (user_id, activity_type, description)
      VALUES (NEW.id, 'profile_update', 'Telefone alterado');
    END IF;
    
    IF (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url) THEN
      INSERT INTO activity_logs (user_id, activity_type, description)
      VALUES (NEW.id, 'profile_update', 'Foto de perfil alterada');
    END IF;
    
    IF (OLD.totp_enabled IS DISTINCT FROM NEW.totp_enabled) THEN
      IF NEW.totp_enabled THEN
        INSERT INTO activity_logs (user_id, activity_type, description)
        VALUES (NEW.id, 'security', 'Autenticação 2FA ativada');
      ELSE
        INSERT INTO activity_logs (user_id, activity_type, description)
        VALUES (NEW.id, 'security', 'Autenticação 2FA desativada');
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para registrar alterações de perfil
DROP TRIGGER IF EXISTS trigger_log_profile_changes ON profiles;
CREATE TRIGGER trigger_log_profile_changes
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_profile_changes();