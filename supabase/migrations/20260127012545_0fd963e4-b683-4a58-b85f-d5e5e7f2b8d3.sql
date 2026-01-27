
-- ============================================================================
-- MIGRATION: Add Platform Ads & Demographics Support + Feed E2E Test Data
-- ============================================================================

-- 1. Thêm cột platform ads metrics vào promotion_campaigns (nếu chưa có)
ALTER TABLE promotion_campaigns 
  ADD COLUMN IF NOT EXISTS platform_icon TEXT DEFAULT 'generic',
  ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cvr NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpm NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpc NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpa NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roas NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acos NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS add_to_cart INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atc_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS relevance_score INTEGER DEFAULT 0;

-- 2. Thêm demographics vào cdp_customers
ALTER TABLE cdp_customers
  ADD COLUMN IF NOT EXISTS age_range TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT,
  ADD COLUMN IF NOT EXISTS primary_device TEXT DEFAULT 'mobile';

-- 3. Tạo bảng platform_ads_daily để track daily ads performance
CREATE TABLE IF NOT EXISTS platform_ads_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- shopee, lazada, tiktok, meta, google
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Budget & Spend
  spend_today NUMERIC DEFAULT 0,
  spend_mtd NUMERIC DEFAULT 0,
  budget_month NUMERIC DEFAULT 0,
  budget_utilization NUMERIC(5,2) DEFAULT 0,
  
  -- Performance Metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  checkouts INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  
  -- Calculated Metrics
  cpm NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  ctr NUMERIC(5,2) DEFAULT 0,
  cvr NUMERIC(5,2) DEFAULT 0,
  atc_rate NUMERIC(5,2) DEFAULT 0,
  checkout_rate NUMERIC(5,2) DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  roas NUMERIC(5,2) DEFAULT 0,
  acos NUMERIC(5,2) DEFAULT 0,
  
  -- Quality Scores
  quality_score INTEGER,
  relevance_score INTEGER,
  
  -- Trends (vs previous period)
  spend_trend NUMERIC(5,2) DEFAULT 0,
  cpa_trend NUMERIC(5,2) DEFAULT 0,
  roas_trend NUMERIC(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, platform, report_date)
);

-- RLS cho platform_ads_daily
ALTER TABLE platform_ads_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant platform ads"
ON platform_ads_daily FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 4. Tạo bảng risk_scores để track risk radar
CREATE TABLE IF NOT EXISTS risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Risk Categories (0-100 scale)
  liquidity_score INTEGER DEFAULT 50 CHECK (liquidity_score >= 0 AND liquidity_score <= 100),
  credit_score INTEGER DEFAULT 50 CHECK (credit_score >= 0 AND credit_score <= 100),
  market_score INTEGER DEFAULT 50 CHECK (market_score >= 0 AND market_score <= 100),
  operational_score INTEGER DEFAULT 50 CHECK (operational_score >= 0 AND operational_score <= 100),
  
  -- Overall composite score
  overall_score INTEGER DEFAULT 50,
  
  -- Calculation metadata
  calculation_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, score_date)
);

ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant risk scores"
ON risk_scores FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 5. Tạo index cho performance
CREATE INDEX IF NOT EXISTS idx_platform_ads_daily_tenant_date 
ON platform_ads_daily(tenant_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_risk_scores_tenant_date 
ON risk_scores(tenant_id, score_date DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_expenses_tenant_date 
ON marketing_expenses(tenant_id, expense_date DESC);
