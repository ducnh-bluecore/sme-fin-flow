-- =============================================
-- PHASE 3: AUTOMATION & TRIGGERS (Fixed)
-- =============================================

-- Drop existing function first
DROP FUNCTION IF EXISTS public.cross_module_run_daily_sync(UUID);

-- =============================================
-- 3.2: ALERT CLUSTERING
-- =============================================

-- Table to store alert clusters
CREATE TABLE IF NOT EXISTS public.alert_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cluster_key TEXT NOT NULL,
  cluster_type TEXT NOT NULL CHECK (cluster_type IN ('metric_family', 'entity', 'time_window', 'causal_chain')),
  root_alert_id UUID REFERENCES public.alert_instances(id) ON DELETE SET NULL,
  alert_count INTEGER DEFAULT 1,
  total_impact_amount NUMERIC(20,2) DEFAULT 0,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(tenant_id, cluster_key)
);

-- Junction table for alerts in clusters
CREATE TABLE IF NOT EXISTS public.alert_cluster_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.alert_clusters(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES public.alert_instances(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  is_root BOOLEAN DEFAULT FALSE,
  UNIQUE(cluster_id, alert_id)
);

-- Enable RLS
ALTER TABLE public.alert_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_cluster_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view their tenant's alert clusters" ON public.alert_clusters;
DROP POLICY IF EXISTS "Users can manage their tenant's alert clusters" ON public.alert_clusters;
DROP POLICY IF EXISTS "Users can view alert cluster members" ON public.alert_cluster_members;
DROP POLICY IF EXISTS "Users can manage alert cluster members" ON public.alert_cluster_members;

CREATE POLICY "Users can view their tenant's alert clusters"
  ON public.alert_clusters FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can manage their tenant's alert clusters"
  ON public.alert_clusters FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can view alert cluster members"
  ON public.alert_cluster_members FOR SELECT
  USING (cluster_id IN (SELECT id FROM public.alert_clusters WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true)));

CREATE POLICY "Users can manage alert cluster members"
  ON public.alert_cluster_members FOR ALL
  USING (cluster_id IN (SELECT id FROM public.alert_clusters WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true)));

-- Function to cluster related alerts
CREATE OR REPLACE FUNCTION public.cluster_related_alerts(p_tenant_id UUID)
RETURNS TABLE(
  clusters_created INTEGER,
  alerts_clustered INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clusters_created INTEGER := 0;
  v_alerts_clustered INTEGER := 0;
  v_cluster_id UUID;
  v_alert RECORD;
  v_cluster_key TEXT;
BEGIN
  FOR v_alert IN 
    SELECT 
      ai.id,
      ai.metric_name,
      ai.category,
      ai.severity,
      ai.impact_amount,
      COALESCE(ai.metric_name, ai.category) || '_' || ai.severity AS computed_cluster_key
    FROM alert_instances ai
    LEFT JOIN alert_cluster_members acm ON acm.alert_id = ai.id
    WHERE ai.tenant_id = p_tenant_id
      AND ai.status = 'active'
      AND acm.id IS NULL
    ORDER BY ai.created_at
  LOOP
    v_cluster_key := v_alert.computed_cluster_key;
    
    SELECT id INTO v_cluster_id
    FROM alert_clusters
    WHERE tenant_id = p_tenant_id
      AND cluster_key = v_cluster_key
      AND status = 'open';
    
    IF v_cluster_id IS NULL THEN
      INSERT INTO alert_clusters (tenant_id, cluster_key, cluster_type, root_alert_id, severity, total_impact_amount)
      VALUES (p_tenant_id, v_cluster_key, 'metric_family', v_alert.id, v_alert.severity, COALESCE(v_alert.impact_amount, 0))
      RETURNING id INTO v_cluster_id;
      
      v_clusters_created := v_clusters_created + 1;
      
      INSERT INTO alert_cluster_members (cluster_id, alert_id, is_root)
      VALUES (v_cluster_id, v_alert.id, TRUE);
    ELSE
      INSERT INTO alert_cluster_members (cluster_id, alert_id, is_root)
      VALUES (v_cluster_id, v_alert.id, FALSE)
      ON CONFLICT (cluster_id, alert_id) DO NOTHING;
      
      UPDATE alert_clusters
      SET 
        alert_count = alert_count + 1,
        total_impact_amount = total_impact_amount + COALESCE(v_alert.impact_amount, 0),
        severity = CASE 
          WHEN v_alert.severity = 'critical' THEN 'critical'
          WHEN severity = 'critical' THEN 'critical'
          WHEN v_alert.severity = 'warning' THEN 'warning'
          ELSE severity
        END,
        updated_at = NOW()
      WHERE id = v_cluster_id;
    END IF;
    
    v_alerts_clustered := v_alerts_clustered + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_clusters_created, v_alerts_clustered;
END;
$$;

-- =============================================
-- 3.3: VARIANCE AUTO-DISPATCH
-- =============================================

CREATE TABLE IF NOT EXISTS public.variance_decision_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  variance_alert_id UUID,
  target_module TEXT NOT NULL CHECK (target_module IN ('FDP', 'MDP', 'CDP', 'CONTROL_TOWER')),
  card_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  recommended_action TEXT,
  impact_amount NUMERIC(20,2),
  priority INTEGER DEFAULT 50,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.variance_decision_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's variance decision cards" ON public.variance_decision_cards;
DROP POLICY IF EXISTS "Users can manage their tenant's variance decision cards" ON public.variance_decision_cards;

CREATE POLICY "Users can view their tenant's variance decision cards"
  ON public.variance_decision_cards FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Users can manage their tenant's variance decision cards"
  ON public.variance_decision_cards FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true));

