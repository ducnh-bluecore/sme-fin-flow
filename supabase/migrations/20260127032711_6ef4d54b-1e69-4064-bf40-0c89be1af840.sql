-- PHASE 4: Locked Cash Position Dashboard (Fixed all column names)
-- Add locked cash columns to central_metrics_snapshots and update compute function

-- PART 1: Add locked cash columns to central_metrics_snapshots table
ALTER TABLE central_metrics_snapshots 
  ADD COLUMN IF NOT EXISTS locked_cash_inventory NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_cash_ads NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_cash_ops NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_cash_platform NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_cash_total NUMERIC(15,2) DEFAULT 0;

-- PART 2: Create v_locked_cash_detail view for drill-down capability
CREATE OR REPLACE VIEW v_locked_cash_detail AS
-- Inventory Lock: Products with stock holding value
SELECT
  p.tenant_id,
  'inventory'::text AS lock_type,
  p.sku,
  p.name AS product_name,
  COALESCE(p.current_stock * p.cost_price, 0) AS locked_amount,
  p.current_stock AS quantity,
  CASE 
    WHEN p.last_sale_date IS NULL OR p.last_sale_date < CURRENT_DATE - INTERVAL '90 days' THEN 'slow_moving'
    ELSE 'active'
  END AS status,
  p.last_sale_date AS reference_date
FROM products p
WHERE p.current_stock > 0 AND p.is_active = true

UNION ALL

-- Ads Float: Recent marketing spend not yet converted to revenue
SELECT
  me.tenant_id,
  'ads'::text AS lock_type,
  me.channel AS sku,
  COALESCE(me.campaign_name, me.channel || ' Ads') AS product_name,
  me.amount AS locked_amount,
  NULL::numeric AS quantity,
  CASE 
    WHEN me.expense_date > CURRENT_DATE - INTERVAL '14 days' THEN 'pending'
    ELSE 'settled'
  END AS status,
  me.expense_date AS reference_date
FROM marketing_expenses me
WHERE me.expense_date > CURRENT_DATE - INTERVAL '30 days'

UNION ALL

-- Ops Float: Pending logistics/shipping bills (using expense_category)
SELECT
  b.tenant_id,
  'ops'::text AS lock_type,
  b.bill_number AS sku,
  b.vendor_name AS product_name,
  COALESCE(b.total_amount - COALESCE(b.paid_amount, 0), 0) AS locked_amount,
  NULL::numeric AS quantity,
  b.status AS status,
  b.bill_date AS reference_date
FROM bills b
WHERE b.status IN ('pending', 'partial', 'overdue')
  AND b.expense_category IN ('shipping', 'logistics', 'fulfillment', 'delivery')

UNION ALL

-- Platform Hold: eCommerce orders awaiting settlement (T+14)
SELECT
  o.tenant_id,
  'platform'::text AS lock_type,
  o.channel AS sku,
  'eCommerce Settlement Hold' AS product_name,
  COALESCE(SUM(o.net_revenue * 0.85), 0) AS locked_amount,
  COUNT(*)::numeric AS quantity,
  'pending_settlement' AS status,
  MAX(o.order_at)::date AS reference_date
FROM cdp_orders o
WHERE o.order_at > CURRENT_DATE - INTERVAL '14 days'
  AND LOWER(o.channel) IN ('shopee', 'lazada', 'tiktok shop', 'tiktok')
GROUP BY o.tenant_id, o.channel;

