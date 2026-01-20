-- ================================================
-- ALERT HIERARCHY SYSTEM
-- ================================================

-- Add hierarchy columns to early_warning_alerts
ALTER TABLE public.early_warning_alerts 
ADD COLUMN IF NOT EXISTS parent_alert_id UUID REFERENCES public.early_warning_alerts(id),
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS suppressed_children JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS root_cause_metric TEXT,
ADD COLUMN IF NOT EXISTS root_cause_explanation TEXT,
ADD COLUMN IF NOT EXISTS child_count INTEGER DEFAULT 0;

-- hierarchy_level: 1=Cash, 2=CM, 3=UnitEcon, 4=SKU, 5=Channel, 6=Campaign
-- suppressed_children: [{id, title, metric_code, original_severity}]

CREATE INDEX IF NOT EXISTS idx_early_warning_parent 
  ON public.early_warning_alerts(parent_alert_id) WHERE parent_alert_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_early_warning_hierarchy 
  ON public.early_warning_alerts(tenant_id, hierarchy_level, is_parent) 
  WHERE status = 'active';

-- Table: alert_hierarchy_rules
-- Defines parent-child relationships between metric types
CREATE TABLE IF NOT EXISTS public.alert_hierarchy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_metric_code TEXT NOT NULL,
  child_metric_code TEXT NOT NULL,
  hierarchy_level INTEGER NOT NULL, -- Lower = higher priority (1=Cash is highest)
  collapse_threshold INTEGER DEFAULT 3, -- Min children to trigger collapse
  root_cause_template TEXT, -- Template for root cause explanation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(parent_metric_code, child_metric_code)
);

-- Enable RLS
ALTER TABLE public.alert_hierarchy_rules ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read alert_hierarchy_rules" 
  ON public.alert_hierarchy_rules FOR SELECT 
  USING (true);

-- Insert hierarchy rules
-- Priority: Cash(1) > CM(2) > UnitEcon(3) > SKU(4) > Channel(5) > Campaign(6)
INSERT INTO public.alert_hierarchy_rules (parent_metric_code, child_metric_code, hierarchy_level, collapse_threshold, root_cause_template) VALUES
-- Cash is root of everything
('cash_runway_days', 'contribution_margin_percent', 1, 1, 'Cash shortage caused by declining contribution margins'),
('cash_runway_days', 'marketing_cash_locked', 1, 1, 'Cash shortage caused by funds locked in marketing'),
('cash_runway_days', 'dso', 1, 1, 'Cash shortage caused by slow collections'),
('cash_runway_days', 'ar_overdue', 1, 1, 'Cash shortage caused by overdue receivables'),

-- CM is parent of unit economics issues
('contribution_margin_percent', 'sku_margin', 2, 3, 'Margin erosion across multiple SKUs driving overall CM decline'),
('contribution_margin_percent', 'channel_margin', 2, 2, 'Channel performance issues driving overall CM decline'),
('contribution_margin_percent', 'cogs_increase', 2, 1, 'COGS increase driving margin compression'),

-- Unit economics parents SKU issues
('unit_economics', 'sku_margin', 3, 5, 'Systemic unit economics problem affecting multiple SKUs'),
('unit_economics', 'sku_velocity', 3, 5, 'Sales velocity decline across product portfolio'),

-- SKU parents campaign issues
('sku_margin', 'campaign_roas', 4, 3, 'SKU profitability issue causing campaign-level losses'),

-- Channel parents campaign issues  
('channel_margin', 'campaign_roas', 5, 2, 'Channel economics driving campaign underperformance'),

-- Marketing cash lock parents campaign issues
('marketing_cash_locked', 'campaign_roas', 2, 3, 'Cash locked in underperforming campaigns')
ON CONFLICT (parent_metric_code, child_metric_code) DO NOTHING;

