-- Criar enum para perfis de investimento
CREATE TYPE public.investment_profile AS ENUM ('start', 'perfil_1', 'perfil_2', 'perfil_5', 'perfil_10');

-- Adicionar coluna de perfil de investimento na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN investment_profile public.investment_profile DEFAULT 'perfil_5';

-- Criar comentário explicando os multiplicadores
COMMENT ON COLUMN public.profiles.investment_profile IS 'Perfil de investimento: start=10%, perfil_1=20%, perfil_2=40%, perfil_5=100%(matriz), perfil_10=200%';