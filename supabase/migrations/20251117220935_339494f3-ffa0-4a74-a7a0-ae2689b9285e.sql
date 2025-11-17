-- Update RPC to set search_path for security best practices
CREATE OR REPLACE FUNCTION public.distinct_strategies()
RETURNS TABLE(strategy text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT DISTINCT strategy
  FROM public.trading_operations
  WHERE strategy IS NOT NULL
  ORDER BY strategy ASC;
$$;