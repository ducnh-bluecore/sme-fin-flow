-- Create function to count unique active customers in a date range
-- This avoids the 1000 row limit issue when using Supabase client
CREATE OR REPLACE FUNCTION cdp_count_active_customers(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT customer_id)::INTEGER
  FROM cdp_orders
  WHERE tenant_id = p_tenant_id
    AND order_at::DATE >= p_start_date
    AND order_at::DATE <= p_end_date;
$$;