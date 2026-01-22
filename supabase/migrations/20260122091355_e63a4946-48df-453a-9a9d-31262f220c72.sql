
-- MDP SEED DATA PART 3: Channel Analytics (daily data - with gross_margin as percentage 0-100)
INSERT INTO channel_analytics (
  tenant_id, analytics_date, channel, 
  revenue, total_orders, avg_order_value,
  platform_fee, shipping_cost, marketing_cost, total_cogs, gross_margin,
  sessions, unique_visitors, conversion_rate, bounce_rate,
  shop_score, shop_rating, response_rate
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  d::date,
  channel,
  -- Revenue (daily, scaled by channel)
  (base_revenue * (CASE WHEN EXTRACT(MONTH FROM d) IN (11, 12) THEN 1.5 ELSE 1.0 END) * (0.8 + random() * 0.4))::numeric(15,2),
  -- Orders
  (base_orders * (0.8 + random() * 0.4))::integer,
  -- AOV
  (base_aov * (0.9 + random() * 0.2))::numeric(15,2),
  -- Platform fee
  (base_revenue * 0.08)::numeric(15,2),
  -- Shipping
  (base_orders * 25000)::numeric(15,2),
  -- Marketing
  (base_marketing * (0.8 + random() * 0.4))::numeric(15,2),
  -- COGS
  (base_revenue * 0.55)::numeric(15,2),
  -- Gross margin as PERCENTAGE (20-30%), fits numeric(10,4)
  (18 + random() * 12)::numeric(6,4),
  -- Sessions
  (base_sessions * (0.8 + random() * 0.4))::integer,
  -- Unique visitors
  (base_sessions * 0.75)::integer,
  -- Conversion rate (1.5-4%)
  (1.5 + random() * 2.5)::numeric(5,2),
  -- Bounce rate (35-55%)
  (35 + random() * 20)::numeric(5,2),
  -- Shop score
  (4.5 + random() * 0.5)::numeric(3,2),
  -- Shop rating
  (4.3 + random() * 0.6)::numeric(3,2),
  -- Response rate
  (85 + random() * 14)::numeric(5,2)
FROM generate_series('2024-07-01'::date, '2025-12-31'::date, '1 day'::interval) d
CROSS JOIN (VALUES 
  ('shopee', 25000000, 45, 550000, 1800000, 3000),
  ('lazada', 18000000, 35, 520000, 1400000, 2500),
  ('tiktok', 15000000, 30, 500000, 1200000, 4000),
  ('facebook', 12000000, 25, 480000, 900000, 2000),
  ('google', 10000000, 20, 500000, 800000, 1500)
) AS ch(channel, base_revenue, base_orders, base_aov, base_marketing, base_sessions);
