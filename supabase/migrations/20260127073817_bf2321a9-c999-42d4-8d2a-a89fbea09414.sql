-- Fix unique constraint to handle NULLs properly
DROP INDEX IF EXISTS rolling_forecasts_unique_idx;
DROP INDEX IF EXISTS rolling_forecasts_tenant_id_forecast_month_forecast_type_cat_idx;

-- Clean up existing duplicates first (keep the most recent one)
DELETE FROM rolling_forecasts a
USING rolling_forecasts b
WHERE a.ctid < b.ctid
  AND a.tenant_id = b.tenant_id
  AND a.forecast_month = b.forecast_month
  AND a.forecast_type = b.forecast_type
  AND COALESCE(a.category, '') = COALESCE(b.category, '')
  AND COALESCE(a.channel, '') = COALESCE(b.channel, '');

-- Create new unique index that handles NULLs correctly
CREATE UNIQUE INDEX rolling_forecasts_unique_idx 
ON rolling_forecasts (
  tenant_id, 
  forecast_month, 
  forecast_type, 
  COALESCE(category, ''), 
  COALESCE(channel, '')
);

-- Create DB view for SSOT summary (Phase 4)
CREATE OR REPLACE VIEW v_rolling_forecast_summary AS
WITH aggregates AS (
  SELECT 
    tenant_id,
    forecast_type,
    SUM(original_budget) as total_budget,
    SUM(current_forecast) as total_forecast,
    SUM(COALESCE(actual_amount, 0)) as total_actual,
    SUM(variance_amount) as total_variance,
    AVG(CASE confidence_level 
      WHEN 'high' THEN 3 
      WHEN 'medium' THEN 2 
      WHEN 'low' THEN 1 
      ELSE 0 
    END) as avg_confidence
  FROM rolling_forecasts
  GROUP BY tenant_id, forecast_type
),
by_month AS (
  SELECT 
    tenant_id,
    forecast_month,
    SUM(CASE WHEN forecast_type IN ('revenue', 'cash_inflow') 
        THEN current_forecast ELSE 0 END) as revenue,
    SUM(CASE WHEN forecast_type IN ('expense', 'cash_outflow') 
        THEN current_forecast ELSE 0 END) as expense
  FROM rolling_forecasts
  GROUP BY tenant_id, forecast_month
),
accuracy_calc AS (
  SELECT 
    tenant_id,
    CASE 
      WHEN COUNT(*) FILTER (WHERE actual_amount > 0) > 0 THEN
        AVG(
          GREATEST(0, 1 - ABS(current_forecast - actual_amount) / NULLIF(actual_amount, 0)) * 100
        ) FILTER (WHERE actual_amount > 0)
      ELSE 0 
    END as forecast_accuracy
  FROM rolling_forecasts
  GROUP BY tenant_id
)
SELECT 
  a.tenant_id,
  SUM(a.total_budget) as total_budget,
  SUM(a.total_forecast) as total_forecast,
  SUM(a.total_actual) as total_actual,
  SUM(a.total_variance) as total_variance,
  AVG(a.avg_confidence) as average_confidence,
  MAX(CASE WHEN a.forecast_type = 'revenue' THEN a.total_budget END) as revenue_budget,
  MAX(CASE WHEN a.forecast_type = 'revenue' THEN a.total_forecast END) as revenue_forecast,
  MAX(CASE WHEN a.forecast_type = 'revenue' THEN a.total_actual END) as revenue_actual,
  MAX(CASE WHEN a.forecast_type = 'expense' THEN a.total_budget END) as expense_budget,
  MAX(CASE WHEN a.forecast_type = 'expense' THEN a.total_forecast END) as expense_forecast,
  MAX(CASE WHEN a.forecast_type = 'expense' THEN a.total_actual END) as expense_actual,
  acc.forecast_accuracy,
  (
    SELECT COALESCE(json_agg(
      json_build_object(
        'month', m.forecast_month,
        'revenue', m.revenue,
        'expense', m.expense,
        'netCash', m.revenue - m.expense
      ) ORDER BY m.forecast_month
    ), '[]'::json)
    FROM by_month m
    WHERE m.tenant_id = a.tenant_id
  ) as by_month_data
FROM aggregates a
JOIN accuracy_calc acc ON a.tenant_id = acc.tenant_id
GROUP BY a.tenant_id, acc.forecast_accuracy;