-- Function to recalculate user financial metrics
CREATE OR REPLACE FUNCTION public.recalcular_metricas_financas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_mes_atual TEXT;
  v_salario NUMERIC;
  v_total_recorrentes NUMERIC;
  v_total_gastos_mes NUMERIC;
  v_sobra NUMERIC;
  v_dias_restantes INT;
  v_valor_diario NUMERIC;
BEGIN
  -- Get user_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  -- Current month
  v_mes_atual := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get user salary
  SELECT COALESCE(salario_mensal, 0) INTO v_salario
  FROM usuario_metricas_financas
  WHERE user_id = v_user_id;

  -- If no metrics exist, skip
  IF v_salario IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate total recurring expenses
  SELECT COALESCE(SUM(valor), 0) INTO v_total_recorrentes
  FROM lancamentos_financas
  WHERE user_id = v_user_id AND recorrente = true;

  -- Calculate total expenses this month (non-recurring)
  SELECT COALESCE(SUM(lf.valor), 0) INTO v_total_gastos_mes
  FROM lancamentos_financas lf
  LEFT JOIN categorias_financas cf ON lf.categoria_id = cf.id
  WHERE lf.user_id = v_user_id
    AND TO_CHAR(lf.data, 'YYYY-MM') = v_mes_atual
    AND lf.recorrente = false
    AND (cf.tipo = 'despesa' OR cf.tipo IS NULL);

  -- Calculate remaining balance
  v_sobra := v_salario - v_total_recorrentes - v_total_gastos_mes;

  -- Calculate remaining days in month
  v_dias_restantes := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE - CURRENT_DATE + 1;
  IF v_dias_restantes <= 0 THEN
    v_dias_restantes := 1;
  END IF;

  -- Calculate daily target
  v_valor_diario := v_sobra / v_dias_restantes;

  -- Update metrics
  UPDATE usuario_metricas_financas
  SET 
    sobra_calculada = v_sobra,
    valor_diario_meta = v_valor_diario,
    mes_referencia = v_mes_atual,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger on lancamentos_financas for INSERT
CREATE TRIGGER trigger_recalc_metricas_insert
AFTER INSERT ON public.lancamentos_financas
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_metricas_financas();

-- Trigger on lancamentos_financas for UPDATE
CREATE TRIGGER trigger_recalc_metricas_update
AFTER UPDATE ON public.lancamentos_financas
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_metricas_financas();

-- Trigger on lancamentos_financas for DELETE
CREATE TRIGGER trigger_recalc_metricas_delete
AFTER DELETE ON public.lancamentos_financas
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_metricas_financas();