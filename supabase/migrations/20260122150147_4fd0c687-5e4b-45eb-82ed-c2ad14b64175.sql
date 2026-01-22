-- ============================================
-- SEED CDP INSIGHT REGISTRY (25 hard-coded insights)
-- ============================================

INSERT INTO public.cdp_insight_registry (insight_code, name, category, population_type, default_population_ref, window_days, baseline_days, threshold_json, cooldown_days) VALUES

-- VALUE INSIGHTS (V01-V06)
('V01', 'Core Customer Spend Decline', 'VALUE', 'PERCENTILE', '{"percentile": 20, "metric": "ltv"}', 60, 60, '{"metric": "revenue_per_customer", "direction": "down", "pct_change": -0.10}', 14),
('V02', 'AOV Compression in High-Value Segment', 'VALUE', 'SEGMENT', '{"segment_type": "repeat_customers"}', 60, 60, '{"metric": "aov", "direction": "down", "pct_change": -0.12}', 14),
('V03', 'Frequency Drop in Revenue-Dominant Cohort', 'VALUE', 'PERCENTILE', '{"percentile": 40, "metric": "revenue_contribution"}', 60, 60, '{"metric": "purchase_frequency", "direction": "down", "pct_change": -0.08}', 14),
('V04', 'Net Revenue Decline after Refunds', 'VALUE', 'ALL', '{"filter": "repeat_customers"}', 60, 60, '{"metric": "net_revenue", "direction": "down", "pct_change": -0.15}', 14),
('V05', 'LTV Projection Downtrend', 'VALUE', 'COHORT', '{"cohort_type": "new_customers"}', 90, 90, '{"metric": "ltv_projected", "direction": "down", "pct_change": -0.10}', 30),
('V06', 'Revenue Concentration Weakening', 'VALUE', 'PERCENTILE', '{"percentile": 10, "metric": "revenue"}', 60, 60, '{"metric": "revenue_share", "direction": "down", "abs_change": -5}', 14),

-- TIMING INSIGHTS (T01-T05)
('T01', 'Inter-Purchase Time Expansion', 'TIMING', 'ALL', '{"filter": "repeat_customers"}', 60, 60, '{"metric": "inter_purchase_days", "direction": "up", "pct_change": 0.20}', 14),
('T02', 'Second-Purchase Delay', 'TIMING', 'COHORT', '{"cohort_type": "new_customers"}', 60, 60, '{"metric": "time_to_second_purchase", "direction": "up", "pct_change": 0.25}', 14),
('T03', 'Purchase Rhythm Volatility Increase', 'TIMING', 'ALL', '{"filter": "repeat_customers"}', 60, 60, '{"metric": "inter_purchase_iqr", "direction": "up", "pct_change": 0.30}', 14),
('T04', 'Cohort Decay Acceleration', 'TIMING', 'COHORT', '{"cohort_type": "monthly"}', 90, 90, '{"metric": "retention_curve_slope", "direction": "down", "pct_change": -0.15}', 30),
('T05', 'Repeat Rate Softening', 'TIMING', 'ALL', '{}', 60, 60, '{"metric": "repeat_rate", "direction": "down", "abs_change": -6}', 14),

-- MIX INSIGHTS (M01-M06)
('M01', 'Discount Dependency Increase', 'MIX', 'ALL', '{}', 60, 60, '{"metric": "discounted_order_share", "direction": "up", "abs_change": 15}', 14),
('M02', 'Low-Margin Category Drift', 'MIX', 'ALL', '{}', 60, 60, '{"metric": "low_margin_category_share", "direction": "up", "abs_change": 10}', 14),
('M03', 'Bundle to Single Item Shift', 'MIX', 'ALL', '{}', 60, 60, '{"metric": "bundle_order_share", "direction": "down", "pct_change": -0.20}', 14),
('M04', 'Channel Mix Shift to Higher Cost', 'MIX', 'ALL', '{}', 60, 60, '{"metric": "high_cost_channel_share", "direction": "up", "abs_change": 10}', 14),
('M05', 'Payment Method Risk Shift (COD)', 'MIX', 'ALL', '{}', 60, 60, '{"metric": "cod_order_share", "direction": "up", "abs_change": 10}', 14),
('M06', 'Price Sensitivity Signal', 'MIX', 'ALL', '{}', 60, 60, '{"metric": "avg_unit_price", "direction": "down", "pct_change": -0.10, "condition": "volume_stable"}', 14),

-- RISK INSIGHTS (R01-R05)
('R01', 'Spend Volatility Spike', 'RISK', 'ALL', '{}', 60, 60, '{"metric": "spend_std_dev", "direction": "up", "pct_change": 0.40}', 14),
('R02', 'Return Rate Escalation', 'RISK', 'ALL', '{}', 60, 60, '{"metric": "return_rate", "direction": "up", "abs_change": 5}', 14),
('R03', 'Revenue Tail Risk Expansion', 'RISK', 'PERCENTILE', '{"percentile": 10, "metric": "revenue", "direction": "bottom"}', 60, 60, '{"metric": "bottom_percentile_loss", "direction": "up", "pct_change": 0.20}', 14),
('R04', 'Core Customer Churn Risk Increase', 'RISK', 'COHORT', '{"cohort_type": "value_tier"}', 60, 60, '{"metric": "churn_probability", "direction": "up", "pct_change": 0.15}', 14),
('R05', 'Forecast Confidence Degradation', 'RISK', 'ALL', '{}', 90, 90, '{"metric": "forecast_error", "direction": "up", "pct_change": 0.25}', 30),

-- QUALITY INSIGHTS (Q01-Q04)
('Q01', 'New Cohort Value Degradation', 'QUALITY', 'COHORT', '{"cohort_type": "new_customers", "window": "30d"}', 30, 30, '{"metric": "first_30d_revenue", "direction": "down", "pct_change": -0.20}', 14),
('Q02', 'Early Refund Spike in New Customers', 'QUALITY', 'COHORT', '{"cohort_type": "new_customers", "window": "30d"}', 30, 30, '{"metric": "early_refund_rate", "direction": "up", "abs_change": 5}', 14),
('Q03', 'New vs Existing Margin Gap Widening', 'QUALITY', 'ALL', '{}', 60, 60, '{"metric": "new_existing_margin_gap", "direction": "up", "abs_change": 5}', 14),
('Q04', 'Identity Coverage Weakening', 'QUALITY', 'ALL', '{}', 30, 30, '{"metric": "identity_coverage", "direction": "down", "abs_change": -5}', 7)

ON CONFLICT (insight_code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  population_type = EXCLUDED.population_type,
  default_population_ref = EXCLUDED.default_population_ref,
  window_days = EXCLUDED.window_days,
  baseline_days = EXCLUDED.baseline_days,
  threshold_json = EXCLUDED.threshold_json,
  cooldown_days = EXCLUDED.cooldown_days;