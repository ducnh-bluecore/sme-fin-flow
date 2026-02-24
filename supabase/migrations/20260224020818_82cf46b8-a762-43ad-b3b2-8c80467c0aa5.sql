
-- Add demand_space column to inv_family_codes
ALTER TABLE public.inv_family_codes 
ADD COLUMN IF NOT EXISTS demand_space text;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_inv_family_codes_demand_space 
ON public.inv_family_codes(demand_space) WHERE demand_space IS NOT NULL;

COMMENT ON COLUMN public.inv_family_codes.demand_space IS 'Demand space classification: EverydayComfort, Occasion, FestiveCultutal, LuxuryParty';
