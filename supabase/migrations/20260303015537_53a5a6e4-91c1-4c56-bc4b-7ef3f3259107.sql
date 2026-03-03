
-- sem_size_health_rules: Cấu hình công thức tính Size Health Score
CREATE TABLE public.sem_size_health_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Ngưỡng tồn tối thiểu: size có on_hand <= threshold → coi như "hết"
  min_stock_threshold int NOT NULL DEFAULT 1,
  
  -- Core sizes: danh sách size chủ lực
  core_sizes text[] NOT NULL DEFAULT ARRAY['S','M','L'],
  
  -- Trọng số composite score (tổng = 1.0)
  weight_missing_ratio numeric NOT NULL DEFAULT 0.30,
  weight_core_missing numeric NOT NULL DEFAULT 0.35,
  weight_curve_deviation numeric NOT NULL DEFAULT 0.20,
  weight_depth_score numeric NOT NULL DEFAULT 0.15,
  
  -- Ngưỡng phân loại (score 0-100, càng CAO càng khỏe)
  threshold_critical int NOT NULL DEFAULT 30,
  threshold_warning int NOT NULL DEFAULT 60,
  
  -- Depth: size có on_hand <= shallow → coi là nông
  shallow_depth_threshold int NOT NULL DEFAULT 2,
  
  -- Curve deviation: max chấp nhận được
  max_curve_deviation_pct numeric NOT NULL DEFAULT 0.30,
  
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

ALTER TABLE public.sem_size_health_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage size health rules"
  ON public.sem_size_health_rules FOR ALL TO authenticated
  USING (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())))
  WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids(auth.uid())));

CREATE TRIGGER update_sem_size_health_rules_updated_at
  BEFORE UPDATE ON public.sem_size_health_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
