-- Tabela para definir os cargos disponíveis na comunidade
CREATE TABLE public.community_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'hsl(210, 70%, 50%)',
  icon TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para relacionar usuários com seus cargos
CREATE TABLE public.user_community_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.community_titles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, title_id)
);

-- RLS para community_titles
ALTER TABLE public.community_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver títulos"
ON public.community_titles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas admins podem gerenciar títulos"
ON public.community_titles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS para user_community_titles
ALTER TABLE public.user_community_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver títulos de usuários"
ON public.user_community_titles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas admins podem atribuir títulos"
ON public.user_community_titles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_community_titles_updated_at
BEFORE UPDATE ON public.community_titles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns títulos padrão
INSERT INTO public.community_titles (name, color, icon, priority)
VALUES
  ('VIP', 'hsl(45, 100%, 51%)', '👑', 100),
  ('Trader Pro', 'hsl(142, 76%, 36%)', '💎', 90),
  ('Moderador', 'hsl(217, 91%, 60%)', '🛡️', 80);