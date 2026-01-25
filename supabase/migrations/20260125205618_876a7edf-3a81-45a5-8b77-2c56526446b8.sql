
-- Fix: Add missing columns to registry
ALTER TABLE cdp_insight_registry ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE cdp_insight_registry ADD COLUMN IF NOT EXISTS owners text[] DEFAULT ARRAY['CEO'];
ALTER TABLE cdp_insight_registry ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true;

-- Drop and recreate view with correct schema
DROP VIEW IF EXISTS public.v_cdp_insight_registry_summary CASCADE;

CREATE VIEW public.v_cdp_insight_registry_summary AS
SELECT 
  r.insight_code as code,
  r.name,
  COALESCE(r.description, r.name) as description,
  r.category as topic,
  COALESCE(r.threshold_json::text, '') as threshold,
  r.cooldown_days,
  COALESCE(r.owners, ARRAY['CEO']) as owners,
  COALESCE(r.is_enabled, true) as is_enabled,
  r.population_type,
  r.window_days,
  r.baseline_days,
  r.category,
  e.tenant_id,
  CASE WHEN e.id IS NOT NULL AND e.status = 'active' THEN true ELSE false END as is_triggered,
  COALESCE(e_count.cnt, 0)::int as triggered_count,
  e.created_at::text as last_triggered_date
FROM cdp_insight_registry r
LEFT JOIN LATERAL (
  SELECT id, tenant_id, status, created_at
  FROM cdp_insight_events
  WHERE insight_code = r.insight_code
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
) e ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int as cnt
  FROM cdp_insight_events
  WHERE insight_code = r.insight_code
) e_count ON true;
