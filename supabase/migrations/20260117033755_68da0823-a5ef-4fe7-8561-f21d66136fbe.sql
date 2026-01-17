
-- Add unique constraint on products for tenant_id + sku
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_sku ON public.products(tenant_id, sku);

-- Add product_id column to product_metrics if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_metrics' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE public.product_metrics 
    ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add generated columns to products if not exists (for margin calculation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'gross_margin'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN gross_margin NUMERIC(15,2) GENERATED ALWAYS AS (selling_price - cost_price) STORED;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'gross_margin_percent'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN gross_margin_percent NUMERIC(8,4) GENERATED ALWAYS AS (
      CASE WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price) * 100 ELSE 0 END
    ) STORED;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_profitable'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN is_profitable BOOLEAN GENERATED ALWAYS AS (selling_price > cost_price) STORED;
  END IF;
END $$;

-- Update recalculate function to JOIN with products for pricing
CREATE OR REPLACE FUNCTION public.recalculate_product_metrics(
  p_tenant_id UUID,
  p_sku TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Get aggregated order data for each SKU, JOIN with products for MASTER pricing
  FOR v_record IN
    SELECT 
      eo.tenant_id,
      item->>'sku' as sku,
      COALESCE(p.name, item->>'product_name', item->>'sku') as product_name,
      p.id as product_id,
      -- CRITICAL: Use products table as SSOT for pricing
      COALESCE(p.selling_price, (item->>'unit_price')::NUMERIC, 0) as unit_price,
      COALESCE(p.cost_price, (item->>'cost')::NUMERIC, 0) as unit_cost,
      COUNT(DISTINCT eo.id) as order_count,
      SUM(COALESCE((item->>'quantity')::INTEGER, 1)) as total_qty,
      -- Revenue = quantity × selling_price from products master
      SUM(COALESCE((item->>'quantity')::INTEGER, 1) * COALESCE(p.selling_price, 0)) as total_revenue,
      -- Cost = quantity × cost_price from products master
      SUM(COALESCE((item->>'quantity')::INTEGER, 1) * COALESCE(p.cost_price, 0)) as total_cost,
      MAX(eo.order_date) as last_order
    FROM external_orders eo
    CROSS JOIN LATERAL jsonb_array_elements(eo.items) as item
    LEFT JOIN products p ON p.tenant_id = eo.tenant_id AND p.sku = item->>'sku'
    WHERE eo.tenant_id = p_tenant_id
      AND eo.order_date >= NOW() - INTERVAL '30 days'
      AND eo.status NOT IN ('cancelled', 'returned')
      AND (p_sku IS NULL OR item->>'sku' = p_sku)
    GROUP BY eo.tenant_id, item->>'sku', item->>'product_name', p.id, p.name, p.selling_price, p.cost_price
  LOOP
    INSERT INTO product_metrics (
      tenant_id, sku, product_name, product_id, unit_price, unit_cost,
      total_orders_30d, total_quantity_30d, total_revenue_30d, total_cost_30d,
      last_order_date, last_calculated_at
    )
    VALUES (
      v_record.tenant_id,
      v_record.sku,
      v_record.product_name,
      v_record.product_id,
      v_record.unit_price,
      v_record.unit_cost,
      v_record.order_count,
      COALESCE(v_record.total_qty, 0),
      COALESCE(v_record.total_revenue, 0),
      COALESCE(v_record.total_cost, 0),
      v_record.last_order,
      NOW()
    )
    ON CONFLICT (tenant_id, sku) DO UPDATE SET
      product_name = EXCLUDED.product_name,
      product_id = EXCLUDED.product_id,
      unit_price = EXCLUDED.unit_price,
      unit_cost = EXCLUDED.unit_cost,
      total_orders_30d = EXCLUDED.total_orders_30d,
      total_quantity_30d = EXCLUDED.total_quantity_30d,
      total_revenue_30d = EXCLUDED.total_revenue_30d,
      total_cost_30d = EXCLUDED.total_cost_30d,
      last_order_date = EXCLUDED.last_order_date,
      last_calculated_at = NOW(),
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;
