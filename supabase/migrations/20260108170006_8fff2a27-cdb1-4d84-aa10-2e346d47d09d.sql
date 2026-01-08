-- Add Cash Flow Direct parameters to formula_settings
ALTER TABLE public.formula_settings
ADD COLUMN IF NOT EXISTS operating_cash_ratio_target numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS cash_burn_rate_warning numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS cash_burn_rate_critical numeric DEFAULT 25,
ADD COLUMN IF NOT EXISTS minimum_operating_cash numeric DEFAULT 500000000,
ADD COLUMN IF NOT EXISTS investing_budget_percentage numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS financing_debt_ratio_max numeric DEFAULT 60,

-- Inventory Aging parameters
ADD COLUMN IF NOT EXISTS inventory_slow_moving_days numeric DEFAULT 90,
ADD COLUMN IF NOT EXISTS inventory_dead_stock_days numeric DEFAULT 180,
ADD COLUMN IF NOT EXISTS inventory_target_turnover numeric DEFAULT 6,
ADD COLUMN IF NOT EXISTS inventory_holding_cost_rate numeric DEFAULT 25,

-- Promotion ROI parameters  
ADD COLUMN IF NOT EXISTS promotion_min_roi numeric DEFAULT 200,
ADD COLUMN IF NOT EXISTS promotion_target_roas numeric DEFAULT 4,
ADD COLUMN IF NOT EXISTS promotion_max_discount_rate numeric DEFAULT 50,

-- Supplier Payment parameters
ADD COLUMN IF NOT EXISTS supplier_early_payment_threshold numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS supplier_concentration_warning numeric DEFAULT 30,
ADD COLUMN IF NOT EXISTS supplier_payment_compliance_target numeric DEFAULT 95;