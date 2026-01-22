
-- =====================================================
-- PHASE 1: Add missing columns to unlock 20/25 insights
-- =====================================================

-- 1) Add columns to cdp_customer_metrics_rolling for item-level metrics
ALTER TABLE cdp_customer_metrics_rolling 
ADD COLUMN IF NOT EXISTS total_qty integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_item_revenue numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_repeat boolean NOT NULL DEFAULT false;

-- 2) Drop and recreate MVs with new columns

-- Drop dependent MVs first (MV5 depends on MV4)
DROP MATERIALIZED VIEW IF EXISTS mv_cdp_value_tier_metrics_rolling CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_cdp_segment_metrics_rolling CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_cdp_cohort_metrics_rolling CASCADE;

-- =====================================================
-- MV2: mv_cdp_segment_metrics_rolling (PHASE 1 UPGRADE)
-- Added: p25_net_revenue, repeat_rate, median_items_per_order, median_unit_price
-- =====================================================
CREATE MATERIALIZED VIEW mv_cdp_segment_metrics_rolling AS
WITH members AS (
  SELECT
    tenant_id,
    as_of_date,
    segment_id,
    segment_version,
    customer_id
  FROM cdp_segment_membership_daily
  WHERE is_member = true
),
m AS (
  SELECT
    tenant_id,
    as_of_date,
    customer_id,
    window_days,
    orders_count,
    net_revenue,
    gross_margin,
    aov,
    refund_amount,
    return_rate,
    discounted_order_share,
    bundle_order_share,
    cod_order_share,
    inter_purchase_days,
    total_qty,
    total_item_revenue,
    is_repeat,
    -- derived per-customer metrics
    CASE WHEN orders_count > 0 THEN total_qty::numeric / orders_count ELSE 0 END AS items_per_order,
    CASE WHEN total_qty > 0 THEN total_item_revenue / total_qty ELSE 0 END AS unit_price
  FROM cdp_customer_metrics_rolling
)
SELECT
  mem.tenant_id,
  mem.as_of_date,
  mem.segment_id,
  mem.segment_version,
  m.window_days,

  COUNT(*)::int AS n_customers,

  -- sums
  SUM(m.net_revenue)::numeric AS sum_net_revenue,
  SUM(m.gross_margin)::numeric AS sum_gross_margin,
  SUM(m.refund_amount)::numeric AS sum_refund_amount,

  -- per-customer averages
  (SUM(m.net_revenue) / NULLIF(COUNT(*),0))::numeric AS net_revenue_per_customer,
  (SUM(m.gross_margin) / NULLIF(COUNT(*),0))::numeric AS gross_margin_per_customer,
  (SUM(m.orders_count) / NULLIF(COUNT(*),0))::numeric AS orders_per_customer,

  -- AOV distribution
  percentile_cont(0.25) WITHIN GROUP (ORDER BY m.aov) AS p25_aov,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY m.aov) AS median_aov,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY m.aov) AS p75_aov,

  -- NEW: Net revenue distribution (for R03 - bottom25)
  percentile_cont(0.25) WITHIN GROUP (ORDER BY m.net_revenue) AS p25_net_revenue,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY m.net_revenue) AS median_net_revenue,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY m.net_revenue) AS p75_net_revenue,

  -- timing distribution
  percentile_cont(0.25) WITHIN GROUP (ORDER BY m.inter_purchase_days) AS p25_inter_purchase_days,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY m.inter_purchase_days) AS median_inter_purchase_days,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY m.inter_purchase_days) AS p75_inter_purchase_days,
  (percentile_cont(0.75) WITHIN GROUP (ORDER BY m.inter_purchase_days)
   - percentile_cont(0.25) WITHIN GROUP (ORDER BY m.inter_purchase_days)) AS iqr_inter_purchase_days,

  -- NEW: Items per order distribution (for M06)
  percentile_cont(0.50) WITHIN GROUP (ORDER BY m.items_per_order) AS median_items_per_order,

  -- NEW: Unit price distribution (for M06)
  percentile_cont(0.50) WITHIN GROUP (ORDER BY m.unit_price) AS median_unit_price,

  -- mix shares
  AVG(m.discounted_order_share)::numeric AS discounted_order_share,
  AVG(m.bundle_order_share)::numeric AS bundle_order_share,
  AVG(m.cod_order_share)::numeric AS cod_order_share,

  -- refund rate
  (SUM(m.refund_amount) / NULLIF(SUM(m.net_revenue) + SUM(m.refund_amount),0))::numeric AS refund_rate,

  -- NEW: Repeat rate (for T05) - share of customers with 2+ orders
  (COUNT(*) FILTER (WHERE m.is_repeat = true)::numeric / NULLIF(COUNT(*),0))::numeric AS repeat_rate

