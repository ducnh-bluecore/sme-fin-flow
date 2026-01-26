-- ============================================================
-- PHASE 3: METRIC GOVERNANCE FORMALIZATION (FIXED)
-- Central registry of all metrics with versioning and change tracking
-- ============================================================

-- 3.1 First, extend check constraints to include new categories
ALTER TABLE public.metric_registry DROP CONSTRAINT IF EXISTS metric_registry_category_check;
ALTER TABLE public.metric_registry ADD CONSTRAINT metric_registry_category_check 
  CHECK (category = ANY (ARRAY['revenue', 'cost', 'margin', 'cash', 'velocity', 'risk', 'quality', 'profit', 'working_capital', 'performance', 'efficiency', 'unit_economics', 'allocation', 'value', 'volume', 'behavior', 'retention']));

ALTER TABLE public.metric_registry DROP CONSTRAINT IF EXISTS metric_registry_module_check;
ALTER TABLE public.metric_registry ADD CONSTRAINT metric_registry_module_check 
  CHECK (module = ANY (ARRAY['fdp', 'mdp', 'cdp', 'control_tower', 'shared', 'FDP', 'MDP', 'CDP']));

ALTER TABLE public.metric_registry DROP CONSTRAINT IF EXISTS metric_registry_unit_check;
ALTER TABLE public.metric_registry ADD CONSTRAINT metric_registry_unit_check 
  CHECK (unit = ANY (ARRAY['currency', 'percent', 'days', 'count', 'ratio', 'VND', '%', 'x', 'orders/month']));

-- 3.2 Extend metric_registry with governance fields
ALTER TABLE public.metric_registry 
  ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'v1.0.0',
  ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_until DATE,
  ADD COLUMN IF NOT EXISTS formula_sql TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS business_context TEXT,
  ADD COLUMN IF NOT EXISTS change_log JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS validation_rules JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bounds JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dependencies TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_computed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS compute_frequency TEXT DEFAULT 'daily';

-- 3.3 Create metric version history table
CREATE TABLE IF NOT EXISTS public.metric_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_code TEXT NOT NULL,
  version TEXT NOT NULL,
  formula_sql TEXT,
  change_reason TEXT,
  changed_by TEXT DEFAULT 'SYSTEM',
  effective_from DATE NOT NULL,
  effective_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_metric_version UNIQUE (metric_code, version)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_metric_version_code ON public.metric_version_history(metric_code);

