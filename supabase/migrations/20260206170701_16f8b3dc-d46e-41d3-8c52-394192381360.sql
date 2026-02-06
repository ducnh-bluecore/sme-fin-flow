-- Create cdp_payments L2 Master Model table for e-commerce payment tracking
CREATE TABLE public.cdp_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  payment_key TEXT NOT NULL,
  order_key TEXT,
  channel TEXT,
  payment_method TEXT,
  payment_status TEXT,
  amount NUMERIC DEFAULT 0,
  paid_at TIMESTAMPTZ,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cdp_payments_tenant_payment_key UNIQUE (tenant_id, payment_key)
);

-- Enable RLS
ALTER TABLE public.cdp_payments ENABLE ROW LEVEL SECURITY;

-- RLS: service role / admin only (backfill runs as service role)
CREATE POLICY "Service role full access on cdp_payments"
  ON public.cdp_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for lookups
CREATE INDEX idx_cdp_payments_tenant_order ON public.cdp_payments(tenant_id, order_key);
CREATE INDEX idx_cdp_payments_channel ON public.cdp_payments(tenant_id, channel);