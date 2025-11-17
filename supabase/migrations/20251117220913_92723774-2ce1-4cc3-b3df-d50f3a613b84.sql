-- Create RPC to return distinct strategy names from trading_operations
CREATE OR REPLACE FUNCTION public.distinct_strategies()
RETURNS TABLE(strategy text)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT strategy
  FROM public.trading_operations
  WHERE strategy IS NOT NULL
  ORDER BY strategy ASC;
$$;