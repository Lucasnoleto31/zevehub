-- RPC: get_operations_detail
-- Returns per-day and per-day-hour aggregations for heatmap, calendar, advanced metrics
-- Replaces the need to fetch 130k+ individual operations

CREATE OR REPLACE FUNCTION get_operations_detail(
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  WITH ops AS (
    SELECT
      operation_date,
      operation_time,
      result,
      strategy,
      contracts
    FROM trading_operations
    WHERE user_id = p_user_id
      AND strategy IN ('Alaska & Square', 'Apollo', 'Ares', 'Orion')
  ),
  -- Daily aggregation (for calendar, top days)
  by_day AS (
    SELECT json_agg(json_build_object(
      'date', d,
      'result', total_result,
      'operations', ops_count,
      'wins', wins,
      'losses', losses,
      'contracts', total_contracts
    ) ORDER BY d) AS arr
    FROM (
      SELECT
        operation_date::date AS d,
        sum(result) AS total_result,
        count(*)::int AS ops_count,
        count(*) FILTER (WHERE result > 0)::int AS wins,
        count(*) FILTER (WHERE result <= 0)::int AS losses,
        sum(contracts)::int AS total_contracts
      FROM ops
      GROUP BY 1
    ) daily
  ),
  -- Day-of-week × hour aggregation (for heatmap)
  by_dow_hour AS (
    SELECT json_agg(json_build_object(
      'dayOfWeek', dow,
      'hour', h,
      'result', total_result,
      'operations', ops_count,
      'wins', wins
    )) AS arr
    FROM (
      SELECT
        extract(dow FROM operation_date::date)::int AS dow,
        extract(hour FROM operation_time::time)::int AS h,
        sum(result) AS total_result,
        count(*)::int AS ops_count,
        count(*) FILTER (WHERE result > 0)::int AS wins
      FROM ops
      GROUP BY 1, 2
    ) heatmap
  ),
  -- By strategy with daily breakdown (for advanced metrics)
  by_strategy_day AS (
    SELECT json_agg(json_build_object(
      'strategy', strategy,
      'date', d,
      'result', total_result,
      'operations', ops_count,
      'wins', wins
    ) ORDER BY strategy, d) AS arr
    FROM (
      SELECT
        strategy,
        operation_date::date AS d,
        sum(result) AS total_result,
        count(*)::int AS ops_count,
        count(*) FILTER (WHERE result > 0)::int AS wins
      FROM ops
      GROUP BY 1, 2
    ) sd
  )
  SELECT json_build_object(
    'byDay', coalesce(bd.arr, '[]'::json),
    'byDowHour', coalesce(bdh.arr, '[]'::json),
    'byStrategyDay', coalesce(bsd.arr, '[]'::json)
  ) INTO v_result
  FROM by_day bd, by_dow_hour bdh, by_strategy_day bsd;

  RETURN v_result;
END;
$$;
