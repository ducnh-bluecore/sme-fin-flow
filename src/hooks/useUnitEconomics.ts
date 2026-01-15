/**
 * ============================================
 * UNIT ECONOMICS HOOK - Refactored to use SSOT
 * ============================================
 * 
 * Now wraps useFDPMetrics as Single Source of Truth.
 * Uses fdp-formulas.ts for all calculations.
 * 
 * Changes from previous version:
 * - Marketing spend now includes: campaigns + marketing_expenses + expenses(marketing)
 * - COGS uses real data from orders + expenses, no hardcoded ratios
 * - CM formula: Net Revenue - COGS - Shipping - Marketing
 */

import { useMemo } from 'react';
import { useFDPMetrics } from './useFDPMetrics';
import {
  calculateAOV,
  calculateCAC,
  calculateLTV,
  calculateLTVCACRatio,
  calculateROAS,
  calculateContributionMargin,
  calculateCMPerOrder,
  FDP_THRESHOLDS
} from '@/lib/fdp-formulas';

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
  
  // Trends (simplified - derived from FDP)
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
  const { data: fdpMetrics, isLoading, error } = useFDPMetrics();

  const data = useMemo<UnitEconomicsData | null>(() => {
    if (!fdpMetrics) return null;

    const {
      revenue,
      costs,
      profit,
      marketing,
      orders,
      customers,
      channelMetrics: fdpChannels,
      formulas,
    } = fdpMetrics;

    // Map FDP channel metrics to legacy format
    const channelMetrics: ChannelUnitMetrics[] = fdpChannels.map(ch => ({
      channel: ch.channel.toUpperCase(),
      orders: ch.orders,
      revenue: ch.revenue,
      cogs: ch.cogs,
      fees: ch.fees,
      contributionMargin: ch.contributionMargin,
      contributionMarginPercent: ch.contributionMarginPercent,
      aov: ch.orders > 0 ? ch.revenue / ch.orders : 0,
    }));

    // Simplified monthly trends - just current period
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyTrends: MonthlyUnitTrend[] = [{
      month: currentMonth,
      aov: orders.aov,
      contributionMargin: profit.contributionMarginPercent,
      ltvCacRatio: marketing.ltvCacRatio,
      roas: marketing.roas,
    }];

    return {
      // Per Order Metrics
      avgOrderValue: orders.aov,
      cogsPerOrder: orders.cogsPerOrder,
      platformFeesPerOrder: orders.feesPerOrder,
      shippingCostPerOrder: orders.shippingPerOrder,
      contributionMarginPerOrder: profit.contributionMarginPerOrder,
      contributionMarginPercent: profit.contributionMarginPercent,

      // Customer Metrics
      totalCustomers: customers.totalCustomers,
      newCustomersThisMonth: customers.newCustomers,
      repeatCustomerRate: customers.repeatRate,
      avgOrdersPerCustomer: customers.avgOrdersPerCustomer,
      customerLifetimeValue: marketing.ltv,
      customerAcquisitionCost: marketing.cac,
      ltvCacRatio: marketing.ltvCacRatio,

      // Marketing Efficiency
      totalMarketingSpend: marketing.totalSpend,
      costPerAcquisition: marketing.cac,
      returnOnAdSpend: marketing.roas,
      marketingEfficiencyRatio: marketing.marketingEfficiencyRatio,

      // Channel & Trends
      channelMetrics,
      monthlyTrends,

      // Raw data
      rawData: {
        totalOrders: orders.totalOrders,
        totalRevenue: revenue.orderRevenue,
        totalCogs: costs.totalCogs,
        totalPlatformFees: revenue.totalPlatformFees,
        totalShippingCost: costs.shippingCosts,
        uniqueBuyers: Math.round(orders.totalOrders / customers.avgOrdersPerCustomer) || 0,
        repeatBuyers: customers.repeatCustomers,
      },

      // Formula results for UI
      formulas: {
        aov: {
          value: formulas.aov.value,
          formula: formulas.aov.formula,
          status: formulas.aov.status,
        },
        cac: {
          value: formulas.cac.value,
          formula: formulas.cac.formula,
          status: formulas.cac.status,
        },
        ltv: {
          value: formulas.ltv.value,
          formula: formulas.ltv.formula,
          status: formulas.ltv.status,
        },
        ltvCacRatio: {
          value: formulas.ltvCacRatio.value,
          formula: formulas.ltvCacRatio.formula,
          status: formulas.ltvCacRatio.status,
        },
        roas: {
          value: formulas.roas.value,
          formula: formulas.roas.formula,
          status: formulas.roas.status,
        },
      },
    };
  }, [fdpMetrics]);

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
