-- Fix upsert key for external_order_items (used by sync-bigquery)
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_order_items_tenant_order_item
ON public.external_order_items (tenant_id, external_order_id, item_id);
