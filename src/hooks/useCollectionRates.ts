/**
 * useCollectionRates - Dynamic AR Collection Rate Settings
 * 
 * Fetches configurable collection rates from formula_settings.
 * These rates are used in cashflow forecasting to estimate
 * how much of each AR aging bucket will be collected.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

// =============================================================
// TYPES
// =============================================================

export interface CollectionRates {
  /** Collection rate for AR not yet due (default 85%) */
  current: number;
  /** Collection rate for AR overdue 1-30 days (default 70%) */
  days30: number;
  /** Collection rate for AR overdue 31-60 days (default 50%) */
  days60: number;
  /** Collection rate for AR overdue 61-90 days (default 30%) */
  days90: number;
  /** Collection rate for AR overdue >90 days - bad debt (default 10%) */
  over90: number;
  /** Source of rates: 'db' if from settings, 'default' if using fallbacks */
  source: 'db' | 'default';
}

// Default collection rates (industry standard)
const DEFAULT_RATES: Omit<CollectionRates, 'source'> = {
  current: 85,
  days30: 70,
  days60: 50,
  days90: 30,
  over90: 10,
};

// =============================================================
// HOOK
// =============================================================

export function useCollectionRates() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  const query = useQuery({
    queryKey: ['collection-rates', tenantId],
    queryFn: async (): Promise<CollectionRates> => {
      if (!tenantId) {
        return { ...DEFAULT_RATES, source: 'default' };
      }

      const { data, error } = await supabase
        .from('formula_settings')
        .select('collection_rate_current, collection_rate_30d, collection_rate_60d, collection_rate_90d, collection_rate_over90')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('[useCollectionRates] Error:', error);
        return { ...DEFAULT_RATES, source: 'default' };
      }

      // If no settings found, use defaults
      if (!data) {
        return { ...DEFAULT_RATES, source: 'default' };
      }

      // Check if any rate is configured (not null)
      const hasDbRates = 
        data.collection_rate_current !== null ||
        data.collection_rate_30d !== null ||
        data.collection_rate_60d !== null ||
        data.collection_rate_90d !== null ||
        data.collection_rate_over90 !== null;

      return {
        current: data.collection_rate_current ?? DEFAULT_RATES.current,
        days30: data.collection_rate_30d ?? DEFAULT_RATES.days30,
        days60: data.collection_rate_60d ?? DEFAULT_RATES.days60,
        days90: data.collection_rate_90d ?? DEFAULT_RATES.days90,
        over90: data.collection_rate_over90 ?? DEFAULT_RATES.over90,
        source: hasDbRates ? 'db' : 'default',
      };
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  return {
    rates: query.data ?? { ...DEFAULT_RATES, source: 'default' },
    isLoading: query.isLoading || tenantLoading,
    error: query.error,
  };
}

/**
 * Calculate expected collection from AR aging buckets
 * 
 * @param arAging - Object with AR amounts by aging bucket
 * @param rates - Collection rates to apply
 * @returns Total expected collection
 */
export function calculateExpectedCollection(
  arAging: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
  },
  rates: CollectionRates
): number {
  return (
    (arAging.current * rates.current / 100) +
    (arAging.days30 * rates.days30 / 100) +
    (arAging.days60 * rates.days60 / 100) +
    (arAging.days90 * rates.days90 / 100) +
    (arAging.over90 * rates.over90 / 100)
  );
}

/**
 * Get breakdown of expected collection by bucket
 */
export function getCollectionBreakdown(
  arAging: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
  },
  rates: CollectionRates
) {
  return {
    current: { amount: arAging.current, rate: rates.current, expected: arAging.current * rates.current / 100 },
    days30: { amount: arAging.days30, rate: rates.days30, expected: arAging.days30 * rates.days30 / 100 },
    days60: { amount: arAging.days60, rate: rates.days60, expected: arAging.days60 * rates.days60 / 100 },
    days90: { amount: arAging.days90, rate: rates.days90, expected: arAging.days90 * rates.days90 / 100 },
    over90: { amount: arAging.over90, rate: rates.over90, expected: arAging.over90 * rates.over90 / 100 },
  };
}
