/**
 * useForecastInputs - Hook for gathering cash flow forecast input data
 * 
 * @architecture Schema-per-Tenant v1.4.1 / DB-First SSOT
 * AR/AP/Bank/Expense aggregation via get_forecast_aggregated_inputs RPC
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useMemo } from 'react';
import { SalesProjection, calculateSalesInflowForDay } from './useSalesProjection';

export interface ForecastInputs {
  bankBalance: number;
  bankAccountCount: number;
  arTotal: number;
  arDueWithin30: number;
  arDueWithin60: number;
  arDueWithin90: number;
  arOverdue: number;
  invoiceCount: number;
  apTotal: number;
  apDueWithin30: number;
  apDueWithin60: number;
  apDueWithin90: number;
  billCount: number;
  recurringExpensesMonthly: number;
  expenseCount: number;
  pendingSettlements: number;
  orderCount: number;
  avgDailyInflow: number;
  avgDailyOutflow: number;
  historicalDays: number;
  avgDailyOrderRevenue: number;
  dataStatus: {
    hasBankData: boolean;
    hasInvoiceData: boolean;
    hasBillData: boolean;
    hasExpenseData: boolean;
    hasOrderData: boolean;
    hasHistoricalData: boolean;
    historicalDaysAvailable: number;
    missingData: string[];
    dataQualityScore: number;
  };
}

export function useForecastInputs() {
  const { callRpc, buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  // DB-First: Get all aggregated inputs from single RPC
  const { data: aggregatedInputs, isLoading: aggLoading } = useQuery({
    queryKey: ['forecast-aggregated-inputs', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await callRpc('get_forecast_aggregated_inputs', {
        p_tenant_id: tenantId,
      });
      if (error) {
        console.error('[useForecastInputs] RPC error:', error);
        return null;
      }
      return data as any;
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });

  // DB-First: Use pre-aggregated view for order stats
  const { data: orderStats, isLoading: orderLoading } = useQuery({
    queryKey: ['forecast-order-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await buildSelectQuery('v_forecast_order_stats', '*')
        .maybeSingle();
      return data as any;
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });

  // DB-First: Use RPC for historical stats
  const { data: historicalStats, isLoading: histLoading } = useQuery({
    queryKey: ['forecast-historical-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await callRpc('get_forecast_historical_stats', { 
        p_tenant_id: tenantId,
        p_days: 90
      });
      if (error) {
        console.error('[useForecastInputs] Historical RPC error:', error);
        return null;
      }
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });

  const tenantLoading = !isReady;
  const inputs = useMemo<ForecastInputs>(() => {
    const agg = aggregatedInputs || {} as any;
    const bank = agg.bank || {};
    const ar = agg.ar || {};
    const ap = agg.ap || {};
    const expenses = agg.expenses || {};

    const bankBalance = Number(bank.balance) || 0;
    const bankCount = Number(bank.count) || 0;
    const arTotal = Number(ar.total) || 0;
    const arOverdue = Number(ar.overdue) || 0;
    const arDueWithin30 = Number(ar.due_within_30) || 0;
    const arDueWithin60 = Number(ar.due_within_60) || 0;
    const arDueWithin90 = Number(ar.due_within_90) || 0;
    const invoiceCount = Number(ar.count) || 0;
    const apTotal = Number(ap.total) || 0;
    const apDueWithin30 = Number(ap.due_within_30) || 0;
    const apDueWithin60 = Number(ap.due_within_60) || 0;
    const apDueWithin90 = Number(ap.due_within_90) || 0;
    const billCount = Number(ap.count) || 0;
    const monthlyExpenses = Number(expenses.monthly) || 0;
    const expenseCount = Number(expenses.count) || 0;

    const pendingSettlements = Number(orderStats?.pending_settlements) || 0;
    const avgDailyOrderRevenue = Number(orderStats?.avg_daily_revenue) || 0;

    const histStats = historicalStats as any;
    const totalCredit = Number(histStats?.total_credit) || 0;
    const totalDebit = Number(histStats?.total_debit) || 0;
    const historicalDays = Number(histStats?.unique_days) || 1;

    const hasBankData = bankCount > 0;
    const hasInvoiceData = invoiceCount > 0;
    const hasBillData = billCount > 0;
    const hasExpenseData = expenseCount > 0;
    const hasOrderData = !!orderStats && Number(orderStats.total_orders) > 0;
    const hasHistoricalData = historicalDays >= 7;

    const missingData: string[] = [];
    if (!hasBankData) missingData.push('Số dư ngân hàng (bank_accounts)');
    if (!hasInvoiceData) missingData.push('Hóa đơn bán hàng (invoices)');
    if (!hasBillData) missingData.push('Hóa đơn mua hàng (bills)');
    if (!hasExpenseData) missingData.push('Chi phí định kỳ (expenses với is_recurring=true)');
    if (!hasOrderData) missingData.push('Đơn hàng eCommerce (external_orders)');
    if (!hasHistoricalData) missingData.push(`Lịch sử giao dịch ngân hàng (cần ≥7 ngày, hiện có ${historicalDays} ngày)`);

    let score = 0;
    if (hasBankData) score += 25;
    if (hasInvoiceData) score += 20;
    if (hasBillData) score += 20;
    if (hasHistoricalData) score += 25;
    if (hasExpenseData) score += 5;
    if (hasOrderData) score += 5;

    return {
      bankBalance,
      bankAccountCount: bankCount,
      arTotal,
      arDueWithin30,
      arDueWithin60,
      arDueWithin90,
      arOverdue,
      invoiceCount,
      apTotal,
      apDueWithin30,
      apDueWithin60,
      apDueWithin90,
      billCount,
      recurringExpensesMonthly: monthlyExpenses,
      expenseCount,
      pendingSettlements,
      orderCount: Number(orderStats?.total_orders) || 0,
      avgDailyInflow: totalCredit / historicalDays,
      avgDailyOutflow: totalDebit / historicalDays,
      historicalDays,
      avgDailyOrderRevenue,
      dataStatus: {
        hasBankData,
        hasInvoiceData,
        hasBillData,
        hasExpenseData,
        hasOrderData,
        hasHistoricalData,
        historicalDaysAvailable: historicalDays,
        missingData,
        dataQualityScore: score,
      },
    };
  }, [aggregatedInputs, orderStats, historicalStats]);

  const isLoading = tenantLoading || aggLoading || orderLoading || histLoading;

  return { inputs, isLoading };
}

export type ForecastMethod = 'rule-based' | 'simple';

// Generate forecast data from inputs (projection logic - uses pre-computed inputs from DB)
export function generateForecast(
  inputs: ForecastInputs, 
  days: number = 90, 
  method: ForecastMethod = 'rule-based',
  salesProjection?: SalesProjection
) {
  const forecast = [];
  const today = new Date();
  
  let balance = inputs.bankBalance;
  
  const getCollectionProbability = (daysFromDue: number) => {
    if (daysFromDue <= 0) return 0.85;
    if (daysFromDue <= 30) return 0.70;
    if (daysFromDue <= 60) return 0.50;
    if (daysFromDue <= 90) return 0.30;
    return 0.10;
  };

  const SIMPLE_DAILY_COLLECTION_RATE = 0.15 / 7;
  const dailyRecurringExpense = inputs.recurringExpensesMonthly / 30;
  let remainingAR = inputs.arTotal;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    let inflow = 0;
    
    if (method === 'simple') {
      const dailyCollection = remainingAR * SIMPLE_DAILY_COLLECTION_RATE;
      inflow += dailyCollection;
      remainingAR -= dailyCollection;
      
      if (i >= 7 && i <= 21) {
        inflow += inputs.pendingSettlements / 14;
      }
    } else {
      if (i < 30) {
        inflow += (inputs.arDueWithin30 / 30) * getCollectionProbability(i);
      } else if (i < 60) {
        inflow += (inputs.arDueWithin60 - inputs.arDueWithin30) / 30 * getCollectionProbability(i - 30);
      } else {
        inflow += (inputs.arDueWithin90 - inputs.arDueWithin60) / 30 * getCollectionProbability(i - 60);
      }
      
      inflow += (inputs.arOverdue * 0.03) * getCollectionProbability(i + 30);
      
      if (i >= 7 && i <= 21) {
        inflow += inputs.pendingSettlements / 14;
      }
    }
    
    if (salesProjection) {
      inflow += calculateSalesInflowForDay(salesProjection, i);
    }
    
    if (!inputs.dataStatus.hasInvoiceData && inputs.dataStatus.hasHistoricalData) {
      inflow = inputs.avgDailyInflow;
    }

    let outflow = 0;
    
    if (i < 30) {
      outflow += inputs.apDueWithin30 / 30;
    } else if (i < 60) {
      outflow += (inputs.apDueWithin60 - inputs.apDueWithin30) / 30;
    } else {
      outflow += (inputs.apDueWithin90 - inputs.apDueWithin60) / 30;
    }
    
    outflow += dailyRecurringExpense;
    
    if (!inputs.dataStatus.hasBillData && inputs.dataStatus.hasHistoricalData) {
      outflow = inputs.avgDailyOutflow;
    }

    balance = balance + inflow - outflow;
    
    let upperBound: number;
    let lowerBound: number;

    if (method === 'simple') {
      upperBound = balance;
      lowerBound = balance;
    } else {
      const uncertainty = Math.min(0.6, i * 0.012);
      upperBound = balance * (1 + uncertainty);
      lowerBound = balance * (1 - uncertainty);

      if (upperBound < lowerBound) {
        const tmp = upperBound;
        upperBound = lowerBound;
        lowerBound = tmp;
      }
    }

    forecast.push({
      date: date.toISOString().split('T')[0],
      displayDate: `${date.getDate()}/${date.getMonth() + 1}`,
      balance,
      inflow,
      outflow,
      netFlow: inflow - outflow,
      upperBound,
      lowerBound,
      isActual: i === 0,
    });
  }
  
  return forecast;
}
