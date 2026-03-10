ALTER TABLE public.central_metrics_snapshots ALTER COLUMN cash_runway_months SET DEFAULT 0;
ALTER TABLE public.central_metrics_snapshots ALTER COLUMN cash_runway_months DROP NOT NULL;