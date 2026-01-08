-- Create BigQuery configuration table for dynamic schema mapping
CREATE TABLE IF NOT EXISTS public.bigquery_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Connection settings
  project_id TEXT NOT NULL DEFAULT 'bluecore-dcp',
  dataset_prefix TEXT NOT NULL DEFAULT 'bluecoredcp',
  
  -- Channel configurations (JSON for flexibility)
  channels JSONB NOT NULL DEFAULT '{
    "shopee": {
      "enabled": true,
      "dataset": "bluecoredcp_shopee",
      "orders_table": "shopee_Orders",
      "order_items_table": "shopee_OrderItems",
      "date_field": "create_time",
      "amount_field": "total_amount",
      "net_amount_field": "seller_income",
      "status_field": "order_status",
      "order_id_field": "order_sn"
    },
    "lazada": {
      "enabled": true,
      "dataset": "bluecoredcp_lazada",
      "orders_table": "lazada_Orders",
      "order_items_table": "lazada_OrderItems",
      "date_field": "created_at",
      "amount_field": "price",
      "net_amount_field": "price",
      "status_field": "statuses_0",
      "order_id_field": "order_id"
    },
    "tiktok": {
      "enabled": false,
      "dataset": "bluecoredcp_tiktokshop",
      "orders_table": "tiktok_Orders",
      "order_items_table": "tiktok_OrderItems",
      "date_field": "create_time",
      "amount_field": "total_amount",
      "net_amount_field": "seller_revenue",
      "status_field": "order_status",
      "order_id_field": "order_id"
    }
  }'::jsonb,
  
  -- Additional custom field mappings
  custom_mappings JSONB DEFAULT '{}',
  
  -- Cache settings
  cache_ttl_minutes INTEGER DEFAULT 15,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.bigquery_configs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their tenant's BigQuery config"
ON public.bigquery_configs FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Owners can manage their tenant's BigQuery config"
ON public.bigquery_configs FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_bigquery_configs_updated_at
BEFORE UPDATE ON public.bigquery_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index
CREATE INDEX idx_bigquery_configs_tenant ON public.bigquery_configs(tenant_id);