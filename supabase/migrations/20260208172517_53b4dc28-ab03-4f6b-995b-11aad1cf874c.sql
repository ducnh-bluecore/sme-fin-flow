
-- Seed ai_semantic_models
INSERT INTO public.ai_semantic_models (entity_type, schema_version, columns, relationships, is_active) VALUES
('order', '1.4.2',
  '[{"name":"order_key","type":"text","description":"Unique order identifier"},{"name":"channel","type":"text","description":"Sales channel: shopee, lazada, tiktok_shop, tiki, kiotviet"},{"name":"status","type":"text","description":"Order status: completed, cancelled, refunded, pending"},{"name":"order_at","type":"timestamptz","description":"Order creation timestamp"},{"name":"gross_revenue","type":"numeric","description":"Gross revenue before deductions"},{"name":"net_revenue","type":"numeric","description":"Net revenue after fees/discounts"},{"name":"customer_name","type":"text","description":"Customer name"},{"name":"buyer_id","type":"text","description":"External customer ID from source"},{"name":"customer_phone","type":"text","description":"Customer phone"},{"name":"shipping_fee","type":"numeric","description":"Shipping fee"},{"name":"platform_discount","type":"numeric","description":"Platform discount"},{"name":"seller_discount","type":"numeric","description":"Seller discount"}]'::jsonb,
  '[{"entity":"customer","join_key":"buyer_id","target_key":"external_ids","type":"many_to_one"},{"entity":"kpi_fact","derived_from":true}]'::jsonb, true),
('customer', '1.4.2',
  '[{"name":"name","type":"text","description":"Customer full name"},{"name":"phone","type":"text","description":"Phone"},{"name":"email","type":"text","description":"Email"},{"name":"acquisition_source","type":"text","description":"Source: kiotviet, haravan, bluecore"},{"name":"lifetime_value","type":"numeric","description":"Total lifetime revenue"},{"name":"external_ids","type":"jsonb","description":"Source system ID map"},{"name":"first_order_at","type":"timestamptz","description":"First order date"},{"name":"last_order_at","type":"timestamptz","description":"Last order date"},{"name":"order_count","type":"integer","description":"Total orders"}]'::jsonb,
  '[{"entity":"order","join_key":"external_ids","target_key":"buyer_id","type":"one_to_many"}]'::jsonb, true),
('product', '1.4.2',
  '[{"name":"sku","type":"text","description":"SKU code"},{"name":"name","type":"text","description":"Product name"},{"name":"selling_price","type":"numeric","description":"Selling price"},{"name":"cost_price","type":"numeric","description":"Cost price"},{"name":"current_stock","type":"integer","description":"Current stock"},{"name":"category","type":"text","description":"Category"},{"name":"is_active","type":"boolean","description":"Active status"}]'::jsonb,
  '[{"entity":"order","via":"cdp_order_items","join_key":"product_id","type":"many_to_many"}]'::jsonb, true),
('kpi_fact', '1.4.2',
  '[{"name":"grain_date","type":"date","description":"Metric date"},{"name":"metric_code","type":"text","description":"Metric: NET_REVENUE, ORDER_COUNT, AOV, COGS, GROSS_MARGIN, ROAS, CPA"},{"name":"value","type":"numeric","description":"Metric value"},{"name":"dimension_type","type":"text","description":"Dimension: channel, total, campaign"},{"name":"dimension_value","type":"text","description":"Dimension value"},{"name":"period_type","type":"text","description":"Period: daily, weekly, monthly"},{"name":"comparison_value","type":"numeric","description":"Previous period value"}]'::jsonb,
  '[{"entity":"order","derived_from":true,"description":"Aggregated via compute_kpi_facts_daily()"}]'::jsonb, true)
ON CONFLICT (entity_type) DO UPDATE SET columns = EXCLUDED.columns, relationships = EXCLUDED.relationships, schema_version = EXCLUDED.schema_version;

-- Seed ai_dimension_catalog
CREATE TABLE IF NOT EXISTS public.ai_dimension_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_name text NOT NULL UNIQUE,
  dimension_type text NOT NULL DEFAULT 'string',
  possible_values jsonb,
  description text,
  source_table text,
  source_column text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_dimension_catalog ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_dimension_catalog' AND policyname='ai_dim_read') THEN
    CREATE POLICY "ai_dim_read" ON public.ai_dimension_catalog FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO public.ai_dimension_catalog (dimension_name, dimension_type, possible_values, description, source_table, source_column) VALUES
('channel','string','["shopee","lazada","tiktok_shop","tiki","kiotviet"]'::jsonb,'Sales channel','cdp_orders','channel'),
('order_status','string','["completed","cancelled","refunded","pending"]'::jsonb,'Order status','cdp_orders','status'),
('metric_code','string','["NET_REVENUE","ORDER_COUNT","AOV","COGS","GROSS_MARGIN","ROAS","CPA","AD_SPEND","RETURN_RATE","NEW_CUSTOMERS","REPEAT_RATE","LTV"]'::jsonb,'KPI metric','kpi_facts_daily','metric_code'),
('dimension_type','string','["channel","total","campaign","category","region"]'::jsonb,'KPI dimension','kpi_facts_daily','dimension_type'),
('period_type','string','["daily","weekly","monthly"]'::jsonb,'Aggregation period','kpi_facts_daily','period_type'),
('acquisition_source','string','["kiotviet","haravan","bluecore","shopee","lazada","tiktok"]'::jsonb,'Customer source','cdp_customers','acquisition_source'),
('expense_category','string','["cogs","marketing","operations","logistics","salary","rent","utilities","other"]'::jsonb,'Expense type','expenses','category'),
('alert_severity','string','["critical","high","medium","low","info"]'::jsonb,'Alert severity','alert_instances','severity'),
('alert_category','string','["revenue","margin","cash","customer","marketing","operations","inventory"]'::jsonb,'Alert category','alert_instances','category'),
('product_category','string','[]'::jsonb,'Product category','products','category'),
('payment_method','string','["cod","bank_transfer","e_wallet","credit_card"]'::jsonb,'Payment method','cdp_orders','payment_method'),
('customer_segment','string','["new","returning","vip","churned","at_risk"]'::jsonb,'Customer segment','cdp_customers','segment')
ON CONFLICT (dimension_name) DO UPDATE SET possible_values = EXCLUDED.possible_values, description = EXCLUDED.description;

