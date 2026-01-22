
-- MDP SEED DATA PART 2: Marketing Expenses (daily data)
INSERT INTO marketing_expenses (tenant_id, expense_date, channel, campaign_name, amount, impressions, clicks, conversions)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  d::date,
  channel,
  channel || ' Daily Ads',
  (CASE 
    WHEN EXTRACT(MONTH FROM d) IN (7, 9, 11, 12) THEN base_amount * (1.0 + random() * 0.5)
    ELSE base_amount * (0.7 + random() * 0.3)
  END)::numeric(12,2),
  (base_impressions * (0.8 + random() * 0.4))::integer,
  (base_impressions * (0.02 + random() * 0.02))::integer,
  GREATEST(1, (base_impressions * 0.0005)::integer)
FROM generate_series('2024-07-01'::date, '2025-12-31'::date, '1 day'::interval) d
CROSS JOIN (VALUES 
  ('shopee', 1800000, 50000),
  ('lazada', 1400000, 40000),
  ('tiktok', 1200000, 80000),
  ('facebook', 900000, 100000),
  ('google', 800000, 30000)
) AS ch(channel, base_amount, base_impressions);
