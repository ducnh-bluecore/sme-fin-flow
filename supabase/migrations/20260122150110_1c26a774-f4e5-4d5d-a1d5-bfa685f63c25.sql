-- ============================================
-- CDP MATERIALIZED VIEWS (Fixed for PostgreSQL compatibility)
-- ============================================

-- MV1: mv_cdp_customer_rolling_windows
CREATE MATERIALIZED VIEW public.mv_cdp_customer_rolling_windows AS
SELECT 
  r.tenant_id,
  r.as_of_date,
  r.customer_id,
  r.window_days,
  r.orders_count,
  r.net_revenue,
  r.gross_margin,
  r.aov,
  r.refund_amount,
  r.return_rate,
  r.discount_share,
  r.discounted_order_share,
  r.bundle_order_share,
  r.cod_order_share,
  r.inter_purchase_days
FROM cdp_customer_metrics_rolling r
WHERE r.window_days IN (30, 60, 90);

CREATE UNIQUE INDEX idx_mv_cdp_rolling_pk ON public.mv_cdp_customer_rolling_windows(tenant_id, as_of_date, customer_id, window_days);

-- MV2: mv_cdp_segment_metrics_rolling
CREATE MATERIALIZED VIEW public.mv_cdp_segment_metrics_rolling AS
SELECT 
  m.tenant_id,
  m.as_of_date,
  sm.segment_id,
  sm.segment_version,
  r.window_days,
  COUNT(DISTINCT r.customer_id) AS n_customers,
  SUM(r.net_revenue) AS sum_net_revenue,
  SUM(r.gross_margin) AS sum_gross_margin,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.aov) AS median_aov,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY r.aov) AS p25_aov,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY r.aov) AS p75_aov,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.inter_purchase_days) AS median_inter_purchase_days,
  AVG(r.discounted_order_share) AS avg_discounted_order_share,
  AVG(r.cod_order_share) AS avg_cod_order_share,
  AVG(r.bundle_order_share) AS avg_bundle_order_share,
  AVG(r.return_rate) AS avg_return_rate
FROM cdp_segment_membership_daily sm
JOIN cdp_customer_metrics_rolling r 
  ON r.tenant_id = sm.tenant_id 
  AND r.customer_id = sm.customer_id 
  AND r.as_of_date = sm.as_of_date
JOIN cdp_customer_metrics_daily m 
  ON m.tenant_id = sm.tenant_id 
  AND m.customer_id = sm.customer_id 
  AND m.as_of_date = sm.as_of_date
WHERE sm.is_member = true
GROUP BY m.tenant_id, m.as_of_date, sm.segment_id, sm.segment_version, r.window_days;

CREATE UNIQUE INDEX idx_mv_cdp_segment_metrics_pk ON public.mv_cdp_segment_metrics_rolling(tenant_id, as_of_date, segment_id, segment_version, window_days);

-- MV3: mv_cdp_cohort_metrics_rolling
CREATE MATERIALIZED VIEW public.mv_cdp_cohort_metrics_rolling AS
SELECT 
  cm.tenant_id,
  cm.as_of_date,
  cm.cohort_id,
  r.window_days,
  COUNT(DISTINCT r.customer_id) AS n_customers,
  SUM(r.net_revenue) AS sum_net_revenue,
  SUM(r.gross_margin) AS sum_gross_margin,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.aov) AS median_aov,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY r.aov) AS p25_aov,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY r.aov) AS p75_aov,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.inter_purchase_days) AS median_inter_purchase_days,
  AVG(r.return_rate) AS avg_return_rate
FROM cdp_cohort_membership_daily cm
JOIN cdp_customer_metrics_rolling r 
  ON r.tenant_id = cm.tenant_id 
  AND r.customer_id = cm.customer_id 
  AND r.as_of_date = cm.as_of_date
WHERE cm.is_member = true
GROUP BY cm.tenant_id, cm.as_of_date, cm.cohort_id, r.window_days;

