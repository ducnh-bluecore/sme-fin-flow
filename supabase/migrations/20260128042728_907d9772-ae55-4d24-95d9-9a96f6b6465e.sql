-- ============================================================
-- PHASE 1.2: MDP DECISION SIGNALS VIEW & CONFIG TABLE
-- Fixed: Use correct column names from cdp_orders and marketing_expenses
-- ============================================================

-- 1. Create mdp_config table for configurable thresholds
CREATE TABLE IF NOT EXISTS public.mdp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  config_key text NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, config_key)
);

-- Enable RLS
ALTER TABLE public.mdp_config ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own tenant mdp_config"
  ON public.mdp_config FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own tenant mdp_config"
  ON public.mdp_config FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 2. Insert default thresholds seeder function
CREATE OR REPLACE FUNCTION public.seed_mdp_config_defaults(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO mdp_config (tenant_id, config_key, config_value, description)
  VALUES 
    (p_tenant_id, 'KILL_PROFIT_ROAS_THRESHOLD', '0'::jsonb, 'Profit ROAS threshold below which campaign should be killed'),
    (p_tenant_id, 'KILL_CONSECUTIVE_DAYS', '3'::jsonb, 'Number of consecutive negative days before KILL'),
    (p_tenant_id, 'PAUSE_CASH_CONVERSION_D14', '0.5'::jsonb, 'Cash conversion threshold at D+14'),
    (p_tenant_id, 'KILL_WORST_CM_PERCENT', '-0.10'::jsonb, 'Worst case CM% threshold for KILL'),
    (p_tenant_id, 'SCALE_MIN_CM_PERCENT', '0.15'::jsonb, 'Minimum CM% for SCALE recommendation'),
    (p_tenant_id, 'SCALE_MIN_CASH_CONVERSION', '0.70'::jsonb, 'Minimum cash conversion for SCALE'),
    (p_tenant_id, 'CAP_RETURN_RATE', '0.15'::jsonb, 'Return rate threshold for CAP action'),
    (p_tenant_id, 'MIN_SPEND_FOR_ANALYSIS', '1000000'::jsonb, 'Minimum spend (VND) to trigger analysis')
  ON CONFLICT (tenant_id, config_key) DO NOTHING;
END;
$$;

-- 3. Create v_mdp_decision_signals view using correct schema
CREATE OR REPLACE VIEW public.v_mdp_decision_signals AS
WITH channel_revenue AS (
  -- Revenue metrics from cdp_orders grouped by channel
  SELECT 
    o.tenant_id,
    COALESCE(o.channel, 'unknown') as channel,
    SUM(o.gross_revenue) as gross_revenue,
    SUM(o.net_revenue) as net_revenue,
    SUM(COALESCE(o.cogs, o.net_revenue * 0.55)) as cogs_amount,
    SUM(COALESCE(o.platform_fee, 0) + COALESCE(o.shipping_fee, 0) + COALESCE(o.other_fees, 0)) as fees,
    SUM(o.net_revenue - COALESCE(o.cogs, o.net_revenue * 0.55) - COALESCE(o.platform_fee, 0) - COALESCE(o.shipping_fee, 0) - COALESCE(o.other_fees, 0)) as contribution_margin,
    COUNT(*) as order_count
  FROM cdp_orders o
  WHERE o.order_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY o.tenant_id, COALESCE(o.channel, 'unknown')
),
channel_spend AS (
  -- Marketing spend from marketing_expenses
  SELECT 
    tenant_id,
    COALESCE(channel, 'unknown') as channel,
    SUM(amount) as ad_spend,
    SUM(COALESCE(impressions, 0)) as total_impressions,
    SUM(COALESCE(clicks, 0)) as total_clicks,
    SUM(COALESCE(conversions, 0)) as total_conversions
  FROM marketing_expenses
  WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY tenant_id, COALESCE(channel, 'unknown')
),
thresholds AS (
  -- Config thresholds per tenant
  SELECT 
    tenant_id,
    MAX(CASE WHEN config_key = 'KILL_PROFIT_ROAS_THRESHOLD' THEN (config_value::text)::numeric END) as kill_roas_threshold,
    MAX(CASE WHEN config_key = 'PAUSE_CASH_CONVERSION_D14' THEN (config_value::text)::numeric END) as pause_cash_conversion,
    MAX(CASE WHEN config_key = 'KILL_WORST_CM_PERCENT' THEN (config_value::text)::numeric END) as kill_cm_percent,
    MAX(CASE WHEN config_key = 'SCALE_MIN_CM_PERCENT' THEN (config_value::text)::numeric END) as scale_cm_percent,
    MAX(CASE WHEN config_key = 'SCALE_MIN_CASH_CONVERSION' THEN (config_value::text)::numeric END) as scale_cash_conversion,
    MAX(CASE WHEN config_key = 'CAP_RETURN_RATE' THEN (config_value::text)::numeric END) as cap_return_rate,
    MAX(CASE WHEN config_key = 'MIN_SPEND_FOR_ANALYSIS' THEN (config_value::text)::numeric END) as min_spend
  FROM mdp_config
  GROUP BY tenant_id
)
SELECT 
  cr.tenant_id,
  cr.channel,
  cr.gross_revenue,
  cr.net_revenue,
  cr.contribution_margin,
  CASE WHEN cr.net_revenue > 0 THEN cr.contribution_margin / cr.net_revenue ELSE 0 END as contribution_margin_percent,
  COALESCE(cs.ad_spend, 0) as ad_spend,
  CASE WHEN COALESCE(cs.ad_spend, 0) > 0 THEN cr.contribution_margin / cs.ad_spend ELSE NULL END as profit_roas,
  COALESCE(cs.total_impressions, 0) as impressions,
  COALESCE(cs.total_clicks, 0) as clicks,
  COALESCE(cs.total_conversions, 0) as conversions,
  cr.order_count,
  -- Decision logic (deterministic rules from MDP Manifesto)
  CASE
    -- Rule 1: KILL if negative profit ROAS and significant spend
    WHEN COALESCE(cs.ad_spend, 0) > COALESCE(t.min_spend, 1000000) 
         AND CASE WHEN COALESCE(cs.ad_spend, 0) > 0 THEN cr.contribution_margin / cs.ad_spend ELSE 0 END < COALESCE(t.kill_roas_threshold, 0)
    THEN 'KILL'
    -- Rule 2: KILL if worst case CM% < threshold
    WHEN cr.net_revenue > 0 
         AND (cr.contribution_margin / cr.net_revenue) < COALESCE(t.kill_cm_percent, -0.10)
    THEN 'KILL'
    -- Rule 3: SCALE if profitable and meets thresholds
    WHEN cr.net_revenue > 0 
         AND (cr.contribution_margin / cr.net_revenue) >= COALESCE(t.scale_cm_percent, 0.15)
    THEN 'SCALE'
    -- Default: MONITOR
    ELSE 'MONITOR'
  END as recommended_action,
  -- Urgency based on action
  CASE
    WHEN COALESCE(cs.ad_spend, 0) > COALESCE(t.min_spend, 1000000) 
         AND CASE WHEN COALESCE(cs.ad_spend, 0) > 0 THEN cr.contribution_margin / cs.ad_spend ELSE 0 END < COALESCE(t.kill_roas_threshold, 0)
    THEN 'IMMEDIATE'
    WHEN cr.net_revenue > 0 
         AND (cr.contribution_margin / cr.net_revenue) < COALESCE(t.kill_cm_percent, -0.10)
    THEN 'IMMEDIATE'
    WHEN cr.net_revenue > 0 
         AND (cr.contribution_margin / cr.net_revenue) >= COALESCE(t.scale_cm_percent, 0.15)
    THEN 'THIS_WEEK'
    ELSE 'THIS_WEEK'
  END as urgency,
  -- Owner based on action type
  CASE
    WHEN COALESCE(cs.ad_spend, 0) > COALESCE(t.min_spend, 1000000) 
         AND CASE WHEN COALESCE(cs.ad_spend, 0) > 0 THEN cr.contribution_margin / cs.ad_spend ELSE 0 END < COALESCE(t.kill_roas_threshold, 0)
    THEN 'CEO'
    WHEN cr.net_revenue > 0 
         AND (cr.contribution_margin / cr.net_revenue) < COALESCE(t.kill_cm_percent, -0.10)
    THEN 'CEO'
    ELSE 'CMO'
  END as decision_owner,
  now() as computed_at
FROM channel_revenue cr
LEFT JOIN channel_spend cs ON cr.tenant_id = cs.tenant_id AND cr.channel = cs.channel
LEFT JOIN thresholds t ON cr.tenant_id = t.tenant_id;

-- 4. Add index for performance
CREATE INDEX IF NOT EXISTS idx_mdp_config_tenant_key ON public.mdp_config(tenant_id, config_key);

-- 5. Grant permissions
GRANT SELECT ON public.v_mdp_decision_signals TO authenticated;
GRANT ALL ON public.mdp_config TO authenticated;