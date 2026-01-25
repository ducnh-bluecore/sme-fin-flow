-- ============================================
-- PHASE 1: FIX CRITICAL SSOT VIOLATIONS (v3)
-- ============================================

-- 1. Create RPC for Control Tower real data (replaces hardcoded data)
CREATE OR REPLACE FUNCTION public.get_control_tower_summary(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalRevenue', COALESCE(SUM(eo.total_amount), 0),
    'totalOrders', COUNT(DISTINCT eo.id),
    'avgOrderValue', CASE WHEN COUNT(DISTINCT eo.id) > 0 
      THEN COALESCE(SUM(eo.total_amount), 0) / COUNT(DISTINCT eo.id) 
      ELSE 0 END,
    'uniqueCustomers', COUNT(DISTINCT eo.customer_id),
    'dailyData', (
      SELECT COALESCE(jsonb_agg(daily_row ORDER BY d.date_val), '[]'::jsonb)
      FROM (
        SELECT 
          d.date_val,
          to_char(d.date_val, 'DD/MM') as date_label,
          COALESCE(SUM(eo2.total_amount), 0) as revenue,
          COUNT(DISTINCT eo2.id) as orders
        FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d(date_val)
        LEFT JOIN external_orders eo2 ON 
          eo2.tenant_id = p_tenant_id AND 
          DATE(eo2.order_date) = d.date_val::date
        GROUP BY d.date_val
      ) daily_row
    ),
    'channelData', (
      SELECT COALESCE(jsonb_agg(ch_row), '[]'::jsonb)
      FROM (
        SELECT 
          COALESCE(channel, 'Khác') as channel,
          SUM(total_amount) as revenue,
          COUNT(*) as orders
        FROM external_orders
        WHERE tenant_id = p_tenant_id
          AND order_date >= p_start_date
          AND order_date <= p_end_date
        GROUP BY channel
        ORDER BY SUM(total_amount) DESC
      ) ch_row
    ),
    'hourlyData', (
      SELECT COALESCE(jsonb_agg(hr_row ORDER BY hour_val), '[]'::jsonb)
      FROM (
        SELECT 
          EXTRACT(HOUR FROM order_date)::int as hour_val,
          EXTRACT(HOUR FROM order_date)::text || 'h' as hour_label,
          COUNT(*) as orders
        FROM external_orders
        WHERE tenant_id = p_tenant_id
          AND order_date >= p_start_date
          AND order_date <= p_end_date
        GROUP BY EXTRACT(HOUR FROM order_date)
      ) hr_row
    ),
    'storeData', (
      SELECT COALESCE(jsonb_agg(st_row), '[]'::jsonb)
      FROM (
        SELECT 
          s.name as store_name,
          COALESCE(SUM(eo3.total_amount), 0) as revenue,
          COUNT(DISTINCT eo3.id) as orders
        FROM stores s
        LEFT JOIN external_orders eo3 ON 
          eo3.store_id = s.id AND
          eo3.order_date >= p_start_date AND
          eo3.order_date <= p_end_date
        WHERE s.tenant_id = p_tenant_id
        GROUP BY s.id, s.name
        ORDER BY SUM(eo3.total_amount) DESC NULLS LAST
        LIMIT 10
      ) st_row
    ),
    'categoryData', (
      SELECT COALESCE(jsonb_agg(cat_row), '[]'::jsonb)
      FROM (
        SELECT 
          COALESCE(ep.category, 'Khác') as category,
          SUM(eoi.total_amount) as value
        FROM external_order_items eoi
        JOIN external_orders eo4 ON eo4.id = eoi.external_order_id
        LEFT JOIN external_products ep ON ep.external_sku = eoi.sku AND ep.tenant_id = p_tenant_id
        WHERE eo4.tenant_id = p_tenant_id
          AND eo4.order_date >= p_start_date
          AND eo4.order_date <= p_end_date
        GROUP BY COALESCE(ep.category, 'Khác')
        ORDER BY SUM(eoi.total_amount) DESC
        LIMIT 10
      ) cat_row
    ),
    'comparison', (
      SELECT jsonb_build_object(
        'currentRevenue', current_rev,
        'previousRevenue', prev_rev,
        'revenueChange', CASE WHEN prev_rev > 0 
          THEN ((current_rev - prev_rev) / prev_rev * 100) 
          ELSE 0 END,
        'currentOrders', current_orders,
        'previousOrders', prev_orders,
        'ordersChange', CASE WHEN prev_orders > 0 
          THEN ((current_orders::numeric - prev_orders::numeric) / prev_orders * 100) 
          ELSE 0 END
      )
      FROM (
        SELECT 
          COALESCE(SUM(CASE WHEN order_date >= p_start_date THEN total_amount END), 0) as current_rev,
          COALESCE(SUM(CASE WHEN order_date < p_start_date THEN total_amount END), 0) as prev_rev,
          COUNT(CASE WHEN order_date >= p_start_date THEN 1 END) as current_orders,
          COUNT(CASE WHEN order_date < p_start_date THEN 1 END) as prev_orders
        FROM external_orders
        WHERE tenant_id = p_tenant_id
          AND order_date >= p_start_date - (p_end_date - p_start_date)
          AND order_date <= p_end_date
      ) comparison_data
    ),
    'dataQuality', jsonb_build_object(
      'hasRealData', COUNT(DISTINCT eo.id) > 0,
      'orderCount', COUNT(DISTINCT eo.id),
      'dateRange', jsonb_build_object('start', p_start_date, 'end', p_end_date)
    )
  ) INTO v_result
  FROM external_orders eo
  WHERE eo.tenant_id = p_tenant_id
    AND eo.order_date >= p_start_date
    AND eo.order_date <= p_end_date;
    
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- 2. Create RPC for FDP period aggregation (replaces client-side .reduce())
CREATE OR REPLACE FUNCTION public.get_fdp_period_summary(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalOrders', COUNT(DISTINCT eo.id),
    'totalRevenue', COALESCE(SUM(eo.total_amount), 0),
    'totalCogs', COALESCE(SUM(eoi_agg.total_cogs), 0),
    'totalPlatformFees', COALESCE(SUM(
      COALESCE(eo.platform_fee, 0) + 
      COALESCE(eo.commission_fee, 0) + 
      COALESCE(eo.payment_fee, 0)
    ), 0),
    'totalShippingFees', COALESCE(SUM(eo.shipping_fee), 0),
    'grossProfit', COALESCE(SUM(eo.total_amount), 0) - COALESCE(SUM(eoi_agg.total_cogs), 0),
    'contributionMargin', COALESCE(SUM(eo.total_amount), 0) - 
      COALESCE(SUM(eoi_agg.total_cogs), 0) - 
      COALESCE(SUM(COALESCE(eo.platform_fee, 0) + COALESCE(eo.commission_fee, 0) + COALESCE(eo.payment_fee, 0) + COALESCE(eo.shipping_fee, 0)), 0),
    'uniqueCustomers', COUNT(DISTINCT eo.customer_id),
    'avgOrderValue', CASE WHEN COUNT(DISTINCT eo.id) > 0 
      THEN COALESCE(SUM(eo.total_amount), 0) / COUNT(DISTINCT eo.id) 
      ELSE 0 END,
    'dataQuality', jsonb_build_object(
      'hasRealData', COUNT(DISTINCT eo.id) > 0,
      'hasCogs', SUM(CASE WHEN eoi_agg.total_cogs IS NOT NULL AND eoi_agg.total_cogs > 0 THEN 1 ELSE 0 END) > 0,
      'hasFees', SUM(CASE WHEN eo.platform_fee IS NOT NULL OR eo.commission_fee IS NOT NULL THEN 1 ELSE 0 END) > 0,
      'orderCount', COUNT(DISTINCT eo.id)
    )
  ) INTO v_result
  FROM external_orders eo
  LEFT JOIN (
    SELECT external_order_id, SUM(total_cogs) as total_cogs
    FROM external_order_items
    WHERE tenant_id = p_tenant_id
    GROUP BY external_order_id
  ) eoi_agg ON eoi_agg.external_order_id = eo.id
  WHERE eo.tenant_id = p_tenant_id
    AND eo.order_date >= p_start_date
    AND eo.order_date <= p_end_date;
    
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_control_tower_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fdp_period_summary(UUID, DATE, DATE) TO authenticated;

