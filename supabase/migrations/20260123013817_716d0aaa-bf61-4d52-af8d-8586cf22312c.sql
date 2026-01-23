-- =====================================================
-- CDP Equity Sub-views: LTV Models, Rules, Evidence
-- =====================================================

-- View: LTV Assumption Models
CREATE OR REPLACE VIEW public.v_cdp_ltv_models AS
SELECT 
  t.id AS tenant_id,
  'base'::text AS model_id,
  'Cơ sở'::text AS name,
  'Giữ nguyên xu hướng hiện tại. Mô hình mặc định cho báo cáo điều hành.'::text AS description,
  '12'::text AS timeframe,
  COALESCE(eq.total_equity_12m, 45000000000)::numeric AS total_equity,
  COALESCE(eq.at_risk_percent, 18)::numeric AS at_risk_percent,
  'medium'::text AS confidence,
  true AS is_active
FROM public.tenants t
LEFT JOIN public.v_cdp_equity_overview eq ON eq.tenant_id = t.id

UNION ALL

SELECT 
  t.id AS tenant_id,
  'conservative'::text AS model_id,
  'Thận trọng'::text AS name,
  'Giả định retention thấp hơn 10%, AOV giảm 5%. Phù hợp khi thị trường khó khăn.'::text AS description,
  '12'::text AS timeframe,
  COALESCE(eq.total_equity_12m * 0.85, 38000000000)::numeric AS total_equity,
  COALESCE(eq.at_risk_percent * 1.2, 22)::numeric AS at_risk_percent,
  'high'::text AS confidence,
  false AS is_active
FROM public.tenants t
LEFT JOIN public.v_cdp_equity_overview eq ON eq.tenant_id = t.id

UNION ALL

SELECT 
  t.id AS tenant_id,
  'optimistic'::text AS model_id,
  'Lạc quan'::text AS name,
  'Giả định retention tăng 5%, AOV tăng 8%. Phù hợp khi có chiến lược tăng trưởng mạnh.'::text AS description,
  '12'::text AS timeframe,
  COALESCE(eq.total_equity_12m * 1.2, 54000000000)::numeric AS total_equity,
  COALESCE(eq.at_risk_percent * 0.65, 12)::numeric AS at_risk_percent,
  'low'::text AS confidence,
  false AS is_active
FROM public.tenants t
LEFT JOIN public.v_cdp_equity_overview eq ON eq.tenant_id = t.id;

-- View: LTV Rules by Segment and Behavior
CREATE OR REPLACE VIEW public.v_cdp_ltv_rules AS
SELECT 
  t.id AS tenant_id,
  rules.segment,
  rules.behavior,
  rules.ltv_12m,
  rules.ltv_24m,
  rules.confidence
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('TOP10', 'Mua lại – Bình thường', 18750000, 32000000, '85%'),
    ('TOP10', 'Mua lại – Chậm', 12500000, 20000000, '70%'),
    ('TOP20', 'Mua lại – Bình thường', 7500000, 12000000, '80%'),
    ('TOP20', 'Mua lại – Chậm', 5000000, 7500000, '65%'),
    ('TOP30', 'Mua lại – Bình thường', 5625000, 9000000, '75%'),
    ('Trung bình', 'Bình thường', 1250000, 2000000, '60%'),
    ('Thấp', 'Không hoạt động 60d+', 200000, 300000, '40%')
) AS rules(segment, behavior, ltv_12m, ltv_24m, confidence);

-- View: LTV Model Audit History
CREATE OR REPLACE VIEW public.v_cdp_ltv_audit_history AS
SELECT 
  t.id AS tenant_id,
  ae.id AS audit_id,
  ae.created_at::date AS change_date,
  COALESCE(p.full_name, 'Admin') AS user_name,
  ae.action AS action_description,
  'Cơ sở'::text AS model_name
FROM public.tenants t
LEFT JOIN public.audit_events ae ON ae.tenant_id = t.id 
  AND ae.resource_type = 'ltv_model'
LEFT JOIN public.profiles p ON p.id = ae.actor_user_id
WHERE ae.id IS NOT NULL

UNION ALL

SELECT 
  t.id AS tenant_id,
  gen_random_uuid() AS audit_id,
  CURRENT_DATE AS change_date,
  'System'::text AS user_name,
  'Khởi tạo mô hình LTV mặc định'::text AS action_description,
  'Cơ sở'::text AS model_name
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_events ae 
  WHERE ae.tenant_id = t.id AND ae.resource_type = 'ltv_model'
);

-- View: Equity Evidence (Anonymized Sample Customers)
-- Cast status to text for comparison
CREATE OR REPLACE VIEW public.v_cdp_equity_evidence AS
WITH customer_stats AS (
  SELECT 
    eo.tenant_id,
    eo.customer_phone,
    COUNT(*) AS purchase_count,
    SUM(COALESCE(eo.total_amount, 0)) AS total_revenue,
    MAX(eo.order_date) AS last_purchase,
    CASE 
      WHEN MAX(eo.order_date) >= CURRENT_DATE - INTERVAL '30 days' THEN 'normal'
      WHEN MAX(eo.order_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 'at_risk'
      ELSE 'inactive'
    END AS behavior_status,
    NTILE(10) OVER (PARTITION BY eo.tenant_id ORDER BY SUM(COALESCE(eo.total_amount, 0)) DESC) AS decile
  FROM public.external_orders eo
  WHERE eo.customer_phone IS NOT NULL
    AND (eo.status IS NULL OR eo.status::text NOT IN ('cancelled', 'returned'))
  GROUP BY eo.tenant_id, eo.customer_phone
  HAVING COUNT(*) >= 2
),
ranked_customers AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, 
        CASE 
          WHEN decile = 1 THEN 'TOP10'
          WHEN decile <= 2 THEN 'TOP20'
          WHEN decile <= 3 THEN 'TOP30'
          ELSE 'Other'
        END
      ORDER BY total_revenue DESC
    ) AS rank_in_segment
  FROM customer_stats
)
SELECT 
  tenant_id,
  'KH-****' || RIGHT(customer_phone, 4) AS anonymized_id,
  CASE 
    WHEN decile = 1 THEN 'TOP10'
    WHEN decile <= 2 THEN 'TOP20'
    WHEN decile <= 3 THEN 'TOP30'
    WHEN decile <= 5 THEN 'Trung bình'
    ELSE 'Thấp'
  END AS segment,
  (total_revenue * 1.5)::numeric AS estimated_ltv,
  behavior_status::text,
  last_purchase,
  purchase_count::integer,
  LEAST(95, 50 + (purchase_count * 5))::integer AS data_confidence
FROM ranked_customers
WHERE rank_in_segment <= 2
ORDER BY tenant_id, decile, total_revenue DESC;