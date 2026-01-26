
-- Fix with all correct column names

-- 1. Create refresh function with correct schema
CREATE OR REPLACE FUNCTION public.refresh_dashboard_kpi_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  FOR v_tenant_id IN 
    SELECT DISTINCT tenant_id FROM cdp_orders
  LOOP
    INSERT INTO dashboard_kpi_cache (
      tenant_id, net_revenue, total_revenue, total_cogs, gross_margin, gross_profit,
      cash_today, total_ar, overdue_ar, auto_match_rate, 
      date_range_start, date_range_end, calculated_at, updated_at
    )
    SELECT 
      v_tenant_id,
      COALESCE(SUM(o.net_revenue), 0),
      COALESCE(SUM(o.gross_revenue), 0),
      COALESCE(SUM(o.cogs), 0),
      CASE WHEN SUM(o.gross_revenue) > 0 
        THEN ROUND(((SUM(o.net_revenue) - SUM(o.cogs)) / SUM(o.gross_revenue) * 100)::numeric, 2)
        ELSE 0 END,
      COALESCE(SUM(o.net_revenue), 0) - COALESCE(SUM(o.cogs), 0),
      COALESCE((SELECT SUM(current_balance) FROM bank_accounts WHERE tenant_id = v_tenant_id), 0),
      COALESCE((SELECT SUM(total_amount - COALESCE(paid_amount, 0)) FROM invoices WHERE tenant_id = v_tenant_id AND status NOT IN ('paid', 'cancelled')), 0),
      COALESCE((SELECT SUM(total_amount - COALESCE(paid_amount, 0)) FROM invoices WHERE tenant_id = v_tenant_id AND status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE), 0),
      -- Use match_status instead of is_matched
      COALESCE((SELECT COUNT(*) FILTER (WHERE match_status = 'matched')::float / NULLIF(COUNT(*), 0) * 100 FROM bank_transactions WHERE tenant_id = v_tenant_id), 0),
      MIN(o.order_at::date),
      MAX(o.order_at::date),
      NOW(),
      NOW()
    FROM cdp_orders o WHERE o.tenant_id = v_tenant_id
    ON CONFLICT (tenant_id) DO UPDATE SET
      net_revenue = EXCLUDED.net_revenue, 
      total_revenue = EXCLUDED.total_revenue,
      total_cogs = EXCLUDED.total_cogs, 
      gross_margin = EXCLUDED.gross_margin,
      gross_profit = EXCLUDED.gross_profit,
      cash_today = EXCLUDED.cash_today, 
      total_ar = EXCLUDED.total_ar,
      overdue_ar = EXCLUDED.overdue_ar, 
      auto_match_rate = EXCLUDED.auto_match_rate,
      date_range_start = EXCLUDED.date_range_start,
      date_range_end = EXCLUDED.date_range_end,
      calculated_at = EXCLUDED.calculated_at,
      updated_at = NOW();
  END LOOP;
END;
$$;

-- 2. Create channel analytics total view
DROP VIEW IF EXISTS public.v_channel_analytics_total;
CREATE VIEW public.v_channel_analytics_total AS
SELECT 
  tenant_id,
  COALESCE(SUM(net_revenue), 0) as net_revenue,
  COALESCE(SUM(gross_revenue), 0) as gross_revenue,
  COALESCE(SUM(total_orders), 0) as total_orders
FROM channel_analytics_cache
GROUP BY tenant_id;

-- 3. Refresh channel_analytics_cache
DELETE FROM channel_analytics_cache;

INSERT INTO channel_analytics_cache (
  tenant_id, total_orders, gross_revenue, net_revenue, total_cogs, 
  gross_profit, avg_order_value, data_start_date, data_end_date, calculated_at
)
SELECT 
  tenant_id,
  COUNT(*)::int,
  COALESCE(SUM(gross_revenue), 0),
  COALESCE(SUM(net_revenue), 0),
  COALESCE(SUM(cogs), 0),
  COALESCE(SUM(net_revenue), 0) - COALESCE(SUM(cogs), 0),
  CASE WHEN COUNT(*) > 0 THEN ROUND((SUM(net_revenue) / COUNT(*))::numeric, 2) ELSE 0 END,
  MIN(order_at::date),
  MAX(order_at::date),
  NOW()
FROM cdp_orders
GROUP BY tenant_id;

-- 4. Refresh dashboard_kpi_cache
SELECT refresh_dashboard_kpi_cache();
