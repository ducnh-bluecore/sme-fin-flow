-- PHASE 1: Drop 16 unused views
DROP VIEW IF EXISTS balance_sheet_summary CASCADE;
DROP VIEW IF EXISTS channel_performance_summary CASCADE;
DROP VIEW IF EXISTS daily_channel_revenue CASCADE;
DROP VIEW IF EXISTS fdp_channel_summary CASCADE;
DROP VIEW IF EXISTS fdp_daily_metrics CASCADE;
DROP VIEW IF EXISTS fdp_expense_summary CASCADE;
DROP VIEW IF EXISTS fdp_invoice_summary CASCADE;
DROP VIEW IF EXISTS fdp_monthly_metrics CASCADE;
DROP VIEW IF EXISTS pl_summary CASCADE;
DROP VIEW IF EXISTS trial_balance CASCADE;
DROP VIEW IF EXISTS unified_decision_history CASCADE;
DROP VIEW IF EXISTS v_audit_auto_reconcile_evidence CASCADE;
DROP VIEW IF EXISTS v_audit_risk_breaches CASCADE;
DROP VIEW IF EXISTS v_audit_summary CASCADE;
DROP VIEW IF EXISTS v_cdp_data_quality_latest CASCADE;
DROP VIEW IF EXISTS v_cdp_overview_stats CASCADE;

-- PHASE 5: Create SSOT Base Metrics View (using actual cdp_orders columns)
CREATE OR REPLACE VIEW v_base_order_metrics WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as unique_customers,
  SUM(COALESCE(gross_revenue, 0)) as gross_revenue,
  SUM(COALESCE(net_revenue, 0)) as net_revenue,
  SUM(COALESCE(cogs, 0)) as total_cogs,
  SUM(COALESCE(gross_margin, 0)) as gross_profit,
  SUM(COALESCE(discount_amount, 0)) as total_discounts,
  CASE WHEN COUNT(*) > 0 
    THEN SUM(COALESCE(net_revenue, 0)) / COUNT(*) 
    ELSE 0 
  END as avg_order_value
FROM cdp_orders
GROUP BY tenant_id;

COMMENT ON VIEW v_base_order_metrics IS 'SSOT Base Layer: Single source for all order aggregations across FDP/MDP/CDP';

-- Create performance index
CREATE INDEX IF NOT EXISTS idx_cdp_orders_tenant_metrics 
ON cdp_orders(tenant_id, order_at, net_revenue, gross_margin);

COMMENT ON SCHEMA public IS 'SSOT Cleanup: Removed 16 redundant views, added v_base_order_metrics on 2026-01-26';