-- Function: Collapse child alerts into parent
CREATE OR REPLACE FUNCTION collapse_alerts_to_parent(
  p_tenant_id UUID,
  p_parent_metric TEXT,
  p_child_metric TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule RECORD;
  v_children RECORD;
  v_parent_id UUID;
  v_child_ids UUID[];
  v_child_summaries JSONB := '[]'::JSONB;
  v_total_exposure NUMERIC := 0;
  v_highest_confidence TEXT := 'low';
  v_result JSONB;
BEGIN
  -- Get hierarchy rule
  SELECT * INTO v_rule 
  FROM alert_hierarchy_rules 
  WHERE parent_metric_code = p_parent_metric 
    AND child_metric_code = p_child_metric;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hierarchy rule found');
  END IF;
  
  -- Find active child alerts
  FOR v_children IN
    SELECT id, title, metric_code, exposure_amount, confidence_level, dimension_key, severity
    FROM early_warning_alerts
    WHERE tenant_id = p_tenant_id
      AND metric_code = p_child_metric
      AND status = 'active'
      AND parent_alert_id IS NULL
    ORDER BY exposure_amount DESC NULLS LAST
  LOOP
    v_child_ids := array_append(v_child_ids, v_children.id);
    v_child_summaries := v_child_summaries || jsonb_build_object(
      'id', v_children.id,
      'title', v_children.title,
      'dimension', v_children.dimension_key,
      'exposure', v_children.exposure_amount,
      'severity', v_children.severity
    );
    v_total_exposure := v_total_exposure + COALESCE(v_children.exposure_amount, 0);
    
    IF v_children.confidence_level = 'high' THEN
      v_highest_confidence := 'high';
    ELSIF v_children.confidence_level = 'medium' AND v_highest_confidence != 'high' THEN
      v_highest_confidence := 'medium';
    END IF;
  END LOOP;
  
  -- Check if enough children to collapse
  IF array_length(v_child_ids, 1) < v_rule.collapse_threshold THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Not enough children to collapse',
      'found', array_length(v_child_ids, 1),
      'required', v_rule.collapse_threshold
    );
  END IF;
  
  -- Create parent alert
  INSERT INTO early_warning_alerts (
    tenant_id, alert_class, metric_code, dimension_key,
    title, message, trajectory, current_value,
    exposure_amount, confidence_level, confidence_score,
    is_parent, hierarchy_level, suppressed_children, child_count,
    root_cause_metric, root_cause_explanation,
    decision_framing, severity, status
  ) VALUES (
    p_tenant_id, 'structural_risk', p_parent_metric, 'global',
    array_length(v_child_ids, 1) || ' ' || p_child_metric || ' alerts collapsed → ' || p_parent_metric || ' Risk',
    v_rule.root_cause_template,
    '[]'::JSONB, 0,
    v_total_exposure, v_highest_confidence, 
    CASE v_highest_confidence WHEN 'high' THEN 85 WHEN 'medium' THEN 60 ELSE 40 END,
    true, v_rule.hierarchy_level, v_child_summaries, array_length(v_child_ids, 1),
    p_parent_metric, v_rule.root_cause_template,
    jsonb_build_object(
      'what_goes_wrong', 'Root cause: ' || v_rule.root_cause_template || '. ' || array_length(v_child_ids, 1) || ' related issues detected.',
      'irreversible_trigger', 'When ' || p_parent_metric || ' breaches critical threshold',
      'decision_owner', jsonb_build_object('role', 
        CASE 
          WHEN v_rule.hierarchy_level = 1 THEN 'CFO'
          WHEN v_rule.hierarchy_level <= 3 THEN 'COO'
          ELSE 'CMO'
        END,
        'reason', 'Root cause ownership based on metric hierarchy'
      )
    ),
    'critical', 'active'
  )
  RETURNING id INTO v_parent_id;
  
  -- Update children to reference parent and suppress
  UPDATE early_warning_alerts
  SET parent_alert_id = v_parent_id,
      status = 'suppressed',
      updated_at = now()
  WHERE id = ANY(v_child_ids);
  
  RETURN jsonb_build_object(
    'success', true,
    'parent_id', v_parent_id,
    'children_suppressed', array_length(v_child_ids, 1),
    'total_exposure', v_total_exposure,
    'root_cause', v_rule.root_cause_template
  );
END;
$$;

-- View: Active alerts excluding suppressed children
CREATE OR REPLACE VIEW v_active_alerts_hierarchy AS
SELECT 
  ewa.*,
  CASE 
    WHEN ewa.is_parent THEN 'PARENT: ' || ewa.child_count || ' issues'
    WHEN ewa.parent_alert_id IS NOT NULL THEN 'SUPPRESSED'
    ELSE 'STANDALONE'
  END as display_status,
  CASE ewa.hierarchy_level
    WHEN 1 THEN 'Cash'
    WHEN 2 THEN 'Contribution Margin'
    WHEN 3 THEN 'Unit Economics'
    WHEN 4 THEN 'SKU'
    WHEN 5 THEN 'Channel'
    WHEN 6 THEN 'Campaign'
    ELSE 'Other'
  END as hierarchy_category
FROM early_warning_alerts ewa
WHERE ewa.status IN ('active', 'acknowledged')
  AND ewa.parent_alert_id IS NULL -- Only show top-level alerts
ORDER BY ewa.hierarchy_level ASC, ewa.exposure_amount DESC NULLS LAST;