CREATE UNIQUE INDEX idx_mv_cdp_cohort_metrics_pk ON public.mv_cdp_cohort_metrics_rolling(tenant_id, as_of_date, cohort_id, window_days);

-- MV4: mv_cdp_percentile_value_tiers (using ntile for tier assignment)
CREATE MATERIALIZED VIEW public.mv_cdp_percentile_value_tiers AS
SELECT 
  r.tenant_id,
  r.as_of_date,
  r.customer_id,
  r.net_revenue,
  CASE 
    WHEN NTILE(10) OVER (PARTITION BY r.tenant_id, r.as_of_date ORDER BY r.net_revenue DESC) = 1 THEN 'TOP10'
    WHEN NTILE(10) OVER (PARTITION BY r.tenant_id, r.as_of_date ORDER BY r.net_revenue DESC) = 2 THEN 'TOP20'
    WHEN NTILE(10) OVER (PARTITION BY r.tenant_id, r.as_of_date ORDER BY r.net_revenue DESC) <= 5 THEN 'MID50'
    ELSE 'BOTTOM50'
  END AS tier_label
FROM cdp_customer_metrics_rolling r
WHERE r.window_days = 90;

CREATE INDEX idx_mv_cdp_tiers_pk ON public.mv_cdp_percentile_value_tiers(tenant_id, as_of_date, customer_id);
CREATE INDEX idx_mv_cdp_tiers_tier ON public.mv_cdp_percentile_value_tiers(tenant_id, as_of_date, tier_label);

-- MV5: mv_cdp_value_tier_metrics_rolling
CREATE MATERIALIZED VIEW public.mv_cdp_value_tier_metrics_rolling AS
SELECT 
  t.tenant_id,
  t.as_of_date,
  t.tier_label,
  r.window_days,
  COUNT(DISTINCT r.customer_id) AS n_customers,
  SUM(r.net_revenue) AS sum_net_revenue,
  SUM(r.gross_margin) AS sum_gross_margin,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.aov) AS median_aov,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.inter_purchase_days) AS median_inter_purchase_days,
  AVG(r.return_rate) AS avg_return_rate,
  AVG(r.discounted_order_share) AS avg_discounted_order_share
FROM mv_cdp_percentile_value_tiers t
JOIN cdp_customer_metrics_rolling r 
  ON r.tenant_id = t.tenant_id 
  AND r.customer_id = t.customer_id 
  AND r.as_of_date = t.as_of_date
GROUP BY t.tenant_id, t.as_of_date, t.tier_label, r.window_days;

CREATE UNIQUE INDEX idx_mv_cdp_tier_metrics_pk ON public.mv_cdp_value_tier_metrics_rolling(tenant_id, as_of_date, tier_label, window_days);

-- MV6: mv_cdp_data_quality_daily
CREATE MATERIALIZED VIEW public.mv_cdp_data_quality_daily AS
SELECT 
  o.tenant_id,
  DATE(o.order_at) AS as_of_date,
  COUNT(*) AS total_orders,
  COUNT(o.customer_id) AS orders_with_identity,
  ROUND(100.0 * COUNT(o.customer_id) / NULLIF(COUNT(*), 0), 2) AS identity_coverage,
  COUNT(CASE WHEN o.cogs > 0 THEN 1 END) AS orders_with_cogs,
  ROUND(100.0 * COUNT(CASE WHEN o.cogs > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS cogs_coverage,
  COUNT(DISTINCT ref.order_id) AS orders_with_refund_mapped
FROM cdp_orders o
LEFT JOIN cdp_refunds ref ON ref.order_id = o.id AND ref.tenant_id = o.tenant_id
GROUP BY o.tenant_id, DATE(o.order_at);

CREATE UNIQUE INDEX idx_mv_cdp_data_quality_pk ON public.mv_cdp_data_quality_daily(tenant_id, as_of_date);