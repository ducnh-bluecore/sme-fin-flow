
-- =============================================
-- TENANT HEALTH & CUSTOMER SUCCESS TRACKING SYSTEM
-- Phase 1: Core Tables + RPC Functions
-- =============================================

-- 1. tenant_events: Raw event log for all user activities
CREATE TABLE public.tenant_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'feature_use', 'decision', 'export', 'error', 'login', 'logout')),
  event_name TEXT NOT NULL,
  module TEXT CHECK (module IN ('fdp', 'mdp', 'cdp', 'control_tower', 'settings', 'onboarding', 'admin', 'other')),
  route TEXT,
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_tenant_events_tenant_id ON public.tenant_events(tenant_id);
CREATE INDEX idx_tenant_events_created_at ON public.tenant_events(created_at DESC);
CREATE INDEX idx_tenant_events_tenant_date ON public.tenant_events(tenant_id, created_at DESC);
CREATE INDEX idx_tenant_events_type ON public.tenant_events(event_type);
CREATE INDEX idx_tenant_events_module ON public.tenant_events(module);

-- Enable RLS
ALTER TABLE public.tenant_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only super admins can read all, users can insert their own tenant's events
CREATE POLICY "Super admins can read all tenant events"
  ON public.tenant_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'super_admin'
    )
  );

CREATE POLICY "Users can insert events for their tenant"
  ON public.tenant_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_users
      WHERE tenant_users.tenant_id = tenant_events.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.is_active = true
    )
  );

-- 2. tenant_health: Daily aggregated health metrics
CREATE TABLE public.tenant_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  health_score INTEGER DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  daily_active_users INTEGER DEFAULT 0,
  weekly_active_users INTEGER DEFAULT 0,
  monthly_active_users INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_decisions INTEGER DEFAULT 0,
  total_exports INTEGER DEFAULT 0,
  modules_used TEXT[] DEFAULT '{}',
  avg_session_duration_min NUMERIC(10,2) DEFAULT 0,
  onboarding_step TEXT,
  onboarding_percent INTEGER DEFAULT 0,
  data_freshness_days INTEGER,
  last_activity_at TIMESTAMPTZ,
  churn_risk_score INTEGER DEFAULT 0 CHECK (churn_risk_score >= 0 AND churn_risk_score <= 100),
  engagement_trend TEXT DEFAULT 'stable' CHECK (engagement_trend IN ('increasing', 'stable', 'declining')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, date)
);

-- Indexes
CREATE INDEX idx_tenant_health_tenant_id ON public.tenant_health(tenant_id);
CREATE INDEX idx_tenant_health_date ON public.tenant_health(date DESC);
CREATE INDEX idx_tenant_health_score ON public.tenant_health(health_score);

-- Enable RLS
ALTER TABLE public.tenant_health ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only super admins can read/write
CREATE POLICY "Super admins can manage tenant health"
  ON public.tenant_health FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'super_admin'
    )
  );

-- 3. cs_alerts: Customer Success alerts for proactive intervention
CREATE TABLE public.cs_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('churn_risk', 'inactive', 'stuck_onboarding', 'engagement_drop', 'data_stale', 'low_adoption')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  recommended_action TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'ignored')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_alerts_tenant_id ON public.cs_alerts(tenant_id);
CREATE INDEX idx_cs_alerts_status ON public.cs_alerts(status);
CREATE INDEX idx_cs_alerts_severity ON public.cs_alerts(severity);
CREATE INDEX idx_cs_alerts_created_at ON public.cs_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.cs_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only super admins can manage
CREATE POLICY "Super admins can manage cs alerts"
  ON public.cs_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'super_admin'
    )
  );

-- =============================================
-- RPC FUNCTIONS
-- =============================================

