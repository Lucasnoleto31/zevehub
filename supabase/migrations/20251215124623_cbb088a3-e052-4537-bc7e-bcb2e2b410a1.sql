-- Create journal_trades table for trading diary
CREATE TABLE public.journal_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'Day Trade',
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TIME,
  exit_time TIME,
  side TEXT NOT NULL DEFAULT 'Compra',
  strategy_id UUID REFERENCES public.strategies(id),
  timeframe TEXT,
  entry_price NUMERIC,
  stop_loss NUMERIC,
  target NUMERIC,
  risk_value NUMERIC,
  contracts NUMERIC,
  result_value NUMERIC,
  result_r NUMERIC,
  status TEXT NOT NULL DEFAULT 'Zero',
  emotion_before TEXT,
  emotion_after TEXT,
  followed_plan BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journal_trades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Usuários podem ver seus próprios trades"
ON public.journal_trades FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios trades"
ON public.journal_trades FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios trades"
ON public.journal_trades FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios trades"
ON public.journal_trades FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_journal_trades_updated_at
BEFORE UPDATE ON public.journal_trades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();