
-- Create a bulk upsert function for KPI engine to avoid CPU timeout from many REST calls
CREATE OR REPLACE FUNCTION public.kpi_engine_bulk_save(
  p_tenant_id uuid,
  p_as_of_date date,
  p_idi jsonb DEFAULT '[]',
  p_scs jsonb DEFAULT '[]',
  p_chi jsonb DEFAULT '[]',
  p_gap jsonb DEFAULT '[]',
  p_size_health jsonb DEFAULT '[]',
  p_lost_revenue jsonb DEFAULT '[]',
  p_markdown_risk jsonb DEFAULT '[]',
  p_size_transfers jsonb DEFAULT '[]',
  p_store_health jsonb DEFAULT '[]',
  p_cash_lock jsonb DEFAULT '[]',
  p_margin_leak jsonb DEFAULT '[]',
  p_evidence_packs jsonb DEFAULT '[]'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
BEGIN
  -- IDI
  DELETE FROM kpi_inventory_distortion WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO kpi_inventory_distortion SELECT * FROM jsonb_populate_recordset(null::kpi_inventory_distortion, p_idi);
  v_result := v_result || jsonb_build_object('idi', jsonb_array_length(p_idi));

  -- SCS
  DELETE FROM kpi_size_completeness WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO kpi_size_completeness SELECT * FROM jsonb_populate_recordset(null::kpi_size_completeness, p_scs);
  v_result := v_result || jsonb_build_object('scs', jsonb_array_length(p_scs));

  -- CHI
  DELETE FROM kpi_curve_health WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO kpi_curve_health SELECT * FROM jsonb_populate_recordset(null::kpi_curve_health, p_chi);
  v_result := v_result || jsonb_build_object('chi', jsonb_array_length(p_chi));

  -- Network Gap
  DELETE FROM kpi_network_gap WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO kpi_network_gap SELECT * FROM jsonb_populate_recordset(null::kpi_network_gap, p_gap);
  v_result := v_result || jsonb_build_object('gap', jsonb_array_length(p_gap));

  -- Size Health (FC-level only)
  DELETE FROM state_size_health_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date AND store_id IS NULL;
  INSERT INTO state_size_health_daily SELECT * FROM jsonb_populate_recordset(null::state_size_health_daily, p_size_health);
  v_result := v_result || jsonb_build_object('size_health', jsonb_array_length(p_size_health));

  -- Lost Revenue
  DELETE FROM state_lost_revenue_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO state_lost_revenue_daily SELECT * FROM jsonb_populate_recordset(null::state_lost_revenue_daily, p_lost_revenue);
  v_result := v_result || jsonb_build_object('lost_revenue', jsonb_array_length(p_lost_revenue));

  -- Markdown Risk
  DELETE FROM state_markdown_risk_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO state_markdown_risk_daily SELECT * FROM jsonb_populate_recordset(null::state_markdown_risk_daily, p_markdown_risk);
  v_result := v_result || jsonb_build_object('markdown_risk', jsonb_array_length(p_markdown_risk));

  -- Size Transfers
  DELETE FROM state_size_transfer_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO state_size_transfer_daily SELECT * FROM jsonb_populate_recordset(null::state_size_transfer_daily, p_size_transfers);
  v_result := v_result || jsonb_build_object('size_transfers', jsonb_array_length(p_size_transfers));

  -- Store Health (store-level only)
  DELETE FROM state_size_health_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date AND store_id IS NOT NULL;
  INSERT INTO state_size_health_daily SELECT * FROM jsonb_populate_recordset(null::state_size_health_daily, p_store_health);
  v_result := v_result || jsonb_build_object('store_health', jsonb_array_length(p_store_health));

  -- Cash Lock
  DELETE FROM state_cash_lock_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO state_cash_lock_daily SELECT * FROM jsonb_populate_recordset(null::state_cash_lock_daily, p_cash_lock);
  v_result := v_result || jsonb_build_object('cash_lock', jsonb_array_length(p_cash_lock));

  -- Margin Leak
  DELETE FROM state_margin_leak_daily WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO state_margin_leak_daily SELECT * FROM jsonb_populate_recordset(null::state_margin_leak_daily, p_margin_leak);
  v_result := v_result || jsonb_build_object('margin_leak', jsonb_array_length(p_margin_leak));

  -- Evidence Packs
  DELETE FROM si_evidence_packs WHERE tenant_id = p_tenant_id AND as_of_date = p_as_of_date;
  INSERT INTO si_evidence_packs SELECT * FROM jsonb_populate_recordset(null::si_evidence_packs, p_evidence_packs);
  v_result := v_result || jsonb_build_object('evidence_packs', jsonb_array_length(p_evidence_packs));

  RETURN v_result;
END;
$$;
