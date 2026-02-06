
# HOÀN THÀNH 3 FACADE VIEWS CÒN THIẾU

## PHÂN TÍCH HIỆN TRẠNG

### Views/Tables đã tồn tại có thể sử dụng làm nguồn:

| Facade View cần tạo | Source Tables/Views hiện có |
|---------------------|----------------------------|
| `v_fdp_truth_snapshot` | `central_metrics_snapshots` (đầy đủ FDP metrics), `v_fdp_finance_summary` |
| `v_mdp_truth_snapshot` | `v_mdp_campaign_performance`, `v_mdp_ceo_snapshot`, `promotion_campaigns` |
| `v_cdp_truth_snapshot` | `v_cdp_equity_overview`, `v_cdp_population_summary`, `cdp_customers` |

### Đã có sẵn:
- `v_ct_truth_snapshot` - Control Tower (đã tạo Phase 4)
- `metric_contracts` table (đã tạo Phase 4)
- `v_decision_outcome_stats` (đã tạo Phase 4)

---

## MIGRATION: TẠO 3 FACADE VIEWS

### 1. v_fdp_truth_snapshot (FDP Dashboard Entry Point)

Nguồn: `central_metrics_snapshots` + `v_fdp_finance_summary`

```sql
CREATE OR REPLACE VIEW public.v_fdp_truth_snapshot AS
WITH latest_snapshot AS (
  SELECT DISTINCT ON (tenant_id) *
  FROM central_metrics_snapshots
  ORDER BY tenant_id, snapshot_at DESC
)
SELECT 
  ls.tenant_id,
  ls.snapshot_at,
  ls.period_start,
  ls.period_end,
  
  -- P&L Metrics
  COALESCE(ls.net_revenue, 0) as net_revenue,
  COALESCE(ls.gross_profit, 0) as gross_profit,
  COALESCE(ls.gross_margin_percent, 0) as gross_margin_pct,
  COALESCE(ls.contribution_margin, 0) as contribution_margin,
  COALESCE(ls.contribution_margin_percent, 0) as contribution_margin_pct,
  COALESCE(ls.ebitda, 0) as ebitda,
  
  -- Cash Position
  COALESCE(ls.cash_today, 0) as cash_in_bank,
  COALESCE(ls.cash_7d_forecast, 0) as cash_forecast_7d,
  COALESCE(ls.cash_runway_months, 0) as runway_months,
  
  -- Locked Cash
  COALESCE(ls.locked_cash_inventory, 0) as locked_cash_inventory,
  COALESCE(ls.locked_cash_ads, 0) as locked_cash_ads,
  COALESCE(ls.locked_cash_ops, 0) as locked_cash_ops,
  COALESCE(ls.locked_cash_total, 0) as locked_cash_total,
  
  -- AR/AP
  COALESCE(ls.total_ar, 0) as accounts_receivable,
  COALESCE(ls.overdue_ar, 0) as ar_overdue,
  COALESCE(ls.total_ap, 0) as accounts_payable,
  COALESCE(ls.overdue_ap, 0) as ap_overdue,
  
  -- Working Capital Cycle
  COALESCE(ls.dso, 0) as dso,
  COALESCE(ls.dpo, 0) as dpo,
  COALESCE(ls.dio, 0) as dio,
  COALESCE(ls.ccc, 0) as cash_conversion_cycle,
  
  -- Orders
  COALESCE(ls.total_orders, 0) as total_orders,
  COALESCE(ls.avg_order_value, 0) as aov
  
FROM latest_snapshot ls;
```

### 2. v_mdp_truth_snapshot (MDP Dashboard Entry Point)

Nguồn: `v_mdp_campaign_performance` + `promotion_campaigns`

