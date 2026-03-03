
-- Table to store the classification formula rules
CREATE TABLE public.sem_criticality_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  rule_name text NOT NULL DEFAULT 'Default Classification',
  is_active boolean NOT NULL DEFAULT true,
  -- Weights for composite score (must sum to 1.0)
  weight_revenue numeric NOT NULL DEFAULT 0.35,
  weight_units_sold numeric NOT NULL DEFAULT 0.25,
  weight_velocity numeric NOT NULL DEFAULT 0.25,
  weight_margin numeric NOT NULL DEFAULT 0.15,
  -- Percentile cutoffs  
  core_percentile numeric NOT NULL DEFAULT 80,   -- top 20% = CORE
  hero_percentile numeric NOT NULL DEFAULT 50,   -- next 30% = HERO, rest = LONGTAIL
  -- Lookback period in days
  lookback_days integer NOT NULL DEFAULT 30,
  -- Min presence rules per class
  core_min_stores integer NOT NULL DEFAULT 20,
  core_min_sizes integer NOT NULL DEFAULT 4,
  hero_min_stores integer NOT NULL DEFAULT 10,
  hero_min_sizes integer NOT NULL DEFAULT 3,
  longtail_min_stores integer NOT NULL DEFAULT 5,
  longtail_min_sizes integer NOT NULL DEFAULT 2,
  -- Metadata
  last_run_at timestamptz,
  last_run_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, rule_name)
);

ALTER TABLE public.sem_criticality_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage criticality rules"
  ON public.sem_criticality_rules FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Function to auto-classify SKUs based on composite score
CREATE OR REPLACE FUNCTION public.fn_auto_classify_criticality(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule record;
  v_cutoff_core numeric;
  v_cutoff_hero numeric;
  v_count_core integer := 0;
  v_count_hero integer := 0;
  v_count_longtail integer := 0;
  v_total integer := 0;
BEGIN
  -- Get active rule
  SELECT * INTO v_rule
  FROM sem_criticality_rules
  WHERE tenant_id = p_tenant_id AND is_active = true
  LIMIT 1;

  IF v_rule IS NULL THEN
    RETURN jsonb_build_object('error', 'No active classification rule found');
  END IF;

  -- Build composite scores from order data
  WITH sku_metrics AS (
    SELECT 
      oi.sku AS sku_id,
      -- Revenue
      COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_revenue,
      -- Units sold
      COALESCE(SUM(oi.quantity), 0) AS total_units,
      -- Velocity (units per day over lookback)
      COALESCE(SUM(oi.quantity)::numeric / GREATEST(v_rule.lookback_days, 1), 0) AS velocity,
      -- Contribution margin (revenue - cost)
      COALESCE(SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * COALESCE(oi.unit_cost, oi.unit_price * 0.6)), 0) AS margin
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id AND o.tenant_id = p_tenant_id
    WHERE o.order_date >= (CURRENT_DATE - (v_rule.lookback_days || ' days')::interval)
      AND o.status NOT IN ('cancelled', 'returned')
      AND oi.sku IS NOT NULL
      AND oi.sku != ''
    GROUP BY oi.sku
  ),
  -- Normalize each metric to 0-1 range using percentile rank
  scored AS (
    SELECT 
      sku_id,
      total_revenue, total_units, velocity, margin,
      -- Composite score using configured weights
      (
        percent_rank() OVER (ORDER BY total_revenue) * v_rule.weight_revenue +
        percent_rank() OVER (ORDER BY total_units) * v_rule.weight_units_sold +
        percent_rank() OVER (ORDER BY velocity) * v_rule.weight_velocity +
        percent_rank() OVER (ORDER BY margin) * v_rule.weight_margin
      ) * 100 AS composite_score
    FROM sku_metrics
    WHERE total_revenue > 0
  ),
  -- Calculate percentile cutoffs
  cutoffs AS (
    SELECT
      percentile_cont(v_rule.core_percentile / 100.0) WITHIN GROUP (ORDER BY composite_score) AS core_cut,
      percentile_cont(v_rule.hero_percentile / 100.0) WITHIN GROUP (ORDER BY composite_score) AS hero_cut
    FROM scored
  ),
  -- Classify
  classified AS (
    SELECT
      s.sku_id,
      CASE
        WHEN s.composite_score >= c.core_cut THEN 'CORE'
        WHEN s.composite_score >= c.hero_cut THEN 'HERO'
        ELSE 'LONGTAIL'
      END AS new_class,
      s.composite_score
    FROM scored s, cutoffs c
  )
  -- Upsert into sem_sku_criticality
  INSERT INTO sem_sku_criticality (tenant_id, sku_id, criticality_class, min_presence_rule, is_current, effective_from)
  SELECT 
    p_tenant_id,
    cl.sku_id,
    cl.new_class,
    CASE cl.new_class
      WHEN 'CORE' THEN jsonb_build_object('min_stores', v_rule.core_min_stores, 'min_sizes', v_rule.core_min_sizes, 'score', round(cl.composite_score::numeric, 2))
      WHEN 'HERO' THEN jsonb_build_object('min_stores', v_rule.hero_min_stores, 'min_sizes', v_rule.hero_min_sizes, 'score', round(cl.composite_score::numeric, 2))
      ELSE jsonb_build_object('min_stores', v_rule.longtail_min_stores, 'min_sizes', v_rule.longtail_min_sizes, 'score', round(cl.composite_score::numeric, 2))
    END,
    true,
    CURRENT_DATE
  FROM classified cl
  ON CONFLICT (tenant_id, sku_id) WHERE is_current = true
  DO UPDATE SET
    criticality_class = EXCLUDED.criticality_class,
    min_presence_rule = EXCLUDED.min_presence_rule,
    effective_from = EXCLUDED.effective_from;

  -- Get counts
  SELECT count(*) FILTER (WHERE criticality_class = 'CORE'),
         count(*) FILTER (WHERE criticality_class = 'HERO'),
         count(*) FILTER (WHERE criticality_class = 'LONGTAIL'),
         count(*)
  INTO v_count_core, v_count_hero, v_count_longtail, v_total
  FROM sem_sku_criticality
  WHERE tenant_id = p_tenant_id AND is_current = true;

  -- Update last_run
  UPDATE sem_criticality_rules
  SET last_run_at = now(), last_run_count = v_total, updated_at = now()
  WHERE id = v_rule.id;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'core', v_count_core,
    'hero', v_count_hero,
    'longtail', v_count_longtail,
    'rule_name', v_rule.rule_name
  );
END;
$$;

-- We need a unique partial index for the ON CONFLICT to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_sem_sku_criticality_tenant_sku_current 
  ON sem_sku_criticality (tenant_id, sku_id) WHERE is_current = true;
