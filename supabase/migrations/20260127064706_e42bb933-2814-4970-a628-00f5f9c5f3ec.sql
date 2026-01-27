-- =====================================================
-- PHASE 2.1: FINANCIAL REPORTS SSOT MIGRATIONS
-- =====================================================

-- 2.1.1 Table: financial_ratio_targets
-- Configurable targets replacing magic numbers in frontend
CREATE TABLE IF NOT EXISTS public.financial_ratio_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  ratio_code TEXT NOT NULL,  -- 'GROSS_MARGIN', 'NET_MARGIN', 'EBITDA_MARGIN', 'DSO', 'CM'
  ratio_name TEXT NOT NULL,  -- 'Biên lợi nhuận gộp', etc.
  target_value NUMERIC NOT NULL,
  unit TEXT DEFAULT '%',
  
  -- Thresholds for insight generation
  good_threshold NUMERIC,
  warning_threshold NUMERIC,
  critical_threshold NUMERIC,
  comparison_type TEXT DEFAULT 'gte', -- 'gte' (greater is better) or 'lte' (lower is better)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, ratio_code)
);

-- Enable RLS
ALTER TABLE public.financial_ratio_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant ratio targets"
ON public.financial_ratio_targets FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their tenant ratio targets"
ON public.financial_ratio_targets FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- Seed default targets for all existing tenants
INSERT INTO public.financial_ratio_targets (tenant_id, ratio_code, ratio_name, target_value, unit, good_threshold, warning_threshold, critical_threshold, comparison_type)
SELECT 
  t.id,
  v.ratio_code,
  v.ratio_name,
  v.target_value,
  v.unit,
  v.good_threshold,
  v.warning_threshold,
  v.critical_threshold,
  v.comparison_type
FROM tenants t
CROSS JOIN (VALUES
  ('GROSS_MARGIN', 'Biên lợi nhuận gộp', 30, '%', 30, 20, 15, 'gte'),
  ('NET_MARGIN', 'Biên lợi nhuận ròng', 10, '%', 10, 5, 0, 'gte'),
  ('EBITDA_MARGIN', 'EBITDA Margin', 15, '%', 15, 10, 5, 'gte'),
  ('DSO', 'DSO', 30, ' ngày', 30, 45, 60, 'lte'),
  ('CM', 'Contribution Margin', 40, '%', 40, 30, 20, 'gte')
) AS v(ratio_code, ratio_name, target_value, unit, good_threshold, warning_threshold, critical_threshold, comparison_type)
ON CONFLICT (tenant_id, ratio_code) DO NOTHING;

-- =====================================================
-- 2.1.2 View: v_financial_report_kpis
-- Pre-compute total_cost, net_margin, overdue_ar_pct
-- =====================================================
CREATE OR REPLACE VIEW public.v_financial_report_kpis AS
SELECT 
  s.tenant_id,
  
  -- From snapshot (already SSOT)
  s.net_revenue,
  s.gross_profit,
  s.gross_margin_percent,
  s.ebitda,
  s.ebitda_margin_percent,
  s.contribution_margin,
  s.contribution_margin_percent,
  s.cash_today,
  s.cash_runway_months,
  s.total_ar,
  s.overdue_ar,
  s.dso,
  
  -- PRE-COMPUTED (replacing FE calculations)
  COALESCE(m.cogs, 0) + COALESCE(m.operating_expenses, 0) AS total_cost,
  
  CASE WHEN s.net_revenue > 0 
    THEN ROUND(((s.gross_profit - COALESCE(m.operating_expenses, 0)) / s.net_revenue * 100)::NUMERIC, 1)
    ELSE 0 
  END AS net_margin_percent,
  
  CASE WHEN s.total_ar > 0 
    THEN ROUND((s.overdue_ar / s.total_ar * 100)::NUMERIC, 1)
    ELSE 0 
  END AS overdue_ar_percent,
  
  -- Pre-formatted for display (in millions)
  ROUND(s.net_revenue / 1000000, 1) AS net_revenue_m,
  ROUND(s.gross_profit / 1000000, 1) AS gross_profit_m,
  ROUND((COALESCE(m.cogs, 0) + COALESCE(m.operating_expenses, 0)) / 1000000, 1) AS total_cost_m,
  ROUND(s.cash_today / 1000000, 1) AS cash_today_m,
  
  s.snapshot_at
  
