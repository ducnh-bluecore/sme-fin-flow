-- =============================================================================
-- PHASE 6: UI POLISH & GOVERNANCE (Complete)
-- Task 6.1: Insight Dismiss/Snooze 
-- Task 6.2: Alert Resolution Workflow
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6.1: INSIGHT ACTIONS (Dismiss/Snooze for CDP Insights)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Table to track insight actions (dismiss, snooze, acknowledge)
CREATE TABLE IF NOT EXISTS cdp_insight_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    insight_event_id UUID NOT NULL REFERENCES cdp_insight_events(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('dismiss', 'snooze', 'acknowledge', 'reactivate')),
    action_by UUID REFERENCES auth.users(id),
    action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason TEXT,
    snooze_until TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE cdp_insight_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant users can manage insight actions" ON cdp_insight_actions;
CREATE POLICY "Tenant users can manage insight actions"
    ON cdp_insight_actions
    FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cdp_insight_actions_lookup 
    ON cdp_insight_actions(tenant_id, insight_event_id, action_type);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6.2: ALERT RESOLUTION WORKFLOW
-- ═══════════════════════════════════════════════════════════════════════════════

-- Table to track alert resolution workflow
CREATE TABLE IF NOT EXISTS alert_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES alert_instances(id) ON DELETE CASCADE,
    resolution_status TEXT NOT NULL DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'in_progress', 'resolved', 'escalated', 'false_positive')),
    assigned_to UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_type TEXT CHECK (resolution_type IN ('action_taken', 'root_cause_fixed', 'monitoring', 'false_positive', 'escalated', 'auto_resolved')),
    resolution_notes TEXT,
    root_cause TEXT,
    actions_taken JSONB DEFAULT '[]',
    time_to_resolve_minutes INTEGER,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE alert_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant users can manage alert resolutions" ON alert_resolutions;
CREATE POLICY "Tenant users can manage alert resolutions"
    ON alert_resolutions
    FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_alert_resolutions_status 
    ON alert_resolutions(tenant_id, resolution_status);
