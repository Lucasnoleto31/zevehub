-- =====================================================
-- Performance Optimization: Indexes + RPCs
-- =====================================================

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profit_operations_user_time ON profit_operations(user_id, open_time DESC);
CREATE INDEX IF NOT EXISTS idx_profit_operations_user_strategy ON profit_operations(user_id, strategy_id);
CREATE INDEX IF NOT EXISTS idx_profit_operations_user_asset ON profit_operations(user_id, asset);
CREATE INDEX IF NOT EXISTS idx_trading_operations_user_date ON trading_operations(user_id, operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_trading_operations_user_strategy ON trading_operations(user_id, strategy);
CREATE INDEX IF NOT EXISTS idx_lancamentos_financas_user ON lancamentos_financas(user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_financas_category ON lancamentos_financas(categoria_id);
CREATE INDEX IF NOT EXISTS idx_categorias_financas_user ON categorias_financas(user_id);
CREATE INDEX IF NOT EXISTS idx_metas_financeiras_user ON metas_financeiras(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- =====================================================
-- RPC: get_trading_dashboard
-- Aggregates profit_operations for the trading dashboard
-- =====================================================
CREATE OR REPLACE FUNCTION get_trading_dashboard(
  p_user_id uuid,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH filtered AS (
    SELECT
      id,
      open_time,
      close_time,
      operation_result,
      strategy_id,
      asset
    FROM profit_operations
    WHERE user_id = p_user_id
      AND (p_date_from IS NULL OR open_time >= p_date_from)
      AND (p_date_to IS NULL OR open_time <= p_date_to)
  ),
  totals AS (
    SELECT
      count(*)::int AS "totalOperations",
      count(*) FILTER (WHERE operation_result > 0)::int AS "totalWins",
      count(*) FILTER (WHERE operation_result <= 0)::int AS "totalLosses",
      CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE operation_result > 0)::numeric / count(*) * 100), 2)
        ELSE 0
      END AS "winRate",
      coalesce(sum(operation_result) FILTER (WHERE operation_result > 0), 0) AS "totalProfit",
      coalesce(sum(operation_result) FILTER (WHERE operation_result <= 0), 0) AS "totalLoss",
      coalesce(sum(operation_result), 0) AS "netResult",
      CASE
        WHEN coalesce(avg(operation_result) FILTER (WHERE operation_result <= 0), 0) != 0
        THEN round(abs(coalesce(avg(operation_result) FILTER (WHERE operation_result > 0), 0) /
             nullif(avg(operation_result) FILTER (WHERE operation_result <= 0), 0)), 2)
        ELSE 0
      END AS "payoff"
    FROM filtered
  ),
  daily AS (
    SELECT
      (open_time AT TIME ZONE 'America/Sao_Paulo')::date AS d,
      sum(operation_result) AS result,
      count(*)::int AS operations,
      count(*) FILTER (WHERE operation_result > 0)::int AS wins,
      count(*) FILTER (WHERE operation_result <= 0)::int AS losses
    FROM filtered
    GROUP BY 1
    ORDER BY 1
  ),
  best_worst AS (
    SELECT
      (SELECT json_build_object('date', d, 'result', result) FROM daily ORDER BY result DESC LIMIT 1) AS "bestDay",
      (SELECT json_build_object('date', d, 'result', result) FROM daily ORDER BY result ASC LIMIT 1) AS "worstDay"
  ),
  daily_arr AS (
    SELECT json_agg(json_build_object(
      'date', d,
      'result', result,
      'operations', operations,
      'wins', wins,
      'losses', losses
    ) ORDER BY d) AS arr
    FROM daily
  ),
  by_strategy AS (
    SELECT json_agg(json_build_object(
      'strategy', strategy_id,
      'operations', ops,
      'wins', w,
      'result', res
    )) AS arr
    FROM (
      SELECT
        strategy_id,
        count(*)::int AS ops,
        count(*) FILTER (WHERE operation_result > 0)::int AS w,
        sum(operation_result) AS res
      FROM filtered
      GROUP BY strategy_id
    ) s
  ),
  by_asset AS (
    SELECT json_agg(json_build_object(
      'asset', asset,
      'operations', ops,
      'wins', w,
      'result', res
    )) AS arr
    FROM (
      SELECT
        asset,
        count(*)::int AS ops,
        count(*) FILTER (WHERE operation_result > 0)::int AS w,
        sum(operation_result) AS res
      FROM filtered
      GROUP BY asset
    ) a
  ),
  by_hour AS (
    SELECT json_agg(json_build_object(
      'hour', h,
      'operations', ops,
      'wins', w,
      'result', res
    ) ORDER BY h) AS arr
    FROM (
      SELECT
        extract(hour FROM open_time AT TIME ZONE 'America/Sao_Paulo')::int AS h,
        count(*)::int AS ops,
        count(*) FILTER (WHERE operation_result > 0)::int AS w,
        sum(operation_result) AS res
      FROM filtered
      GROUP BY 1
    ) h
  ),
  monthly AS (
    SELECT json_agg(json_build_object(
      'month', m,
      'result', res,
      'operations', ops,
      'winRate', wr
    ) ORDER BY m) AS arr
    FROM (
      SELECT
        to_char((open_time AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM') AS m,
        sum(operation_result) AS res,
        count(*)::int AS ops,
        CASE WHEN count(*) > 0
          THEN round((count(*) FILTER (WHERE operation_result > 0)::numeric / count(*) * 100), 2)
          ELSE 0
        END AS wr
      FROM filtered
      GROUP BY 1
    ) mo
  )
  SELECT json_build_object(
    'totalOperations', t."totalOperations",
    'totalWins', t."totalWins",
    'totalLosses', t."totalLosses",
    'winRate', t."winRate",
    'totalProfit', t."totalProfit",
    'totalLoss', t."totalLoss",
    'netResult', t."netResult",
    'payoff', t."payoff",
    'bestDay', bw."bestDay",
    'worstDay', bw."worstDay",
    'dailyResults', coalesce(da.arr, '[]'::json),
    'byStrategy', coalesce(bs.arr, '[]'::json),
    'byAsset', coalesce(ba.arr, '[]'::json),
    'byHour', coalesce(bh.arr, '[]'::json),
    'monthlyResults', coalesce(mo.arr, '[]'::json)
  ) INTO result
  FROM totals t, best_worst bw, daily_arr da, by_strategy bs, by_asset ba, by_hour bh, monthly mo;

  RETURN result;
END;
$$;

-- =====================================================
-- RPC: get_operations_dashboard
-- Aggregates trading_operations for the operations (robot) dashboard
-- =====================================================
CREATE OR REPLACE FUNCTION get_operations_dashboard(
  p_user_id uuid,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  WITH filtered AS (
    SELECT
      id,
      operation_date,
      operation_time,
      result,
      strategy,
      contracts
    FROM trading_operations
    WHERE user_id = p_user_id
      AND strategy IN ('Alaska & Square', 'Apollo', 'Ares', 'Orion')
      AND (p_date_from IS NULL OR operation_date::timestamptz >= p_date_from)
      AND (p_date_to IS NULL OR operation_date::timestamptz <= p_date_to)
  ),
  totals AS (
    SELECT
      count(*)::int AS "totalOperations",
      count(*) FILTER (WHERE result > 0)::int AS "totalWins",
      count(*) FILTER (WHERE result <= 0)::int AS "totalLosses",
      CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE result > 0)::numeric / count(*) * 100), 2)
        ELSE 0
      END AS "winRate",
      coalesce(sum(result) FILTER (WHERE result > 0), 0) AS "totalProfit",
      coalesce(sum(result) FILTER (WHERE result <= 0), 0) AS "totalLoss",
      coalesce(sum(result), 0) AS "netResult",
      CASE
        WHEN coalesce(avg(result) FILTER (WHERE result <= 0), 0) != 0
        THEN round(abs(coalesce(avg(result) FILTER (WHERE result > 0), 0) /
             nullif(avg(result) FILTER (WHERE result <= 0), 0)), 2)
        ELSE 0
      END AS "payoff"
    FROM filtered
  ),
  daily AS (
    SELECT
      operation_date::date AS d,
      sum(result) AS result,
      count(*)::int AS operations,
      count(*) FILTER (WHERE result > 0)::int AS wins,
      count(*) FILTER (WHERE result <= 0)::int AS losses
    FROM filtered
    GROUP BY 1
    ORDER BY 1
  ),
  best_worst AS (
    SELECT
      (SELECT json_build_object('date', d, 'result', result) FROM daily ORDER BY result DESC LIMIT 1) AS "bestDay",
      (SELECT json_build_object('date', d, 'result', result) FROM daily ORDER BY result ASC LIMIT 1) AS "worstDay"
  ),
  daily_arr AS (
    SELECT json_agg(json_build_object(
      'date', d,
      'result', result,
      'operations', operations,
      'wins', wins,
      'losses', losses
    ) ORDER BY d) AS arr
    FROM daily
  ),
  by_strategy AS (
    SELECT json_agg(json_build_object(
      'strategy', strategy,
      'operations', ops,
      'wins', w,
      'result', res
    )) AS arr
    FROM (
      SELECT
        strategy,
        count(*)::int AS ops,
        count(*) FILTER (WHERE result > 0)::int AS w,
        sum(result) AS res
      FROM filtered
      GROUP BY strategy
    ) s
  ),
  by_hour AS (
    SELECT json_agg(json_build_object(
      'hour', h,
      'operations', ops,
      'wins', w,
      'result', res
    ) ORDER BY h) AS arr
    FROM (
      SELECT
        extract(hour FROM operation_time::time)::int AS h,
        count(*)::int AS ops,
        count(*) FILTER (WHERE result > 0)::int AS w,
        sum(result) AS res
      FROM filtered
      GROUP BY 1
    ) h
  ),
  monthly AS (
    SELECT json_agg(json_build_object(
      'month', m,
      'result', res,
      'operations', ops,
      'winRate', wr
    ) ORDER BY m) AS arr
    FROM (
      SELECT
        to_char(operation_date::date, 'YYYY-MM') AS m,
        sum(result) AS res,
        count(*)::int AS ops,
        CASE WHEN count(*) > 0
          THEN round((count(*) FILTER (WHERE result > 0)::numeric / count(*) * 100), 2)
          ELSE 0
        END AS wr
      FROM filtered
      GROUP BY 1
    ) mo
  )
  SELECT json_build_object(
    'totalOperations', t."totalOperations",
    'totalWins', t."totalWins",
    'totalLosses', t."totalLosses",
    'winRate', t."winRate",
    'totalProfit', t."totalProfit",
    'totalLoss', t."totalLoss",
    'netResult', t."netResult",
    'payoff', t."payoff",
    'bestDay', bw."bestDay",
    'worstDay', bw."worstDay",
    'dailyResults', coalesce(da.arr, '[]'::json),
    'byStrategy', coalesce(bs.arr, '[]'::json),
    'byHour', coalesce(bh.arr, '[]'::json),
    'monthlyResults', coalesce(mo.arr, '[]'::json)
  ) INTO v_result
  FROM totals t, best_worst bw, daily_arr da, by_strategy bs, by_hour bh, monthly mo;

  RETURN v_result;
END;
$$;

-- =====================================================
-- RPC: get_financas_summary
-- Aggregates lancamentos_financas for the finance dashboard
-- =====================================================
CREATE OR REPLACE FUNCTION get_financas_summary(
  p_user_id uuid,
  p_month text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_year int;
  v_month_start date;
  v_month_end date;
BEGIN
  -- If month specified (format YYYY-MM), filter to that month
  -- Otherwise, current month
  IF p_month IS NOT NULL THEN
    v_year := extract(year FROM (p_month || '-01')::date);
    v_month_start := (p_month || '-01')::date;
    v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;
  ELSE
    v_month_start := date_trunc('month', current_date)::date;
    v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;
    v_year := extract(year FROM current_date);
  END IF;

  WITH month_data AS (
    SELECT
      coalesce(sum(valor) FILTER (WHERE tipo_transacao = 'receita'), 0) AS "totalReceitas",
      coalesce(sum(valor) FILTER (WHERE tipo_transacao = 'despesa'), 0) AS "totalDespesas"
    FROM lancamentos_financas
    WHERE user_id = p_user_id
      AND data >= v_month_start::text
      AND data <= v_month_end::text
  ),
  by_cat AS (
    SELECT json_agg(json_build_object(
      'category_name', c.nome,
      'type', l.tipo_transacao,
      'total', t
    )) AS arr
    FROM (
      SELECT
        categoria_id,
        tipo_transacao,
        sum(valor) AS t
      FROM lancamentos_financas
      WHERE user_id = p_user_id
        AND data >= v_month_start::text
        AND data <= v_month_end::text
      GROUP BY categoria_id, tipo_transacao
    ) l
    LEFT JOIN categorias_financas c ON c.id = l.categoria_id
  ),
  monthly_evo AS (
    SELECT json_agg(json_build_object(
      'month', m,
      'receitas', r,
      'despesas', d,
      'saldo', r - d
    ) ORDER BY m) AS arr
    FROM (
      SELECT
        to_char(data::date, 'YYYY-MM') AS m,
        coalesce(sum(valor) FILTER (WHERE tipo_transacao = 'receita'), 0) AS r,
        coalesce(sum(valor) FILTER (WHERE tipo_transacao = 'despesa'), 0) AS d
      FROM lancamentos_financas
      WHERE user_id = p_user_id
        AND extract(year FROM data::date) = v_year
      GROUP BY 1
    ) evo
  ),
  recent AS (
    SELECT json_agg(json_build_object(
      'id', l.id,
      'data', l.data,
      'valor', l.valor,
      'tipo_transacao', l.tipo_transacao,
      'descricao', l.descricao,
      'pago', l.pago,
      'category_name', c.nome
    ) ORDER BY l.data DESC) AS arr
    FROM (
      SELECT * FROM lancamentos_financas
      WHERE user_id = p_user_id
      ORDER BY data DESC
      LIMIT 20
    ) l
    LEFT JOIN categorias_financas c ON c.id = l.categoria_id
  )
  SELECT json_build_object(
    'totalReceitas', md."totalReceitas",
    'totalDespesas', md."totalDespesas",
    'saldo', md."totalReceitas" - md."totalDespesas",
    'byCategory', coalesce(bc.arr, '[]'::json),
    'monthlyEvolution', coalesce(me.arr, '[]'::json),
    'recentLancamentos', coalesce(rc.arr, '[]'::json)
  ) INTO v_result
  FROM month_data md, by_cat bc, monthly_evo me, recent rc;

  RETURN v_result;
END;
$$;
