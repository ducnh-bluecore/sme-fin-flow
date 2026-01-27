-- 1. Add product_id FK column to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

-- 2. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON inventory_items(product_id);

-- 3. Seed inventory items from products table for E2E Test Company
-- Using explicit row numbering with proper type casting
INSERT INTO inventory_items (
  tenant_id, product_id, sku, product_name, category, 
  quantity, unit_cost, received_date, warehouse_location, last_sold_date, status, notes
)
SELECT 
  p.tenant_id,
  p.id as product_id,
  p.sku,
  p.name as product_name,
  p.category,
  (20 + (row_num % 150))::int as quantity,
  COALESCE(p.cost_price, 85000) as unit_cost,
  -- Distribute received_date with proper int cast
  CASE 
    WHEN row_num <= 40 THEN CURRENT_DATE - ((row_num % 25)::int)
    WHEN row_num <= 65 THEN CURRENT_DATE - (30 + (row_num % 30))::int
    WHEN row_num <= 80 THEN CURRENT_DATE - (60 + (row_num % 30))::int
    WHEN row_num <= 92 THEN CURRENT_DATE - (90 + (row_num % 90))::int
    ELSE CURRENT_DATE - (180 + (row_num % 120))::int
  END as received_date,
  'WH-' || (1 + (row_num % 3)) as warehouse_location,
  CASE 
    WHEN row_num <= 40 THEN CURRENT_DATE - ((row_num % 10)::int)
    WHEN row_num <= 65 THEN CURRENT_DATE - (20 + (row_num % 20))::int
    WHEN row_num <= 80 THEN CURRENT_DATE - (50 + (row_num % 30))::int
    WHEN row_num <= 92 THEN CURRENT_DATE - (80 + (row_num % 60))::int
    ELSE CURRENT_DATE - (150 + (row_num % 100))::int
  END as last_sold_date,
  CASE WHEN row_num <= 80 THEN 'active' ELSE 'slow_moving' END as status,
  'Seeded from products table - E2E Test Data' as notes
FROM (
  SELECT *, ROW_NUMBER() OVER (ORDER BY id) as row_num
  FROM products
  WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
) p;