-- 4. Create view refresh tracking table
CREATE TABLE IF NOT EXISTS public.view_refresh_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  view_name TEXT NOT NULL,
  triggered_by TEXT,
  queued_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error_message TEXT
);

-- Create index for efficient deduplication
CREATE INDEX IF NOT EXISTS idx_refresh_queue_pending 
  ON view_refresh_queue(tenant_id, view_name) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.view_refresh_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies using tenant_users table
CREATE POLICY "Tenant isolation for refresh queue" ON public.view_refresh_queue
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- 5. Create trigger function for auto-queueing refreshes
CREATE OR REPLACE FUNCTION public.trigger_queue_view_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Queue FDP views refresh when orders change
  IF TG_TABLE_NAME = 'external_orders' THEN
    INSERT INTO view_refresh_queue (tenant_id, view_name, triggered_by)
    SELECT 
      COALESCE(NEW.tenant_id, OLD.tenant_id), 
      'fdp_daily_metrics', 
      'external_orders_' || TG_OP
    WHERE NOT EXISTS (
      SELECT 1 FROM view_refresh_queue 
      WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
        AND view_name = 'fdp_daily_metrics'
        AND status = 'pending'
    );
  END IF;
  
  -- Queue CDP views refresh when CDP orders change
  IF TG_TABLE_NAME = 'cdp_orders' THEN
    INSERT INTO view_refresh_queue (tenant_id, view_name, triggered_by)
    SELECT 
      COALESCE(NEW.tenant_id, OLD.tenant_id), 
      'cdp_customer_metrics', 
      'cdp_orders_' || TG_OP
    WHERE NOT EXISTS (
      SELECT 1 FROM view_refresh_queue 
      WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
        AND view_name = 'cdp_customer_metrics'
        AND status = 'pending'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Create triggers on source tables
DROP TRIGGER IF EXISTS trg_orders_queue_refresh ON external_orders;
CREATE TRIGGER trg_orders_queue_refresh
  AFTER INSERT OR UPDATE OR DELETE ON external_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_queue_view_refresh();

DROP TRIGGER IF EXISTS trg_cdp_orders_queue_refresh ON cdp_orders;
CREATE TRIGGER trg_cdp_orders_queue_refresh
  AFTER INSERT OR UPDATE OR DELETE ON cdp_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_queue_view_refresh();