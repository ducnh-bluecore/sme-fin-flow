-- =====================================================
-- CDP Customer Metrics Computed Table + Equity Computation
-- Per CDP Manifesto: No hardcoded values, NULL when missing
-- =====================================================

-- 1. CREATE THE COMPUTED TABLE (OPTION A)
CREATE TABLE IF NOT EXISTS public.cdp_customer_equity_computed (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES cdp_customers(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  
  -- Order/Revenue metrics
  orders_30d integer NOT NULL DEFAULT 0,
  orders_90d integer NOT NULL DEFAULT 0,
  orders_180d integer NOT NULL DEFAULT 0,
  net_revenue_30d numeric NOT NULL DEFAULT 0,
  net_revenue_90d numeric NOT NULL DEFAULT 0,
  net_revenue_180d numeric NOT NULL DEFAULT 0,
  
  -- Profitability metrics (nullable - may not have COGS)
  gross_profit_30d numeric NULL,
  gross_profit_90d numeric NULL,
  contribution_profit_90d numeric NULL,
  
  -- Behavioral metrics
  aov_90d numeric NULL,
  refund_rate_90d numeric NULL,
  repeat_rate_180d numeric NULL,
  recency_days integer NULL,
  frequency_180d integer NULL,
  monetary_180d numeric NULL,
  
  -- EQUITY FIELDS (core output)
  equity_12m numeric NULL,
  equity_24m numeric NULL,
  equity_is_estimated boolean NOT NULL DEFAULT false,
  equity_estimation_method text NULL,
  equity_confidence numeric NULL CHECK (equity_confidence IS NULL OR (equity_confidence >= 0 AND equity_confidence <= 1)),
  equity_reason text NULL,
  
  -- Risk assessment
  churn_risk_score numeric NULL CHECK (churn_risk_score IS NULL OR (churn_risk_score >= 0 AND churn_risk_score <= 1)),
  risk_level text NULL CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Data quality tracking
  data_quality_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  
  -- Primary key
  PRIMARY KEY (tenant_id, customer_id, as_of_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cdp_cec_tenant_date ON cdp_customer_equity_computed(tenant_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_cdp_cec_equity_desc ON cdp_customer_equity_computed(tenant_id, equity_12m DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cdp_cec_risk ON cdp_customer_equity_computed(tenant_id, risk_level) WHERE risk_level IS NOT NULL;

-- Enable RLS
ALTER TABLE cdp_customer_equity_computed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for cdp_customer_equity_computed"
  ON cdp_customer_equity_computed
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- =====================================================
-- 2. BUILD COMPUTATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.cdp_build_customer_equity(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customers_processed integer := 0;
  v_customers_with_equity integer := 0;
  v_estimated_count integer := 0;
  v_has_cogs boolean := false;
  v_has_fees boolean := false;
  v_start_ts timestamptz := clock_timestamp();
BEGIN
  -- Check if we have COGS data
  SELECT EXISTS (
    SELECT 1 FROM cdp_orders 
    WHERE tenant_id = p_tenant_id AND cogs > 0 LIMIT 1
  ) INTO v_has_cogs;
  
  -- Check if we have fees data (would come from channel_fees)
  SELECT EXISTS (
    SELECT 1 FROM channel_fees 
    WHERE tenant_id = p_tenant_id LIMIT 1
  ) INTO v_has_fees;
  
  -- Upsert computed metrics for all customers with orders
  WITH customer_base AS (
    SELECT 
      c.tenant_id,
      c.id as customer_id,
      c.first_order_at,
      c.last_order_at
    FROM cdp_customers c
    WHERE c.tenant_id = p_tenant_id
      AND c.status = 'ACTIVE'
  ),
  order_metrics AS (
    SELECT 
      o.customer_id,
      -- 30-day metrics
      COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '30 days') as orders_30d,
      COALESCE(SUM(o.net_revenue) FILTER (WHERE o.order_at >= p_as_of_date - interval '30 days'), 0) as net_revenue_30d,
      COALESCE(SUM(o.gross_margin) FILTER (WHERE o.order_at >= p_as_of_date - interval '30 days'), 0) as gross_profit_30d,
      -- 90-day metrics
      COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days') as orders_90d,
      COALESCE(SUM(o.net_revenue) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days'), 0) as net_revenue_90d,
      COALESCE(SUM(o.gross_margin) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days'), 0) as gross_profit_90d,
      -- 180-day metrics
      COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '180 days') as orders_180d,
      COALESCE(SUM(o.net_revenue) FILTER (WHERE o.order_at >= p_as_of_date - interval '180 days'), 0) as net_revenue_180d,
      -- AOV 90d
      CASE WHEN COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days') > 0
           THEN SUM(o.net_revenue) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days') / 
                COUNT(*) FILTER (WHERE o.order_at >= p_as_of_date - interval '90 days')
           ELSE NULL END as aov_90d,
      -- Recency
      EXTRACT(DAY FROM (p_as_of_date - MAX(o.order_at)::date)) as recency_days
    FROM cdp_orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.order_at <= p_as_of_date
    GROUP BY o.customer_id
  ),
  refund_metrics AS (
    SELECT 
      r.customer_id,
      COALESCE(SUM(r.refund_amount) FILTER (WHERE r.refund_at >= p_as_of_date - interval '90 days'), 0) as refund_amount_90d
    FROM cdp_refunds r
    WHERE r.tenant_id = p_tenant_id
      AND r.refund_at <= p_as_of_date
    GROUP BY r.customer_id
  ),
  computed AS (
    SELECT 
      cb.tenant_id,
      cb.customer_id,
      p_as_of_date as as_of_date,
      COALESCE(om.orders_30d, 0)::integer as orders_30d,
      COALESCE(om.orders_90d, 0)::integer as orders_90d,
      COALESCE(om.orders_180d, 0)::integer as orders_180d,
      COALESCE(om.net_revenue_30d, 0) as net_revenue_30d,
      COALESCE(om.net_revenue_90d, 0) as net_revenue_90d,
      COALESCE(om.net_revenue_180d, 0) as net_revenue_180d,
      -- Profitability (NULL if no COGS)
      CASE WHEN v_has_cogs THEN om.gross_profit_30d ELSE NULL END as gross_profit_30d,
      CASE WHEN v_has_cogs THEN om.gross_profit_90d ELSE NULL END as gross_profit_90d,
      NULL::numeric as contribution_profit_90d, -- Would need fees
      om.aov_90d,
      -- Refund rate
      CASE WHEN om.net_revenue_90d > 0 
           THEN COALESCE(rm.refund_amount_90d, 0) / om.net_revenue_90d 
           ELSE NULL END as refund_rate_90d,
      -- Repeat rate (orders_180d > 1 means repeat)
      CASE WHEN om.orders_180d > 0 
           THEN CASE WHEN om.orders_180d > 1 THEN 1.0 ELSE 0.0 END 
           ELSE NULL END as repeat_rate_180d,
      om.recency_days::integer,
      COALESCE(om.orders_180d, 0)::integer as frequency_180d,
      COALESCE(om.net_revenue_180d, 0) as monetary_180d,
      -- EQUITY CALCULATION
      -- Method 1: If we have gross profit, use profit-based LTV
      -- Method 2: If only revenue, use revenue proxy with lower confidence
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL AND om.gross_profit_90d > 0 THEN
          -- Profit-based: Extrapolate 90d profit to 12m (x4) with decay
          om.gross_profit_90d * 4 * 0.85
        WHEN om.net_revenue_90d > 0 THEN
          -- Revenue proxy: Use revenue with estimated margin (30%)
          om.net_revenue_90d * 4 * 0.30
        ELSE NULL
      END as equity_12m,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL AND om.gross_profit_90d > 0 THEN
          om.gross_profit_90d * 8 * 0.70 -- 24m with more decay
        WHEN om.net_revenue_90d > 0 THEN
          om.net_revenue_90d * 8 * 0.25 -- Lower confidence for 24m
        ELSE NULL
      END as equity_24m,
      -- Estimation flags
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL THEN false
        WHEN om.net_revenue_90d > 0 THEN true
        ELSE true
      END as equity_is_estimated,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL THEN 'PROFIT_BASED'
        WHEN om.net_revenue_90d > 0 THEN 'REVENUE_PROXY'
        ELSE 'NO_DATA'
      END as equity_estimation_method,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL THEN 0.85
        WHEN om.net_revenue_90d > 0 THEN 0.45
        ELSE NULL
      END as equity_confidence,
      CASE 
        WHEN v_has_cogs AND om.gross_profit_90d IS NOT NULL THEN 'Calculated from real profit data'
        WHEN om.net_revenue_90d > 0 THEN 'Estimated: Missing COGS/fees; using 30% margin proxy'
        ELSE 'No order data available'
      END as equity_reason,
      -- Risk assessment
      CASE 
        WHEN om.recency_days IS NULL THEN NULL
        WHEN om.recency_days > 180 THEN 0.9
        WHEN om.recency_days > 90 THEN 0.7
        WHEN om.recency_days > 60 THEN 0.5
        WHEN om.recency_days > 30 THEN 0.3
        ELSE 0.1
      END as churn_risk_score,
      CASE 
        WHEN om.recency_days IS NULL THEN NULL
        WHEN om.recency_days > 180 THEN 'critical'
        WHEN om.recency_days > 90 THEN 'high'
        WHEN om.recency_days > 60 THEN 'medium'
        ELSE 'low'
      END as risk_level,
      -- Data quality flags
      jsonb_build_object(
        'has_orders', COALESCE(om.orders_180d, 0) > 0,
        'has_refunds', COALESCE(rm.refund_amount_90d, 0) > 0,
        'has_cogs', v_has_cogs,
        'has_fees', v_has_fees,
        'has_contribution_margin', false,
        'is_estimated', NOT v_has_cogs OR om.gross_profit_90d IS NULL OR om.gross_profit_90d <= 0
      ) as data_quality_flags,
      now() as computed_at
    FROM customer_base cb
    LEFT JOIN order_metrics om ON om.customer_id = cb.customer_id
    LEFT JOIN refund_metrics rm ON rm.customer_id = cb.customer_id
  )
  INSERT INTO cdp_customer_equity_computed
  SELECT * FROM computed
  ON CONFLICT (tenant_id, customer_id, as_of_date)
  DO UPDATE SET
    orders_30d = EXCLUDED.orders_30d,
    orders_90d = EXCLUDED.orders_90d,
    orders_180d = EXCLUDED.orders_180d,
    net_revenue_30d = EXCLUDED.net_revenue_30d,
    net_revenue_90d = EXCLUDED.net_revenue_90d,
    net_revenue_180d = EXCLUDED.net_revenue_180d,
    gross_profit_30d = EXCLUDED.gross_profit_30d,
    gross_profit_90d = EXCLUDED.gross_profit_90d,
    contribution_profit_90d = EXCLUDED.contribution_profit_90d,
    aov_90d = EXCLUDED.aov_90d,
    refund_rate_90d = EXCLUDED.refund_rate_90d,
    repeat_rate_180d = EXCLUDED.repeat_rate_180d,
    recency_days = EXCLUDED.recency_days,
    frequency_180d = EXCLUDED.frequency_180d,
    monetary_180d = EXCLUDED.monetary_180d,
    equity_12m = EXCLUDED.equity_12m,
    equity_24m = EXCLUDED.equity_24m,
    equity_is_estimated = EXCLUDED.equity_is_estimated,
    equity_estimation_method = EXCLUDED.equity_estimation_method,
    equity_confidence = EXCLUDED.equity_confidence,
    equity_reason = EXCLUDED.equity_reason,
    churn_risk_score = EXCLUDED.churn_risk_score,
    risk_level = EXCLUDED.risk_level,
    data_quality_flags = EXCLUDED.data_quality_flags,
    computed_at = EXCLUDED.computed_at;
  
  GET DIAGNOSTICS v_customers_processed = ROW_COUNT;
  
  -- Count customers with equity
  SELECT COUNT(*), COUNT(*) FILTER (WHERE equity_is_estimated)
  INTO v_customers_with_equity, v_estimated_count
  FROM cdp_customer_equity_computed
  WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date AND equity_12m IS NOT NULL;
  
  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'as_of_date', p_as_of_date,
    'customers_processed', v_customers_processed,
    'customers_with_equity', v_customers_with_equity,
    'estimated_count', v_estimated_count,
    'has_cogs', v_has_cogs,
    'has_fees', v_has_fees,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_ts)::integer
  );
END;
$$;

-- =====================================================
-- 3. REWRITE VIEWS (NO HARDCODED VALUES)
-- =====================================================

-- Drop existing hardcoded views
DROP VIEW IF EXISTS public.v_cdp_equity_snapshot CASCADE;
DROP VIEW IF EXISTS public.v_cdp_equity_drivers CASCADE;
DROP VIEW IF EXISTS public.v_cdp_equity_distribution CASCADE;
DROP VIEW IF EXISTS public.v_cdp_equity_overview CASCADE;

-- v_cdp_equity_overview: Aggregated equity summary per tenant
CREATE VIEW public.v_cdp_equity_overview AS
WITH latest_date AS (
  SELECT tenant_id, MAX(as_of_date) as latest_date
  FROM cdp_customer_equity_computed
  GROUP BY tenant_id
),
tenant_metrics AS (
  SELECT 
    c.tenant_id,
    ld.latest_date as as_of_date,
    COUNT(*) as total_customers,
    COUNT(*) FILTER (WHERE c.equity_12m IS NOT NULL) as customers_with_equity,
    SUM(c.equity_12m) as total_equity_12m,
    SUM(c.equity_24m) as total_equity_24m,
    AVG(c.equity_12m) FILTER (WHERE c.equity_12m IS NOT NULL) as avg_equity_12m,
    -- At-risk value: sum of equity for high/critical risk customers
    SUM(c.equity_12m) FILTER (WHERE c.risk_level IN ('high', 'critical')) as at_risk_value,
    -- At-risk percent
    CASE WHEN SUM(c.equity_12m) > 0 THEN
      (SUM(c.equity_12m) FILTER (WHERE c.risk_level IN ('high', 'critical')) / SUM(c.equity_12m)) * 100
    ELSE NULL END as at_risk_percent,
    -- Estimated share
    CASE WHEN COUNT(*) FILTER (WHERE c.equity_12m IS NOT NULL) > 0 THEN
      COUNT(*) FILTER (WHERE c.equity_is_estimated AND c.equity_12m IS NOT NULL)::numeric / 
      COUNT(*) FILTER (WHERE c.equity_12m IS NOT NULL)
    ELSE NULL END as estimated_share,
    -- Data quality summary
    jsonb_build_object(
      'has_cogs_data', bool_or((c.data_quality_flags->>'has_cogs')::boolean),
      'has_fees_data', bool_or((c.data_quality_flags->>'has_fees')::boolean),
      'total_estimated', COUNT(*) FILTER (WHERE c.equity_is_estimated),
      'total_with_real_profit', COUNT(*) FILTER (WHERE NOT c.equity_is_estimated AND c.equity_12m IS NOT NULL)
    ) as data_quality_summary,
    MAX(c.computed_at) as last_updated
  FROM cdp_customer_equity_computed c
  JOIN latest_date ld ON c.tenant_id = ld.tenant_id AND c.as_of_date = ld.latest_date
  GROUP BY c.tenant_id, ld.latest_date
)
SELECT 
  t.id as tenant_id,
  tm.as_of_date,
  COALESCE(tm.total_customers, 0) as total_customers,
  COALESCE(tm.customers_with_equity, 0) as customers_with_equity,
  tm.total_equity_12m,
  tm.total_equity_24m,
  tm.avg_equity_12m,
  tm.at_risk_value,
  tm.at_risk_percent,
  -- Equity change: NULL until we have historical comparison
  NULL::numeric as equity_change,
  NULL::text as change_direction,
  tm.estimated_share,
  COALESCE(tm.data_quality_summary, '{}'::jsonb) as data_quality_summary,
  tm.last_updated
FROM tenants t
LEFT JOIN tenant_metrics tm ON tm.tenant_id = t.id;

-- v_cdp_equity_distribution: Equity buckets
CREATE VIEW public.v_cdp_equity_distribution AS
WITH latest_date AS (
  SELECT tenant_id, MAX(as_of_date) as latest_date
  FROM cdp_customer_equity_computed
  GROUP BY tenant_id
),
bucketed AS (
  SELECT 
    c.tenant_id,
    CASE 
      WHEN c.equity_12m IS NULL THEN 'unknown'
      WHEN c.equity_12m <= 1000000 THEN '0-1M'
      WHEN c.equity_12m <= 3000000 THEN '1-3M'
      WHEN c.equity_12m <= 10000000 THEN '3-10M'
      ELSE '10M+'
    END as bucket,
    c.equity_12m,
    c.equity_is_estimated
  FROM cdp_customer_equity_computed c
  JOIN latest_date ld ON c.tenant_id = ld.tenant_id AND c.as_of_date = ld.latest_date
)
SELECT 
  tenant_id,
  bucket,
  COUNT(*) as customer_count,
  SUM(equity_12m) as equity_sum,
  AVG(equity_12m) as equity_avg,
  COUNT(*) FILTER (WHERE equity_is_estimated) as estimated_count
FROM bucketed
GROUP BY tenant_id, bucket;

-- v_cdp_equity_drivers: Top factors affecting equity
CREATE VIEW public.v_cdp_equity_drivers AS
WITH latest_date AS (
  SELECT tenant_id, MAX(as_of_date) as latest_date
  FROM cdp_customer_equity_computed
  GROUP BY tenant_id
),
driver_analysis AS (
  SELECT 
    c.tenant_id,
    -- Recency impact
    AVG(c.equity_12m) FILTER (WHERE c.recency_days <= 30) as equity_recent,
    AVG(c.equity_12m) FILTER (WHERE c.recency_days > 90) as equity_stale,
    -- Frequency impact
    AVG(c.equity_12m) FILTER (WHERE c.frequency_180d >= 3) as equity_high_freq,
    AVG(c.equity_12m) FILTER (WHERE c.frequency_180d = 1) as equity_low_freq,
    -- Monetary impact
    AVG(c.equity_12m) FILTER (WHERE c.monetary_180d >= 5000000) as equity_high_monetary,
    AVG(c.equity_12m) FILTER (WHERE c.monetary_180d < 1000000) as equity_low_monetary
  FROM cdp_customer_equity_computed c
  JOIN latest_date ld ON c.tenant_id = ld.tenant_id AND c.as_of_date = ld.latest_date
  WHERE c.equity_12m IS NOT NULL
  GROUP BY c.tenant_id
)
SELECT 
  tenant_id,
  'Recency' as factor,
  CASE 
    WHEN equity_recent IS NOT NULL AND equity_stale IS NOT NULL 
    THEN ((equity_recent - equity_stale) / NULLIF(equity_stale, 0)) * 100
    ELSE NULL
  END as impact_percent,
  CASE 
    WHEN equity_recent > equity_stale THEN 'positive'
    WHEN equity_recent < equity_stale THEN 'negative'
    ELSE 'neutral'
  END as direction,
  'Khách mua gần đây có equity cao hơn' as description
FROM driver_analysis
WHERE equity_recent IS NOT NULL
UNION ALL
SELECT 
  tenant_id,
  'Frequency' as factor,
  CASE 
    WHEN equity_high_freq IS NOT NULL AND equity_low_freq IS NOT NULL 
    THEN ((equity_high_freq - equity_low_freq) / NULLIF(equity_low_freq, 0)) * 100
    ELSE NULL
  END as impact_percent,
  CASE 
    WHEN equity_high_freq > equity_low_freq THEN 'positive'
    WHEN equity_high_freq < equity_low_freq THEN 'negative'
    ELSE 'neutral'
  END as direction,
  'Khách mua thường xuyên có equity cao hơn' as description
FROM driver_analysis
WHERE equity_high_freq IS NOT NULL
UNION ALL
SELECT 
  tenant_id,
  'Monetary' as factor,
  CASE 
    WHEN equity_high_monetary IS NOT NULL AND equity_low_monetary IS NOT NULL 
    THEN ((equity_high_monetary - equity_low_monetary) / NULLIF(equity_low_monetary, 0)) * 100
    ELSE NULL
  END as impact_percent,
  CASE 
    WHEN equity_high_monetary > equity_low_monetary THEN 'positive'
    WHEN equity_high_monetary < equity_low_monetary THEN 'negative'
    ELSE 'neutral'
  END as direction,
  'Khách chi tiêu cao có equity cao hơn' as description
FROM driver_analysis
WHERE equity_high_monetary IS NOT NULL;

-- v_cdp_equity_snapshot: Combined snapshot for UI (used by hooks)
CREATE VIEW public.v_cdp_equity_snapshot AS
SELECT 
  eo.tenant_id,
  eo.as_of_date,
  eo.total_equity_12m,
  eo.total_equity_24m,
  eo.at_risk_value,
  eo.at_risk_percent,
  eo.equity_change,
  eo.change_direction,
  eo.estimated_share,
  eo.data_quality_summary,
  (SELECT json_agg(json_build_object(
    'factor', factor,
    'impact', impact_percent,
    'direction', direction,
    'description', description
  ))
  FROM (
    SELECT factor, impact_percent, direction, description
    FROM v_cdp_equity_drivers ed
    WHERE ed.tenant_id = eo.tenant_id
    ORDER BY ABS(ed.impact_percent) DESC NULLS LAST
    LIMIT 3
  ) drivers) as top_drivers,
  eo.last_updated
FROM v_cdp_equity_overview eo;

-- =====================================================
-- 4. UPDATE cdp_run_daily_build TO INCLUDE EQUITY
-- =====================================================
CREATE OR REPLACE FUNCTION public.cdp_run_daily_build(
  p_tenant_id uuid,
  p_as_of_date date DEFAULT (CURRENT_DATE - interval '1 day')::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_count integer;
  v_rolling_count integer;
  v_equity_result jsonb;
  v_start_ts timestamptz;
  v_daily_ts timestamptz;
  v_rolling_ts timestamptz;
  v_equity_ts timestamptz;
BEGIN
  v_start_ts := clock_timestamp();
  
  -- Step 1: Build daily metrics
  v_daily_count := cdp_build_customer_metrics_daily(p_tenant_id, p_as_of_date);
  v_daily_ts := clock_timestamp();
  
  -- Step 2: Build rolling metrics
  v_rolling_count := cdp_build_customer_metrics_rolling(p_tenant_id, p_as_of_date);
  v_rolling_ts := clock_timestamp();
  
  -- Step 3: Build customer equity (NEW)
  v_equity_result := cdp_build_customer_equity(p_tenant_id, p_as_of_date);
  v_equity_ts := clock_timestamp();
  
  -- Step 4: Refresh MVs concurrently
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_segment_metrics_rolling;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_cohort_metrics_rolling;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_value_tier_metrics_rolling;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cdp_data_quality_daily;
  
  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'as_of_date', p_as_of_date,
    'daily_customers', v_daily_count,
    'rolling_customers', v_rolling_count,
    'equity_result', v_equity_result,
    'duration_daily_ms', EXTRACT(MILLISECONDS FROM v_daily_ts - v_start_ts)::integer,
    'duration_rolling_ms', EXTRACT(MILLISECONDS FROM v_rolling_ts - v_daily_ts)::integer,
    'duration_equity_ms', EXTRACT(MILLISECONDS FROM v_equity_ts - v_rolling_ts)::integer,
    'duration_total_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_ts)::integer
  );
END;
$$;