-- Fix function: use customer_id with join to customers table
DROP FUNCTION IF EXISTS public.detect_real_alerts(uuid);

CREATE OR REPLACE FUNCTION public.detect_real_alerts(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_rows integer := 0;
  v_now timestamp with time zone := now();
BEGIN
  -- Clear old active alerts for this tenant (we regenerate fresh)
  DELETE FROM alert_instances 
  WHERE tenant_id = p_tenant_id 
    AND status = 'active'
    AND created_at < v_now - interval '1 hour';

  -- 1. LOW MARGIN SKUs (margin < 5%) from product_metrics
  INSERT INTO alert_instances (
    tenant_id, alert_type, category, severity, title, message,
    object_name, object_type, current_value, threshold_value,
    impact_amount, status, created_at
  )
  SELECT 
    p_tenant_id,
    'low_margin',
    'product',
    CASE 
      WHEN pm.gross_margin_percent < 0 THEN 'critical'
      WHEN pm.gross_margin_percent < 5 THEN 'warning'
      ELSE 'info'
    END,
    'Margin thấp: ' || COALESCE(pm.product_name, pm.sku),
    pm.sku || ': Margin ' || ROUND(COALESCE(pm.gross_margin_percent, 0)::numeric, 1) || '%. ' ||
    'Doanh thu 30d: ' || COALESCE(pm.total_revenue_30d, 0)::text,
    COALESCE(pm.product_name, pm.sku),
    'product',
    COALESCE(pm.gross_margin_percent, 0),
    5,
    ABS(COALESCE(pm.gross_profit_30d, 0)),
    'active',
    v_now
  FROM product_metrics pm
  WHERE pm.tenant_id = p_tenant_id
    AND pm.total_quantity_30d > 0
    AND COALESCE(pm.gross_margin_percent, 100) < 5
  LIMIT 20;
  
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- 2. OVERDUE AR from invoices (join with customers for name)
  INSERT INTO alert_instances (
    tenant_id, alert_type, category, severity, title, message,
    object_name, object_type, current_value, threshold_value,
    impact_amount, status, created_at
  )
  SELECT 
    p_tenant_id,
    'overdue_ar',
    'finance',
    CASE 
      WHEN (CURRENT_DATE - i.due_date) > 30 THEN 'critical'
      WHEN (CURRENT_DATE - i.due_date) > 14 THEN 'warning'
      ELSE 'info'
    END,
    'Công nợ quá hạn: ' || i.invoice_number,
    'Khách: ' || COALESCE(c.name, 'N/A') || '. Quá hạn ' || 
    (CURRENT_DATE - i.due_date) || ' ngày. Số tiền: ' || i.total_amount::text,
    i.invoice_number,
    'invoice',
    (CURRENT_DATE - i.due_date),
    0,
    i.total_amount - COALESCE(i.paid_amount, 0),
    'active',
    v_now
  FROM invoices i
  LEFT JOIN customers c ON c.id = i.customer_id AND c.tenant_id = i.tenant_id
  WHERE i.tenant_id = p_tenant_id
    AND i.status IN ('sent', 'partial', 'overdue')
    AND i.due_date < CURRENT_DATE
    AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
  ORDER BY (i.total_amount - COALESCE(i.paid_amount, 0)) DESC
  LIMIT 20;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- 3. LOW CASH WARNING from bank_accounts
  INSERT INTO alert_instances (
    tenant_id, alert_type, category, severity, title, message,
    object_name, object_type, current_value, threshold_value,
    impact_amount, status, created_at
  )
  SELECT 
    p_tenant_id,
    'low_cash',
    'finance',
    CASE 
      WHEN total_cash < 10000000 THEN 'critical'
      WHEN total_cash < 50000000 THEN 'warning'
      ELSE 'info'
    END,
    'Cảnh báo tiền mặt thấp',
    'Tổng số dư: ' || total_cash::text || ' VND.',
    'Cash Position',
    'cash',
    total_cash,
    50000000,
    50000000 - total_cash,
    'active',
    v_now
  FROM (
    SELECT COALESCE(SUM(current_balance), 0) AS total_cash
    FROM bank_accounts
    WHERE tenant_id = p_tenant_id
      AND status = 'active'
  ) cash_summary
  WHERE total_cash < 50000000;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- 4. PENDING BILLS (Unpaid vendor bills)
  INSERT INTO alert_instances (
    tenant_id, alert_type, category, severity, title, message,
    object_name, object_type, current_value, threshold_value,
    impact_amount, status, created_at
  )
  SELECT 
    p_tenant_id,
    'pending_bill',
    'finance',
    CASE 
      WHEN (CURRENT_DATE - b.due_date) > 14 THEN 'critical'
      WHEN (CURRENT_DATE - b.due_date) > 7 THEN 'warning'
      ELSE 'info'
    END,
    'Hóa đơn NCC: ' || b.bill_number,
    'NCC: ' || COALESCE(v.name, 'N/A') || '. Hạn: ' || b.due_date::text ||
    '. Nợ: ' || (b.total_amount - COALESCE(b.paid_amount, 0))::text,
    b.bill_number,
    'bill',
    (CURRENT_DATE - b.due_date),
    0,
    b.total_amount - COALESCE(b.paid_amount, 0),
    'active',
    v_now
  FROM bills b
  LEFT JOIN vendors v ON v.id = b.vendor_id AND v.tenant_id = b.tenant_id
  WHERE b.tenant_id = p_tenant_id
    AND b.status IN ('pending', 'approved', 'partial')
    AND b.due_date <= CURRENT_DATE + interval '7 days'
    AND (b.total_amount - COALESCE(b.paid_amount, 0)) > 0
  ORDER BY b.due_date ASC
  LIMIT 20;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  -- 5. HIGH RETURN RATE from external_orders
  INSERT INTO alert_instances (
    tenant_id, alert_type, category, severity, title, message,
    object_name, object_type, current_value, threshold_value,
    impact_amount, status, created_at
  )
  SELECT 
    p_tenant_id,
    'high_return_rate',
    'operations',
    CASE 
      WHEN return_rate > 10 THEN 'critical'
      WHEN return_rate > 5 THEN 'warning'
      ELSE 'info'
    END,
    'Tỷ lệ hoàn cao: ' || channel,
    'Kênh ' || channel || ': ' || return_count || '/' || total_count || ' đơn (' ||
    ROUND(return_rate::numeric, 1) || '%) trong 30 ngày.',
    channel,
    'channel',
    return_rate,
    5,
    return_value,
    'active',
    v_now
  FROM (
    SELECT 
      channel,
      COUNT(*) FILTER (WHERE status IN ('returned', 'cancelled')) AS return_count,
      COUNT(*) AS total_count,
      COALESCE(SUM(total_amount) FILTER (WHERE status IN ('returned', 'cancelled')), 0) AS return_value,
      CASE WHEN COUNT(*) > 0 
        THEN COUNT(*) FILTER (WHERE status IN ('returned', 'cancelled'))::float / COUNT(*)::float * 100
        ELSE 0
      END AS return_rate
    FROM external_orders
    WHERE tenant_id = p_tenant_id
      AND order_date >= CURRENT_DATE - interval '30 days'
    GROUP BY channel
    HAVING COUNT(*) >= 10
  ) channel_stats
  WHERE return_rate > 5;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_count := v_count + v_rows;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_real_alerts(uuid) TO authenticated;