-- 3.4 Populate FDP metrics (using valid category/unit values)
INSERT INTO public.metric_registry (metric_code, metric_name, metric_name_vi, category, module, formula, source_view, unit, owner, description, business_context, formula_sql, bounds)
VALUES
  ('FDP_NET_REVENUE', 'Net Revenue', 'Doanh thu thuần', 'revenue', 'fdp', 'gross_revenue - returns - discounts', 'v_fdp_finance_summary', 'currency', 'CFO', 
   'Total revenue after deducting returns and discounts', 
   'Đây là con số doanh thu thực tế CEO/CFO cần theo dõi hàng ngày',
   'SUM(net_revenue) FROM external_orders WHERE status = completed',
   '{"min": 0, "max": null}'),
  
  ('FDP_COGS', 'Cost of Goods Sold', 'Giá vốn hàng bán', 'cost', 'fdp', 'SUM(cogs)', 'external_order_items', 'currency', 'CFO',
   'Direct cost of products sold',
   'Chi phí trực tiếp để có hàng bán',
   'SUM(quantity * unit_cost) FROM external_order_items',
   '{"min": 0, "max": null}'),
   
  ('FDP_GROSS_PROFIT', 'Gross Profit', 'Lợi nhuận gộp', 'profit', 'fdp', 'net_revenue - cogs', 'v_fdp_finance_summary', 'currency', 'CFO',
   'Revenue minus cost of goods sold',
   'Lợi nhuận sau khi trừ giá vốn, trước chi phí vận hành',
   'net_revenue - cogs',
   '{"min": null, "max": null}'),
   
  ('FDP_GROSS_MARGIN', 'Gross Margin %', 'Biên lợi nhuận gộp', 'margin', 'fdp', '(gross_profit / net_revenue) * 100', 'v_fdp_finance_summary', 'percent', 'CFO',
   'Gross profit as percentage of revenue',
   'Phần trăm lợi nhuận còn lại sau giá vốn',
   '(gross_profit / NULLIF(net_revenue, 0)) * 100',
   '{"min": -100, "max": 100}'),

  ('FDP_CM1', 'Contribution Margin 1', 'CM1', 'margin', 'fdp', 'gross_profit - platform_fees - shipping_cost', 'v_fdp_finance_summary', 'currency', 'CFO',
   'Gross profit minus variable platform and shipping costs',
   'Lợi nhuận sau giá vốn + phí sàn + vận chuyển',
   'gross_profit - platform_fees - shipping_cost',
   '{"min": null, "max": null}'),
   
  ('FDP_CM2', 'Contribution Margin 2', 'CM2', 'margin', 'fdp', 'cm1 - marketing_spend', 'v_fdp_finance_summary', 'currency', 'CFO',
   'CM1 minus marketing spend',
   'Lợi nhuận sau tất cả chi phí biến đổi',
   'cm1 - marketing_spend',
   '{"min": null, "max": null}'),

  ('FDP_DSO', 'Days Sales Outstanding', 'Số ngày thu tiền', 'working_capital', 'fdp', '(AR / daily_revenue) days', 'v_fdp_working_capital', 'days', 'CFO',
   'Average days to collect receivables',
   'Bao lâu khách hàng trả tiền?',
   '(total_ar / NULLIF(avg_daily_revenue, 0))',
   '{"min": 0, "max": 365}'),
   
  ('FDP_DPO', 'Days Payables Outstanding', 'Số ngày trả tiền', 'working_capital', 'fdp', '(AP / daily_cogs) days', 'v_fdp_working_capital', 'days', 'CFO',
   'Average days to pay suppliers',
   'Bao lâu mình trả tiền nhà cung cấp?',
   '(total_ap / NULLIF(avg_daily_cogs, 0))',
   '{"min": 0, "max": 365}'),
   
  ('FDP_CCC', 'Cash Conversion Cycle', 'Chu kỳ tiền mặt', 'working_capital', 'fdp', 'DSO + DIO - DPO', 'v_fdp_working_capital', 'days', 'CFO',
   'Time between paying suppliers and collecting from customers',
   'Bao lâu từ lúc bỏ tiền ra đến lúc thu về?',
   'dso + dio - dpo',
   '{"min": -100, "max": 365}'),

  ('FDP_CASH_AVAILABLE', 'Available Cash', 'Tiền mặt sẵn có', 'cash', 'fdp', 'bank_balance', 'v_fdp_cash_position', 'currency', 'CFO',
   'Cash immediately available in bank',
   'Tiền trong ngân hàng có thể dùng ngay',
   'SUM(balance) FROM bank_accounts WHERE status = active',
   '{"min": 0, "max": null}'),
   
  ('FDP_CASH_AT_RISK', 'Cash at Risk', 'Tiền có rủi ro', 'risk', 'fdp', 'AR overdue', 'v_fdp_cash_position', 'currency', 'CFO',
   'Receivables past due, collection uncertain',
   'Tiền khách hàng quá hạn, có nguy cơ mất',
   'SUM(remaining_amount) FROM invoices WHERE due_date < NOW() AND status != paid',
   '{"min": 0, "max": null}')
ON CONFLICT (metric_code) DO UPDATE SET
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  business_context = EXCLUDED.business_context,
  formula_sql = EXCLUDED.formula_sql,
  bounds = EXCLUDED.bounds,
  deprecation_date = NULL;

