/**
 * CDP Tier Data Hook - REFACTORED FOR SSOT
 * 
 * Uses get_cdp_tier_summary and get_cdp_rfm_summary RPCs
 * ALL aggregation done in database.
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

export interface TierData {
  tierLabel: string;
  customerCount: number;
  totalRevenue: number;
  estimatedEquity: number;
  avgRevenuePerCustomer: number;
}

/**
 * Fetch tier statistics via RPC - NO client-side aggregation
 */
export function useCDPTierData(tierLabel: string | undefined) {
  const { tenantId, isReady, callRpc } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp', 'tier-data', tenantId, tierLabel],
    queryFn: async (): Promise<TierData | null> => {
      if (!tenantId || !tierLabel) return null;

      const { data, error } = await callRpc('get_cdp_tier_summary', {
        p_tenant_id: tenantId,
        p_tier_label: tierLabel,
      });

      if (error) {
        console.error('Error fetching tier data:', error);
        return null;
      }

      const result = data as any;
      return {
        tierLabel: result?.tierLabel || tierLabel,
        customerCount: Number(result?.customerCount) || 0,
        totalRevenue: Number(result?.totalRevenue) || 0,
        estimatedEquity: Number(result?.estimatedEquity) || 0,
        avgRevenuePerCustomer: Number(result?.avgRevenuePerCustomer) || 0,
      };
    },
    enabled: isReady && !!tierLabel,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch RFM segment statistics via RPC - NO client-side aggregation
 */
export function useCDPRFMData(rfmSegment: string | undefined) {
  const { tenantId, isReady, callRpc } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['cdp', 'rfm-data', tenantId, rfmSegment],
    queryFn: async (): Promise<TierData | null> => {
      if (!tenantId || !rfmSegment) return null;

      const { data, error } = await callRpc('get_cdp_rfm_summary', {
        p_tenant_id: tenantId,
        p_rfm_segment: rfmSegment,
      });

      if (error) {
        console.error('Error fetching RFM data:', error);
        return null;
      }

      const result = data as any;
      return {
        tierLabel: result?.tierLabel || rfmSegment,
        customerCount: Number(result?.customerCount) || 0,
        totalRevenue: Number(result?.totalRevenue) || 0,
        estimatedEquity: Number(result?.estimatedEquity) || 0,
        avgRevenuePerCustomer: Number(result?.avgRevenuePerCustomer) || 0,
      };
    },
    enabled: isReady && !!rfmSegment,
    staleTime: 5 * 60 * 1000,
  });
}
