-- Tabela para armazenar contratos importados
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf TEXT NOT NULL,
  client_name TEXT,
  contract_date DATE NOT NULL,
  volume INTEGER NOT NULL DEFAULT 0,
  asset TEXT,
  broker TEXT,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id),
  matched_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para otimização
CREATE INDEX idx_contracts_cpf ON public.contracts(cpf);
CREATE INDEX idx_contracts_date ON public.contracts(contract_date);
CREATE INDEX idx_contracts_matched_user ON public.contracts(matched_user_id);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver contratos
CREATE POLICY "Admins podem ver todos os contratos"
ON public.contracts
FOR SELECT
USING (is_admin(auth.uid()));

-- Apenas admins podem inserir contratos
CREATE POLICY "Admins podem inserir contratos"
ON public.contracts
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Apenas admins podem deletar contratos
CREATE POLICY "Admins podem deletar contratos"
ON public.contracts
FOR DELETE
USING (is_admin(auth.uid()));

-- Apenas admins podem atualizar contratos
CREATE POLICY "Admins podem atualizar contratos"
ON public.contracts
FOR UPDATE
USING (is_admin(auth.uid()));

-- Tabela para log de sincronização de acesso
CREATE TABLE public.access_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  cpf TEXT,
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  synced_by UUID REFERENCES auth.users(id),
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_sync_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs
CREATE POLICY "Admins podem ver logs de sincronização"
ON public.access_sync_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Apenas admins podem inserir logs
CREATE POLICY "Admins podem inserir logs de sincronização"
ON public.access_sync_logs
FOR INSERT
WITH CHECK (is_admin(auth.uid()));