/**
 * useFDPAggregatedMetrics - DEPRECATED WRAPPER
 * 
 * @deprecated Use useFDPAggregatedMetricsSSOT instead
 * This is a thin wrapper for backward compatibility only.
 */

import { useFDPAggregatedMetricsSSOT, type AggregatedFDPMetricsSSOT } from './useFDPAggregatedMetricsSSOT';

// Re-export types for backward compatibility
export interface AggregatedFDPMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalCogs: number;
  totalPlatformFees: number;
  totalShippingFees: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  avgOrderValue: number;
  cmPerOrder: number;
  uniqueCustomers: number;
  totalMarketingSpend: number;
  roas: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  channelBreakdown: any[];
  dailyTrend: any[];
}

/**
 * @deprecated Use useFDPAggregatedMetricsSSOT instead
 */
export function useFDPAggregatedMetrics() {
  const { data: ssotData, isLoading, error } = useFDPAggregatedMetricsSSOT();

  // Map SSOT data to legacy format
  const data: AggregatedFDPMetrics | null = ssotData ? {
    totalOrders: ssotData.totalOrders,
    totalRevenue: ssotData.totalRevenue,
    totalCogs: ssotData.totalCogs,
    totalPlatformFees: ssotData.totalPlatformFees,
    totalShippingFees: ssotData.totalShippingFees,
    contributionMargin: ssotData.contributionMargin,
    contributionMarginPercent: ssotData.contributionMarginPercent,
    avgOrderValue: ssotData.avgOrderValue,
    cmPerOrder: ssotData.cmPerOrder,
    uniqueCustomers: ssotData.uniqueCustomers,
    totalMarketingSpend: ssotData.totalMarketingSpend,
    roas: ssotData.roas,
    cac: ssotData.cac,
    ltv: ssotData.ltv,
    ltvCacRatio: ssotData.ltvCacRatio,
    channelBreakdown: ssotData.channelBreakdown,
    dailyTrend: [], // Not available in SSOT version
  } : null;

  return { data, isLoading, error };
}
