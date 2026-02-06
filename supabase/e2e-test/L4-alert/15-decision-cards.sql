-- ============================================================================
-- E2E TEST SUITE - SCRIPT 15: DECISION CARDS (L4 Alert/Decision)
-- ============================================================================
-- Architecture: v1.4.2 Layer 4 - Alert/Decision
-- Creates decision cards from alerts for Control Tower
--
-- COMPONENTS:
--   - decision_cards: Actionable items for CEO/CFO
--   - control_tower_priority_queue: Prioritized queue
--
-- EXPECTED VALUES:
--   - decision_cards: 10-20 cards
--   - priority_queue: 5-10 items
-- ============================================================================

-- Clean existing data
DELETE FROM decision_cards 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

DELETE FROM control_tower_priority_queue 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- ============================================================================
-- CREATE DECISION CARDS FROM ALERTS
-- ============================================================================
INSERT INTO decision_cards (
  id, tenant_id, alert_id, title, description,
  decision_type, recommended_action, impact_amount, impact_type,
  urgency, owner_role, status, deadline_at, created_at
)
SELECT
  ('aaaaaaaa-card-' || LPAD(ROW_NUMBER() OVER ()::text, 4, '0') || '-0001-000000000001')::uuid as id,
  tenant_id,
  id as alert_id,
  title,
  message as description,
  CASE category
    WHEN 'revenue' THEN 'revenue_action'
    WHEN 'margin' THEN 'cost_action'
    WHEN 'customer' THEN 'retention_action'
    ELSE 'operational_action'
  END as decision_type,
  CASE category
    WHEN 'revenue' THEN 'Review channel performance and adjust pricing/promotions'
    WHEN 'margin' THEN 'Negotiate better supplier terms or optimize product mix'
    WHEN 'customer' THEN 'Launch retention campaign for at-risk customers'
    ELSE 'Investigate root cause and implement process improvement'
  END as recommended_action,
  COALESCE(impact_amount, 0) as impact_amount,
  CASE 
    WHEN impact_amount > 0 THEN 'loss'
    ELSE 'opportunity'
  END as impact_type,
  CASE severity
    WHEN 'critical' THEN 'immediate'
    WHEN 'warning' THEN 'today'
    ELSE 'this_week'
  END as urgency,
  CASE severity
    WHEN 'critical' THEN 'ceo'
    WHEN 'warning' THEN 'cfo'
    ELSE 'manager'
  END as owner_role,
  'pending' as status,
  CASE severity
    WHEN 'critical' THEN NOW() + INTERVAL '4 hours'
    WHEN 'warning' THEN NOW() + INTERVAL '24 hours'
    ELSE NOW() + INTERVAL '72 hours'
  END as deadline_at,
  NOW() as created_at
FROM alert_instances
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND status = 'open';

-- ============================================================================
-- CREATE PRIORITY QUEUE FOR CONTROL TOWER
-- ============================================================================
INSERT INTO control_tower_priority_queue (
  id, tenant_id, decision_card_id, priority_score, priority_rank,
  estimated_impact, time_to_deadline_hours, status, created_at
)
SELECT
  ('aaaaaaaa-prio-' || LPAD(ROW_NUMBER() OVER (ORDER BY priority_score DESC)::text, 4, '0') || '-0001-000000000001')::uuid as id,
  dc.tenant_id,
  dc.id as decision_card_id,
  -- Priority score based on impact and urgency
  (COALESCE(dc.impact_amount, 0) / 1000000 * 10) + 
  CASE dc.urgency 
    WHEN 'immediate' THEN 100
    WHEN 'today' THEN 50
    ELSE 20
  END as priority_score,
  ROW_NUMBER() OVER (ORDER BY 
    CASE dc.urgency WHEN 'immediate' THEN 1 WHEN 'today' THEN 2 ELSE 3 END,
    dc.impact_amount DESC NULLS LAST
  ) as priority_rank,
  dc.impact_amount as estimated_impact,
  EXTRACT(EPOCH FROM (dc.deadline_at - NOW())) / 3600 as time_to_deadline_hours,
  'queued' as status,
  NOW() as created_at
FROM decision_cards dc
WHERE dc.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  AND dc.status = 'pending'
ORDER BY priority_score DESC
LIMIT 10;  -- Top 10 for CEO view

-- ============================================================================
-- ALSO POPULATE: CDP Segment LTV for MDP (backward compat)
-- ============================================================================
DELETE FROM cdp_segment_ltv_for_mdp 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO cdp_segment_ltv_for_mdp (
  id, tenant_id, segment, customer_count, total_ltv,
  avg_ltv, retention_rate, created_at
)
SELECT
  ('aaaaaaaa-sltv-' || LPAD(ROW_NUMBER() OVER ()::text, 4, '0') || '-0001-000000000001')::uuid,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  segment,
  COUNT(*) as customer_count,
  SUM(total_net_revenue) as total_ltv,
  AVG(total_net_revenue) as avg_ltv,
  CASE segment
    WHEN 'Champions' THEN 0.95
    WHEN 'Loyal' THEN 0.80
    WHEN 'Potential' THEN 0.60
    ELSE 0.40
  END as retention_rate,
  NOW() as created_at
FROM (
  SELECT 
    ce.customer_id,
    ce.total_net_revenue,
    CASE 
      WHEN c.canonical_key LIKE 'platinum%' THEN 'Champions'
      WHEN c.canonical_key LIKE 'gold%' THEN 'Loyal'
      WHEN c.canonical_key LIKE 'silver%' THEN 'Potential'
      ELSE 'New'
    END as segment
  FROM cdp_customer_equity_computed ce
  JOIN cdp_customers c ON ce.customer_id = c.id
  WHERE ce.tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
) segmented
GROUP BY segment;

-- ============================================================================
-- ALSO POPULATE: CDP Customer Cohort CAC (backward compat)
-- ============================================================================
DELETE FROM cdp_customer_cohort_cac 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

INSERT INTO cdp_customer_cohort_cac (
  id, tenant_id, cohort_month, channel, new_customers,
  marketing_spend, cac, created_at
)
SELECT
  ('aaaaaaaa-ccac-' || LPAD(ROW_NUMBER() OVER ()::text, 4, '0') || '-0001-000000000001')::uuid,
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  DATE_TRUNC('month', order_at)::date as cohort_month,
  channel,
  COUNT(DISTINCT customer_id) as new_customers,
  SUM(net_revenue) * 0.10 as marketing_spend,  -- Assume 10% of revenue
  (SUM(net_revenue) * 0.10) / NULLIF(COUNT(DISTINCT customer_id), 0) as cac,
  NOW() as created_at
FROM cdp_orders
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
GROUP BY DATE_TRUNC('month', order_at), channel;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'L4_DECISION: CARDS' as layer,
  COUNT(*) as total_cards,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_cards,
  jsonb_object_agg(urgency, cnt ORDER BY urgency) as by_urgency
FROM (
  SELECT urgency, COUNT(*) as cnt
  FROM decision_cards
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  GROUP BY urgency
) sub;

SELECT 
  'L4_DECISION: PRIORITY_QUEUE' as layer,
  COUNT(*) as queue_size,
  MAX(priority_rank) as lowest_priority,
  ROUND(AVG(priority_score), 1) as avg_score
FROM control_tower_priority_queue
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'L4_DECISION: SEGMENT_LTV (compat)' as layer,
  COUNT(*) as segment_count
FROM cdp_segment_ltv_for_mdp
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

SELECT 
  'L4_DECISION: COHORT_CAC (compat)' as layer,
  COUNT(*) as cohort_count
FROM cdp_customer_cohort_cac
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
