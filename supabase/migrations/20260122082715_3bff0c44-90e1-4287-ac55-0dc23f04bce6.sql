
-- Simple compute function for central_metric_facts
CREATE OR REPLACE FUNCTION public.compute_central_metric_facts(
  p_tenant_id UUID,
  p_period_start DATE DEFAULT '2024-07-01'::DATE,
  p_period_end DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  -- Clear existing facts
  DELETE FROM central_metric_facts WHERE tenant_id = p_tenant_id;
  DELETE FROM central_metric_facts_summary WHERE tenant_id = p_tenant_id;

  -- SKU GRAIN
  INSERT INTO central_metric_facts (tenant_id, grain_type, grain_id, grain_name, revenue, cost, profit, margin_percent, quantity, order_count, period_start, period_end)
  SELECT p_tenant_id, 'sku', COALESCE(eoi.sku, 'UNKNOWN'), COALESCE(eoi.product_name, eoi.sku),
    SUM(COALESCE(eoi.total_amount, 0)), SUM(COALESCE(eoi.total_cogs, eoi.total_amount * 0.6)),
    SUM(COALESCE(eoi.gross_profit, eoi.total_amount * 0.4)),
    CASE WHEN SUM(eoi.total_amount) > 0 THEN SUM(COALESCE(eoi.gross_profit, 0)) / SUM(eoi.total_amount) * 100 ELSE 0 END,
    SUM(COALESCE(eoi.quantity, 1))::INT, COUNT(DISTINCT eo.id)::INT, p_period_start, p_period_end
  FROM external_order_items eoi
  JOIN external_orders eo ON eoi.external_order_id = eo.id
  WHERE eo.tenant_id = p_tenant_id AND eo.order_date BETWEEN p_period_start AND p_period_end AND eo.status NOT IN ('cancelled', 'returned')
  GROUP BY eoi.sku, eoi.product_name;

  -- CHANNEL GRAIN
  INSERT INTO central_metric_facts (tenant_id, grain_type, grain_id, grain_name, revenue, cost, profit, margin_percent, quantity, order_count, period_start, period_end)
  SELECT p_tenant_id, 'channel', COALESCE(eo.channel, 'direct'), INITCAP(COALESCE(eo.channel, 'Direct')),
    SUM(COALESCE(eo.net_revenue, eo.total_amount * 0.9)), SUM(COALESCE(eo.cost_of_goods, eo.total_amount * 0.6)),
    SUM(COALESCE(eo.gross_profit, eo.total_amount * 0.3)),
    CASE WHEN SUM(eo.total_amount) > 0 THEN SUM(COALESCE(eo.gross_profit, 0)) / SUM(eo.total_amount) * 100 ELSE 0 END,
    SUM(COALESCE(eo.total_quantity, 1))::INT, COUNT(*)::INT, p_period_start, p_period_end
  FROM external_orders eo
  WHERE eo.tenant_id = p_tenant_id AND eo.order_date BETWEEN p_period_start AND p_period_end AND eo.status NOT IN ('cancelled', 'returned')
  GROUP BY eo.channel;

  -- CATEGORY GRAIN  
  INSERT INTO central_metric_facts (tenant_id, grain_type, grain_id, grain_name, revenue, cost, profit, margin_percent, quantity, order_count, period_start, period_end)
  SELECT p_tenant_id, 'category', COALESCE(eoi.category, 'uncategorized'), INITCAP(COALESCE(eoi.category, 'Uncategorized')),
    SUM(COALESCE(eoi.total_amount, 0)), SUM(COALESCE(eoi.total_cogs, eoi.total_amount * 0.6)),
    SUM(COALESCE(eoi.gross_profit, eoi.total_amount * 0.4)),
    CASE WHEN SUM(eoi.total_amount) > 0 THEN SUM(COALESCE(eoi.gross_profit, 0)) / SUM(eoi.total_amount) * 100 ELSE 0 END,
    SUM(COALESCE(eoi.quantity, 1))::INT, COUNT(DISTINCT eo.id)::INT, p_period_start, p_period_end
  FROM external_order_items eoi
  JOIN external_orders eo ON eoi.external_order_id = eo.id
  WHERE eo.tenant_id = p_tenant_id AND eo.order_date BETWEEN p_period_start AND p_period_end AND eo.status NOT IN ('cancelled', 'returned')
  GROUP BY eoi.category;

  -- Update rankings
  UPDATE central_metric_facts f SET revenue_rank = sub.rr, profit_rank = sub.pr
  FROM (SELECT id, RANK() OVER (PARTITION BY grain_type ORDER BY revenue DESC) rr, RANK() OVER (PARTITION BY grain_type ORDER BY profit DESC) pr FROM central_metric_facts WHERE tenant_id = p_tenant_id) sub
  WHERE f.id = sub.id;

  -- Summary
  INSERT INTO central_metric_facts_summary (tenant_id, grain_type, total_items, total_revenue, total_cost, total_profit, total_quantity, total_orders, avg_margin_percent, period_start, period_end)
  SELECT p_tenant_id, grain_type, COUNT(*)::INT, SUM(revenue), SUM(cost), SUM(profit), SUM(quantity), SUM(order_count), AVG(margin_percent), p_period_start, p_period_end
  FROM central_metric_facts WHERE tenant_id = p_tenant_id GROUP BY grain_type;

  SELECT COUNT(*) INTO v_inserted FROM central_metric_facts WHERE tenant_id = p_tenant_id;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_central_metric_facts TO authenticated, service_role;

-- Run for test tenant
SELECT compute_central_metric_facts('11111111-1111-1111-1111-111111111111'::UUID);
