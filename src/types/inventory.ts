/**
 * Local type definitions for inventory tables/views not in auto-generated Supabase types.
 * These replace `as any` casts across inventory hooks.
 */

// ─── Tables ───

export interface InvFamilyCode {
  id: string;
  tenant_id: string;
  fc_code: string;
  fc_name: string | null;
  category: string | null;
  subcategory: string | null;
  season: string | null;
  is_active: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface InvStore {
  id: string;
  tenant_id: string;
  store_code: string;
  store_name: string | null;
  store_type: string | null;
  region: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InvSkuFcMapping {
  id: string;
  tenant_id: string;
  sku: string;
  fc_id: string;
  size_code: string | null;
  is_active: boolean;
}

export interface InvStatePosition {
  id: string;
  tenant_id: string;
  sku: string;
  store_id: string;
  on_hand: number;
  on_order: number;
  in_transit: number;
  as_of_date: string;
}

// ─── State tables (daily computed) ───

export interface StateSizeHealthDaily {
  id: string;
  tenant_id: string;
  product_id: string;
  store_id: string | null;
  as_of_date: string;
  size_health_score: number;
  curve_state: string;
  deviation_score: number;
  core_size_missing: boolean;
  shallow_depth_count: number;
}

export interface StateSizeTransferDaily {
  id: string;
  tenant_id: string;
  product_id: string;
  size_code: string;
  source_store_id: string;
  dest_store_id: string;
  as_of_date: string;
  transfer_qty: number;
  transfer_score: number;
  source_on_hand: number;
  dest_on_hand: number;
  dest_velocity: number;
  estimated_revenue_gain: number;
  estimated_transfer_cost: number;
  net_benefit: number;
  reason: string;
}

export interface StateMarkdownRiskDaily {
  id: string;
  tenant_id: string;
  product_id: string;
  as_of_date: string;
  markdown_risk_score: number;
  markdown_eta_days: number | null;
  reason: string;
}

export interface StateLostRevenueDaily {
  id: string;
  tenant_id: string;
  product_id: string;
  as_of_date: string;
  lost_units_est: number;
  lost_revenue_est: number;
  driver: string;
}

export interface StateCashLockDaily {
  id: string;
  tenant_id: string;
  product_id: string;
  as_of_date: string;
  inventory_value: number;
  cash_locked_value: number;
  locked_pct: number;
  expected_release_days: number | null;
  lock_driver: string;
}

export interface StateMarginLeakDaily {
  id: string;
  tenant_id: string;
  product_id: string;
  as_of_date: string;
  margin_leak_value: number;
  leak_driver: string;
  leak_detail: any;
  cumulative_leak_30d: number;
}

// ─── Evidence ───

export interface SiEvidencePack {
  id: string;
  tenant_id: string;
  product_id: string;
  as_of_date: string;
  evidence_type: string;
  severity: string;
  summary: string;
  data_snapshot: any;
  source_tables: string[];
  created_at: string;
}

// ─── Summary Views ───

export interface VSizeIntelligenceSummary {
  tenant_id: string;
  as_of_date: string;
  avg_health_score: number;
  total_products: number;
  broken_count: number;
  risk_count: number;
  watch_count: number;
  healthy_count: number;
  core_missing_count: number;
}

export interface VLostRevenueSummary {
  tenant_id: string;
  as_of_date: string;
  total_lost_revenue: number;
  total_lost_units: number;
}

export interface VMarkdownRiskSummary {
  tenant_id: string;
  as_of_date: string;
  high_risk_count: number;
  critical_count: number;
}

export interface VCashLockSummary {
  tenant_id: string;
  as_of_date: string;
  total_cash_locked: number;
  total_inventory_value: number;
}

export interface VMarginLeakSummary {
  tenant_id: string;
  as_of_date: string;
  total_margin_leak: number;
  leak_by_size_break: number;
  leak_by_markdown: number;
}

export interface VTransferByDestination {
  tenant_id: string;
  dest_store_id: string;
  transfer_count: number;
  total_net_benefit: number;
  total_transfer_qty: number;
}

export interface VSizeHealthByState {
  tenant_id: string;
  curve_state: string;
  style_count: number;
  avg_health_score: number;
  total_lost_revenue: number;
  total_cash_locked: number;
  total_margin_leak: number;
}

// ─── Clearance Views ───

export interface VClearanceHistoryByFc {
  tenant_id: string;
  fc_id: string;
  product_name: string;
  channel: string;
  sale_month: string;
  discount_band: string;
  units_sold: number;
  revenue_collected: number;
  total_discount_given: number;
  avg_discount_pct: number;
}

// ─── Markdown Memory Engine ───

export interface InvMarkdownEvent {
  id: string;
  tenant_id: string;
  fc_id: string;
  sku: string;
  channel: string;
  discount_pct: number;
  original_price: number | null;
  selling_price: number | null;
  units_sold: number;
  revenue_collected: number;
  event_date: string;
  notes: string | null;
  created_at: string;
}

export interface SemMarkdownLadder {
  id: string;
  tenant_id: string;
  fc_id: string;
  channel: string;
  discount_step: number;
  clearability_score: number;
  avg_days_to_clear: number | null;
  total_units_cleared: number;
  total_revenue: number;
  sample_count: number;
  last_computed_at: string;
  created_at: string;
}

export interface SemMarkdownCap {
  id: string;
  tenant_id: string;
  fc_id: string | null;
  category: string | null;
  max_discount_pct: number;
  reason: string | null;
  override_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarkdownLadderStep {
  fc_id: string;
  channel: string;
  discount_step: number;
  clearability_score: number;
  avg_days_to_clear: number | null;
  total_units_cleared: number;
  total_revenue: number;
  sample_count: number;
}

// ─── KPI ───

export interface KpiSizeCompleteness {
  id: string;
  tenant_id: string;
  product_id: string;
  store_id: string | null;
  as_of_date: string;
  total_sizes: number;
  present_sizes: number;
  missing_sizes: string[];
  completeness_pct: number;
}
