-- =====================================================
-- PHASE 2: CS ALERTS AUTOMATION & TRIGGER SYSTEM
-- =====================================================

-- Function to check and create CS alerts based on tenant behavior
CREATE OR REPLACE FUNCTION public.check_and_create_cs_alerts(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerts_created integer := 0;
  v_health_data record;
  v_last_activity timestamptz;
  v_last_import timestamptz;
  v_previous_health integer;
  v_modules_count integer;
  v_existing_alert_count integer;
BEGIN
  -- Get current health metrics
  SELECT * INTO v_health_data FROM get_tenant_health(p_tenant_id);
  
  IF v_health_data IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get last activity timestamp
  SELECT MAX(created_at) INTO v_last_activity
  FROM tenant_events
  WHERE tenant_id = p_tenant_id;
  
  -- Check: No login > 7 days (HIGH - inactive)
  IF v_last_activity IS NOT NULL AND v_last_activity < NOW() - INTERVAL '7 days' THEN
    SELECT COUNT(*) INTO v_existing_alert_count
    FROM cs_alerts
    WHERE tenant_id = p_tenant_id
      AND alert_type = 'inactive'
      AND status IN ('open', 'acknowledged')
      AND created_at > NOW() - INTERVAL '7 days';
    
    IF v_existing_alert_count = 0 THEN
      INSERT INTO cs_alerts (tenant_id, alert_type, severity, title, description, recommended_action, metadata)
      VALUES (
        p_tenant_id,
        'inactive',
        'high',
        'Tenant không hoạt động > 7 ngày',
        'Không có hoạt động đăng nhập hoặc sử dụng hệ thống trong hơn 7 ngày. Hoạt động cuối: ' || 
          COALESCE(TO_CHAR(v_last_activity, 'DD/MM/YYYY HH24:MI'), 'N/A'),
        'Gọi điện hoặc gửi email kiểm tra tình hình sử dụng. Hỏi về khó khăn gặp phải.',
        jsonb_build_object(
          'last_activity', v_last_activity,
          'days_inactive', EXTRACT(DAY FROM NOW() - v_last_activity)
        )
      );
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END IF;
  
  -- Check: Health score drop > 20 points (HIGH - engagement_drop)
  SELECT health_score INTO v_previous_health
  FROM tenant_health
  WHERE tenant_id = p_tenant_id
    AND date < CURRENT_DATE
  ORDER BY date DESC
  LIMIT 1;
  
  IF v_previous_health IS NOT NULL AND v_health_data.health_score IS NOT NULL 
     AND (v_previous_health - v_health_data.health_score) >= 20 THEN
    SELECT COUNT(*) INTO v_existing_alert_count
    FROM cs_alerts
    WHERE tenant_id = p_tenant_id
      AND alert_type = 'engagement_drop'
      AND status IN ('open', 'acknowledged')
      AND created_at > NOW() - INTERVAL '3 days';
    
    IF v_existing_alert_count = 0 THEN
      INSERT INTO cs_alerts (tenant_id, alert_type, severity, title, description, recommended_action, metadata)
      VALUES (
        p_tenant_id,
        'engagement_drop',
        'high',
        'Health score giảm mạnh (-' || (v_previous_health - v_health_data.health_score) || ' điểm)',
        'Health score đã giảm từ ' || v_previous_health || ' xuống ' || v_health_data.health_score || 
          ' trong thời gian gần đây. Cần can thiệp ngay.',
        'Liên hệ khách hàng để tìm hiểu vấn đề. Đề xuất training session hoặc support call.',
        jsonb_build_object(
          'previous_score', v_previous_health,
          'current_score', v_health_data.health_score,
          'drop_amount', v_previous_health - v_health_data.health_score
        )
      );
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END IF;
  
  -- Check: Low adoption - only 1 module used (LOW - low_adoption)
  v_modules_count := COALESCE(array_length(v_health_data.modules_used, 1), 0);
  
  IF v_modules_count <= 1 AND v_health_data.total_page_views > 10 THEN
    SELECT COUNT(*) INTO v_existing_alert_count
    FROM cs_alerts
    WHERE tenant_id = p_tenant_id
      AND alert_type = 'low_adoption'
      AND status IN ('open', 'acknowledged')
      AND created_at > NOW() - INTERVAL '14 days';
    
    IF v_existing_alert_count = 0 THEN
      INSERT INTO cs_alerts (tenant_id, alert_type, severity, title, description, recommended_action, metadata)
      VALUES (
        p_tenant_id,
        'low_adoption',
        'low',
        'Chỉ sử dụng ' || v_modules_count || ' module',
        'Tenant đang chỉ sử dụng ' || 
          CASE WHEN v_modules_count = 0 THEN 'chưa có module nào' 
               ELSE COALESCE(array_to_string(v_health_data.modules_used, ', '), 'không xác định') 
          END ||
          '. Có thể giới thiệu thêm các tính năng khác.',
        'Gửi email hoặc schedule demo giới thiệu các module MDP, CDP, Control Tower.',
        jsonb_build_object(
          'modules_used', v_health_data.modules_used,
          'modules_count', v_modules_count
        )
      );
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END IF;
  
  -- Check: Critical health score < 40 (CRITICAL - churn_risk)
  IF v_health_data.health_score IS NOT NULL AND v_health_data.health_score < 40 THEN
    SELECT COUNT(*) INTO v_existing_alert_count
    FROM cs_alerts
    WHERE tenant_id = p_tenant_id
      AND alert_type = 'churn_risk'
      AND status IN ('open', 'acknowledged')
      AND created_at > NOW() - INTERVAL '7 days';
    
    IF v_existing_alert_count = 0 THEN
      INSERT INTO cs_alerts (tenant_id, alert_type, severity, title, description, recommended_action, metadata)
      VALUES (
        p_tenant_id,
        'churn_risk',
        'critical',
        'Nguy cơ churn cao - Health score ' || v_health_data.health_score,
        'Health score ở mức critical (' || v_health_data.health_score || '/100). ' ||
          'DAU: ' || COALESCE(v_health_data.daily_active_users, 0) || ', ' ||
          'WAU: ' || COALESCE(v_health_data.weekly_active_users, 0),
        'Liên hệ NGAY với khách hàng. Cân nhắc offer incentive hoặc extended support.',
        jsonb_build_object(
          'health_score', v_health_data.health_score,
          'risk_level', v_health_data.risk_level,
          'dau', v_health_data.daily_active_users,
          'wau', v_health_data.weekly_active_users
        )
      );
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END IF;
  
  -- Check: No data import > 14 days (MEDIUM - data_stale)
  SELECT MAX(created_at) INTO v_last_import
  FROM tenant_events
  WHERE tenant_id = p_tenant_id
    AND event_type IN ('feature_use', 'export')
    AND event_name ILIKE '%import%';
  
  IF v_last_import IS NOT NULL AND v_last_import < NOW() - INTERVAL '14 days' THEN
    SELECT COUNT(*) INTO v_existing_alert_count
    FROM cs_alerts
    WHERE tenant_id = p_tenant_id
      AND alert_type = 'data_stale'
      AND status IN ('open', 'acknowledged')
      AND created_at > NOW() - INTERVAL '14 days';
    
    IF v_existing_alert_count = 0 THEN
      INSERT INTO cs_alerts (tenant_id, alert_type, severity, title, description, recommended_action, metadata)
      VALUES (
        p_tenant_id,
        'data_stale',
        'medium',
        'Chưa import dữ liệu mới > 14 ngày',
        'Lần import cuối: ' || TO_CHAR(v_last_import, 'DD/MM/YYYY') || 
          '. Dữ liệu có thể đã outdate.',
        'Nhắc khách hàng sync dữ liệu mới. Hỏi về khó khăn trong quá trình import.',
        jsonb_build_object(
          'last_import', v_last_import,
          'days_since_import', EXTRACT(DAY FROM NOW() - v_last_import)
        )
      );
      v_alerts_created := v_alerts_created + 1;
    END IF;
  END IF;
  
  RETURN v_alerts_created;
END;
$$;

-- Function to run alert checks for all active tenants
CREATE OR REPLACE FUNCTION public.run_cs_alert_checks()
RETURNS TABLE(tenant_id uuid, alerts_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tenant_id,
    check_and_create_cs_alerts(t.id) as alerts_created
  FROM tenants t
  WHERE t.is_active = true;
END;
$$;

-- Function to get CS alerts summary for admin dashboard
CREATE OR REPLACE FUNCTION public.get_cs_alerts_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_open', COUNT(*) FILTER (WHERE status = 'open'),
    'total_acknowledged', COUNT(*) FILTER (WHERE status = 'acknowledged'),
    'total_in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'critical_count', COUNT(*) FILTER (WHERE severity = 'critical' AND status IN ('open', 'acknowledged')),
    'high_count', COUNT(*) FILTER (WHERE severity = 'high' AND status IN ('open', 'acknowledged')),
    'medium_count', COUNT(*) FILTER (WHERE severity = 'medium' AND status IN ('open', 'acknowledged')),
    'low_count', COUNT(*) FILTER (WHERE severity = 'low' AND status IN ('open', 'acknowledged')),
    'by_type', jsonb_build_object(
      'churn_risk', COUNT(*) FILTER (WHERE alert_type = 'churn_risk' AND status IN ('open', 'acknowledged')),
      'inactive', COUNT(*) FILTER (WHERE alert_type = 'inactive' AND status IN ('open', 'acknowledged')),
      'engagement_drop', COUNT(*) FILTER (WHERE alert_type = 'engagement_drop' AND status IN ('open', 'acknowledged')),
      'stuck_onboarding', COUNT(*) FILTER (WHERE alert_type = 'stuck_onboarding' AND status IN ('open', 'acknowledged')),
      'data_stale', COUNT(*) FILTER (WHERE alert_type = 'data_stale' AND status IN ('open', 'acknowledged')),
      'low_adoption', COUNT(*) FILTER (WHERE alert_type = 'low_adoption' AND status IN ('open', 'acknowledged'))
    ),
    'recent_alerts', (
      SELECT jsonb_agg(row_to_json(a))
      FROM (
        SELECT 
          ca.id,
          ca.tenant_id,
          t.company_name as tenant_name,
          ca.alert_type,
          ca.severity,
          ca.title,
          ca.status,
          ca.created_at
        FROM cs_alerts ca
        JOIN tenants t ON t.id = ca.tenant_id
        WHERE ca.status IN ('open', 'acknowledged')
        ORDER BY 
          CASE ca.severity 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          ca.created_at DESC
        LIMIT 10
      ) a
    )
  ) INTO v_result
  FROM cs_alerts;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Function to get all open alerts with tenant info (for admin list)
CREATE OR REPLACE FUNCTION public.get_all_open_cs_alerts(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_severity text DEFAULT NULL,
  p_alert_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  tenant_name text,
  tenant_email text,
  alert_type text,
  severity text,
  title text,
  description text,
  recommended_action text,
  metadata jsonb,
  status text,
  assigned_to uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.tenant_id,
    t.company_name as tenant_name,
    t.contact_email as tenant_email,
    ca.alert_type,
    ca.severity,
    ca.title,
    ca.description,
    ca.recommended_action,
    ca.metadata,
    ca.status,
    ca.assigned_to,
    ca.created_at,
    ca.updated_at
  FROM cs_alerts ca
  JOIN tenants t ON t.id = ca.tenant_id
  WHERE ca.status IN ('open', 'acknowledged', 'in_progress')
    AND (p_severity IS NULL OR ca.severity = p_severity)
    AND (p_alert_type IS NULL OR ca.alert_type = p_alert_type)
  ORDER BY 
    CASE ca.severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      ELSE 4 
    END,
    ca.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_and_create_cs_alerts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_cs_alert_checks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cs_alerts_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_open_cs_alerts(integer, integer, text, text) TO authenticated;