-- PART 3: Update compute_central_metrics_snapshot to calculate locked cash
CREATE OR REPLACE FUNCTION public.compute_central_metrics_snapshot(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_days_in_period INTEGER;
  
  -- Revenue metrics
  v_net_revenue NUMERIC := 0;
  v_gross_profit NUMERIC := 0;
  v_total_cogs NUMERIC := 0;
  v_daily_revenue NUMERIC := 0;
  v_daily_cogs NUMERIC := 0;
  v_annual_cogs NUMERIC := 0;
  
  -- Cash metrics
  v_cash_today NUMERIC := 0;
  v_cash_7d_forecast NUMERIC := 0;
  
  -- AR/AP metrics
  v_total_ar NUMERIC := 0;
  v_overdue_ar NUMERIC := 0;
  v_total_ap NUMERIC := 0;
  v_overdue_ap NUMERIC := 0;
  v_ar_current NUMERIC := 0;
  v_ar_30d NUMERIC := 0;
  v_ar_60d NUMERIC := 0;
  v_ar_90d NUMERIC := 0;
  
  -- Inventory
  v_inventory_value NUMERIC := 0;
  v_slow_inventory NUMERIC := 0;
  
  -- Locked Cash (Phase 4)
  v_locked_inventory NUMERIC := 0;
  v_locked_ads NUMERIC := 0;
  v_locked_ops NUMERIC := 0;
  v_locked_platform NUMERIC := 0;
  v_locked_total NUMERIC := 0;
  
  -- Expense metrics
  v_total_opex NUMERIC := 0;
  v_marketing_spend NUMERIC := 0;
  v_variable_costs NUMERIC := 0;
  
  -- Computed metrics
  v_contribution_margin NUMERIC := 0;
  v_ebitda NUMERIC := 0;
  v_gross_margin_pct NUMERIC := 0;
  v_contribution_margin_pct NUMERIC := 0;
  v_ebitda_margin_pct NUMERIC := 0;
  v_dso NUMERIC := 0;
  v_dpo NUMERIC := 0;
  v_dio NUMERIC := 0;
  v_ccc NUMERIC := 0;
  
  -- Order metrics
  v_total_orders INTEGER := 0;
  v_total_customers INTEGER := 0;
  v_avg_order_value NUMERIC := 0;
BEGIN
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '90 days');
  v_days_in_period := GREATEST((v_end_date - v_start_date)::INTEGER, 1);

  -- 1. Revenue from cdp_orders
  SELECT 
    COALESCE(SUM(net_revenue), 0),
    COALESCE(SUM(gross_margin), 0),
    COALESCE(SUM(cogs), 0),
    COUNT(*),
    COUNT(DISTINCT customer_id)
  INTO v_net_revenue, v_gross_profit, v_total_cogs, v_total_orders, v_total_customers
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at::date BETWEEN v_start_date AND v_end_date;

  v_daily_revenue := v_net_revenue / v_days_in_period;
  v_daily_cogs := v_total_cogs / v_days_in_period;
  v_avg_order_value := CASE WHEN v_total_orders > 0 THEN v_net_revenue / v_total_orders ELSE 0 END;
  v_annual_cogs := v_total_cogs * (365.0 / v_days_in_period);

  -- 2. Cash from bank_accounts
  SELECT COALESCE(SUM(current_balance), 0)
  INTO v_cash_today
  FROM bank_accounts
  WHERE tenant_id = p_tenant_id AND status = 'active';

  v_cash_7d_forecast := v_cash_today;

  -- 3. AR from invoices with aging buckets
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue', 'partial') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('sent', 'partial')) THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 60 AND due_date >= CURRENT_DATE - 90 THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ar, v_overdue_ar, v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d
  FROM invoices
  WHERE tenant_id = p_tenant_id AND status IN ('sent', 'overdue', 'partial');

  -- 4. AP from bills
  SELECT 
    COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue', 'partial') THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'overdue' OR (due_date < CURRENT_DATE AND status IN ('pending', 'partial')) THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END), 0)
  INTO v_total_ap, v_overdue_ap
  FROM bills
  WHERE tenant_id = p_tenant_id;

  -- 5. Inventory from products
  SELECT COALESCE(SUM(current_stock * cost_price), 0)
  INTO v_inventory_value
  FROM products
  WHERE tenant_id = p_tenant_id AND is_active = true;
  
  SELECT COALESCE(SUM(current_stock * cost_price), 0)
  INTO v_slow_inventory
  FROM products
  WHERE tenant_id = p_tenant_id 
    AND is_active = true
    AND (last_sale_date IS NULL OR last_sale_date < CURRENT_DATE - INTERVAL '90 days');

  -- 6. PHASE 4: Locked Cash Calculations (DB-First)
  v_locked_inventory := v_inventory_value;
  
  SELECT COALESCE(SUM(amount), 0)
  INTO v_locked_ads
  FROM marketing_expenses
  WHERE tenant_id = p_tenant_id
    AND expense_date > CURRENT_DATE - INTERVAL '14 days';
  
  -- Use expense_category instead of category
  SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
  INTO v_locked_ops
  FROM bills
  WHERE tenant_id = p_tenant_id
    AND status IN ('pending', 'partial', 'overdue')
    AND expense_category IN ('shipping', 'logistics', 'fulfillment', 'delivery');
  
  SELECT COALESCE(SUM(net_revenue), 0) * 0.85
  INTO v_locked_platform
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at > CURRENT_DATE - INTERVAL '14 days'
    AND LOWER(channel) IN ('shopee', 'lazada', 'tiktok shop', 'tiktok');
  
  v_locked_total := v_locked_inventory + v_locked_ads + v_locked_ops + v_locked_platform;

  -- 7. Expenses
  SELECT 
    COALESCE(SUM(CASE WHEN category::text IN ('salary', 'rent', 'utilities', 'other') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category::text = 'marketing' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category::text IN ('logistics', 'marketing') THEN amount ELSE 0 END), 0)
  INTO v_total_opex, v_marketing_spend, v_variable_costs
  FROM expenses
  WHERE tenant_id = p_tenant_id AND expense_date BETWEEN v_start_date AND v_end_date;

  -- 8. Computed metrics
  v_contribution_margin := v_gross_profit - v_variable_costs;
  v_ebitda := v_gross_profit - v_total_opex;
  
  IF v_net_revenue > 0 THEN
    v_gross_margin_pct := (v_gross_profit / v_net_revenue) * 100;
    v_contribution_margin_pct := (v_contribution_margin / v_net_revenue) * 100;
    v_ebitda_margin_pct := (v_ebitda / v_net_revenue) * 100;
  END IF;

  -- 9. Cash cycle metrics
  IF v_daily_revenue > 0 THEN
    v_dso := LEAST(v_total_ar / v_daily_revenue, 365);
  END IF;
  
  IF v_annual_cogs > 0 THEN
    v_dio := LEAST((v_inventory_value / v_annual_cogs) * 365, 365);
    v_dpo := LEAST((v_total_ap / v_annual_cogs) * 365, 365);
  END IF;
  
  v_ccc := v_dso + v_dio - v_dpo;

  v_snapshot_id := gen_random_uuid();

  INSERT INTO central_metrics_snapshots (
    id, tenant_id, snapshot_at, period_start, period_end,
    net_revenue, gross_profit, contribution_margin, ebitda,
    gross_margin_percent, contribution_margin_percent, ebitda_margin_percent,
    cash_today, cash_7d_forecast, total_ar, overdue_ar, total_ap, overdue_ap,
    total_inventory_value, slow_moving_inventory,
    dso, dpo, dio, ccc,
    total_marketing_spend, total_orders, avg_order_value, total_customers,
    ar_aging_current, ar_aging_30d, ar_aging_60d, ar_aging_90d,
    locked_cash_inventory, locked_cash_ads, locked_cash_ops, locked_cash_platform, locked_cash_total,
    created_at
  ) VALUES (
    v_snapshot_id, p_tenant_id, NOW(), v_start_date, v_end_date,
    v_net_revenue, v_gross_profit, v_contribution_margin, v_ebitda,
    v_gross_margin_pct, v_contribution_margin_pct, v_ebitda_margin_pct,
    v_cash_today, v_cash_7d_forecast, v_total_ar, v_overdue_ar, v_total_ap, v_overdue_ap,
    v_inventory_value, v_slow_inventory,
    v_dso, v_dpo, v_dio, v_ccc,
    v_marketing_spend, v_total_orders, v_avg_order_value, v_total_customers,
    v_ar_current, v_ar_30d, v_ar_60d, v_ar_90d,
    v_locked_inventory, v_locked_ads, v_locked_ops, v_locked_platform, v_locked_total,
    NOW()
  )
  ON CONFLICT (tenant_id, snapshot_at) 
  DO UPDATE SET
    period_start = EXCLUDED.period_start, period_end = EXCLUDED.period_end,
    net_revenue = EXCLUDED.net_revenue, gross_profit = EXCLUDED.gross_profit,
    contribution_margin = EXCLUDED.contribution_margin, ebitda = EXCLUDED.ebitda,
    gross_margin_percent = EXCLUDED.gross_margin_percent,
    contribution_margin_percent = EXCLUDED.contribution_margin_percent,
    ebitda_margin_percent = EXCLUDED.ebitda_margin_percent,
    cash_today = EXCLUDED.cash_today, cash_7d_forecast = EXCLUDED.cash_7d_forecast,
    total_ar = EXCLUDED.total_ar, overdue_ar = EXCLUDED.overdue_ar,
    total_ap = EXCLUDED.total_ap, overdue_ap = EXCLUDED.overdue_ap,
    total_inventory_value = EXCLUDED.total_inventory_value,
    slow_moving_inventory = EXCLUDED.slow_moving_inventory,
    dso = EXCLUDED.dso, dpo = EXCLUDED.dpo, dio = EXCLUDED.dio, ccc = EXCLUDED.ccc,
    total_marketing_spend = EXCLUDED.total_marketing_spend,
    total_orders = EXCLUDED.total_orders, avg_order_value = EXCLUDED.avg_order_value,
    total_customers = EXCLUDED.total_customers,
    ar_aging_current = EXCLUDED.ar_aging_current, ar_aging_30d = EXCLUDED.ar_aging_30d,
    ar_aging_60d = EXCLUDED.ar_aging_60d, ar_aging_90d = EXCLUDED.ar_aging_90d,
    locked_cash_inventory = EXCLUDED.locked_cash_inventory,
    locked_cash_ads = EXCLUDED.locked_cash_ads,
    locked_cash_ops = EXCLUDED.locked_cash_ops,
    locked_cash_platform = EXCLUDED.locked_cash_platform,
    locked_cash_total = EXCLUDED.locked_cash_total,
    created_at = NOW();

  RETURN v_snapshot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_central_metrics_snapshot(UUID, DATE, DATE) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_products_tenant_stock ON products(tenant_id, current_stock) WHERE current_stock > 0;
CREATE INDEX IF NOT EXISTS idx_bills_tenant_status_expense_category ON bills(tenant_id, status, expense_category);

COMMENT ON VIEW v_locked_cash_detail IS 'FDP Phase 4: Drill-down view for locked cash breakdown by type (inventory, ads, ops, platform)';