-- 3.5 Populate MDP metrics
INSERT INTO public.metric_registry (metric_code, metric_name, metric_name_vi, category, module, formula, source_view, unit, owner, description, business_context, formula_sql, bounds)
VALUES
  ('MDP_TOTAL_SPEND', 'Total Ad Spend', 'Tổng chi phí quảng cáo', 'cost', 'mdp', 'SUM(spend)', 'marketing_spends', 'currency', 'CMO',
   'Total marketing spend across all channels',
   'Tổng tiền đã chi cho quảng cáo',
   'SUM(amount) FROM marketing_spends',
   '{"min": 0, "max": null}'),
   
  ('MDP_ROAS_REVENUE', 'ROAS (Revenue)', 'ROAS theo doanh thu', 'performance', 'mdp', 'attributed_revenue / spend', 'v_mdp_channel_performance', 'ratio', 'CMO',
   'Revenue generated per dollar spent on ads',
   'Mỗi đồng quảng cáo tạo ra bao nhiêu doanh thu?',
   'attributed_revenue / NULLIF(total_spend, 0)',
   '{"min": 0, "max": 100}'),
   
  ('MDP_ROAS_CONTRIBUTION', 'ROAS (Contribution)', 'ROAS theo lợi nhuận', 'performance', 'mdp', 'attributed_contribution / spend', 'v_mdp_channel_performance', 'ratio', 'CFO',
   'Contribution margin generated per dollar spent',
   'Mỗi đồng quảng cáo tạo ra bao nhiêu LỢI NHUẬN?',
   'attributed_contribution / NULLIF(total_spend, 0)',
   '{"min": 0, "max": 50}'),
   
  ('MDP_CPA', 'Cost per Acquisition', 'Chi phí mỗi đơn', 'efficiency', 'mdp', 'spend / orders', 'v_mdp_channel_performance', 'currency', 'CMO',
   'Average cost to acquire one order',
   'Tốn bao nhiêu tiền quảng cáo để có 1 đơn?',
   'total_spend / NULLIF(order_count, 0)',
   '{"min": 0, "max": null}'),
   
  ('MDP_CAC', 'Customer Acquisition Cost', 'Chi phí thu hút KH mới', 'efficiency', 'mdp', 'spend / new_customers', 'v_mdp_channel_performance', 'currency', 'CMO',
   'Cost to acquire a new customer',
   'Tốn bao nhiêu để có 1 khách hàng MỚI?',
   'total_spend / NULLIF(new_customer_count, 0)',
   '{"min": 0, "max": null}'),
   
  ('MDP_LTV_CAC_RATIO', 'LTV:CAC Ratio', 'Tỷ lệ LTV/CAC', 'unit_economics', 'mdp', 'ltv / cac', 'v_mdp_unit_economics', 'ratio', 'CFO',
   'Customer lifetime value relative to acquisition cost',
   'Giá trị khách hàng có lớn hơn chi phí thu hút không?',
   'avg_ltv / NULLIF(cac, 0)',
   '{"min": 0, "max": 20}'),
   
  ('MDP_BLENDED_ROAS', 'Blended ROAS', 'ROAS tổng hợp', 'performance', 'mdp', 'total_revenue / total_spend', 'v_mdp_summary', 'ratio', 'CMO',
   'Overall ROAS across all marketing channels',
   'ROAS tổng của toàn bộ marketing',
   'total_revenue / NULLIF(total_spend, 0)',
   '{"min": 0, "max": 100}'),
   
  ('MDP_CONTRIBUTION_MARGIN', 'Marketing Contribution', 'CM Marketing', 'profit', 'mdp', 'attributed_revenue - attributed_cogs - spend', 'v_mdp_contribution', 'currency', 'CFO',
   'Net contribution from marketing after all costs',
   'Marketing tạo ra hay phá hủy lợi nhuận?',
   'attributed_revenue - attributed_cogs - total_spend',
   '{"min": null, "max": null}')
ON CONFLICT (metric_code) DO UPDATE SET
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  business_context = EXCLUDED.business_context,
  formula_sql = EXCLUDED.formula_sql,
  bounds = EXCLUDED.bounds;

-- 3.6 Populate CDP metrics
INSERT INTO public.metric_registry (metric_code, metric_name, metric_name_vi, category, module, formula, source_view, unit, owner, description, business_context, formula_sql, bounds)
VALUES
  ('CDP_EQUITY_12M', 'Customer Equity (12M)', 'Giá trị khách hàng 12 tháng', 'value', 'cdp', 'projected 12-month value', 'cdp_customer_equity_computed', 'currency', 'CEO',
   'Projected customer value over next 12 months',
   'Dự kiến khách hàng này mang lại bao nhiêu trong 12 tháng tới?',
   'SUM(equity_12m) FROM cdp_customer_equity_computed',
   '{"min": 0, "max": null}'),
   
  ('CDP_LTV_REALIZED', 'Realized LTV', 'LTV đã thực hiện', 'value', 'cdp', 'historical total revenue', 'cdp_customer_equity_computed', 'currency', 'CFO',
   'Total revenue already collected from customer',
   'Khách hàng này đã chi bao nhiêu với mình?',
   'SUM(ltv_realized) FROM cdp_customer_equity_computed',
   '{"min": 0, "max": null}'),
   
  ('CDP_ACTIVE_CUSTOMERS', 'Active Customers', 'Khách hàng hoạt động', 'volume', 'cdp', 'count where last_order < 90 days', 'v_cdp_customer_summary', 'count', 'COO',
   'Customers with purchase in last 90 days',
   'Bao nhiêu khách hàng còn đang mua hàng?',
   'COUNT(*) FROM cdp_customers WHERE last_order_date > NOW() - INTERVAL 90 days',
   '{"min": 0, "max": null}'),
   
  ('CDP_AT_RISK_CUSTOMERS', 'At-Risk Customers', 'Khách hàng có rủi ro', 'risk', 'cdp', 'count where last_order 60-120 days', 'v_cdp_customer_summary', 'count', 'COO',
   'Customers showing signs of churn',
   'Bao nhiêu khách hàng đang có nguy cơ rời bỏ?',
   'COUNT(*) FROM cdp_customers WHERE last_order_date BETWEEN NOW() - INTERVAL 120 days AND NOW() - INTERVAL 60 days',
   '{"min": 0, "max": null}'),
   
  ('CDP_CHURN_RATE', 'Churn Rate', 'Tỷ lệ rời bỏ', 'risk', 'cdp', 'churned / (active + churned) * 100', 'v_cdp_churn_analysis', 'percent', 'CEO',
   'Percentage of customers who stopped buying',
   'Phần trăm khách hàng không quay lại',
   '(churned_count / NULLIF(active_count + churned_count, 0)) * 100',
   '{"min": 0, "max": 100}'),
   
  ('CDP_RECENCY_DAYS', 'Avg Recency', 'TB số ngày từ đơn cuối', 'behavior', 'cdp', 'avg days since last order', 'cdp_customer_metrics_rolling', 'days', 'COO',
   'Average days since customers last ordered',
   'Trung bình bao lâu khách hàng đặt đơn lần cuối?',
   'AVG(CURRENT_DATE - last_order_date::date) FROM cdp_customers',
   '{"min": 0, "max": 365}'),
   
  ('CDP_AVG_ORDER_VALUE', 'Average Order Value', 'Giá trị đơn TB', 'revenue', 'cdp', 'total_revenue / order_count', 'cdp_customer_metrics_rolling', 'currency', 'CFO',
   'Average revenue per order',
   'Trung bình mỗi đơn hàng bao nhiêu tiền?',
   'SUM(net_revenue) / NULLIF(COUNT(*), 0) FROM cdp_orders',
   '{"min": 0, "max": null}'),
   
  ('CDP_RETENTION_RATE', 'Retention Rate', 'Tỷ lệ giữ chân', 'retention', 'cdp', 'repeat_customers / total * 100', 'v_cdp_retention', 'percent', 'CEO',
   'Percentage of customers who return',
   'Phần trăm khách hàng quay lại mua tiếp',
   '(repeat_customer_count / NULLIF(total_customer_count, 0)) * 100',
   '{"min": 0, "max": 100}')