-- Seed ai_query_templates
INSERT INTO public.ai_query_templates (intent_pattern, category, sql_template, required_tables, parameters, is_active) VALUES
('doanh thu theo kênh|revenue by channel','revenue','SELECT dimension_value AS channel, value AS net_revenue, comparison_value AS prev_value FROM kpi_facts_daily WHERE tenant_id = $1 AND metric_code = ''NET_REVENUE'' AND dimension_type = ''channel'' AND grain_date = (SELECT MAX(grain_date) FROM kpi_facts_daily WHERE tenant_id = $1) ORDER BY value DESC',ARRAY['kpi_facts_daily'],'{"$1":"tenant_id"}'::jsonb,true),
('top SKU|sản phẩm bán chạy','product','SELECT p.sku, p.name, SUM(oi.line_revenue) AS revenue, SUM(oi.qty) AS qty FROM cdp_order_items oi JOIN products p ON p.id=oi.product_id JOIN cdp_orders o ON o.id=oi.order_id WHERE o.tenant_id=$1 AND o.status=''completed'' AND o.order_at>=NOW()-INTERVAL ''30 days'' GROUP BY p.sku,p.name ORDER BY revenue DESC LIMIT 20',ARRAY['cdp_order_items','products','cdp_orders'],'{"$1":"tenant_id"}'::jsonb,true),
('khách hàng mới|new customers','customer','SELECT DATE_TRUNC(''month'',created_at) AS month, COUNT(*) AS new_customers FROM cdp_customers WHERE tenant_id=$1 AND created_at>=NOW()-INTERVAL ''6 months'' GROUP BY month ORDER BY month',ARRAY['cdp_customers'],'{"$1":"tenant_id"}'::jsonb,true),
('ROAS|hiệu quả quảng cáo','marketing','SELECT dimension_value AS campaign, value AS roas FROM kpi_facts_daily WHERE tenant_id=$1 AND metric_code=''ROAS'' AND dimension_type=''campaign'' AND grain_date>=NOW()-INTERVAL ''7 days'' ORDER BY value DESC',ARRAY['kpi_facts_daily'],'{"$1":"tenant_id"}'::jsonb,true),
('xu hướng doanh thu|revenue trend','revenue','SELECT grain_date, value AS net_revenue FROM kpi_facts_daily WHERE tenant_id=$1 AND metric_code=''NET_REVENUE'' AND dimension_type=''total'' AND period_type=''daily'' AND grain_date>=NOW()-INTERVAL ''30 days'' ORDER BY grain_date',ARRAY['kpi_facts_daily'],'{"$1":"tenant_id"}'::jsonb,true),
('tổng quan hôm nay|daily summary','overview','SELECT metric_code, value, comparison_value FROM kpi_facts_daily WHERE tenant_id=$1 AND grain_date=CURRENT_DATE AND dimension_type=''total'' ORDER BY metric_code',ARRAY['kpi_facts_daily'],'{"$1":"tenant_id"}'::jsonb,true),
('cảnh báo|active alerts','alert','SELECT alert_type, category, severity, impact_amount, impact_description, deadline_at FROM alert_instances WHERE tenant_id=$1 AND status IN (''open'',''in_progress'') ORDER BY CASE severity WHEN ''critical'' THEN 1 WHEN ''high'' THEN 2 ELSE 3 END LIMIT 10',ARRAY['alert_instances'],'{"$1":"tenant_id"}'::jsonb,true),
('chi phí quảng cáo|ad spend','marketing','SELECT channel, SUM(expense) AS spend, SUM(conversions) AS conversions, CASE WHEN SUM(expense)>0 THEN ROUND(SUM(direct_order_amount)/SUM(expense),2) ELSE 0 END AS roas FROM ad_spend_daily WHERE tenant_id=$1 AND spend_date>=NOW()-INTERVAL ''30 days'' GROUP BY channel ORDER BY spend DESC',ARRAY['ad_spend_daily'],'{"$1":"tenant_id"}'::jsonb,true),
('gross margin|biên lợi nhuận','margin','SELECT dimension_value AS channel, value AS margin_pct FROM kpi_facts_daily WHERE tenant_id=$1 AND metric_code=''GROSS_MARGIN'' AND dimension_type=''channel'' AND grain_date=(SELECT MAX(grain_date) FROM kpi_facts_daily WHERE tenant_id=$1 AND metric_code=''GROSS_MARGIN'') ORDER BY value DESC',ARRAY['kpi_facts_daily'],'{"$1":"tenant_id"}'::jsonb,true),
('tồn kho thấp|low stock','inventory','SELECT sku, name, current_stock, selling_price FROM products WHERE tenant_id=$1 AND is_active=true AND current_stock<10 ORDER BY current_stock LIMIT 20',ARRAY['products'],'{"$1":"tenant_id"}'::jsonb,true)
ON CONFLICT (intent_pattern) DO UPDATE SET sql_template=EXCLUDED.sql_template, required_tables=EXCLUDED.required_tables, category=EXCLUDED.category;
