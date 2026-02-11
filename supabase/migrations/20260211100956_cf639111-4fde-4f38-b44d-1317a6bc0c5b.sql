
-- Drop the old DATE overload that conflicts
DROP FUNCTION IF EXISTS get_sku_cost_breakdown(UUID, TEXT, DATE, DATE);