FROM central_metrics_snapshots s
LEFT JOIN LATERAL (
  SELECT 
    cogs, 
    operating_expenses
  FROM finance_monthly_summary 
  WHERE tenant_id = s.tenant_id 
  ORDER BY year_month DESC 
  LIMIT 1
) m ON true
WHERE s.snapshot_at = (
  SELECT MAX(snapshot_at) 
  FROM central_metrics_snapshots cs
  WHERE cs.tenant_id = s.tenant_id
);

-- =====================================================
-- 2.1.3 View: v_financial_insights
-- Pre-generate insights with status and descriptions
-- =====================================================
CREATE OR REPLACE VIEW public.v_financial_insights AS
SELECT 
  k.tenant_id,
  
  -- Insight 1: Gross Margin
  CASE 
    WHEN k.gross_margin_percent >= COALESCE(t_gm.good_threshold, 30) THEN 'success'
    WHEN k.gross_margin_percent >= COALESCE(t_gm.warning_threshold, 20) THEN 'warning'
    ELSE 'danger'
  END AS gross_margin_status,
  CASE 
    WHEN k.gross_margin_percent >= COALESCE(t_gm.good_threshold, 30) THEN 'Biên lợi nhuận gộp tốt'
    WHEN k.gross_margin_percent >= COALESCE(t_gm.warning_threshold, 20) THEN 'Biên lợi nhuận gộp cần cải thiện'
    ELSE 'Biên lợi nhuận gộp thấp'
  END AS gross_margin_title,
  'Đạt ' || COALESCE(k.gross_margin_percent, 0)::TEXT || '%, ' ||
    CASE WHEN k.gross_margin_percent >= COALESCE(t_gm.target_value, 30) THEN 'cao hơn' ELSE 'thấp hơn' END ||
    ' mức tiêu chuẩn ' || COALESCE(t_gm.target_value, 30)::TEXT || '%' AS gross_margin_description,
  COALESCE(k.gross_margin_percent >= t_gm.good_threshold, k.gross_margin_percent >= 30) AS gross_margin_show,
  
  -- Insight 2: DSO
  CASE 
    WHEN k.dso <= COALESCE(t_dso.good_threshold, 30) THEN 'success'
    WHEN k.dso <= COALESCE(t_dso.warning_threshold, 45) THEN 'warning'
    ELSE 'danger'
  END AS dso_status,
  CASE 
    WHEN k.dso > COALESCE(t_dso.warning_threshold, 45) THEN 'DSO cao'
    ELSE NULL
  END AS dso_title,
  CASE 
    WHEN k.dso > COALESCE(t_dso.warning_threshold, 45) 
    THEN 'DSO ' || COALESCE(k.dso, 0)::INTEGER::TEXT || ' ngày, tiền bị kẹt trong công nợ'
    ELSE NULL
  END AS dso_description,
  k.dso > COALESCE(t_dso.warning_threshold, 45) AS dso_show,
  
  -- Insight 3: Net Margin
  CASE 
    WHEN k.net_margin_percent < 0 THEN 'danger'
    WHEN k.net_margin_percent < COALESCE(t_nm.warning_threshold, 5) THEN 'warning'
    ELSE 'success'
  END AS net_margin_status,
  CASE 
    WHEN k.net_margin_percent < 0 THEN 'Lỗ ròng'
    ELSE NULL
  END AS net_margin_title,
  CASE 
    WHEN k.net_margin_percent < 0 
    THEN 'Biên lợi nhuận ròng ' || COALESCE(k.net_margin_percent, 0)::TEXT || '%'
    ELSE NULL
  END AS net_margin_description,
  k.net_margin_percent < 0 AS net_margin_show,
  
  -- Insight 4: Overdue AR
  CASE 
    WHEN COALESCE(k.overdue_ar_percent, 0) > 20 THEN 'warning'
    ELSE 'success'
  END AS ar_status,
  CASE 
    WHEN COALESCE(k.overdue_ar_percent, 0) > 20 THEN 'Công nợ quá hạn cao'
    ELSE NULL
  END AS ar_title,
  CASE 
    WHEN COALESCE(k.overdue_ar_percent, 0) > 20 
    THEN COALESCE(k.overdue_ar_percent, 0)::TEXT || '% AR đang quá hạn'
    ELSE NULL
  END AS ar_description,
  COALESCE(k.overdue_ar_percent, 0) > 20 AS ar_show,
  
  -- Insight 5: Cash Health
  CASE 
    WHEN k.cash_today > k.net_revenue * 0.5 THEN 'success'
    ELSE NULL
  END AS cash_status,
  CASE 
    WHEN k.cash_today > k.net_revenue * 0.5 THEN 'Tình hình tiền mặt khỏe'
    ELSE NULL
  END AS cash_title,
  CASE 
    WHEN k.cash_today > k.net_revenue * 0.5 
    THEN 'Cash buffer dồi dào: ' || COALESCE(k.cash_today_m, 0)::TEXT || ' triệu'
    ELSE NULL
  END AS cash_description,
  k.cash_today > k.net_revenue * 0.5 AS cash_show
  
