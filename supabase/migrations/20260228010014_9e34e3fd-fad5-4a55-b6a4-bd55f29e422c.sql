
-- ============================================
-- BATCH 5: Dead Stock, Clearance Channel, Distortion, Decision Outcomes
-- ============================================

-- 1. Dead Stock Summary RPC
-- Replaces client-side reduce in useDeadStock.ts (lines 106-119)
CREATE OR REPLACE FUNCTION public.get_dead_stock_summary(
  p_tenant_id UUID,
  p_min_inactive_days INTEGER DEFAULT 90
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_items', COUNT(*),
    'total_locked_value', COALESCE(SUM(cash_locked_value), 0),
    'total_stock', COALESCE(SUM(current_stock), 0),
    'by_bucket', json_build_object(
      'slow_moving', json_build_object(
        'items', COUNT(*) FILTER (WHERE days_to_clear >= p_min_inactive_days AND days_to_clear < 180),
        'locked', COALESCE(SUM(cash_locked_value) FILTER (WHERE days_to_clear >= p_min_inactive_days AND days_to_clear < 180), 0),
        'stock', COALESCE(SUM(current_stock) FILTER (WHERE days_to_clear >= p_min_inactive_days AND days_to_clear < 180), 0)
      ),
      'stagnant', json_build_object(
        'items', COUNT(*) FILTER (WHERE days_to_clear >= 180 AND days_to_clear < 365),
        'locked', COALESCE(SUM(cash_locked_value) FILTER (WHERE days_to_clear >= 180 AND days_to_clear < 365), 0),
        'stock', COALESCE(SUM(current_stock) FILTER (WHERE days_to_clear >= 180 AND days_to_clear < 365), 0)
      ),
      'dead_stock', json_build_object(
        'items', COUNT(*) FILTER (WHERE days_to_clear >= 365 OR days_to_clear IS NULL),
        'locked', COALESCE(SUM(cash_locked_value) FILTER (WHERE days_to_clear >= 365 OR days_to_clear IS NULL), 0),
        'stock', COALESCE(SUM(current_stock) FILTER (WHERE days_to_clear >= 365 OR days_to_clear IS NULL), 0)
      )
    )
  ) INTO result
  FROM (
    SELECT 
      COALESCE(cl.cash_locked_value, 0) AS cash_locked_value,
      COALESCE(sp.on_hand, 0) AS current_stock,
      COALESCE(cl.days_to_clear, 9999) AS days_to_clear,
      COALESCE(cl.avg_daily_sales, 0) AS avg_daily_sales
    FROM state_cash_lock_daily cl
    LEFT JOIN inv_state_positions sp ON sp.fc_id = cl.product_id AND sp.tenant_id = cl.tenant_id
    WHERE cl.tenant_id = p_tenant_id
      AND (COALESCE(cl.days_to_clear, 9999) >= p_min_inactive_days OR COALESCE(cl.avg_daily_sales, 0) <= 0)
  ) sub;

  RETURN COALESCE(result, '{"total_items":0,"total_locked_value":0,"total_stock":0,"by_bucket":{"slow_moving":{"items":0,"locked":0,"stock":0},"stagnant":{"items":0,"locked":0,"stock":0},"dead_stock":{"items":0,"locked":0,"stock":0}}}'::json);
END;
$$;

-- 2. Clearance By Channel RPC
-- Replaces client-side reduce in useClearanceIntelligence.ts useClearanceByChannel
CREATE OR REPLACE FUNCTION public.get_clearance_by_channel(p_tenant_id UUID)
RETURNS TABLE(
  channel TEXT,
  total_units BIGINT,
  total_revenue NUMERIC,
  total_discount NUMERIC,
  record_count BIGINT,
  avg_discount_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(h.channel, 'Unknown') AS channel,
    COALESCE(SUM(h.units_sold), 0)::BIGINT AS total_units,
    COALESCE(SUM(h.revenue_collected), 0) AS total_revenue,
    COALESCE(SUM(h.total_discount_given), 0) AS total_discount,
    COUNT(*)::BIGINT AS record_count,
    CASE 
      WHEN COALESCE(SUM(h.revenue_collected), 0) + COALESCE(SUM(h.total_discount_given), 0) > 0 
      THEN ROUND((COALESCE(SUM(h.total_discount_given), 0) / (COALESCE(SUM(h.revenue_collected), 0) + COALESCE(SUM(h.total_discount_given), 0))) * 100)
      ELSE 0 
    END AS avg_discount_pct
  FROM v_clearance_history_by_fc h
  WHERE h.tenant_id = p_tenant_id
  GROUP BY COALESCE(h.channel, 'Unknown')
  ORDER BY total_units DESC;
END;
$$;

-- 3. Command Distortion Summary RPC
-- Replaces inline query + reduce in CommandOverviewPage.tsx (lines 34-46)
CREATE OR REPLACE FUNCTION public.get_command_distortion_summary(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'avg_score', COALESCE(AVG(distortion_score), 0),
    'total_locked_cash', COALESCE(SUM(locked_cash_estimate), 0)
  ) INTO result
  FROM (
    SELECT distortion_score, locked_cash_estimate
    FROM kpi_inventory_distortion
    WHERE tenant_id = p_tenant_id
    ORDER BY as_of_date DESC
    LIMIT 50
  ) sub;

  RETURN COALESCE(result, '{"avg_score":0,"total_locked_cash":0}'::json);
END;
$$;

-- 4. Decision Outcomes Summary RPC
-- Replaces client-side reduce in DecisionOutcomesPage.tsx (lines 74-80)
CREATE OR REPLACE FUNCTION public.get_decision_outcomes_summary(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_evaluated', COUNT(*),
    'avg_accuracy', COALESCE(AVG(accuracy_score), 0),
    'high_accuracy_count', COUNT(*) FILTER (WHERE COALESCE(accuracy_score, 0) >= 0.85),
    'total_predicted_revenue', COALESCE(SUM((predicted_impact->>'revenue_protected')::NUMERIC), 0),
    'total_actual_revenue', COALESCE(SUM((actual_impact->>'revenue_protected')::NUMERIC), 0)
  ) INTO result
  FROM dec_decision_outcomes
  WHERE tenant_id = p_tenant_id;

  RETURN COALESCE(result, '{"total_evaluated":0,"avg_accuracy":0,"high_accuracy_count":0,"total_predicted_revenue":0,"total_actual_revenue":0}'::json);
END;
$$;

-- 5. Marketing Impressions/Clicks Summary RPC
-- Replaces client-side reduce in MarketingModePage.tsx (lines 138-139)
CREATE OR REPLACE FUNCTION public.get_marketing_impressions_clicks(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_impressions', COALESCE(SUM(impressions), 0),
    'total_clicks', COALESCE(SUM(clicks), 0)
  ) INTO result
  FROM ad_spend_daily
  WHERE tenant_id = p_tenant_id;

  RETURN COALESCE(result, '{"total_impressions":0,"total_clicks":0}'::json);
END;
$$;