```sql
CREATE OR REPLACE VIEW public.v_mdp_truth_snapshot AS
WITH campaign_agg AS (
  SELECT 
    tenant_id,
    SUM(spend) as total_ad_spend,
    SUM(revenue) as total_revenue_attributed,
    SUM(orders) as total_orders,
    SUM(impressions_estimated) as total_impressions,
    SUM(clicks_estimated) as total_clicks
  FROM v_mdp_campaign_performance
  WHERE status = 'active' OR status IS NULL
  GROUP BY tenant_id
),
channel_breakdown AS (
  SELECT 
    tenant_id,
    jsonb_object_agg(
      channel,
      jsonb_build_object(
        'spend', channel_spend,
        'revenue', channel_revenue,
        'orders', channel_orders,
        'roas', CASE WHEN channel_spend > 0 THEN ROUND(channel_revenue / channel_spend, 2) ELSE 0 END
      )
    ) as breakdown
  FROM (
    SELECT 
      tenant_id,
      channel,
      SUM(spend) as channel_spend,
      SUM(revenue) as channel_revenue,
      SUM(orders) as channel_orders
    FROM v_mdp_campaign_performance
    GROUP BY tenant_id, channel
  ) by_channel
  GROUP BY tenant_id
)
SELECT 
  ca.tenant_id,
  CURRENT_DATE as snapshot_date,
  
  -- Spend & Revenue
  COALESCE(ca.total_ad_spend, 0) as total_ad_spend,
  COALESCE(ca.total_revenue_attributed, 0) as revenue_attributed,
  
  -- Performance Ratios
  CASE WHEN ca.total_ad_spend > 0 
    THEN ROUND(ca.total_revenue_attributed / ca.total_ad_spend, 2)
    ELSE 0 
  END as blended_roas,
  
  COALESCE(ca.total_orders, 0) as total_orders,
  
  CASE WHEN ca.total_orders > 0 
    THEN ROUND(ca.total_ad_spend / ca.total_orders, 0)
    ELSE 0 
  END as cpa,
  
  -- Funnel Metrics
  COALESCE(ca.total_impressions, 0) as impressions,
  COALESCE(ca.total_clicks, 0) as clicks,
  CASE WHEN ca.total_impressions > 0 
    THEN ROUND((ca.total_clicks::numeric / ca.total_impressions) * 100, 2)
    ELSE 0 
  END as ctr_pct,
  
  -- Channel Breakdown (JSONB)
  COALESCE(cb.breakdown, '{}'::jsonb) as channel_breakdown,
  
  now() as snapshot_at

FROM campaign_agg ca
LEFT JOIN channel_breakdown cb ON ca.tenant_id = cb.tenant_id;
```

### 3. v_cdp_truth_snapshot (CDP Dashboard Entry Point)

Nguồn: `v_cdp_equity_overview` + `v_cdp_population_summary` + `cdp_customers`

```sql
CREATE OR REPLACE VIEW public.v_cdp_truth_snapshot AS
WITH customer_counts AS (
  SELECT 
    tenant_id,
    COUNT(*) as total_customers,
    COUNT(*) FILTER (WHERE status = 'active') as active_customers,
    COUNT(*) FILTER (WHERE churn_risk_score >= 0.7) as at_risk_customers
  FROM cdp_customers
  GROUP BY tenant_id
),
equity_data AS (
  SELECT 
    tenant_id,
    total_equity_12m,
    total_equity_24m,
    avg_equity_12m as avg_ltv,
    at_risk_value,
    at_risk_percent
  FROM v_cdp_equity_overview
)
SELECT 
  cc.tenant_id,
  
  -- Customer Counts
  COALESCE(cc.total_customers, 0) as total_customers,
  COALESCE(cc.active_customers, 0) as active_customers,
  COALESCE(cc.at_risk_customers, 0) as at_risk_customers,
  
  -- Equity
  COALESCE(ed.total_equity_12m, 0) as total_equity_12m,
  COALESCE(ed.total_equity_24m, 0) as total_equity_24m,
  COALESCE(ed.at_risk_value, 0) as at_risk_value,
  
  -- Ratios
  CASE WHEN cc.total_customers > 0 
    THEN ROUND((cc.at_risk_customers::numeric / cc.total_customers) * 100, 2)
    ELSE 0 
  END as at_risk_pct,
  
  -- LTV
  COALESCE(ed.avg_ltv, 0) as avg_ltv,
  
  -- LTV/CAC (cần join với central_metrics)
  COALESCE(
    (SELECT ltv_cac_ratio FROM central_metrics_snapshots cms 
     WHERE cms.tenant_id = cc.tenant_id 
     ORDER BY snapshot_at DESC LIMIT 1), 
    0
  ) as ltv_cac_ratio,
  
  now() as snapshot_at

FROM customer_counts cc
LEFT JOIN equity_data ed ON cc.tenant_id = ed.tenant_id;
```