FROM v_financial_report_kpis k
LEFT JOIN financial_ratio_targets t_gm ON k.tenant_id = t_gm.tenant_id AND t_gm.ratio_code = 'GROSS_MARGIN'
LEFT JOIN financial_ratio_targets t_dso ON k.tenant_id = t_dso.tenant_id AND t_dso.ratio_code = 'DSO'
LEFT JOIN financial_ratio_targets t_nm ON k.tenant_id = t_nm.tenant_id AND t_nm.ratio_code = 'NET_MARGIN';

-- =====================================================
-- 2.1.4 View: v_financial_ratios_with_targets
-- Join actual values with targets, pre-calculate is_on_target and progress
-- =====================================================
CREATE OR REPLACE VIEW public.v_financial_ratios_with_targets AS
SELECT 
  k.tenant_id,
  t.ratio_code,
  t.ratio_name,
  t.target_value,
  t.unit,
  t.comparison_type,
  
  -- Actual value from KPIs
  CASE t.ratio_code
    WHEN 'GROSS_MARGIN' THEN k.gross_margin_percent
    WHEN 'NET_MARGIN' THEN k.net_margin_percent
    WHEN 'EBITDA_MARGIN' THEN k.ebitda_margin_percent
    WHEN 'DSO' THEN k.dso
    WHEN 'CM' THEN k.contribution_margin_percent
    ELSE 0
  END AS actual_value,
  
  -- PRE-COMPUTED: is_on_target
  CASE 
    WHEN t.comparison_type = 'gte' AND (
      CASE t.ratio_code
        WHEN 'GROSS_MARGIN' THEN k.gross_margin_percent
        WHEN 'NET_MARGIN' THEN k.net_margin_percent
        WHEN 'EBITDA_MARGIN' THEN k.ebitda_margin_percent
        WHEN 'CM' THEN k.contribution_margin_percent
        ELSE 0
      END
    ) >= t.target_value THEN true
    WHEN t.comparison_type = 'lte' AND k.dso <= t.target_value THEN true
    ELSE false
  END AS is_on_target,
  
  -- PRE-COMPUTED: progress (capped at 100)
  LEAST(
    ROUND(
      CASE t.comparison_type
        WHEN 'gte' THEN (
          CASE t.ratio_code
            WHEN 'GROSS_MARGIN' THEN k.gross_margin_percent
            WHEN 'NET_MARGIN' THEN k.net_margin_percent
            WHEN 'EBITDA_MARGIN' THEN k.ebitda_margin_percent
            WHEN 'CM' THEN k.contribution_margin_percent
            ELSE 0
          END / NULLIF(t.target_value, 0) * 100
        )
        WHEN 'lte' THEN (
          t.target_value / NULLIF(k.dso, 0) * 100
        )
        ELSE 0
      END::NUMERIC, 0
    ),
    100
  ) AS progress_percent
  
FROM v_financial_report_kpis k
JOIN financial_ratio_targets t ON k.tenant_id = t.tenant_id;