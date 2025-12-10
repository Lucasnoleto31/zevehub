-- Tabela para clientes cadastrados na assessoria (com CPF)
CREATE TABLE IF NOT EXISTS public.registered_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para busca por nome (para cruzamento)
CREATE INDEX idx_registered_clients_name ON public.registered_clients USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_registered_clients_cpf ON public.registered_clients(cpf);

-- RLS
ALTER TABLE public.registered_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver todos os clientes"
ON public.registered_clients FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir clientes"
ON public.registered_clients FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar clientes"
ON public.registered_clients FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar clientes"
ON public.registered_clients FOR DELETE
USING (is_admin(auth.uid()));