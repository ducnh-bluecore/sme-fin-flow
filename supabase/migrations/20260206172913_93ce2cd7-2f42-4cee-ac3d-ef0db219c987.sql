
-- Create ad_spend_daily table for daily ad spend metrics from Shopee Ads
CREATE TABLE public.ad_spend_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  spend_date DATE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'shopee_ads',
  campaign_id TEXT,
  campaign_name TEXT,
  ad_id TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  expense NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  direct_order_amount NUMERIC DEFAULT 0,
  broad_order_amount NUMERIC DEFAULT 0,
  direct_conversions INTEGER DEFAULT 0,
  broad_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, channel, spend_date, campaign_id, ad_id)
);

-- RLS
ALTER TABLE public.ad_spend_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.ad_spend_daily
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_ad_spend_daily_tenant_date ON public.ad_spend_daily(tenant_id, spend_date);
CREATE INDEX idx_ad_spend_daily_campaign ON public.ad_spend_daily(tenant_id, campaign_id);