ON CONFLICT (metric_code) DO UPDATE SET
  owner = EXCLUDED.owner,
  description = EXCLUDED.description,
  business_context = EXCLUDED.business_context,
  formula_sql = EXCLUDED.formula_sql,
  bounds = EXCLUDED.bounds;

-- 3.7 Create view for metric changelog
CREATE OR REPLACE VIEW public.v_metric_changelog AS
SELECT 
  m.metric_code,
  m.metric_name,
  m.metric_name_vi,
  m.module,
  m.version as current_version,
  m.owner,
  m.effective_from,
  m.formula_sql as current_formula,
  m.business_context,
  h.version as history_version,
  h.formula_sql as history_formula,
  h.change_reason,
  h.changed_by,
  h.effective_from as history_effective_from,
  h.effective_until as history_effective_until
FROM public.metric_registry m
LEFT JOIN public.metric_version_history h ON h.metric_code = m.metric_code
ORDER BY m.module, m.metric_code, h.effective_from DESC;

-- 3.8 Function to update metric with version tracking
CREATE OR REPLACE FUNCTION public.update_metric_formula(
  p_metric_code TEXT,
  p_new_formula TEXT,
  p_change_reason TEXT,
  p_changed_by TEXT DEFAULT 'SYSTEM'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_formula TEXT;
  v_old_version TEXT;
  v_new_version TEXT;
  v_major INT;
  v_minor INT;
  v_patch INT;
BEGIN
  -- Get current state
  SELECT formula_sql, version INTO v_old_formula, v_old_version
  FROM metric_registry
  WHERE metric_code = p_metric_code;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Metric % not found', p_metric_code;
  END IF;
  
  -- Parse and increment version
  SELECT 
    SPLIT_PART(REPLACE(v_old_version, 'v', ''), '.', 1)::INT,
    SPLIT_PART(REPLACE(v_old_version, 'v', ''), '.', 2)::INT,
    SPLIT_PART(REPLACE(v_old_version, 'v', ''), '.', 3)::INT
  INTO v_major, v_minor, v_patch;
  
  v_new_version := format('v%s.%s.%s', v_major, v_minor + 1, 0);
  
  -- Archive old version
  INSERT INTO metric_version_history (
    metric_code, version, formula_sql, change_reason, changed_by,
    effective_from, effective_until
  ) VALUES (
    p_metric_code, v_old_version, v_old_formula, p_change_reason, p_changed_by,
    (SELECT effective_from FROM metric_registry WHERE metric_code = p_metric_code),
    CURRENT_DATE
  )
  ON CONFLICT (metric_code, version) DO NOTHING;
  
  -- Update current
  UPDATE metric_registry
  SET 
    formula_sql = p_new_formula,
    version = v_new_version,
    effective_from = CURRENT_DATE,
    change_log = COALESCE(change_log, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'version', v_new_version,
      'changed_at', NOW(),
      'changed_by', p_changed_by,
      'reason', p_change_reason
    ))
  WHERE metric_code = p_metric_code;
  
  RETURN TRUE;
END;
$$;