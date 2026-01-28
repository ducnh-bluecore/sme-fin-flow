-- Phase 7: Final SSOT Cleanup - Enhanced Decision Views

-- 7.1.1: Create CEO Snapshot view for MDP
CREATE OR REPLACE VIEW v_mdp_ceo_snapshot AS
WITH profit_data AS (
  SELECT
    tenant_id,
    SUM(CASE WHEN contribution_margin > 0 THEN contribution_margin ELSE 0 END) as margin_created,
    SUM(CASE WHEN contribution_margin < 0 THEN ABS(contribution_margin) ELSE 0 END) as margin_destroyed,
    SUM(contribution_margin) as net_margin
  FROM v_mdp_decision_signals
  GROUP BY tenant_id
),
cash_data AS (
  SELECT
    s.tenant_id,
    COALESCE(s.cash_today, 0) as cash_received,
    COALESCE(s.total_ar, 0) - COALESCE(s.overdue_ar, 0) as cash_pending,
    COALESCE(s.locked_cash_total, 0) as cash_locked
  FROM central_metrics_snapshots s
  WHERE s.snapshot_at = (
    SELECT MAX(s2.snapshot_at) 
    FROM central_metrics_snapshots s2 
    WHERE s2.tenant_id = s.tenant_id
  )
),
decision_counts AS (
  SELECT
    tenant_id,
    COUNT(*) FILTER (WHERE urgency = 'IMMEDIATE') as immediate_count,
    COUNT(*) FILTER (WHERE urgency = 'TODAY') as today_count,
    COUNT(*) FILTER (WHERE recommended_action IN ('KILL', 'PAUSE', 'CAP')) as action_count
  FROM v_mdp_decision_signals
  GROUP BY tenant_id
)
SELECT
  p.tenant_id,
  p.net_margin >= 0 as is_creating_money,
  COALESCE(p.margin_created, 0) as total_margin_created,
  COALESCE(p.margin_destroyed, 0) as total_margin_destroyed,
  COALESCE(p.net_margin, 0) as net_margin_position,
  CASE 
    WHEN p.net_margin > 1000000 THEN 'improving'
    WHEN p.net_margin < -1000000 THEN 'deteriorating'
    ELSE 'stable'
  END as margin_trend,
  COALESCE(c.cash_received, 0) as cash_received,
  COALESCE(c.cash_pending, 0) as cash_pending,
  COALESCE(c.cash_locked, 0) as cash_locked,
  COALESCE(c.cash_pending, 0) + COALESCE(c.cash_locked, 0) as total_cash_at_risk,
  CASE 
    WHEN COALESCE(c.cash_received, 0) + COALESCE(c.cash_pending, 0) > 0 
    THEN COALESCE(c.cash_received, 0)::numeric / (COALESCE(c.cash_received, 0) + COALESCE(c.cash_pending, 0))::numeric
    ELSE 0
  END as cash_conversion_rate,
  COALESCE(d.immediate_count, 0) as immediate_actions,
  COALESCE(d.today_count, 0) as today_actions,
  COALESCE(d.action_count, 0) as total_actions,
  CASE 
    WHEN d.action_count = 0 THEN 'high'
    WHEN COALESCE(d.immediate_count, 0) > 0 THEN 'low'
    ELSE 'medium'
  END as data_confidence,
  NOW() as last_updated
FROM profit_data p
LEFT JOIN cash_data c ON c.tenant_id = p.tenant_id
LEFT JOIN decision_counts d ON d.tenant_id = p.tenant_id;

-- 7.1.2: Create scale opportunities view
CREATE OR REPLACE VIEW v_mdp_scale_opportunities AS
SELECT
  ds.tenant_id,
  ds.channel,
  ds.gross_revenue,
  ds.net_revenue,
  ds.contribution_margin,
  ds.contribution_margin_percent,
  ds.profit_roas,
  ds.ad_spend,
  0.15 as min_cm_percent,
  0.70 as min_cash_conversion,
  CASE 
    WHEN ds.contribution_margin_percent >= 0.15 AND ds.profit_roas > 0.5
    THEN true
    ELSE false
  END as is_scalable,
  ds.computed_at
FROM v_mdp_decision_signals ds
WHERE ds.recommended_action = 'SCALE' 
   OR (ds.contribution_margin_percent >= 0.10 AND ds.profit_roas > 0);

