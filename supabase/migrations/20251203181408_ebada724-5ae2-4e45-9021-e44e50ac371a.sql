-- Criar enum para status de acesso
DO $$ BEGIN
  CREATE TYPE public.access_status AS ENUM ('pendente', 'aprovado', 'reprovado', 'bloqueado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adicionar novos campos à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS has_genial_account BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS genial_id TEXT,
ADD COLUMN IF NOT EXISTS access_status public.access_status DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS assessor_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS access_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS access_approved_by UUID REFERENCES auth.users(id);

-- Atualizar usuários existentes para status aprovado (para não bloquear acesso atual)
UPDATE public.profiles SET access_status = 'aprovado' WHERE access_status IS NULL OR access_status = 'pendente';

-- Função para verificar se usuário tem acesso aprovado
CREATE OR REPLACE FUNCTION public.has_approved_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND access_status = 'aprovado'
  )
$$;