CREATE INDEX IF NOT EXISTS idx_alert_resolutions_assigned 
    ON alert_resolutions(assigned_to, resolution_status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPCs FOR UI INTERACTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Dismiss insight
CREATE OR REPLACE FUNCTION dismiss_insight(
    p_tenant_id UUID,
    p_insight_event_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_action_id UUID;
BEGIN
    -- Delete existing dismiss if any
    DELETE FROM cdp_insight_actions 
    WHERE insight_event_id = p_insight_event_id 
    AND action_type = 'dismiss';
    
    -- Insert dismiss action
    INSERT INTO cdp_insight_actions (
        tenant_id,
        insight_event_id,
        action_type,
        action_by,
        reason
    ) VALUES (
        p_tenant_id,
        p_insight_event_id,
        'dismiss',
        auth.uid(),
        p_reason
    )
    RETURNING id INTO v_action_id;
    
    -- Update insight event status
    UPDATE cdp_insight_events 
    SET status = 'dismissed',
        updated_at = now()
    WHERE id = p_insight_event_id 
    AND tenant_id = p_tenant_id;
    
    RETURN v_action_id;
END;
$$;

-- Snooze insight
CREATE OR REPLACE FUNCTION snooze_insight(
    p_tenant_id UUID,
    p_insight_event_id UUID,
    p_snooze_days INTEGER DEFAULT 7,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_action_id UUID;
    v_snooze_until TIMESTAMPTZ;
BEGIN
    v_snooze_until := now() + (p_snooze_days || ' days')::INTERVAL;
    
    -- Delete existing snooze if any
    DELETE FROM cdp_insight_actions 
    WHERE insight_event_id = p_insight_event_id 
    AND action_type = 'snooze';
    
    -- Insert snooze action
    INSERT INTO cdp_insight_actions (
        tenant_id,
        insight_event_id,
        action_type,
        action_by,
        reason,
        snooze_until
    ) VALUES (
        p_tenant_id,
        p_insight_event_id,
        'snooze',
        auth.uid(),
        p_reason,
        v_snooze_until
    )
    RETURNING id INTO v_action_id;
    
    -- Update insight event cooldown
    UPDATE cdp_insight_events 
    SET cooldown_until = v_snooze_until,
        status = 'snoozed',
        updated_at = now()
    WHERE id = p_insight_event_id 
    AND tenant_id = p_tenant_id;
    
    RETURN v_action_id;
END;
$$;

-- Reactivate snoozed/dismissed insight
CREATE OR REPLACE FUNCTION reactivate_insight(
    p_tenant_id UUID,
    p_insight_event_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Remove dismiss/snooze actions
    DELETE FROM cdp_insight_actions 
    WHERE insight_event_id = p_insight_event_id 
    AND tenant_id = p_tenant_id
    AND action_type IN ('dismiss', 'snooze');
    
    -- Reactivate insight
    UPDATE cdp_insight_events 
    SET status = 'active',
        cooldown_until = NULL,
        updated_at = now()
    WHERE id = p_insight_event_id 
    AND tenant_id = p_tenant_id;
    
    RETURN TRUE;
END;
$$;

-- Start alert resolution
CREATE OR REPLACE FUNCTION start_alert_resolution(
    p_tenant_id UUID,
    p_alert_id UUID,
    p_assigned_to UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resolution_id UUID;
BEGIN
    -- Check if resolution exists
    SELECT id INTO v_resolution_id FROM alert_resolutions WHERE alert_id = p_alert_id;
    
    IF v_resolution_id IS NOT NULL THEN
        UPDATE alert_resolutions SET
            resolution_status = 'in_progress',
            assigned_to = COALESCE(p_assigned_to, auth.uid()),
            assigned_at = now(),
            started_at = COALESCE(started_at, now()),
            updated_at = now()
        WHERE id = v_resolution_id;
    ELSE
        INSERT INTO alert_resolutions (
            tenant_id,
            alert_id,
            resolution_status,
            assigned_to,
            assigned_at,
            started_at
        ) VALUES (
            p_tenant_id,
            p_alert_id,
            'in_progress',
            COALESCE(p_assigned_to, auth.uid()),
            now(),
            now()
        )
        RETURNING id INTO v_resolution_id;
    END IF;
    
    -- Update alert status
    UPDATE alert_instances 
    SET status = 'in_progress',
        assigned_to = COALESCE(p_assigned_to, auth.uid()),
        assigned_at = now(),
        updated_at = now()
    WHERE id = p_alert_id 
    AND tenant_id = p_tenant_id;
    
    RETURN v_resolution_id;
END;
$$;

-- Complete alert resolution
CREATE OR REPLACE FUNCTION complete_alert_resolution(
    p_tenant_id UUID,
    p_alert_id UUID,
    p_resolution_type TEXT,
    p_resolution_notes TEXT DEFAULT NULL,
    p_root_cause TEXT DEFAULT NULL,
    p_actions_taken JSONB DEFAULT '[]'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resolution_id UUID;
    v_started_at TIMESTAMPTZ;
    v_minutes INTEGER;
BEGIN
    -- Get started_at for time calculation
    SELECT id, started_at INTO v_resolution_id, v_started_at 
    FROM alert_resolutions 
    WHERE alert_id = p_alert_id;
    
    v_minutes := EXTRACT(EPOCH FROM (now() - COALESCE(v_started_at, now()))) / 60;
    
    IF v_resolution_id IS NOT NULL THEN
        UPDATE alert_resolutions SET
            resolution_status = 'resolved',
            resolved_at = now(),
            resolved_by = auth.uid(),
            resolution_type = p_resolution_type,
            resolution_notes = p_resolution_notes,
            root_cause = p_root_cause,
            actions_taken = p_actions_taken,
            time_to_resolve_minutes = v_minutes,
            updated_at = now()
        WHERE id = v_resolution_id;
    ELSE
        INSERT INTO alert_resolutions (
            tenant_id,
            alert_id,
            resolution_status,
            resolved_at,
            resolved_by,
            resolution_type,
            resolution_notes,
            root_cause,
            actions_taken,
            time_to_resolve_minutes
        ) VALUES (
            p_tenant_id,
            p_alert_id,
            'resolved',
            now(),
            auth.uid(),
            p_resolution_type,
            p_resolution_notes,
            p_root_cause,
            p_actions_taken,
            0
        )
        RETURNING id INTO v_resolution_id;
    END IF;
    
    -- Update alert status
    UPDATE alert_instances 
    SET status = 'resolved',
        resolved_at = now(),
        resolved_by = auth.uid(),
        resolution_notes = p_resolution_notes,
        updated_at = now()
    WHERE id = p_alert_id 
    AND tenant_id = p_tenant_id;
    
    RETURN v_resolution_id;
END;
$$;

-- Mark alert as false positive
CREATE OR REPLACE FUNCTION mark_alert_false_positive(
    p_tenant_id UUID,
    p_alert_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resolution_id UUID;
BEGIN
    SELECT id INTO v_resolution_id FROM alert_resolutions WHERE alert_id = p_alert_id;
    
    IF v_resolution_id IS NOT NULL THEN
        UPDATE alert_resolutions SET
            resolution_status = 'false_positive',
            resolved_at = now(),
            resolved_by = auth.uid(),
            resolution_type = 'false_positive',
            resolution_notes = p_reason,
            updated_at = now()
        WHERE id = v_resolution_id;
    ELSE
        INSERT INTO alert_resolutions (
            tenant_id,
            alert_id,
            resolution_status,
            resolved_at,
            resolved_by,
            resolution_type,
            resolution_notes
        ) VALUES (
            p_tenant_id,
            p_alert_id,
            'false_positive',
            now(),
            auth.uid(),
            'false_positive',
            p_reason
        )
        RETURNING id INTO v_resolution_id;
    END IF;
    
    -- Update alert status
    UPDATE alert_instances 
    SET status = 'dismissed',
        resolved_at = now(),
        resolved_by = auth.uid(),
        resolution_notes = 'False positive: ' || p_reason,
        updated_at = now()
    WHERE id = p_alert_id 
    AND tenant_id = p_tenant_id;
    
    RETURN v_resolution_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW: Active insights with action status
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_cdp_insights_with_actions AS
SELECT 
    e.id,
    e.tenant_id,
    e.insight_code,
    e.title,
    e.severity,
    e.confidence,
    e.status,
    e.created_at,
    e.cooldown_until,
    -- Action info
    CASE 
        WHEN dismiss.id IS NOT NULL THEN 'dismissed'
        WHEN snooze.id IS NOT NULL AND snooze.snooze_until > now() THEN 'snoozed'
        ELSE e.status
    END AS display_status,
    dismiss.action_at AS dismissed_at,
    dismiss.reason AS dismiss_reason,
    snooze.snooze_until,
    snooze.reason AS snooze_reason,
    -- Is actionable?
    CASE 
        WHEN dismiss.id IS NOT NULL THEN false
        WHEN snooze.id IS NOT NULL AND snooze.snooze_until > now() THEN false
        ELSE true
    END AS is_actionable
FROM cdp_insight_events e
LEFT JOIN cdp_insight_actions dismiss 
    ON e.id = dismiss.insight_event_id 
    AND dismiss.action_type = 'dismiss'
LEFT JOIN cdp_insight_actions snooze 
    ON e.id = snooze.insight_event_id 
    AND snooze.action_type = 'snooze';

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW: Alerts with resolution workflow status
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_alerts_with_resolution AS
SELECT 
    a.id,
    a.tenant_id,
    a.alert_type,
    a.title,
    a.severity,
    a.status AS alert_status,
    a.created_at,
    a.impact_amount,
    -- Resolution info
    r.id AS resolution_id,
    COALESCE(r.resolution_status, 'pending') AS resolution_status,
    r.assigned_to,
    r.started_at,
    r.resolved_at,
    r.resolution_type,
    r.resolution_notes,
    r.root_cause,
    r.time_to_resolve_minutes,
    r.follow_up_required,
    r.follow_up_date,
    -- Time metrics
    CASE 
        WHEN r.started_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (COALESCE(r.resolved_at, now()) - r.started_at)) / 60
        ELSE NULL
    END AS minutes_in_progress,
    CASE 
        WHEN a.created_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (now() - a.created_at)) / 60
        ELSE 0
    END AS minutes_since_created
FROM alert_instances a
LEFT JOIN alert_resolutions r ON a.id = r.alert_id;