-- Function to get tenant activity summary
CREATE OR REPLACE FUNCTION public.get_tenant_activity_summary(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_start_date TIMESTAMPTZ;
  v_today DATE;
BEGIN
  v_today := CURRENT_DATE;
  v_start_date := v_today - (p_days || ' days')::INTERVAL;

  SELECT jsonb_build_object(
    'tenant_id', p_tenant_id,
    'period_days', p_days,
    'total_events', COALESCE((
      SELECT COUNT(*) FROM tenant_events
      WHERE tenant_id = p_tenant_id AND created_at >= v_start_date
    ), 0),
    'total_page_views', COALESCE((
      SELECT COUNT(*) FROM tenant_events
      WHERE tenant_id = p_tenant_id 
        AND event_type = 'page_view' 
        AND created_at >= v_start_date
    ), 0),
    'total_decisions', COALESCE((
      SELECT COUNT(*) FROM tenant_events
      WHERE tenant_id = p_tenant_id 
        AND event_type = 'decision' 
        AND created_at >= v_start_date
    ), 0),
    'unique_users', COALESCE((
      SELECT COUNT(DISTINCT user_id) FROM tenant_events
      WHERE tenant_id = p_tenant_id AND created_at >= v_start_date
    ), 0),
    'daily_active_users', COALESCE((
      SELECT COUNT(DISTINCT user_id) FROM tenant_events
      WHERE tenant_id = p_tenant_id 
        AND created_at >= v_today::TIMESTAMPTZ
    ), 0),
    'weekly_active_users', COALESCE((
      SELECT COUNT(DISTINCT user_id) FROM tenant_events
      WHERE tenant_id = p_tenant_id 
        AND created_at >= (v_today - INTERVAL '7 days')::TIMESTAMPTZ
    ), 0),
    'modules_used', COALESCE((
      SELECT jsonb_agg(DISTINCT module) FROM tenant_events
      WHERE tenant_id = p_tenant_id 
        AND module IS NOT NULL 
        AND created_at >= v_start_date
    ), '[]'::jsonb),
    'module_usage', COALESCE((
      SELECT jsonb_object_agg(module, cnt)
      FROM (
        SELECT module, COUNT(*) as cnt
        FROM tenant_events
        WHERE tenant_id = p_tenant_id 
          AND module IS NOT NULL
          AND created_at >= v_start_date
        GROUP BY module
      ) sub
    ), '{}'::jsonb),
    'avg_session_duration_min', COALESCE((
      SELECT ROUND(AVG(duration_ms)::NUMERIC / 60000, 2)
      FROM tenant_events
      WHERE tenant_id = p_tenant_id 
        AND event_type = 'page_view'
        AND duration_ms IS NOT NULL
        AND created_at >= v_start_date
    ), 0),
    'last_activity_at', (
      SELECT MAX(created_at) FROM tenant_events
      WHERE tenant_id = p_tenant_id
    ),
    'daily_trend', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', day::DATE,
          'events', COALESCE(cnt, 0),
          'users', COALESCE(users, 0)
        ) ORDER BY day
      )
      FROM (
        SELECT 
          d.day,
          COUNT(e.id) as cnt,
          COUNT(DISTINCT e.user_id) as users
        FROM generate_series(v_start_date::DATE, v_today, '1 day'::INTERVAL) d(day)
        LEFT JOIN tenant_events e ON e.tenant_id = p_tenant_id 
          AND e.created_at::DATE = d.day::DATE
        GROUP BY d.day
      ) daily
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to calculate tenant health score
CREATE OR REPLACE FUNCTION public.calculate_tenant_health_score(
  p_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_engagement_score INTEGER := 0;
  v_adoption_score INTEGER := 0;
  v_data_score INTEGER := 0;
  v_onboarding_score INTEGER := 0;
  v_growth_score INTEGER := 0;
  v_dau INTEGER;
  v_wau INTEGER;
  v_total_members INTEGER;
  v_modules_count INTEGER;
  v_last_activity TIMESTAMPTZ;
  v_days_inactive INTEGER;
BEGIN
  -- Get basic stats
  SELECT COUNT(*) INTO v_total_members
  FROM tenant_users WHERE tenant_id = p_tenant_id AND is_active = true;
  
  IF v_total_members = 0 THEN v_total_members := 1; END IF;

  -- DAU (today)
  SELECT COUNT(DISTINCT user_id) INTO v_dau
  FROM tenant_events
  WHERE tenant_id = p_tenant_id
    AND created_at >= CURRENT_DATE::TIMESTAMPTZ;

  -- WAU (last 7 days)
  SELECT COUNT(DISTINCT user_id) INTO v_wau
  FROM tenant_events
  WHERE tenant_id = p_tenant_id
    AND created_at >= (CURRENT_DATE - INTERVAL '7 days')::TIMESTAMPTZ;

  -- Modules used (last 30 days)
  SELECT COUNT(DISTINCT module) INTO v_modules_count
  FROM tenant_events
  WHERE tenant_id = p_tenant_id
    AND module IS NOT NULL
    AND created_at >= (CURRENT_DATE - INTERVAL '30 days')::TIMESTAMPTZ;

  -- Last activity
  SELECT MAX(created_at) INTO v_last_activity
  FROM tenant_events WHERE tenant_id = p_tenant_id;

  IF v_last_activity IS NOT NULL THEN
    v_days_inactive := EXTRACT(DAY FROM now() - v_last_activity)::INTEGER;
  ELSE
    v_days_inactive := 999;
  END IF;

  -- Calculate component scores
  
  -- 1. Engagement Score (30%): DAU/members ratio + recency
  v_engagement_score := LEAST(30, (
    (v_dau::NUMERIC / v_total_members * 15) + -- DAU ratio (max 15)
    CASE 
      WHEN v_days_inactive <= 1 THEN 15
      WHEN v_days_inactive <= 3 THEN 10
      WHEN v_days_inactive <= 7 THEN 5
      ELSE 0
    END
  )::INTEGER);

  -- 2. Adoption Score (25%): Modules used
  v_adoption_score := LEAST(25, (v_modules_count * 6.25)::INTEGER);

  -- 3. Data Activity Score (20%): Based on feature usage
  SELECT LEAST(20, COUNT(*)::INTEGER / 5) INTO v_data_score
  FROM tenant_events
  WHERE tenant_id = p_tenant_id
    AND event_type IN ('export', 'decision')
    AND created_at >= (CURRENT_DATE - INTERVAL '7 days')::TIMESTAMPTZ;

  -- 4. Onboarding Score (15%): Check onboarding completion
  -- For now, give 15 if tenant has been active
  IF v_wau > 0 THEN
    v_onboarding_score := 15;
  ELSIF v_dau > 0 THEN
    v_onboarding_score := 10;
  ELSE
    v_onboarding_score := 0;
  END IF;

  -- 5. Growth Score (10%): WAU trend
  v_growth_score := CASE
    WHEN v_wau >= v_total_members * 0.7 THEN 10
    WHEN v_wau >= v_total_members * 0.5 THEN 7
    WHEN v_wau >= v_total_members * 0.3 THEN 5
    WHEN v_wau > 0 THEN 3
    ELSE 0
  END;

  -- Total score
  v_score := v_engagement_score + v_adoption_score + v_data_score + v_onboarding_score + v_growth_score;

  RETURN LEAST(100, GREATEST(0, v_score));
END;
$$;

-- Function to get tenant health with calculated scores
CREATE OR REPLACE FUNCTION public.get_tenant_health(
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  v_health_score INTEGER;
  v_summary JSONB;
BEGIN
  -- Calculate current health score
  v_health_score := calculate_tenant_health_score(p_tenant_id);
  
  -- Get activity summary
  v_summary := get_tenant_activity_summary(p_tenant_id, 30);

  SELECT jsonb_build_object(
    'tenant_id', p_tenant_id,
    'health_score', v_health_score,
    'risk_level', CASE
      WHEN v_health_score >= 80 THEN 'healthy'
      WHEN v_health_score >= 60 THEN 'monitor'
      WHEN v_health_score >= 40 THEN 'at_risk'
      ELSE 'critical'
    END,
    'daily_active_users', v_summary->>'daily_active_users',
    'weekly_active_users', v_summary->>'weekly_active_users',
    'total_page_views', v_summary->>'total_page_views',
    'total_decisions', v_summary->>'total_decisions',
    'modules_used', v_summary->'modules_used',
    'module_usage', v_summary->'module_usage',
    'avg_session_duration_min', v_summary->>'avg_session_duration_min',
    'last_activity_at', v_summary->>'last_activity_at',
    'daily_trend', v_summary->'daily_trend',
    'calculated_at', now()
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to insert activity event (used by frontend)
CREATE OR REPLACE FUNCTION public.track_tenant_event(
  p_tenant_id UUID,
  p_event_type TEXT,
  p_event_name TEXT,
  p_module TEXT DEFAULT NULL,
  p_route TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_session_id TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  INSERT INTO tenant_events (
    tenant_id, user_id, event_type, event_name, 
    module, route, metadata, session_id, duration_ms
  ) VALUES (
    p_tenant_id, v_user_id, p_event_type, p_event_name,
    p_module, p_route, p_metadata, p_session_id, p_duration_ms
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_tenant_health_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_health_timestamp
  BEFORE UPDATE ON public.tenant_health
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_health_updated_at();

CREATE TRIGGER update_cs_alerts_timestamp
  BEFORE UPDATE ON public.cs_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_health_updated_at();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_tenant_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_tenant_health_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_health TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_tenant_event TO authenticated;
