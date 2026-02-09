
-- Function to auto-calculate store tiers based on revenue (total_sold) + velocity
-- Uses percentile ranking: Top 10% = S, 10-30% = A, 30-70% = B, rest = C
CREATE OR REPLACE FUNCTION public.fn_auto_tier_stores(p_tenant_id uuid)
RETURNS TABLE(store_id uuid, store_name text, old_tier text, new_tier text, total_sold bigint, avg_velocity numeric, rank_pct numeric)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total_stores int;
BEGIN
  -- Count active stores (exclude warehouses)
  SELECT COUNT(*) INTO v_total_stores
  FROM inv_stores s
  WHERE s.tenant_id = p_tenant_id
    AND s.is_active = true
    AND s.location_type = 'store';

  IF v_total_stores = 0 THEN
    RETURN;
  END IF;

  -- Calculate and update tiers
  RETURN QUERY
  WITH store_metrics AS (
    SELECT 
      s.id AS sid,
      s.store_name AS sname,
      s.tier AS current_tier,
      COALESCE(SUM(d.total_sold), 0)::bigint AS tot_sold,
      COALESCE(AVG(d.sales_velocity), 0)::numeric AS avg_vel
    FROM inv_stores s
    LEFT JOIN inv_state_demand d ON d.store_id = s.id AND d.tenant_id = p_tenant_id
    WHERE s.tenant_id = p_tenant_id
      AND s.is_active = true
      AND s.location_type = 'store'
    GROUP BY s.id, s.store_name, s.tier
  ),
  ranked AS (
    SELECT 
      sm.*,
      -- Combined score: 60% revenue weight + 40% velocity weight (normalized)
      PERCENT_RANK() OVER (
        ORDER BY (
          0.6 * (sm.tot_sold::numeric / NULLIF(MAX(sm.tot_sold) OVER (), 0)) +
          0.4 * (sm.avg_vel / NULLIF(MAX(sm.avg_vel) OVER (), 0))
        ) DESC
      ) AS pct_rank
    FROM store_metrics sm
  ),
  tiered AS (
    SELECT 
      r.sid,
      r.sname,
      r.current_tier,
      CASE
        WHEN r.pct_rank <= 0.10 THEN 'S'
        WHEN r.pct_rank <= 0.30 THEN 'A'
        WHEN r.pct_rank <= 0.70 THEN 'B'
        ELSE 'C'
      END AS calc_tier,
      r.tot_sold,
      r.avg_vel,
      ROUND(r.pct_rank * 100, 1) AS pct
    FROM ranked r
  )
  UPDATE inv_stores st
  SET tier = t.calc_tier, updated_at = now()
  FROM tiered t
  WHERE st.id = t.sid
  RETURNING st.id, t.sname, t.current_tier, t.calc_tier, t.tot_sold, t.avg_vel, t.pct;
END;
$$;

-- Log table for tier change history
CREATE TABLE IF NOT EXISTS public.inv_tier_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  store_id uuid NOT NULL,
  old_tier text,
  new_tier text,
  total_sold bigint,
  avg_velocity numeric,
  rank_pct numeric,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inv_tier_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for inv_tier_history"
  ON public.inv_tier_history
  FOR ALL
  USING (tenant_id = (SELECT current_setting('app.current_tenant', true))::uuid);

CREATE INDEX IF NOT EXISTS idx_inv_tier_history_tenant_store 
  ON public.inv_tier_history(tenant_id, store_id, calculated_at DESC);