FROM members mem
JOIN m
  ON m.tenant_id = mem.tenant_id
 AND m.as_of_date = mem.as_of_date
 AND m.customer_id = mem.customer_id
GROUP BY
  mem.tenant_id, mem.as_of_date, mem.segment_id, mem.segment_version, m.window_days;

-- Indexes for MV2
CREATE UNIQUE INDEX idx_mv_seg_roll_unique 
ON mv_cdp_segment_metrics_rolling (tenant_id, as_of_date, segment_id, segment_version, window_days);

CREATE INDEX idx_mv_seg_roll_lookup
ON mv_cdp_segment_metrics_rolling (tenant_id, segment_id, as_of_date);

-- =====================================================
-- MV3: mv_cdp_cohort_metrics_rolling (PHASE 1 UPGRADE)
-- Added: repeat_rate, cohort_type, cohort_key (via join)
-- =====================================================
CREATE MATERIALIZED VIEW mv_cdp_cohort_metrics_rolling AS
WITH members AS (
  SELECT
    cm.tenant_id,
    cm.as_of_date,
    cm.cohort_id,
    cm.customer_id,
    c.cohort_type,
    c.cohort_key
  FROM cdp_cohort_membership_daily cm
  JOIN cdp_cohorts c ON c.id = cm.cohort_id AND c.tenant_id = cm.tenant_id
  WHERE cm.is_member = true
),
m AS (
  SELECT
    tenant_id,
    as_of_date,
    customer_id,
    window_days,
    orders_count,
    net_revenue,
    gross_margin,
    aov,
    refund_amount,
    return_rate,
    discounted_order_share,
    bundle_order_share,
    cod_order_share,
    inter_purchase_days,
    is_repeat
  FROM cdp_customer_metrics_rolling
)
SELECT
  mem.tenant_id,
  mem.as_of_date,
  mem.cohort_id,
  mem.cohort_type,  -- NEW: from cdp_cohorts join
  mem.cohort_key,   -- NEW: from cdp_cohorts join
  m.window_days,

  COUNT(*)::int AS n_customers,

  -- sums
  SUM(m.net_revenue)::numeric AS sum_net_revenue,
  SUM(m.gross_margin)::numeric AS sum_gross_margin,
  SUM(m.refund_amount)::numeric AS sum_refund_amount,

  -- per-customer averages
  (SUM(m.net_revenue) / NULLIF(COUNT(*),0))::numeric AS net_revenue_per_customer,
  (SUM(m.gross_margin) / NULLIF(COUNT(*),0))::numeric AS gross_margin_per_customer,
  (SUM(m.orders_count) / NULLIF(COUNT(*),0))::numeric AS orders_per_customer,

  -- AOV distribution
  percentile_cont(0.25) WITHIN GROUP (ORDER BY m.aov) AS p25_aov,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY m.aov) AS median_aov,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY m.aov) AS p75_aov,

  -- timing distribution
  percentile_cont(0.25) WITHIN GROUP (ORDER BY m.inter_purchase_days) AS p25_inter_purchase_days,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY m.inter_purchase_days) AS median_inter_purchase_days,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY m.inter_purchase_days) AS p75_inter_purchase_days,
  (percentile_cont(0.75) WITHIN GROUP (ORDER BY m.inter_purchase_days)
   - percentile_cont(0.25) WITHIN GROUP (ORDER BY m.inter_purchase_days)) AS iqr_inter_purchase_days,

  -- mix shares
  AVG(m.discounted_order_share)::numeric AS discounted_order_share,
  AVG(m.bundle_order_share)::numeric AS bundle_order_share,
  AVG(m.cod_order_share)::numeric AS cod_order_share,

  -- refund rate
  (SUM(m.refund_amount) / NULLIF(SUM(m.net_revenue) + SUM(m.refund_amount),0))::numeric AS refund_rate,

  -- NEW: Repeat rate (for T05)
  (COUNT(*) FILTER (WHERE m.is_repeat = true)::numeric / NULLIF(COUNT(*),0))::numeric AS repeat_rate

