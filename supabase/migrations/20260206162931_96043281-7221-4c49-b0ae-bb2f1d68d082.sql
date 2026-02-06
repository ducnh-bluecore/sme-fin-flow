-- Add unique constraint for refund deduplication during backfill
ALTER TABLE public.cdp_refunds ADD CONSTRAINT cdp_refunds_tenant_refund_key UNIQUE (tenant_id, refund_key);