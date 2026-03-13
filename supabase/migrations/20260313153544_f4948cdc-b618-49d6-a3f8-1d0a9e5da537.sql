
DO $$
DECLARE 
  v_tenant_id UUID := '364a23ad-66f5-44d6-8da9-74c7ff333dcc';
BEGIN
  -- AI
  DELETE FROM ai_predictions WHERE tenant_id = v_tenant_id;
  DELETE FROM ai_advisor_responses WHERE tenant_id = v_tenant_id;
  DELETE FROM ai_advisor_config WHERE tenant_id = v_tenant_id;
  DELETE FROM ai_insights WHERE tenant_id = v_tenant_id;
  DELETE FROM ai_messages WHERE tenant_id = v_tenant_id;
  DELETE FROM ai_conversations WHERE tenant_id = v_tenant_id;
  DELETE FROM ai_favorites WHERE tenant_id = v_tenant_id;
  DELETE FROM ai_query_history WHERE tenant_id = v_tenant_id;
  DELETE FROM ai_usage_logs WHERE tenant_id = v_tenant_id;

  -- Alerts
  DELETE FROM alert_cluster_members WHERE alert_id IN (SELECT id FROM alert_instances WHERE tenant_id = v_tenant_id);
  DELETE FROM alert_calculations_log WHERE tenant_id = v_tenant_id;
  DELETE FROM alert_instances WHERE tenant_id = v_tenant_id;
  DELETE FROM decision_cards WHERE tenant_id = v_tenant_id;
  DELETE FROM early_warning_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM decision_learning_patterns WHERE tenant_id = v_tenant_id;

  -- Ads
  DELETE FROM ads_execution_log WHERE tenant_id = v_tenant_id;
  DELETE FROM ads_recommendations WHERE tenant_id = v_tenant_id;
  DELETE FROM ads_content WHERE tenant_id = v_tenant_id;
  DELETE FROM ads_rules WHERE tenant_id = v_tenant_id;
  DELETE FROM ads_platform_connections WHERE tenant_id = v_tenant_id;
  DELETE FROM ad_spend_daily WHERE tenant_id = v_tenant_id;

  -- Accounting
  DELETE FROM adjustment_note_items WHERE tenant_id = v_tenant_id;
  DELETE FROM adjustment_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM journal_entry_lines WHERE tenant_id = v_tenant_id;
  DELETE FROM journal_entries WHERE tenant_id = v_tenant_id;
  DELETE FROM bill_items WHERE tenant_id = v_tenant_id;
  DELETE FROM bills WHERE tenant_id = v_tenant_id;
  DELETE FROM invoice_items WHERE tenant_id = v_tenant_id;
  DELETE FROM invoices WHERE tenant_id = v_tenant_id;
  DELETE FROM gl_accounts WHERE tenant_id = v_tenant_id;
END $$;
