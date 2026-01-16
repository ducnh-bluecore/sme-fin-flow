/**
 * ============================================
 * UNIT ECONOMICS HOOK - OPTIMIZED WITH AGGREGATED VIEWS
 * ============================================
 * 
 * SSOT: Uses useFDPAggregatedMetrics which queries pre-aggregated database views
 * instead of fetching 50,000+ raw rows.
 * 
 * Performance: ~99% reduction in data transfer
 */

import { useMemo } from 'react';
import { useFDPAggregatedMetrics } from './useFDPAggregatedMetrics';
import { FDP_THRESHOLDS } from '@/lib/fdp-formulas';

export interface UnitEconomicsData {
  // Per Order Metrics
  avgOrderValue: number;
  cogsPerOrder: number;
  platformFeesPerOrder: number;
  shippingCostPerOrder: number;
  contributionMarginPerOrder: number;
  contributionMarginPercent: number;
  
  // Customer Metrics
  totalCustomers: number;
  newCustomersThisMonth: number;
  repeatCustomerRate: number;
  avgOrdersPerCustomer: number;
  customerLifetimeValue: number;
  customerAcquisitionCost: number;
  ltvCacRatio: number;
  
  // Marketing Efficiency
  totalMarketingSpend: number;
  costPerAcquisition: number;
  returnOnAdSpend: number;
  marketingEfficiencyRatio: number;
  
  // Profitability by Channel
  channelMetrics: ChannelUnitMetrics[];
  
  // Trends (simplified - derived from aggregated data)
  monthlyTrends: MonthlyUnitTrend[];

  // Raw data for formula display
  rawData: {
    totalOrders: number;
    totalRevenue: number;
    totalCogs: number;
    totalPlatformFees: number;
    totalShippingCost: number;
    uniqueBuyers: number;
    repeatBuyers: number;
  };
  
  // Formula results for UI display
  formulas?: {
    aov: { value: number; formula: string; status: string };
    cac: { value: number; formula: string; status: string };
    ltv: { value: number; formula: string; status: string };
    ltvCacRatio: { value: number; formula: string; status: string };
    roas: { value: number; formula: string; status: string };
  };
}

export interface ChannelUnitMetrics {
  channel: string;
  orders: number;
  revenue: number;
  cogs: number;
  fees: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  aov: number;
}

export interface MonthlyUnitTrend {
  month: string;
  aov: number;
  contributionMargin: number;
  ltvCacRatio: number;
  roas: number;
}