-- Function to auto-dispatch variance alerts to decision cards
CREATE OR REPLACE FUNCTION public.auto_dispatch_variance_to_cards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_title TEXT;
  v_card_description TEXT;
  v_target_modules TEXT[];
  v_module TEXT;
BEGIN
  IF NEW.severity NOT IN ('warning', 'critical') OR ABS(NEW.variance_percent) < 10 THEN
    RETURN NEW;
  END IF;
  
  CASE NEW.alert_type
    WHEN 'REVENUE_VARIANCE' THEN
      v_target_modules := ARRAY['FDP', 'MDP'];
      v_card_title := 'Revenue Variance Detected: ' || ROUND(NEW.variance_percent::NUMERIC, 1) || '%';
      v_card_description := 'Expected: ' || NEW.expected_value || ', Actual: ' || NEW.actual_value;
    WHEN 'COST_VARIANCE' THEN
      v_target_modules := ARRAY['FDP'];
      v_card_title := 'Cost Variance Detected: ' || ROUND(NEW.variance_percent::NUMERIC, 1) || '%';
      v_card_description := 'Review cost structure and update locked costs if needed';
    WHEN 'LTV_VARIANCE' THEN
      v_target_modules := ARRAY['CDP', 'MDP'];
      v_card_title := 'LTV Variance Detected: ' || ROUND(NEW.variance_percent::NUMERIC, 1) || '%';
      v_card_description := 'Recalibrate customer equity and segment priorities';
    ELSE
      v_target_modules := ARRAY['CONTROL_TOWER'];
      v_card_title := 'Cross-Domain Variance: ' || NEW.alert_type;
      v_card_description := 'Review variance between ' || NEW.source_module || ' and ' || NEW.target_module;
  END CASE;
  
  FOREACH v_module IN ARRAY v_target_modules
  LOOP
    INSERT INTO variance_decision_cards (
      tenant_id,
      variance_alert_id,
      target_module,
      card_type,
      title,
      description,
      recommended_action,
      impact_amount,
      priority
    )
    VALUES (
      NEW.tenant_id,
      NEW.id,
      v_module,
      NEW.alert_type,
      v_card_title,
      v_card_description,
      CASE v_module
        WHEN 'FDP' THEN 'Review budget allocation and update forecasts'
        WHEN 'MDP' THEN 'Adjust marketing spend based on variance'
        WHEN 'CDP' THEN 'Recalibrate customer segments and LTV assumptions'
        ELSE 'Escalate to management for strategic review'
      END,
      NEW.variance_amount,
      CASE NEW.severity
        WHEN 'critical' THEN 90
        WHEN 'warning' THEN 60
        ELSE 30
      END
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-dispatch
DROP TRIGGER IF EXISTS trigger_auto_dispatch_variance ON public.cross_domain_variance_alerts;
CREATE TRIGGER trigger_auto_dispatch_variance
  AFTER INSERT ON public.cross_domain_variance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_dispatch_variance_to_cards();

-- =============================================
-- 3.1: DAILY SYNC ORCHESTRATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.cross_module_run_daily_sync(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE(
  step TEXT,
  status TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
  v_result RECORD;
BEGIN
  FOR v_tenant IN 
    SELECT id FROM tenants WHERE is_active = true AND (p_tenant_id IS NULL OR id = p_tenant_id)
  LOOP
    BEGIN
      PERFORM fdp_push_ar_to_cdp(v_tenant.id);
      RETURN QUERY SELECT 'ar_to_credit_risk'::TEXT, 'success'::TEXT, jsonb_build_object('tenant_id', v_tenant.id);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'ar_to_credit_risk'::TEXT, 'error'::TEXT, jsonb_build_object('tenant_id', v_tenant.id, 'error', SQLERRM);
    END;
    
    BEGIN
      SELECT * INTO v_result FROM cluster_related_alerts(v_tenant.id);
      RETURN QUERY SELECT 'alert_clustering'::TEXT, 'success'::TEXT, jsonb_build_object('tenant_id', v_tenant.id, 'clusters_created', v_result.clusters_created, 'alerts_clustered', v_result.alerts_clustered);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'alert_clustering'::TEXT, 'error'::TEXT, jsonb_build_object('tenant_id', v_tenant.id, 'error', SQLERRM);
    END;
    
    BEGIN
      PERFORM detect_cross_domain_variance(v_tenant.id);
      RETURN QUERY SELECT 'variance_detection'::TEXT, 'success'::TEXT, jsonb_build_object('tenant_id', v_tenant.id);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'variance_detection'::TEXT, 'error'::TEXT, jsonb_build_object('tenant_id', v_tenant.id, 'error', SQLERRM);
    END;
    
    BEGIN
      PERFORM auto_escalate_alerts();
      RETURN QUERY SELECT 'auto_escalation'::TEXT, 'success'::TEXT, jsonb_build_object('tenant_id', v_tenant.id);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT 'auto_escalation'::TEXT, 'error'::TEXT, jsonb_build_object('tenant_id', v_tenant.id, 'error', SQLERRM);
    END;
  END LOOP;
  
  RETURN;
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_alert_clusters_tenant_status ON public.alert_clusters(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_cluster_members_cluster ON public.alert_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_variance_decision_cards_tenant_status ON public.variance_decision_cards(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_variance_decision_cards_module ON public.variance_decision_cards(target_module, status);