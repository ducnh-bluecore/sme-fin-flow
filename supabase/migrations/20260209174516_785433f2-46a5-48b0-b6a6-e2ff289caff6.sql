
CREATE OR REPLACE FUNCTION public.fn_auto_tier_stores(p_tenant_id uuid)
RETURNS TABLE(store_id uuid, store_name text, old_tier text, new_tier text, total_sold bigint, avg_velocity numeric, rank_pct numeric)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
  global_max AS (
    SELECT 
      NULLIF(MAX(tot_sold), 0)::numeric AS max_sold,
      NULLIF(MAX(avg_vel), 0)::numeric AS max_vel
    FROM store_metrics
  ),
  scored AS (
    SELECT
      sm.*,
      0.6 * (sm.tot_sold::numeric / gm.max_sold) + 0.4 * (sm.avg_vel / gm.max_vel) AS score
    FROM store_metrics sm, global_max gm
    WHERE gm.max_sold IS NOT NULL AND gm.max_vel IS NOT NULL
  ),
  ranked AS (
    SELECT
      sc.*,
      PERCENT_RANK() OVER (ORDER BY sc.score DESC) AS pct_rank
    FROM scored sc
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
