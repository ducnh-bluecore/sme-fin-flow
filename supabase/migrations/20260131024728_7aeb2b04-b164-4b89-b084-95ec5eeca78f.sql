-- Drop and recreate the get_cs_alerts_summary function with correct column name
DROP FUNCTION IF EXISTS public.get_cs_alerts_summary();

CREATE OR REPLACE FUNCTION public.get_cs_alerts_summary()
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  total_alerts bigint,
  critical_count bigint,
  warning_count bigint,
  info_count bigint,
  oldest_unresolved timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(a.id) as total_alerts,
    COUNT(CASE WHEN a.severity = 'critical' THEN 1 END) as critical_count,
    COUNT(CASE WHEN a.severity = 'warning' THEN 1 END) as warning_count,
    COUNT(CASE WHEN a.severity = 'info' THEN 1 END) as info_count,
    MIN(a.created_at) as oldest_unresolved
  FROM tenants t
  LEFT JOIN cs_alerts a ON a.tenant_id = t.id AND a.status IN ('open', 'acknowledged')
  GROUP BY t.id, t.name
  HAVING COUNT(a.id) > 0
  ORDER BY critical_count DESC, warning_count DESC, total_alerts DESC;
$$;