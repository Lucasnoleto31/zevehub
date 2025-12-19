-- Add strategy_id column to profit_operations table
ALTER TABLE public.profit_operations 
ADD COLUMN strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_profit_operations_strategy_id ON public.profit_operations(strategy_id);