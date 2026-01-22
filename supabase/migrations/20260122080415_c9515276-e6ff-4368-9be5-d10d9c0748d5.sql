
SET session_replication_role = replica;

-- SEED Working Capital Metrics (only non-generated columns)
INSERT INTO working_capital_metrics (
  tenant_id, metric_date, accounts_receivable, accounts_payable, inventory_value,
  dso_days, dpo_days, dio_days, created_at
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  ('2024-07-01'::date + (i * INTERVAL '1 month'))::date,
  (150000000 * POWER(1.02, i))::numeric(15,2),
  (120000000 * POWER(1.02, i))::numeric(15,2),
  (250000000 * POWER(1.01, i))::numeric(15,2),
  (28 - i / 2)::int, (32 + i / 3)::int, (48 - i / 3)::int,
  NOW()
FROM generate_series(0, 17) AS i;

SET session_replication_role = DEFAULT;
