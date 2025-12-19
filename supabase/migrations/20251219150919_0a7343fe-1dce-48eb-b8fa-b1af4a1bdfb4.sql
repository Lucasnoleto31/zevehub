-- Create table for Profit imported operations
CREATE TABLE public.profit_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number TEXT,
  holder_name TEXT,
  import_date DATE,
  asset TEXT NOT NULL,
  open_time TIMESTAMP WITH TIME ZONE NOT NULL,
  close_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration TEXT,
  buy_qty INTEGER,
  sell_qty INTEGER,
  side TEXT,
  buy_price NUMERIC,
  sell_price NUMERIC,
  market_price NUMERIC,
  mep NUMERIC,
  men NUMERIC,
  buy_agent TEXT,
  sell_agent TEXT,
  average TEXT,
  interval_result_gross NUMERIC,
  interval_result_percent NUMERIC,
  operation_result NUMERIC,
  operation_result_percent NUMERIC,
  tet TEXT,
  total NUMERIC,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profit_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see their own data
CREATE POLICY "Users can view their own profit operations"
ON public.profit_operations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profit operations"
ON public.profit_operations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profit operations"
ON public.profit_operations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profit operations"
ON public.profit_operations
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_profit_operations_user_id ON public.profit_operations(user_id);
CREATE INDEX idx_profit_operations_open_time ON public.profit_operations(open_time);
CREATE INDEX idx_profit_operations_asset ON public.profit_operations(asset);

-- Trigger for updated_at
CREATE TRIGGER update_profit_operations_updated_at
BEFORE UPDATE ON public.profit_operations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();