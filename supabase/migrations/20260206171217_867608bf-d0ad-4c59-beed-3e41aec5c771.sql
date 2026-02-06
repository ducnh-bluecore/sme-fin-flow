-- Create cdp_fulfillments L2 Master Model table for e-commerce fulfillment/shipping tracking
CREATE TABLE public.cdp_fulfillments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  fulfillment_key TEXT NOT NULL,
  order_key TEXT,
  channel TEXT,
  tracking_number TEXT,
  shipping_carrier TEXT,
  fulfillment_status TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cdp_fulfillments_tenant_fulfillment_key UNIQUE (tenant_id, fulfillment_key)
);

ALTER TABLE public.cdp_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on cdp_fulfillments"
  ON public.cdp_fulfillments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_cdp_fulfillments_tenant_order ON public.cdp_fulfillments(tenant_id, order_key);
CREATE INDEX idx_cdp_fulfillments_channel ON public.cdp_fulfillments(tenant_id, channel);