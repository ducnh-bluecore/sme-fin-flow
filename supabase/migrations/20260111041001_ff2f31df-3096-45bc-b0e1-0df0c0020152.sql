-- ============================================
-- 1. Add store-specific columns to alert_objects
-- ============================================

ALTER TABLE public.alert_objects 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS manager_name TEXT,
ADD COLUMN IF NOT EXISTS open_hours TEXT;

-- ============================================
-- 2. Create unique index for upsert to work (must exist before trigger)
-- ============================================

DROP INDEX IF EXISTS idx_alert_objects_tenant_external_id;
CREATE UNIQUE INDEX idx_alert_objects_tenant_external_id 
ON public.alert_objects (tenant_id, external_id) 
WHERE external_id IS NOT NULL;

-- ============================================
-- 3. Create trigger function to sync external_products to alert_objects
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_external_product_to_alert_object()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update alert_object for the external product
  INSERT INTO public.alert_objects (
    tenant_id,
    object_type,
    object_name,
    external_id,
    object_category,
    object_data,
    is_monitored,
    current_metrics,
    synced_at
  )
  VALUES (
    NEW.tenant_id,
    'product',
    NEW.name,
    NEW.id::text,
    COALESCE(NEW.category, 'Uncategorized'),
    jsonb_build_object(
      'sku', NEW.external_sku,
      'barcode', NEW.barcode,
      'cost_price', NEW.cost_price,
      'selling_price', NEW.selling_price,
      'stock_quantity', NEW.stock_quantity,
      'brand', NEW.brand
    ),
    true,
    jsonb_build_object(
      'stock_quantity', NEW.stock_quantity,
      'selling_price', NEW.selling_price
    ),
    now()
  )
  ON CONFLICT (tenant_id, external_id) WHERE external_id IS NOT NULL
  DO UPDATE SET
    object_name = EXCLUDED.object_name,
    object_category = EXCLUDED.object_category,
    object_data = EXCLUDED.object_data,
    current_metrics = EXCLUDED.current_metrics,
    synced_at = EXCLUDED.synced_at,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on external_products
DROP TRIGGER IF EXISTS sync_product_to_alert_object ON public.external_products;
CREATE TRIGGER sync_product_to_alert_object
AFTER INSERT OR UPDATE ON public.external_products
FOR EACH ROW
EXECUTE FUNCTION public.sync_external_product_to_alert_object();

-- ============================================
-- 4. Sync existing external_products to alert_objects (one-time migration)
-- ============================================

INSERT INTO public.alert_objects (
  tenant_id,
  object_type,
  object_name,
  external_id,
  object_category,
  object_data,
  is_monitored,
  current_metrics,
  synced_at
)
SELECT 
  ep.tenant_id,
  'product',
  ep.name,
  ep.id::text,
  COALESCE(ep.category, 'Uncategorized'),
  jsonb_build_object(
    'sku', ep.external_sku,
    'barcode', ep.barcode,
    'cost_price', ep.cost_price,
    'selling_price', ep.selling_price,
    'stock_quantity', ep.stock_quantity,
    'brand', ep.brand
  ),
  true,
  jsonb_build_object(
    'stock_quantity', ep.stock_quantity,
    'selling_price', ep.selling_price
  ),
  now()
FROM public.external_products ep
ON CONFLICT (tenant_id, external_id) WHERE external_id IS NOT NULL
DO NOTHING;

-- ============================================
-- 5. Add notification_recipients table indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notification_recipients_tenant_role 
ON public.notification_recipients (tenant_id, role);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_active 
ON public.notification_recipients (tenant_id, is_active) 
WHERE is_active = true;