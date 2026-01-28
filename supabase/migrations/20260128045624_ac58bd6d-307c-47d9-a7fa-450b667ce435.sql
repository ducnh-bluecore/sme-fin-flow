-- =============================================
-- PHASE 4: CONFIGURATION TABLE
-- =============================================

-- =============================================
-- Task 4.1: Cross-Module Config Table
-- =============================================

-- Central configuration table for all cross-module settings
CREATE TABLE IF NOT EXISTS public.cross_module_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, config_key)
);

-- Enable RLS
ALTER TABLE public.cross_module_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tenant config"
  ON public.cross_module_config FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own tenant config"
  ON public.cross_module_config FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own tenant config"
  ON public.cross_module_config FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_cross_module_config_tenant_key ON public.cross_module_config(tenant_id, config_key);
CREATE INDEX idx_cross_module_config_category ON public.cross_module_config(tenant_id, category);

-- Function to seed default configs for a tenant
CREATE OR REPLACE FUNCTION public.seed_cross_module_config_defaults(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Variance thresholds
  INSERT INTO cross_module_config (tenant_id, config_key, config_value, description, category)
  VALUES 
    (p_tenant_id, 'variance_threshold_default', '{"value": 0.10}', 'Default variance threshold (10%)', 'variance'),
    (p_tenant_id, 'variance_threshold_critical', '{"value": 0.20}', 'Critical variance threshold (20%)', 'variance')
  ON CONFLICT (tenant_id, config_key) DO NOTHING;

  -- Cost fallback ratios
  INSERT INTO cross_module_config (tenant_id, config_key, config_value, description, category)
  VALUES 
    (p_tenant_id, 'cost_fallback_cogs', '{"percent": 0.55}', 'Default COGS fallback (55%)', 'cost_fallback'),
    (p_tenant_id, 'cost_fallback_fee', '{"percent": 0.20}', 'Default fee fallback (20%)', 'cost_fallback')
  ON CONFLICT (tenant_id, config_key) DO NOTHING;

  -- Escalation hours
  INSERT INTO cross_module_config (tenant_id, config_key, config_value, description, category)
  VALUES 
    (p_tenant_id, 'escalation_hours_critical', '{"hours": 24}', 'Critical alert escalation (24h)', 'escalation'),
    (p_tenant_id, 'escalation_hours_warning', '{"hours": 48}', 'Warning alert escalation (48h)', 'escalation'),
    (p_tenant_id, 'escalation_hours_info', '{"hours": 72}', 'Info alert escalation (72h)', 'escalation')
  ON CONFLICT (tenant_id, config_key) DO NOTHING;

  -- Sync schedule (UTC times)
  INSERT INTO cross_module_config (tenant_id, config_key, config_value, description, category)
  VALUES 
    (p_tenant_id, 'sync_schedule_daily_build', '{"hour": 2, "minute": 0}', 'Daily build time (02:00 UTC)', 'sync'),
    (p_tenant_id, 'sync_schedule_cross_module', '{"hour": 4, "minute": 0}', 'Cross-module sync time (04:00 UTC)', 'sync')
  ON CONFLICT (tenant_id, config_key) DO NOTHING;

  -- MDP thresholds
  INSERT INTO cross_module_config (tenant_id, config_key, config_value, description, category)
  VALUES 
    (p_tenant_id, 'mdp_roas_kill_threshold', '{"value": 0}', 'ROAS threshold for KILL decision', 'mdp'),
    (p_tenant_id, 'mdp_roas_pause_threshold', '{"value": 1.0}', 'ROAS threshold for PAUSE decision', 'mdp'),
    (p_tenant_id, 'mdp_roas_scale_threshold', '{"value": 3.0}', 'ROAS threshold for SCALE decision', 'mdp'),
    (p_tenant_id, 'mdp_cm_scale_threshold', '{"value": 0.15}', 'CM% threshold for SCALE decision (15%)', 'mdp')
  ON CONFLICT (tenant_id, config_key) DO NOTHING;
END;
$$;

-- =============================================
-- Task 4.2: LTV Auto-Seed Assumptions
-- =============================================

-- Industry-specific LTV assumptions table
CREATE TABLE IF NOT EXISTS public.ltv_industry_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_code TEXT NOT NULL UNIQUE,
  industry_name TEXT NOT NULL,
  assumptions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default industry assumptions
INSERT INTO public.ltv_industry_assumptions (industry_code, industry_name, assumptions)
VALUES 
  ('ecommerce_fashion', 'E-commerce Fashion', '{
    "avg_order_frequency_yearly": 3.5,
    "avg_retention_rate": 0.35,
    "avg_gross_margin": 0.45,
    "avg_discount_rate": 0.10,
    "customer_lifespan_years": 2.5,
    "repeat_purchase_probability": 0.40
  }'),
  ('ecommerce_electronics', 'E-commerce Electronics', '{
    "avg_order_frequency_yearly": 2.0,
    "avg_retention_rate": 0.25,
    "avg_gross_margin": 0.20,
    "avg_discount_rate": 0.10,
    "customer_lifespan_years": 3.0,
    "repeat_purchase_probability": 0.30
  }'),
  ('ecommerce_fmcg', 'E-commerce FMCG', '{
    "avg_order_frequency_yearly": 8.0,
    "avg_retention_rate": 0.50,
    "avg_gross_margin": 0.30,
    "avg_discount_rate": 0.10,
    "customer_lifespan_years": 2.0,
    "repeat_purchase_probability": 0.55
  }'),
  ('ecommerce_beauty', 'E-commerce Beauty & Cosmetics', '{
    "avg_order_frequency_yearly": 5.0,
    "avg_retention_rate": 0.45,
    "avg_gross_margin": 0.55,
    "avg_discount_rate": 0.10,
    "customer_lifespan_years": 2.5,
    "repeat_purchase_probability": 0.50
  }'),
  ('retail_general', 'Retail General', '{
    "avg_order_frequency_yearly": 4.0,
    "avg_retention_rate": 0.40,
    "avg_gross_margin": 0.35,
    "avg_discount_rate": 0.10,
    "customer_lifespan_years": 2.0,
    "repeat_purchase_probability": 0.45
  }')
ON CONFLICT (industry_code) DO UPDATE SET
  assumptions = EXCLUDED.assumptions,
  updated_at = now();

-- Tenant LTV config table (stores selected industry + overrides)
CREATE TABLE IF NOT EXISTS public.tenant_ltv_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  industry_code TEXT REFERENCES public.ltv_industry_assumptions(industry_code),
  custom_assumptions JSONB,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_ltv_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own tenant LTV config"
  ON public.tenant_ltv_config FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own tenant LTV config"
  ON public.tenant_ltv_config FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own tenant LTV config"
  ON public.tenant_ltv_config FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Function to get effective LTV assumptions for a tenant
CREATE OR REPLACE FUNCTION public.get_tenant_ltv_assumptions(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config tenant_ltv_config%ROWTYPE;
  v_industry_assumptions JSONB;
  v_result JSONB;
BEGIN
  -- Get tenant config
  SELECT * INTO v_config FROM tenant_ltv_config WHERE tenant_id = p_tenant_id;
  
  -- If no config, return default (retail_general)
  IF v_config IS NULL THEN
    SELECT assumptions INTO v_result FROM ltv_industry_assumptions WHERE industry_code = 'retail_general';
    RETURN COALESCE(v_result, '{}'::JSONB);
  END IF;
  
  -- If custom, return custom assumptions
  IF v_config.is_custom AND v_config.custom_assumptions IS NOT NULL THEN
    RETURN v_config.custom_assumptions;
  END IF;
  
  -- Get industry assumptions
  SELECT assumptions INTO v_industry_assumptions 
  FROM ltv_industry_assumptions 
  WHERE industry_code = v_config.industry_code;
  
  -- Merge with custom overrides if any
  IF v_config.custom_assumptions IS NOT NULL THEN
    RETURN v_industry_assumptions || v_config.custom_assumptions;
  END IF;
  
  RETURN COALESCE(v_industry_assumptions, '{}'::JSONB);
END;
$$;

-- Function to auto-seed LTV config when tenant is created
CREATE OR REPLACE FUNCTION public.auto_seed_tenant_ltv_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seed default LTV config (retail_general)
  INSERT INTO tenant_ltv_config (tenant_id, industry_code, is_custom)
  VALUES (NEW.id, 'retail_general', false)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  -- Seed cross-module config defaults
  PERFORM seed_cross_module_config_defaults(NEW.id);
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-seed on tenant creation
DROP TRIGGER IF EXISTS trigger_auto_seed_tenant_config ON public.tenants;
CREATE TRIGGER trigger_auto_seed_tenant_config
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_seed_tenant_ltv_config();

-- RPC to get config value
CREATE OR REPLACE FUNCTION public.get_cross_module_config(
  p_tenant_id UUID,
  p_config_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT config_value INTO v_value
  FROM cross_module_config
  WHERE tenant_id = p_tenant_id AND config_key = p_config_key AND is_active = true;
  
  RETURN v_value;
END;
$$;

-- RPC to update config value
CREATE OR REPLACE FUNCTION public.set_cross_module_config(
  p_tenant_id UUID,
  p_config_key TEXT,
  p_config_value JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cross_module_config
  SET config_value = p_config_value, updated_at = now()
  WHERE tenant_id = p_tenant_id AND config_key = p_config_key;
  
  RETURN FOUND;
END;
$$;

-- Seed configs for existing tenants
DO $$
DECLARE
  t_id UUID;
BEGIN
  FOR t_id IN SELECT id FROM tenants LOOP
    PERFORM seed_cross_module_config_defaults(t_id);
  END LOOP;
END;
$$;