-- 7.3.1: Create RFM Segments view by aggregating from cdp_orders
CREATE OR REPLACE VIEW v_cdp_rfm_segments AS
WITH customer_orders AS (
  SELECT
    tenant_id,
    customer_id,
    COUNT(*) as frequency,
    SUM(COALESCE(gross_revenue, 0)) as monetary,
    MAX(order_at) as last_order_at,
    MIN(order_at) as first_order_at
  FROM cdp_orders
  WHERE customer_id IS NOT NULL
  GROUP BY tenant_id, customer_id
),
customer_rfm AS (
  SELECT
    tenant_id,
    customer_id,
    frequency,
    monetary,
    EXTRACT(DAY FROM NOW() - last_order_at) as recency_days,
    first_order_at,
    last_order_at,
    CASE 
      WHEN EXTRACT(DAY FROM NOW() - last_order_at) <= 7 THEN 5
      WHEN EXTRACT(DAY FROM NOW() - last_order_at) <= 30 THEN 4
      WHEN EXTRACT(DAY FROM NOW() - last_order_at) <= 60 THEN 3
      WHEN EXTRACT(DAY FROM NOW() - last_order_at) <= 90 THEN 2
      ELSE 1
    END as recency_score,
    CASE 
      WHEN frequency >= 10 THEN 5
      WHEN frequency >= 5 THEN 4
      WHEN frequency >= 3 THEN 3
      WHEN frequency >= 2 THEN 2
      ELSE 1
    END as frequency_score,
    CASE 
      WHEN monetary >= 10000000 THEN 5
      WHEN monetary >= 5000000 THEN 4
      WHEN monetary >= 2000000 THEN 3
      WHEN monetary >= 500000 THEN 2
      ELSE 1
    END as monetary_score
  FROM customer_orders
  WHERE frequency > 0
),
rfm_with_segment AS (
  SELECT
    *,
    recency_score + frequency_score + monetary_score as rfm_total,
    CASE 
      WHEN recency_score >= 4 AND frequency_score >= 4 AND monetary_score >= 4 THEN 'Champions'
      WHEN frequency_score >= 4 AND monetary_score >= 3 THEN 'Loyal'
      WHEN recency_score >= 4 AND frequency_score <= 2 AND monetary_score >= 2 THEN 'Potential Loyalist'
      WHEN recency_score <= 2 AND (frequency_score >= 3 OR monetary_score >= 3) THEN 'At Risk'
      WHEN recency_score <= 2 AND frequency_score <= 2 AND monetary_score <= 2 THEN 'Hibernating'
      ELSE 'Other'
    END as segment_name
  FROM customer_rfm
)
SELECT
  tenant_id, customer_id, frequency, monetary, recency_days,
  recency_score, frequency_score, monetary_score, rfm_total, segment_name,
  first_order_at, last_order_at,
  CASE segment_name
    WHEN 'Champions' THEN 'Mua gần đây, thường xuyên, chi tiêu nhiều'
    WHEN 'Loyal' THEN 'Mua thường xuyên, phản hồi tốt'
    WHEN 'Potential Loyalist' THEN 'Khách mới với tiềm năng cao'
    WHEN 'At Risk' THEN 'Từng mua nhiều, giờ không hoạt động'
    WHEN 'Hibernating' THEN 'Không hoạt động lâu, LTV thấp'
    ELSE 'Chưa phân loại'
  END as segment_description,
  CASE segment_name
    WHEN 'Champions' THEN 'Reward & retain'
    WHEN 'Loyal' THEN 'Upsell & cross-sell'
    WHEN 'Potential Loyalist' THEN 'Engagement campaigns'
    WHEN 'At Risk' THEN 'Win-back campaigns'
    WHEN 'Hibernating' THEN 'Evaluate win-back ROI'
    ELSE 'Monitor'
  END as recommended_action,
  CASE segment_name
    WHEN 'At Risk' THEN 'critical'
    WHEN 'Champions' THEN 'high'
    WHEN 'Loyal' THEN 'high'
    WHEN 'Potential Loyalist' THEN 'medium'
    ELSE 'low'
  END as priority
FROM rfm_with_segment;

-- 7.3.2: Create RFM Segments summary view
CREATE OR REPLACE VIEW v_cdp_rfm_segment_summary AS
SELECT
  tenant_id, segment_name,
  MIN(segment_description) as description,
  MIN(recommended_action) as recommended_action,
  MIN(priority) as priority,
  COUNT(*) as customer_count,
  ROUND(COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY tenant_id), 0) * 100, 1) as percentage,
  ROUND(AVG(monetary)::numeric, 0) as avg_revenue,
  ROUND(AVG(frequency)::numeric, 1) as avg_frequency,
  ROUND(AVG(recency_days)::numeric, 0) as avg_recency,
  SUM(monetary) as total_value,
  SUM(monetary) * 2 as potential_value,
  SUM(CASE WHEN segment_name IN ('At Risk', 'Hibernating') THEN monetary ELSE 0 END) as risk_value,
  CASE segment_name
    WHEN 'Champions' THEN '#8b5cf6'
    WHEN 'Loyal' THEN '#3b82f6'
    WHEN 'Potential Loyalist' THEN '#10b981'
    WHEN 'At Risk' THEN '#f59e0b'
    WHEN 'Hibernating' THEN '#ef4444'
    ELSE '#6b7280'
  END as color
FROM v_cdp_rfm_segments
GROUP BY tenant_id, segment_name;

COMMENT ON VIEW v_mdp_ceo_snapshot IS 'CEO one-screen summary for MDP';
COMMENT ON VIEW v_mdp_scale_opportunities IS 'Channels eligible for budget scaling';
COMMENT ON VIEW v_cdp_rfm_segments IS 'Customer-level RFM segmentation from cdp_orders';
COMMENT ON VIEW v_cdp_rfm_segment_summary IS 'Aggregated RFM segment metrics';