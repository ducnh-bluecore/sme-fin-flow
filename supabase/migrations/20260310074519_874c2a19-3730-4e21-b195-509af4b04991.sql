-- Also fix in tenant schema
ALTER TABLE tenant_icondenim.central_metrics_snapshots ALTER COLUMN cash_runway_months SET DEFAULT 0;
ALTER TABLE tenant_icondenim.central_metrics_snapshots ALTER COLUMN cash_runway_months DROP NOT NULL;

-- Now compute metrics
SET search_path TO tenant_icondenim, public;
SELECT compute_central_metrics_snapshot(
  '364a23ad-66f5-44d6-8da9-74c7ff333dcc'::uuid,
  '2025-01-01'::date,
  '2026-03-09'::date
);
RESET search_path;