-- Add onboarding columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  onboarding_status TEXT DEFAULT 'pending';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  user_role TEXT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  onboarding_completed_at TIMESTAMPTZ;

-- Add onboarding columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  onboarding_status TEXT DEFAULT 'pending';

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  industry TEXT;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  company_scale TEXT;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  monthly_revenue_range TEXT;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  data_sources JSONB DEFAULT '[]'::jsonb;

-- Add check constraints separately (safer approach)
DO $$
BEGIN
  -- Profile onboarding_status constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_onboarding_status_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_onboarding_status_check 
      CHECK (onboarding_status IN ('pending', 'platform_done', 'completed', 'skipped'));
  END IF;
  
  -- Profile user_role constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_role_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_role_check 
      CHECK (user_role IS NULL OR user_role IN ('ceo', 'cfo', 'cmo', 'coo', 'marketer', 'accountant', 'admin'));
  END IF;
  
  -- Tenant onboarding_status constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_onboarding_status_check'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_onboarding_status_check 
      CHECK (onboarding_status IN ('pending', 'in_progress', 'completed', 'skipped'));
  END IF;
  
  -- Tenant company_scale constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_company_scale_check'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_company_scale_check 
      CHECK (company_scale IS NULL OR company_scale IN ('startup', 'sme', 'enterprise'));
  END IF;
END $$;

-- Create index for faster onboarding status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status ON profiles(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_status ON tenants(onboarding_status);