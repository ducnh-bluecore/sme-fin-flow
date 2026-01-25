/**
 * ============================================
 * FDP PERIOD SUMMARY - DB-FIRST AGGREGATION
 * ============================================
 * 
 * Replaces client-side .reduce() with database RPC.
 * Single query returns pre-aggregated totals.
 * 
 * Uses: get_fdp_period_summary RPC
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export interface FDPPeriodSummary {
  totalOrders: number;
  totalRevenue: number;
  totalCogs: number;
  totalPlatformFees: number;
  totalShippingFees: number;
  grossProfit: number;
  contributionMargin: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  // Calculated percentages
  grossMarginPercent: number;
  contributionMarginPercent: number;
  // Data quality
  dataQuality: {
    hasRealData: boolean;
    hasCogs: boolean;
    hasFees: boolean;
    orderCount: number;
  };
  // Estimation flags
  estimation: {
    cogsIsEstimated: boolean;
    feesIsEstimated: boolean;
  };
}

export function useFDPPeriodSummary() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['fdp-period-summary', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<FDPPeriodSummary | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase.rpc('get_fdp_period_summary', {
        p_tenant_id: tenantId,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
      });

      if (error) {
        console.error('FDP Period Summary RPC error:', error);
        throw error;
      }

      const result = data as unknown as {
        totalOrders: number;
        totalRevenue: number;
        totalCogs: number;
        totalPlatformFees: number;
        totalShippingFees: number;
        grossProfit: number;
        contributionMargin: number;
        uniqueCustomers: number;
        avgOrderValue: number;
        dataQuality: {
          hasRealData: boolean;
          hasCogs: boolean;
          hasFees: boolean;
          orderCount: number;
        };
      };

      const revenue = result?.totalRevenue ?? 0;
      const grossProfit = result?.grossProfit ?? 0;
      const contributionMargin = result?.contributionMargin ?? 0;
      const hasCogs = result?.dataQuality?.hasCogs ?? false;
      const hasFees = result?.dataQuality?.hasFees ?? false;

      return {
        totalOrders: result?.totalOrders ?? 0,
        totalRevenue: revenue,
        totalCogs: result?.totalCogs ?? 0,
        totalPlatformFees: result?.totalPlatformFees ?? 0,
        totalShippingFees: result?.totalShippingFees ?? 0,
        grossProfit,
        contributionMargin,
        uniqueCustomers: result?.uniqueCustomers ?? 0,
        avgOrderValue: result?.avgOrderValue ?? 0,
        grossMarginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        contributionMarginPercent: revenue > 0 ? (contributionMargin / revenue) * 100 : 0,
        dataQuality: result?.dataQuality ?? {
          hasRealData: false,
          hasCogs: false,
          hasFees: false,
          orderCount: 0,
        },
        estimation: {
          cogsIsEstimated: !hasCogs,
          feesIsEstimated: !hasFees,
        },
      };
    },
    enabled: !!tenantId,
    staleTime: 3 * 60 * 1000, // Cache 3 minutes
  });
}
