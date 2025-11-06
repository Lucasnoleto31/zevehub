-- Adicionar coluna de estratégia/robô na tabela trading_operations
ALTER TABLE public.trading_operations 
ADD COLUMN strategy TEXT;