FROM members mem
JOIN m
  ON m.tenant_id = mem.tenant_id
 AND m.as_of_date = mem.as_of_date
 AND m.customer_id = mem.customer_id
GROUP BY
  mem.tenant_id, mem.as_of_date, mem.cohort_id, mem.cohort_type, mem.cohort_key, m.window_days;

-- Indexes for MV3
CREATE UNIQUE INDEX idx_mv_cohort_roll_unique 
ON mv_cdp_cohort_metrics_rolling (tenant_id, as_of_date, cohort_id, window_days);

CREATE INDEX idx_mv_cohort_roll_lookup
ON mv_cdp_cohort_metrics_rolling (tenant_id, cohort_id, as_of_date);

CREATE INDEX idx_mv_cohort_roll_type
ON mv_cdp_cohort_metrics_rolling (tenant_id, cohort_type, cohort_key, as_of_date);

-- =====================================================
-- MV5: mv_cdp_value_tier_metrics_rolling (RECREATE)
-- =====================================================
CREATE MATERIALIZED VIEW mv_cdp_value_tier_metrics_rolling AS
WITH tier_assign AS (
  SELECT
    tenant_id,
    as_of_date,
    customer_id,
    tier_label
  FROM mv_cdp_percentile_value_tiers
),
m AS (
  SELECT
    tenant_id,
    as_of_date,
    customer_id,
    window_days,
    orders_count,
    net_revenue,
    gross_margin,
    aov,
    refund_amount,
    inter_purchase_days,
    is_repeat
  FROM cdp_customer_metrics_rolling
)
SELECT
  t.tenant_id,
  t.as_of_date,
  t.tier_label,
  m.window_days,

  COUNT(*)::int AS n_customers,
  SUM(m.net_revenue)::numeric AS sum_net_revenue,
  SUM(m.gross_margin)::numeric AS sum_gross_margin,
  SUM(m.refund_amount)::numeric AS sum_refund_amount,

  -- per-customer
  (SUM(m.net_revenue) / NULLIF(COUNT(*),0))::numeric AS net_revenue_per_customer,
  (SUM(m.gross_margin) / NULLIF(COUNT(*),0))::numeric AS gross_margin_per_customer,

  -- AOV distribution
  percentile_cont(0.25) WITHIN GROUP (ORDER BY m.aov) AS p25_aov,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY m.aov) AS median_aov,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY m.aov) AS p75_aov,

  -- timing
  percentile_cont(0.50) WITHIN GROUP (ORDER BY m.inter_purchase_days) AS median_inter_purchase_days,

  -- volatility proxy
  stddev_samp(m.net_revenue)::numeric AS spend_stddev,

  -- churn risk placeholder
  NULL::numeric AS churn_risk_index,

  -- repeat rate
  (COUNT(*) FILTER (WHERE m.is_repeat = true)::numeric / NULLIF(COUNT(*),0))::numeric AS repeat_rate

FROM tier_assign t
JOIN m
  ON m.tenant_id = t.tenant_id
 AND m.as_of_date = t.as_of_date
 AND m.customer_id = t.customer_id
GROUP BY
  t.tenant_id, t.as_of_date, t.tier_label, m.window_days;

-- Indexes for MV5
CREATE UNIQUE INDEX idx_mv_tier_roll_unique 
ON mv_cdp_value_tier_metrics_rolling (tenant_id, as_of_date, tier_label, window_days);

CREATE INDEX idx_mv_tier_roll_lookup
ON mv_cdp_value_tier_metrics_rolling (tenant_id, tier_label, as_of_date);
