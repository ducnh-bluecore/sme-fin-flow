
-- Product Metrics Table - SINGLE SOURCE OF TRUTH for all SKU/Product metrics
-- Auto-calculated from order data, serves as the master record

CREATE TABLE public.product_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Product Identity
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  
  -- Pricing (from latest order or manual input)
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Calculated margins (from base columns only)
  gross_margin NUMERIC(15,2) GENERATED ALWAYS AS (unit_price - unit_cost) STORED,
  gross_margin_percent NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN unit_price > 0 THEN ((unit_price - unit_cost) / unit_price) * 100 ELSE 0 END
  ) STORED,
  
  -- Sales Velocity (updated from orders) - BASE COLUMNS
  total_orders_30d INTEGER DEFAULT 0,
  total_quantity_30d INTEGER DEFAULT 0,
  total_revenue_30d NUMERIC(15,2) DEFAULT 0,
  total_cost_30d NUMERIC(15,2) DEFAULT 0,
  
  -- Calculated velocity metrics (from base columns)
  avg_daily_orders NUMERIC(8,4) GENERATED ALWAYS AS (total_orders_30d::NUMERIC / 30) STORED,
  avg_daily_quantity NUMERIC(8,4) GENERATED ALWAYS AS (total_quantity_30d::NUMERIC / 30) STORED,
  avg_daily_revenue NUMERIC(15,2) GENERATED ALWAYS AS (total_revenue_30d / 30) STORED,
  
  -- Profitability (from base columns)
  gross_profit_30d NUMERIC(15,2) GENERATED ALWAYS AS (total_revenue_30d - total_cost_30d) STORED,
  profit_per_unit NUMERIC(15,2) GENERATED ALWAYS AS (
    CASE WHEN total_quantity_30d > 0 THEN (total_revenue_30d - total_cost_30d) / total_quantity_30d ELSE 0 END
  ) STORED,
  
  -- Channel breakdown (JSONB for flexibility)
  channel_breakdown JSONB DEFAULT '{}',
  
  -- Inventory - BASE COLUMNS
  current_stock INTEGER DEFAULT 0,
  
  -- Days of stock uses base columns only (not generated avg_daily_quantity)
  days_of_stock NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN total_quantity_30d > 0 THEN (current_stock::NUMERIC * 30) / total_quantity_30d ELSE 999 END
  ) STORED,
  
  -- Status flags (from base columns only)
  is_profitable BOOLEAN GENERATED ALWAYS AS (unit_price > unit_cost) STORED,
  profit_status TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN unit_price <= 0 THEN 'unknown'
      WHEN ((unit_price - unit_cost) / unit_price) * 100 >= 20 THEN 'healthy'
      WHEN ((unit_price - unit_cost) / unit_price) * 100 >= 0 THEN 'warning'
      ELSE 'critical'
    END
  ) STORED,
  
  -- Tracking
  last_order_date TIMESTAMPTZ,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint per tenant + SKU
  UNIQUE(tenant_id, sku)
);

-- Enable RLS
ALTER TABLE public.product_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies using tenant_users table
CREATE POLICY "Users can view product_metrics for their tenant"
  ON public.product_metrics FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert product_metrics for their tenant"
  ON public.product_metrics FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update product_metrics for their tenant"
  ON public.product_metrics FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete product_metrics for their tenant"
  ON public.product_metrics FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_product_metrics_tenant ON public.product_metrics(tenant_id);
CREATE INDEX idx_product_metrics_sku ON public.product_metrics(sku);
CREATE INDEX idx_product_metrics_profit_status ON public.product_metrics(profit_status);
CREATE INDEX idx_product_metrics_is_profitable ON public.product_metrics(is_profitable);

-- Function to recalculate product metrics from orders
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
  -- Get aggregated order data for each SKU
  FOR v_record IN
    SELECT 
      eo.tenant_id,
      item->>'sku' as sku,
      item->>'product_name' as product_name,
      MAX((item->>'unit_price')::NUMERIC) as unit_price,
      MAX((item->>'cost')::NUMERIC) as unit_cost,
      COUNT(DISTINCT eo.id) as order_count,
      SUM((item->>'quantity')::INTEGER) as total_qty,
      SUM((item->>'subtotal')::NUMERIC) as total_revenue,
      SUM((item->>'cost')::NUMERIC * (item->>'quantity')::INTEGER) as total_cost,
      MAX(eo.order_date) as last_order
    FROM external_orders eo
    CROSS JOIN LATERAL jsonb_array_elements(eo.items) as item
    WHERE eo.tenant_id = p_tenant_id
      AND eo.order_date >= NOW() - INTERVAL '30 days'
      AND eo.status NOT IN ('cancelled', 'returned')
      AND (p_sku IS NULL OR item->>'sku' = p_sku)
    GROUP BY eo.tenant_id, item->>'sku', item->>'product_name'
  LOOP
    INSERT INTO product_metrics (
      tenant_id, sku, product_name, unit_price, unit_cost,
      total_orders_30d, total_quantity_30d, total_revenue_30d, total_cost_30d,
      last_order_date, last_calculated_at
    )
    VALUES (
      v_record.tenant_id,
      v_record.sku,
      COALESCE(v_record.product_name, v_record.sku),
      COALESCE(v_record.unit_price, 0),
      COALESCE(v_record.unit_cost, 0),
      v_record.order_count,
      COALESCE(v_record.total_qty, 0),
      COALESCE(v_record.total_revenue, 0),
      COALESCE(v_record.total_cost, 0),
      v_record.last_order,
      NOW()
    )
    ON CONFLICT (tenant_id, sku) DO UPDATE SET
      product_name = EXCLUDED.product_name,
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

-- Trigger to auto-update product_metrics when orders change
CREATE OR REPLACE FUNCTION public.trigger_update_product_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sku TEXT;
BEGIN
  -- Extract SKU from items
  IF NEW.items IS NOT NULL AND jsonb_array_length(NEW.items) > 0 THEN
    v_sku := NEW.items->0->>'sku';
    IF v_sku IS NOT NULL THEN
      PERFORM recalculate_product_metrics(NEW.tenant_id, v_sku);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_external_orders_update_metrics
  AFTER INSERT OR UPDATE ON public.external_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_product_metrics();

-- Updated_at trigger
CREATE TRIGGER update_product_metrics_updated_at
  BEFORE UPDATE ON public.product_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
