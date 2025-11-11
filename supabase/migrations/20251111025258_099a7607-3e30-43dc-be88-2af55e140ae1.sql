-- Tabela de Gestão de Banca
CREATE TABLE IF NOT EXISTS public.bankroll_management (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  initial_capital NUMERIC NOT NULL,
  current_capital NUMERIC NOT NULL,
  risk_percentage NUMERIC NOT NULL DEFAULT 2.0,
  max_daily_loss_percentage NUMERIC NOT NULL DEFAULT 5.0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para bankroll_management
ALTER TABLE public.bankroll_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver sua própria gestão de banca"
ON public.bankroll_management
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir sua própria gestão de banca"
ON public.bankroll_management
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar sua própria gestão de banca"
ON public.bankroll_management
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar toda gestão de banca"
ON public.bankroll_management
FOR ALL
USING (is_admin(auth.uid()));

-- Tabela de Metas
CREATE TABLE IF NOT EXISTS public.trading_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  goal_type TEXT NOT NULL CHECK (goal_type IN ('profit', 'win_rate', 'operations')),
  target_value NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para trading_goals
ALTER TABLE public.trading_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias metas"
ON public.trading_goals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias metas"
ON public.trading_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias metas"
ON public.trading_goals
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias metas"
ON public.trading_goals
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar todas as metas"
ON public.trading_goals
FOR ALL
USING (is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bankroll_management_updated_at
BEFORE UPDATE ON public.bankroll_management
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_trading_goals_updated_at
BEFORE UPDATE ON public.trading_goals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();