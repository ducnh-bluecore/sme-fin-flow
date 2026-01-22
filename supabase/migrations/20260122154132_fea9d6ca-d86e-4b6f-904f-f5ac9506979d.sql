
-- =====================================================
-- UPGRADE MVs TO FULL SPEC FOR 25 INSIGHTS
-- =====================================================

-- Drop existing MVs to recreate with full columns
DROP MATERIALIZED VIEW IF EXISTS mv_cdp_segment_metrics_rolling CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_cdp_cohort_metrics_rolling CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_cdp_value_tier_metrics_rolling CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_cdp_data_quality_daily CASCADE;

-- =====================================================
-- MV2: mv_cdp_segment_metrics_rolling (FULL SPEC)
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
    inter_purchase_days
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

  -- AOV distribution (decision-grade)
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

  -- refund rate (population-level weighted)
  (SUM(m.refund_amount) / NULLIF(SUM(m.net_revenue) + SUM(m.refund_amount),0))::numeric AS refund_rate

FROM members mem
JOIN m
  ON m.tenant_id = mem.tenant_id
 AND m.as_of_date = mem.as_of_date
 AND m.customer_id = mem.customer_id
GROUP BY
  mem.tenant_id, mem.as_of_date, mem.segment_id, mem.segment_version, m.window_days;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_seg_roll_unique 
ON mv_cdp_segment_metrics_rolling (tenant_id, as_of_date, segment_id, segment_version, window_days);

CREATE INDEX idx_mv_seg_roll_lookup
ON mv_cdp_segment_metrics_rolling (tenant_id, segment_id, as_of_date);

-- =====================================================
-- MV3: mv_cdp_cohort_metrics_rolling (FULL SPEC)
-- =====================================================
CREATE MATERIALIZED VIEW mv_cdp_cohort_metrics_rolling AS
WITH members AS (
  SELECT
    tenant_id,
    as_of_date,
    cohort_id,
    customer_id
  FROM cdp_cohort_membership_daily
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
    inter_purchase_days
  FROM cdp_customer_metrics_rolling
)
SELECT
  mem.tenant_id,
  mem.as_of_date,
  mem.cohort_id,
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
  (SUM(m.refund_amount) / NULLIF(SUM(m.net_revenue) + SUM(m.refund_amount),0))::numeric AS refund_rate

FROM members mem
JOIN m
  ON m.tenant_id = mem.tenant_id
 AND m.as_of_date = mem.as_of_date
 AND m.customer_id = mem.customer_id
GROUP BY
  mem.tenant_id, mem.as_of_date, mem.cohort_id, m.window_days;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_cohort_roll_unique 
ON mv_cdp_cohort_metrics_rolling (tenant_id, as_of_date, cohort_id, window_days);

CREATE INDEX idx_mv_cohort_roll_lookup
ON mv_cdp_cohort_metrics_rolling (tenant_id, cohort_id, as_of_date);

-- =====================================================
-- MV5: mv_cdp_value_tier_metrics_rolling (FULL SPEC)
-- Using MV4 inline for tier assignment
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
    inter_purchase_days
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

  -- volatility proxy: stddev of per-customer net revenue
  stddev_samp(m.net_revenue)::numeric AS spend_stddev,

  -- churn risk placeholder (will be computed by insight detection logic)
  NULL::numeric AS churn_risk_index

FROM tier_assign t
JOIN m
  ON m.tenant_id = t.tenant_id
 AND m.as_of_date = t.as_of_date
 AND m.customer_id = t.customer_id
GROUP BY
  t.tenant_id, t.as_of_date, t.tier_label, m.window_days;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_tier_roll_unique 
ON mv_cdp_value_tier_metrics_rolling (tenant_id, as_of_date, tier_label, window_days);

CREATE INDEX idx_mv_tier_roll_lookup
ON mv_cdp_value_tier_metrics_rolling (tenant_id, tier_label, as_of_date);

-- =====================================================
-- MV6: mv_cdp_data_quality_daily (FULL SPEC)
-- =====================================================
CREATE MATERIALIZED VIEW mv_cdp_data_quality_daily AS
WITH o AS (
  SELECT
    tenant_id,
    order_at::date AS as_of_date,
    COUNT(*)::numeric AS orders_total,
    SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END)::numeric AS orders_with_customer,
    SUM(CASE WHEN cogs > 0 THEN 1 ELSE 0 END)::numeric AS orders_with_cogs
  FROM cdp_orders
  GROUP BY 1,2
),
r AS (
  SELECT
    tenant_id,
    refund_at::date AS as_of_date,
    COUNT(*)::numeric AS refunds_total,
    SUM(CASE WHEN order_id IS NOT NULL THEN 1 ELSE 0 END)::numeric AS refunds_mapped_to_order,
    SUM(CASE WHEN customer_id IS NOT NULL THEN 1 ELSE 0 END)::numeric AS refunds_mapped_to_customer
  FROM cdp_refunds
  GROUP BY 1,2
)
SELECT
  o.tenant_id,
  o.as_of_date,

  (o.orders_with_customer / NULLIF(o.orders_total,0))::numeric AS identity_coverage,
  (o.orders_with_cogs / NULLIF(o.orders_total,0))::numeric AS cogs_coverage,

  COALESCE((r.refunds_mapped_to_order / NULLIF(r.refunds_total,0)), 1)::numeric AS refund_order_mapping_coverage,
  COALESCE((r.refunds_mapped_to_customer / NULLIF(r.refunds_total,0)), 1)::numeric AS refund_customer_mapping_coverage,

  jsonb_build_object(
    'orders_total', o.orders_total,
    'orders_with_customer', o.orders_with_customer,
    'orders_with_cogs', o.orders_with_cogs,
    'refunds_total', COALESCE(r.refunds_total,0),
    'refunds_mapped_to_order', COALESCE(r.refunds_mapped_to_order,0),
    'refunds_mapped_to_customer', COALESCE(r.refunds_mapped_to_customer,0)
  ) AS diagnostics

FROM o
LEFT JOIN r
  ON r.tenant_id = o.tenant_id
 AND r.as_of_date = o.as_of_date;

-- Unique index for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_dq_daily_unique
ON mv_cdp_data_quality_daily (tenant_id, as_of_date);
