-- Função para incrementar valores em tabelas
CREATE OR REPLACE FUNCTION public.increment_column(
  table_name text,
  row_id uuid,
  column_name text,
  increment_value integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = %I + $1 WHERE id = $2',
    table_name, column_name, column_name
  ) USING increment_value, row_id;
END;
$$;