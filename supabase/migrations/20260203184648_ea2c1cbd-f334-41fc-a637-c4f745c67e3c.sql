-- Criar índice para acelerar consultas por estratégia
CREATE INDEX IF NOT EXISTS idx_trading_operations_strategy 
ON public.trading_operations (strategy);