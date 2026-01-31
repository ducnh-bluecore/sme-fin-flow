-- =============================================
-- PLATFORM PLANS & MODULES MANAGEMENT SYSTEM
-- =============================================

-- 1. Create platform_plans table
CREATE TABLE public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  max_users integer,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create platform_modules table
CREATE TABLE public.platform_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  is_core boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create plan_modules junction table
CREATE TABLE public.plan_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.platform_plans(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.platform_modules(id) ON DELETE CASCADE,
  is_included boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, module_id)
);

-- 4. Create tenant_modules table
CREATE TABLE public.tenant_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.platform_modules(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  enabled_at timestamptz DEFAULT now(),
  enabled_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_id)
);

-- 5. Enable RLS
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for platform_plans
CREATE POLICY "Anyone can read plans" 
  ON public.platform_plans FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert plans" 
  ON public.platform_plans FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans" 
  ON public.platform_plans FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plans" 
  ON public.platform_plans FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. RLS Policies for platform_modules
CREATE POLICY "Anyone can read modules" 
  ON public.platform_modules FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert modules" 
  ON public.platform_modules FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update modules" 
  ON public.platform_modules FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete modules" 
  ON public.platform_modules FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. RLS Policies for plan_modules
CREATE POLICY "Anyone can read plan_modules" 
  ON public.plan_modules FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert plan_modules" 
  ON public.plan_modules FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plan_modules" 
  ON public.plan_modules FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plan_modules" 
  ON public.plan_modules FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. RLS Policies for tenant_modules
CREATE POLICY "Tenant members can read their modules" 
  ON public.tenant_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu 
      WHERE tu.tenant_id = tenant_modules.tenant_id 
      AND tu.user_id = auth.uid() 
      AND tu.is_active = true
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can insert tenant_modules" 
  ON public.tenant_modules FOR INSERT 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tenant_modules" 
  ON public.tenant_modules FOR UPDATE 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tenant_modules" 
  ON public.tenant_modules FOR DELETE 
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. Create updated_at triggers
CREATE TRIGGER update_platform_plans_updated_at
  BEFORE UPDATE ON public.platform_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_modules_updated_at
  BEFORE UPDATE ON public.platform_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_modules_updated_at
  BEFORE UPDATE ON public.tenant_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Create indexes
CREATE INDEX idx_plan_modules_plan_id ON public.plan_modules(plan_id);
CREATE INDEX idx_plan_modules_module_id ON public.plan_modules(module_id);
CREATE INDEX idx_tenant_modules_tenant_id ON public.tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_module_id ON public.tenant_modules(module_id);

-- 12. Insert seed data for platform_modules
INSERT INTO public.platform_modules (code, name, description, icon, color, is_core, is_active, sort_order) VALUES
  ('fdp', 'FDP', 'Financial Data Platform - Nền tảng dữ liệu tài chính', 'TrendingUp', 'emerald', true, true, 1),
  ('mdp', 'MDP', 'Marketing Data Platform - Đo lường giá trị tài chính của marketing', 'Target', 'blue', false, true, 2),
  ('cdp', 'CDP', 'Customer Data Platform - Phân tích hành vi khách hàng', 'Users', 'violet', false, true, 3),
  ('control_tower', 'Control Tower', 'Trung tâm điều hành & cảnh báo', 'Radio', 'amber', false, true, 4),
  ('data_warehouse', 'Data Warehouse', 'Kho dữ liệu tập trung', 'Database', 'slate', false, true, 5);

-- 13. Insert seed data for platform_plans
INSERT INTO public.platform_plans (code, name, description, price_monthly, price_yearly, max_users, is_active, sort_order, features) VALUES
  ('free', 'Miễn phí', 'Gói cơ bản cho doanh nghiệp nhỏ', 0, 0, 2, true, 1, '["Báo cáo tài chính cơ bản", "Dashboard tổng quan", "Hỗ trợ email"]'::jsonb),
  ('starter', 'Starter', 'Gói khởi đầu cho doanh nghiệp đang phát triển', 2000000, 20000000, 5, true, 2, '["Tất cả tính năng Free", "Marketing Analytics", "Báo cáo chi tiết", "Hỗ trợ chat"]'::jsonb),
  ('professional', 'Professional', 'Gói chuyên nghiệp cho doanh nghiệp tầm trung', 5000000, 50000000, 15, true, 3, '["Tất cả tính năng Starter", "Customer Analytics", "Control Tower", "API Access", "Hỗ trợ ưu tiên"]'::jsonb),
  ('enterprise', 'Enterprise', 'Gói doanh nghiệp với đầy đủ tính năng', NULL, NULL, NULL, true, 4, '["Tất cả tính năng Pro", "Data Warehouse", "Custom Integration", "Dedicated Support", "SLA 99.9%"]'::jsonb);

-- 14. Insert plan_modules relationships
-- Free plan: only FDP
INSERT INTO public.plan_modules (plan_id, module_id, is_included)
SELECT p.id, m.id, true
FROM public.platform_plans p, public.platform_modules m
WHERE p.code = 'free' AND m.code = 'fdp';

-- Starter plan: FDP + MDP
INSERT INTO public.plan_modules (plan_id, module_id, is_included)
SELECT p.id, m.id, true
FROM public.platform_plans p, public.platform_modules m
WHERE p.code = 'starter' AND m.code IN ('fdp', 'mdp');

-- Professional plan: FDP + MDP + CDP + Control Tower
INSERT INTO public.plan_modules (plan_id, module_id, is_included)
SELECT p.id, m.id, true
FROM public.platform_plans p, public.platform_modules m
WHERE p.code = 'professional' AND m.code IN ('fdp', 'mdp', 'cdp', 'control_tower');

-- Enterprise plan: All modules
INSERT INTO public.plan_modules (plan_id, module_id, is_included)
SELECT p.id, m.id, true
FROM public.platform_plans p, public.platform_modules m
WHERE p.code = 'enterprise';