-- Tabela de operações de trading
CREATE TABLE public.trading_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_date DATE NOT NULL,
  operation_time TIME NOT NULL,
  asset TEXT NOT NULL,
  contracts INTEGER NOT NULL,
  costs DECIMAL(10,2) NOT NULL DEFAULT 0,
  result DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.trading_operations ENABLE ROW LEVEL SECURITY;

-- Policies para operações
CREATE POLICY "Usuários podem ver suas próprias operações"
  ON public.trading_operations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias operações"
  ON public.trading_operations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias operações"
  ON public.trading_operations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias operações"
  ON public.trading_operations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as operações"
  ON public.trading_operations FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem gerenciar todas as operações"
  ON public.trading_operations FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER handle_trading_operations_updated_at
  BEFORE UPDATE ON public.trading_operations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Índices para melhor performance
CREATE INDEX idx_trading_operations_user_id ON public.trading_operations(user_id);
CREATE INDEX idx_trading_operations_date ON public.trading_operations(operation_date DESC);
CREATE INDEX idx_trading_operations_user_date ON public.trading_operations(user_id, operation_date DESC);