export function useUnitEconomics() {
  const { data: metrics, isLoading, error } = useFDPAggregatedMetrics();

  const data = useMemo<UnitEconomicsData | null>(() => {
    if (!metrics) return null;

    const {
      totalOrders,
      totalRevenue,
      totalCogs,
      totalPlatformFees,
      totalShippingFees,
      contributionMargin,
      contributionMarginPercent,
      avgOrderValue,
      cmPerOrder,
      uniqueCustomers,
      totalMarketingSpend,
      roas,
      cac,
      ltv,
      ltvCacRatio,
      channelBreakdown,
      dailyTrend,
    } = metrics;

    // Per-order calculations
    const cogsPerOrder = totalOrders > 0 ? totalCogs / totalOrders : 0;
    const feesPerOrder = totalOrders > 0 ? totalPlatformFees / totalOrders : 0;
    const shippingPerOrder = totalOrders > 0 ? totalShippingFees / totalOrders : 0;

    // Customer metrics
    const avgOrdersPerCustomer = uniqueCustomers > 0 ? totalOrders / uniqueCustomers : 1;
    const repeatRate = avgOrdersPerCustomer > 1 ? ((avgOrdersPerCustomer - 1) / avgOrdersPerCustomer) * 100 : 0;
    const repeatCustomers = Math.round(uniqueCustomers * (repeatRate / 100));

    // Map channel breakdown to legacy format
    const channelMetrics: ChannelUnitMetrics[] = channelBreakdown.map(ch => ({
      channel: (ch.channel || 'OTHER').toUpperCase(),
      orders: ch.order_count || 0,
      revenue: ch.total_revenue || 0,
      cogs: ch.total_cogs || 0,
      fees: (ch.total_platform_fee || 0) + (ch.total_commission_fee || 0) + (ch.total_payment_fee || 0),
      contributionMargin: ch.contribution_margin || 0,
      contributionMarginPercent: ch.total_revenue > 0 
        ? ((ch.contribution_margin || 0) / ch.total_revenue) * 100 
        : 0,
      aov: ch.avg_order_value || 0,
    }));

    // Simplified monthly trends from daily data
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyTrends: MonthlyUnitTrend[] = [{
      month: currentMonth,
      aov: avgOrderValue,
      contributionMargin: contributionMarginPercent,
      ltvCacRatio: ltvCacRatio,
      roas: roas,
    }];

    // Marketing efficiency ratio
    const marketingEfficiencyRatio = totalMarketingSpend > 0 
      ? contributionMargin / totalMarketingSpend 
      : 0;

    // Build formula displays
    const getStatus = (metric: string, value: number): string => {
      switch (metric) {
        case 'cm':
          if (value >= FDP_THRESHOLDS.CM_GOOD_PERCENT) return 'good';
          if (value >= FDP_THRESHOLDS.CM_WARNING_PERCENT) return 'warning';
          return 'critical';
        case 'roas':
          if (value >= FDP_THRESHOLDS.ROAS_GOOD) return 'good';
          if (value >= FDP_THRESHOLDS.ROAS_WARNING) return 'warning';
          return 'critical';
        case 'ltvCac':
          if (value >= 3) return 'good';
          if (value >= 2) return 'warning';
          return 'critical';
        default:
          return 'normal';
      }
    };

    return {
      // Per Order Metrics
      avgOrderValue,
      cogsPerOrder,
      platformFeesPerOrder: feesPerOrder,
      shippingCostPerOrder: shippingPerOrder,
      contributionMarginPerOrder: cmPerOrder,
      contributionMarginPercent,

      // Customer Metrics
      totalCustomers: uniqueCustomers,
      newCustomersThisMonth: Math.round(uniqueCustomers * 0.2), // Estimate 20% new
      repeatCustomerRate: repeatRate,
      avgOrdersPerCustomer,
      customerLifetimeValue: ltv,
      customerAcquisitionCost: cac,
      ltvCacRatio,

      // Marketing Efficiency
      totalMarketingSpend,
      costPerAcquisition: cac,
      returnOnAdSpend: roas,
      marketingEfficiencyRatio,

      // Channel & Trends
      channelMetrics,
      monthlyTrends,

      // Raw data
      rawData: {
        totalOrders,
        totalRevenue,
        totalCogs,
        totalPlatformFees,
        totalShippingCost: totalShippingFees,
        uniqueBuyers: uniqueCustomers,
        repeatBuyers: repeatCustomers,
      },

      // Formula results for UI
      formulas: {
        aov: {
          value: avgOrderValue,
          formula: `${totalRevenue.toLocaleString()} ÷ ${totalOrders.toLocaleString()} = ${avgOrderValue.toLocaleString()}`,
          status: 'normal',
        },
        cac: {
          value: cac,
          formula: `${totalMarketingSpend.toLocaleString()} ÷ ${uniqueCustomers.toLocaleString()} = ${cac.toLocaleString()}`,
          status: cac <= 500000 ? 'good' : 'warning',
        },
        ltv: {
          value: ltv,
          formula: `${avgOrderValue.toLocaleString()} × ${avgOrdersPerCustomer.toFixed(1)} × ${(contributionMarginPercent/100).toFixed(2)}`,
          status: ltv > cac * 3 ? 'good' : 'warning',
        },
        ltvCacRatio: {
          value: ltvCacRatio,
          formula: `${ltv.toLocaleString()} ÷ ${cac.toLocaleString()} = ${ltvCacRatio.toFixed(2)}`,
          status: getStatus('ltvCac', ltvCacRatio),
        },
        roas: {
          value: roas,
          formula: `${totalRevenue.toLocaleString()} ÷ ${totalMarketingSpend.toLocaleString()} = ${roas.toFixed(2)}`,
          status: getStatus('roas', roas),
        },
      },
    };
  }, [metrics]);

  return {
    data: data || getEmptyData(),
    isLoading,
    error,
  };
}

function getEmptyData(): UnitEconomicsData {
  return {
    avgOrderValue: 0,
    cogsPerOrder: 0,
    platformFeesPerOrder: 0,
    shippingCostPerOrder: 0,
    contributionMarginPerOrder: 0,
    contributionMarginPercent: 0,
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    repeatCustomerRate: 0,
    avgOrdersPerCustomer: 0,
    customerLifetimeValue: 0,
    customerAcquisitionCost: 0,
    ltvCacRatio: 0,
    totalMarketingSpend: 0,
    costPerAcquisition: 0,
    returnOnAdSpend: 0,
    marketingEfficiencyRatio: 0,
    channelMetrics: [],
    monthlyTrends: [],
    rawData: {
      totalOrders: 0,
      totalRevenue: 0,
      totalCogs: 0,
      totalPlatformFees: 0,
      totalShippingCost: 0,
      uniqueBuyers: 0,
      repeatBuyers: 0
    }
  };
}