---

## FILES TO CREATE/MODIFY

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/YYYYMMDD_facade_views_complete.sql` | CREATE | 3 facade views + grants |

---

## SQL MIGRATION SCRIPT

```sql
-- ============================================
-- FACADE VIEWS COMPLETION
-- Phase 4 Continuation - 3 remaining views
-- ============================================

-- 1. FDP TRUTH SNAPSHOT
CREATE OR REPLACE VIEW public.v_fdp_truth_snapshot 
WITH (security_invoker = on) AS
[... SQL from above ...]

-- 2. MDP TRUTH SNAPSHOT  
CREATE OR REPLACE VIEW public.v_mdp_truth_snapshot
WITH (security_invoker = on) AS
[... SQL from above ...]

-- 3. CDP TRUTH SNAPSHOT
CREATE OR REPLACE VIEW public.v_cdp_truth_snapshot
WITH (security_invoker = on) AS
[... SQL from above ...]

-- Grants
GRANT SELECT ON public.v_fdp_truth_snapshot TO authenticated, anon;
GRANT SELECT ON public.v_mdp_truth_snapshot TO authenticated, anon;
GRANT SELECT ON public.v_cdp_truth_snapshot TO authenticated, anon;

-- Comments
COMMENT ON VIEW public.v_fdp_truth_snapshot IS 
  'SSOT Facade View: Single entry point for FDP dashboard metrics. Sources from central_metrics_snapshots.';
COMMENT ON VIEW public.v_mdp_truth_snapshot IS 
  'SSOT Facade View: Single entry point for MDP dashboard metrics. Aggregates v_mdp_campaign_performance.';
COMMENT ON VIEW public.v_cdp_truth_snapshot IS 
  'SSOT Facade View: Single entry point for CDP dashboard metrics. Combines v_cdp_equity_overview + customer counts.';
```

---

## SUCCESS CRITERIA

| Check | Verification Query |
|-------|-------------------|
| FDP View exists | `SELECT * FROM v_fdp_truth_snapshot LIMIT 1` |
| MDP View exists | `SELECT * FROM v_mdp_truth_snapshot LIMIT 1` |
| CDP View exists | `SELECT * FROM v_cdp_truth_snapshot LIMIT 1` |
| All 4 facades aligned | `SELECT * FROM information_schema.views WHERE table_name LIKE 'v_%_truth_snapshot'` returns 4 rows |

---

## TECHNICAL NOTES

1. **security_invoker = on**: Views sẽ chạy với quyền của người gọi, không phải người tạo view (RLS áp dụng đúng)

2. **Source Tables Dependency**:
   - `v_fdp_truth_snapshot` → `central_metrics_snapshots` (table)
   - `v_mdp_truth_snapshot` → `v_mdp_campaign_performance` (view)
   - `v_cdp_truth_snapshot` → `v_cdp_equity_overview` (view), `cdp_customers` (table)

3. **No Breaking Changes**: Tất cả views mới, không DROP existing views

4. **JSONB cho Channel Breakdown**: MDP view trả về JSONB để frontend có thể render dynamic charts
