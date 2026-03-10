CREATE OR REPLACE FUNCTION public.tenant_upsert_jsonb(
  p_tenant_id uuid,
  p_table_name text,
  p_rows jsonb,
  p_conflict_columns text[]
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema text;
  v_cols text[];
  v_col text;
  v_insert_cols text;
  v_select_cols text;
  v_update_cols text;
  v_conflict_cols text;
  v_count integer;
  v_first_row jsonb;
  v_allowed_tables text[] := ARRAY[
    'products', 'cdp_customers', 'cdp_orders', 'cdp_order_items', 
    'cdp_refunds', 'cdp_payments', 'cdp_fulfillments',
    'ad_spend_daily', 'promotion_campaigns', 
    'inventory_movements', 'inventory_snapshots'
  ];
BEGIN
  -- Validate table name (whitelist)
  IF NOT (p_table_name = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'Table "%" is not allowed for tenant upsert', p_table_name;
  END IF;

  -- Determine tenant schema
  SELECT CASE 
    WHEN schema_provisioned THEN 'tenant_' || replace(slug, '-', '_')
    ELSE 'public'
  END INTO v_schema
  FROM tenants WHERE id = p_tenant_id;

  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
  END IF;

  -- Verify schema exists if not public
  IF v_schema != 'public' THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = v_schema) THEN
      RAISE EXCEPTION 'Schema "%" does not exist for tenant %', v_schema, p_tenant_id;
    END IF;
  END IF;

  -- Extract column names from first row
  v_first_row := p_rows->0;
  IF v_first_row IS NULL THEN
    RETURN 0;
  END IF;

  SELECT array_agg(k) INTO v_cols FROM jsonb_object_keys(v_first_row) AS k;

  -- Build column lists
  v_insert_cols := array_to_string(
    ARRAY(SELECT format('%I', c) FROM unnest(v_cols) AS c), ', '
  );

  v_select_cols := array_to_string(
    ARRAY(SELECT format(
      'CASE WHEN r->>%L IS NOT NULL THEN (r->>%L)::%s ELSE NULL END',
      c, c,
      CASE 
        WHEN c IN ('tenant_id', 'order_id', 'customer_id', 'product_id', 'id', 'integration_id', 'gl_account_id') THEN 'uuid'
        WHEN c IN ('cost_price', 'selling_price', 'current_stock', 'quantity', 'unit_price', 'total_price',
                   'subtotal', 'total_amount', 'tax_amount', 'discount_amount', 'shipping_amount', 'net_amount',
                   'payment_amount', 'refund_amount', 'amount', 'expense', 'impressions', 'clicks', 'conversions',
                   'cpc', 'ctr', 'budget', 'actual_spend', 'revenue_attributed',
                   'broad_conversions', 'broad_order_amount', 'direct_conversions', 'direct_order_amount',
                   'opening_qty', 'closing_qty', 'movement_qty', 'snapshot_qty', 'snapshot_value',
                   'begin_stock', 'purchase_qty', 'sold_qty', 'return_qty', 
                   'transfer_in_qty', 'transfer_out_qty', 'end_stock',
                   'net_revenue', 'cost_amount', 'on_hand', 'reserved', 'available',
                   'total_spent', 'avg_order_value') THEN 'numeric'
        WHEN c IN ('is_active', 'is_cod', 'is_first_order', 'is_verified', 'is_marketplace') THEN 'boolean'
        WHEN c IN ('order_number', 'total_orders', 'total_items', 'item_count', 'order_count') THEN 'integer'
        WHEN c IN ('order_date', 'payment_date', 'refund_date', 'fulfilled_at', 'shipped_at', 'delivered_at',
                   'created_at', 'updated_at', 'source_created_at', 'source_updated_at', 'first_order_date', 'last_order_date',
                   'spend_date', 'start_date', 'end_date', 'movement_date', 'snapshot_date') THEN 'timestamptz'
        ELSE 'text'
      END
    ) FROM unnest(v_cols) AS c), ', '
  );

  v_conflict_cols := array_to_string(
    ARRAY(SELECT format('%I', c) FROM unnest(p_conflict_columns) AS c), ', '
  );

  -- Build UPDATE SET clause (exclude conflict columns)
  v_update_cols := array_to_string(
    ARRAY(
      SELECT format('%I = EXCLUDED.%I', c, c)
      FROM unnest(v_cols) AS c
      WHERE NOT (c = ANY(p_conflict_columns))
    ), ', '
  );

  -- Execute dynamic upsert
  EXECUTE format(
    'INSERT INTO %I.%I (%s) SELECT %s FROM jsonb_array_elements($1) AS r ON CONFLICT (%s) DO UPDATE SET %s',
    v_schema, p_table_name,
    v_insert_cols,
    v_select_cols,
    v_conflict_cols,
    v_update_cols
  ) USING p_rows;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RAISE NOTICE '[tenant_upsert_jsonb] Upserted % rows into %.% for tenant %', v_count, v_schema, p_table_name, p_tenant_id;
  
  RETURN v_count;
END;
$$;