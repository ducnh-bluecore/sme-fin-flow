import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

// Types for Equity views - Aligned with v_cdp_equity_* schema
export interface EquityOverview {
  tenant_id: string;
  as_of_date: string | null;
  total_customers: number;
  customers_with_equity: number;
  total_equity_12m: number | null;
  total_equity_24m: number | null;
  avg_equity_12m: number | null;
  at_risk_value: number | null;
  at_risk_percent: number | null;
  equity_change: number | null;
  change_direction: string | null;
  estimated_share: number | null;
  data_quality_summary: Record<string, unknown> | null;
  last_updated: string | null;
}

// NEW: Bucket-based distribution from computed table
export interface EquityDistribution {
  tenant_id: string;
  bucket: string; // '0-1M', '1-3M', '3-10M', '10M+', 'unknown'
  customer_count: number;
  equity_sum: number | null;
  equity_avg: number | null;
  estimated_count: number;
}

// NEW: Driver analysis from computed table
export interface EquityDriver {
  tenant_id: string;
  factor: string; // 'Recency', 'Frequency', 'Monetary'
  impact_percent: number | null;
  direction: string; // 'positive', 'negative', 'neutral'
  description: string;
}

export interface EquitySnapshot {
  tenant_id: string;
  as_of_date: string | null;
  total_equity_12m: number | null;
  total_equity_24m: number | null;
  at_risk_value: number | null;
  at_risk_percent: number | null;
  equity_change: number | null;
  change_direction: string | null;
  estimated_share: number | null;
  data_quality_summary: Record<string, unknown> | null;
  top_drivers: Array<{
    factor: string;
    impact: number | null;
    direction: string;
    description: string;
  }> | null;
  last_updated: string | null;
}

// New types for sub-pages
export interface LTVModel {
  tenant_id: string;
  model_id: string;
  name: string;
  description: string;
  timeframe: string;
  total_equity: number;
  at_risk_percent: number;
  confidence: 'high' | 'medium' | 'low';
  is_active: boolean;
}

export interface LTVRule {
  tenant_id: string;
  segment: string;
  behavior: string;
  ltv_12m: number;
  ltv_24m: number;
  confidence: string;
}

export interface LTVAuditHistory {
  tenant_id: string;
  audit_id: string;
  change_date: string;
  user_name: string;
  action_description: string;
  model_name: string;
}

export interface EquityEvidence {
  tenant_id: string;
  customer_id: string;
  anonymized_id: string;
  segment: string;
  estimated_ltv: number;
  behavior_status: 'normal' | 'at_risk' | 'inactive';
  last_purchase: string;
  purchase_count: number;
  data_confidence: number;
}

// Hook: Fetch Equity Overview KPIs
export function useCDPEquityOverview() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-equity-overview', tenantId],
    queryFn: async (): Promise<EquityOverview | null> => {
      if (!tenantId) return null;

      let query = client.from('v_cdp_equity_overview').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.maybeSingle();

      // PGRST116 = no rows found - this is OK, return null
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching equity overview:', error);
        throw error;
      }

      return data as EquityOverview | null;
    },
    enabled: isReady,
  });
}

// Hook: Fetch Equity Distribution by segments
export function useCDPEquityDistribution() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-equity-distribution', tenantId],
    queryFn: async (): Promise<EquityDistribution[]> => {
      if (!tenantId) return [];

      let query = client.from('v_cdp_equity_distribution').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching equity distribution:', error);
        throw error;
      }

      // Map to EquityDistribution interface
      return (data || []).map(row => ({
        tenant_id: row.tenant_id,
        bucket: row.bucket,
        customer_count: row.customer_count,
        equity_sum: row.equity_sum,
        equity_avg: row.equity_avg,
        estimated_count: row.estimated_count,
      })) as EquityDistribution[];
    },
    enabled: isReady,
  });
}

// Hook: Fetch Equity Drivers
export function useCDPEquityDrivers() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-equity-drivers', tenantId],
    queryFn: async (): Promise<EquityDriver[]> => {
      if (!tenantId) return [];

      let query = client.from('v_cdp_equity_drivers').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching equity drivers:', error);
        throw error;
      }

      // Map to EquityDriver interface
      return (data || []).map(row => ({
        tenant_id: row.tenant_id,
        factor: row.factor,
        impact_percent: row.impact_percent,
        direction: row.direction,
        description: row.description,
      })) as EquityDriver[];
    },
    enabled: isReady,
  });
}

// Hook: Fetch Equity Snapshot (for overview cards)
export function useCDPEquitySnapshot() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-equity-snapshot', tenantId],
    queryFn: async (): Promise<EquitySnapshot | null> => {
      if (!tenantId) return null;

      let query = client.from('v_cdp_equity_snapshot').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.maybeSingle();

      // PGRST116 = no rows found - this is OK, return null
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching equity snapshot:', error);
        throw error;
      }

      // Return null if no data found
      if (!data) return null;

      // Parse top_drivers from JSONB
      const topDrivers = Array.isArray(data?.top_drivers) 
        ? data.top_drivers as EquitySnapshot['top_drivers']
        : [];

      return {
        ...data,
        change_direction: data?.change_direction as 'up' | 'down' | 'stable',
        top_drivers: topDrivers,
      } as EquitySnapshot;
    },
    enabled: isReady,
  });
}

// Hook: Fetch LTV Models - Returns placeholder models since v_cdp_ltv_models doesn't exist yet
export function useCDPLTVModels() {
  const { tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-ltv-models', tenantId],
    queryFn: async (): Promise<LTVModel[]> => {
      if (!tenantId) return [];

      // NOTE: v_cdp_ltv_models view doesn't exist yet
      // Return empty array - UI will show appropriate empty state
      console.warn('[CDP] v_cdp_ltv_models view not implemented. Returning empty models.');
      return [];
    },
    enabled: isReady,
  });
}

// Hook: Fetch LTV Rules
export function useCDPLTVRules() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-ltv-rules', tenantId],
    queryFn: async (): Promise<LTVRule[]> => {
      if (!tenantId) return [];

      let query = client.from('v_cdp_ltv_rules').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching LTV rules:', error);
        throw error;
      }

      return (data || []) as LTVRule[];
    },
    enabled: isReady,
  });
}

// Hook: Fetch LTV Audit History
export function useCDPLTVAuditHistory() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-ltv-audit-history', tenantId],
    queryFn: async (): Promise<LTVAuditHistory[]> => {
      if (!tenantId) return [];

      let query = client.from('v_cdp_ltv_audit_history').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query.order('change_date', { ascending: false });

      if (error) {
        console.error('Error fetching LTV audit history:', error);
        throw error;
      }

      return (data || []) as LTVAuditHistory[];
    },
    enabled: isReady,
  });
}

// Hook: Fetch Equity Evidence (Sample Customers)
export function useCDPEquityEvidence() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['cdp-equity-evidence', tenantId],
    queryFn: async (): Promise<EquityEvidence[]> => {
      if (!tenantId) return [];

      let query = client.from('v_cdp_equity_evidence').select('*');
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching equity evidence:', error);
        throw error;
      }

      return (data || []).map(d => ({
        ...d,
        behavior_status: d.behavior_status as 'normal' | 'at_risk' | 'inactive',
      })) as EquityEvidence[];
    },
    enabled: isReady,
  });
}
