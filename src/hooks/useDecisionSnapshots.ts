/**
 * Decision Snapshots Hook
 * 
 * SSOT v1: Append-only truth ledger for CFO metrics.
 * Reads from decision_snapshots table/views, writes via edge function.
 * 
 * Truth levels:
 * - settled: BANK, MANUAL, ACCOUNTING authority
 * - provisional: RULE authority (forecasts with assumptions)
 * 
 * @architecture Schema-per-Tenant
 * @domain Control Tower/Decisions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

export interface DecisionSnapshot {
  id: string;
  tenant_id: string;
  metric_code: string;
  metric_version: number;
  entity_type: string;
  entity_id: string | null;
  dimensions: Record<string, unknown>;
  value: number;
  currency: string;
  truth_level: 'settled' | 'provisional';
  authority: 'BANK' | 'MANUAL' | 'RULE' | 'ACCOUNTING' | 'GATEWAY' | 'CARRIER';
  confidence: number;
  as_of: string;
  derived_from: {
    evidence?: Array<{ type: string; id: string; [key: string]: unknown }>;
    assumptions?: Array<{ factor: string; value: number; description: string }>;
    formula?: string;
    sources?: string[];
    inputs?: Record<string, number>;
    calculation?: Record<string, number>;
    notes?: string;
    window_days?: number;
  };
  calculation_hash: string | null;
  created_by: string | null;
  created_at: string;
  supersedes_id: string | null;
}

export interface SnapshotExplanation {
  snapshot: DecisionSnapshot;
  formatted: {
    metricCode: string;
    value: number;
    currency: string;
    truthLevel: string;
    authority: string;
    confidence: number;
    asOf: string;
    evidence: unknown[];
    assumptions: unknown[];
    sources: string[];
    formula: string | null;
    notes: string | null;
  };
}

export interface CashMetrics {
  cashToday: number;
  cashFlowToday: number;
  cashNext7d: number;
  snapshots: {
    cash_today?: DecisionSnapshot;
    cash_flow_today?: DecisionSnapshot;
    cash_next_7d?: DecisionSnapshot;
  };
  isStale: boolean;
  lastUpdated: string | null;
}

// Staleness threshold (15 minutes)
const STALE_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Fetch latest snapshot for a metric
 */
export function useLatestSnapshot(metricCode: string, enabled = true) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['decision-snapshot-latest', tenantId, metricCode],
    queryFn: async (): Promise<DecisionSnapshot | null> => {
      if (!tenantId) return null;

      let query = client
        .from('v_decision_latest')
        .select('*')
        .eq('metric_code', metricCode);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data as DecisionSnapshot | null;
    },
    enabled: !!tenantId && enabled && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch all cash-related snapshots with staleness check
 */
export function useCashSnapshots() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['decision-snapshots-cash', tenantId],
    queryFn: async (): Promise<CashMetrics> => {
      if (!tenantId) {
        return {
          cashToday: 0,
          cashFlowToday: 0,
          cashNext7d: 0,
          snapshots: {},
          isStale: true,
          lastUpdated: null,
        };
      }

      let query = client
        .from('v_decision_latest')
        .select('*')
        .in('metric_code', ['cash_today', 'cash_flow_today', 'cash_next_7d']);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const snapshots: CashMetrics['snapshots'] = {};
      let isStale = false;
      let lastUpdated: string | null = null;

      for (const snap of (data || []) as DecisionSnapshot[]) {
        const snapshotAge = Date.now() - new Date(snap.as_of).getTime();
        if (snapshotAge > STALE_THRESHOLD_MS) {
          isStale = true;
        }
        if (!lastUpdated || snap.as_of > lastUpdated) {
          lastUpdated = snap.as_of;
        }

        if (snap.metric_code === 'cash_today') snapshots.cash_today = snap;
        if (snap.metric_code === 'cash_flow_today') snapshots.cash_flow_today = snap;
        if (snap.metric_code === 'cash_next_7d') snapshots.cash_next_7d = snap;
      }

      // Mark as stale if any metric is missing
      if (!snapshots.cash_today || !snapshots.cash_flow_today || !snapshots.cash_next_7d) {
        isStale = true;
      }

      return {
        cashToday: snapshots.cash_today?.value || 0,
        cashFlowToday: snapshots.cash_flow_today?.value || 0,
        cashNext7d: snapshots.cash_next_7d?.value || 0,
        snapshots,
        isStale,
        lastUpdated,
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Compute and write cash snapshots via edge function
 */
export function useComputeCashSnapshots() {
  const { client, tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      const session = await client.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decision-snapshots/compute/cash`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'x-tenant-id': tenantId,
          },
          body: JSON.stringify({ tenantId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compute cash snapshots');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-snapshots-cash', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['decision-snapshot-latest', tenantId] });
    },
  });
}

/**
 * Get explanation for a snapshot
 */
export function useSnapshotExplanation(snapshotId: string | null) {
  const { client, tenantId } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['decision-snapshot-explain', snapshotId],
    queryFn: async (): Promise<SnapshotExplanation | null> => {
      if (!snapshotId) return null;

      const session = await client.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decision-snapshots/explain/${snapshotId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'x-tenant-id': tenantId || '',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get snapshot explanation');
      }

      return response.json();
    },
    enabled: !!snapshotId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Create a new snapshot manually
 */
export function useCreateSnapshot() {
  const { client, tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      metricCode: string;
      value: number;
      truthLevel: 'settled' | 'provisional';
      authority: 'BANK' | 'MANUAL' | 'RULE' | 'ACCOUNTING' | 'GATEWAY' | 'CARRIER';
      confidence?: number;
      derivedFrom?: Record<string, unknown>;
      entityType?: string;
      entityId?: string;
      dimensions?: Record<string, unknown>;
    }) => {
      if (!tenantId) throw new Error('No tenant ID');

      const session = await client.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decision-snapshots/snapshots`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'x-tenant-id': tenantId,
          },
          body: JSON.stringify({
            tenantId,
            ...params,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create snapshot');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['decision-snapshot-latest', tenantId, variables.metricCode] });
      queryClient.invalidateQueries({ queryKey: ['decision-snapshots-cash', tenantId] });
    },
  });
}
