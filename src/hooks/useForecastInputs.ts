/**
 * useForecastInputs - Hook for gathering cash flow forecast input data
 * 
 * This hook collects all necessary data for generating cash flow forecasts:
 * - Bank balances (current cash position)
 * - Accounts Receivable (expected inflows)
 * - Accounts Payable (expected outflows)
 * - Recurring expenses (predictable outflows)
 * - eCommerce pending settlements
 * - Historical transaction patterns
 * 
 * Architecture v1.4.1: Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useMemo } from 'react';
import { SalesProjection, calculateSalesInflowForDay } from './useSalesProjection';

export interface ForecastInputs {
  // Current state
  bankBalance: number;
  bankAccountCount: number;
  
  // AR (Accounts Receivable) - expected inflows
  arTotal: number;
  arDueWithin30: number;
  arDueWithin60: number;
  arDueWithin90: number;
  arOverdue: number;
  invoiceCount: number;
  
  // AP (Accounts Payable) - expected outflows
  apTotal: number;
  apDueWithin30: number;
  apDueWithin60: number;
  apDueWithin90: number;
  billCount: number;
  
  // Recurring expenses
  recurringExpensesMonthly: number;
  expenseCount: number;
  
  // eCommerce orders (pending settlements)
  pendingSettlements: number;
  orderCount: number;
  
  // Historical averages (last 90 days)
  avgDailyInflow: number;
  avgDailyOutflow: number;
  historicalDays: number;
  
  // Average daily order revenue from cdp_orders (SSOT fallback)
  avgDailyOrderRevenue: number;
  
  // Data availability flags
  dataStatus: {
    hasBankData: boolean;
    hasInvoiceData: boolean;
    hasBillData: boolean;
    hasExpenseData: boolean;
    hasOrderData: boolean;
    hasHistoricalData: boolean;
    historicalDaysAvailable: number;
    missingData: string[];
    dataQualityScore: number; // 0-100
  };
}

export function useForecastInputs() {
  const { buildSelectQuery, callRpc, tenantId, isReady } = useTenantQueryBuilder();

  // Fetch all required data in parallel
  const { data: bankAccounts, isLoading: bankLoading } = useQuery({
    queryKey: ['forecast-bank-accounts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await buildSelectQuery('bank_accounts', 'id, current_balance, status')
        .eq('status', 'active');
      return data || [];
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });

  const { data: invoices, isLoading: invoiceLoading } = useQuery({
    queryKey: ['forecast-invoices', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await buildSelectQuery('invoices', 'id, total_amount, paid_amount, due_date, status')
        .in('status', ['sent', 'issued', 'overdue', 'partial']);
      return data || [];
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });

  const { data: bills, isLoading: billLoading } = useQuery({
    queryKey: ['forecast-bills', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await buildSelectQuery('bills', 'id, total_amount, paid_amount, due_date, status')
        .in('status', ['approved', 'pending', 'partial']);
      return data || [];
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });

  const { data: expenses, isLoading: expenseLoading } = useQuery({
    queryKey: ['forecast-expenses', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await buildSelectQuery('expenses', 'id, amount, is_recurring, recurring_period, expense_date, description')
        .eq('is_recurring', true);
      return data || [];
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });

  // DB-First: Use pre-aggregated view instead of pulling 50k raw orders
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

  // DB-First: Use RPC to get historical stats
  const { data: historicalStats, isLoading: histLoading } = useQuery({
    queryKey: ['forecast-historical-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await callRpc('get_forecast_historical_stats', { 
        p_tenant_id: tenantId,
        p_days: 90
      });
      
      if (error) {
        console.error('[useForecastInputs] RPC error:', error);
        return null;
      }
      
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!tenantId && isReady,
    staleTime: 60000,
  });

  const tenantLoading = !isReady;
  const inputs = useMemo<ForecastInputs>(() => {
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const in60Days = new Date(today);
    in60Days.setDate(in60Days.getDate() + 60);
    const in90Days = new Date(today);
    in90Days.setDate(in90Days.getDate() + 90);

    // Bank balance
    const bankBalance = ((bankAccounts || []) as any[]).reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
    
    // AR calculations
    const arData = ((invoices || []) as any[]).map(inv => ({
      balance: (inv.total_amount || 0) - (inv.paid_amount || 0),
      dueDate: new Date(inv.due_date),
      isOverdue: inv.status === 'overdue' || new Date(inv.due_date) < today,
    }));
    
    const arTotal = arData.reduce((sum, a) => sum + a.balance, 0);
    const arOverdue = arData.filter(a => a.isOverdue).reduce((sum, a) => sum + a.balance, 0);
    const arDueWithin30 = arData.filter(a => !a.isOverdue && a.dueDate <= in30Days).reduce((sum, a) => sum + a.balance, 0);
    const arDueWithin60 = arData.filter(a => !a.isOverdue && a.dueDate <= in60Days).reduce((sum, a) => sum + a.balance, 0);
    const arDueWithin90 = arData.filter(a => !a.isOverdue && a.dueDate <= in90Days).reduce((sum, a) => sum + a.balance, 0);

    // AP calculations
    const apData = ((bills || []) as any[]).map(bill => ({
      balance: (bill.total_amount || 0) - (bill.paid_amount || 0),
      dueDate: new Date(bill.due_date),
    }));
    
    const apTotal = apData.reduce((sum, a) => sum + a.balance, 0);
    const apDueWithin30 = apData.filter(a => a.dueDate <= in30Days).reduce((sum, a) => sum + a.balance, 0);
    const apDueWithin60 = apData.filter(a => a.dueDate <= in60Days).reduce((sum, a) => sum + a.balance, 0);
    const apDueWithin90 = apData.filter(a => a.dueDate <= in90Days).reduce((sum, a) => sum + a.balance, 0);

    // Recurring expenses (monthly)
    const expensesByType = new Map<string, number>();
    const sortedExpenses = [...((expenses || []) as any[])].sort((a, b) => {
      const dateA = a.expense_date ? new Date(a.expense_date).getTime() : 0;
      const dateB = b.expense_date ? new Date(b.expense_date).getTime() : 0;
      return dateB - dateA;
    });
    
    for (const exp of sortedExpenses) {
      const key = exp.description || `expense_${exp.id}`;
      if (!expensesByType.has(key)) {
        let monthlyAmount = exp.amount || 0;
        if (exp.recurring_period === 'weekly') {
          monthlyAmount = monthlyAmount * 4;
        } else if (exp.recurring_period === 'yearly') {
          monthlyAmount = monthlyAmount / 12;
        }
        expensesByType.set(key, monthlyAmount);
      }
    }
    
    const monthlyExpenses = Array.from(expensesByType.values()).reduce((sum, amt) => sum + amt, 0);

    // Pending settlements & order stats from pre-aggregated view
    const pendingSettlements = Number(orderStats?.pending_settlements) || 0;
    const avgDailyOrderRevenue = Number(orderStats?.avg_daily_revenue) || 0;

    // Historical averages from RPC
    const histStats = historicalStats as any;
    const totalCredit = Number(histStats?.total_credit) || 0;
    const totalDebit = Number(histStats?.total_debit) || 0;
    const historicalDays = Number(histStats?.unique_days) || 1;

    // Data status
    const hasBankData = (bankAccounts || []).length > 0;
    const hasInvoiceData = (invoices || []).length > 0;
    const hasBillData = (bills || []).length > 0;
    const hasExpenseData = (expenses || []).length > 0;
    const hasOrderData = !!orderStats && Number(orderStats.total_orders) > 0;
    const hasHistoricalData = historicalDays >= 7;

    const missingData: string[] = [];
    if (!hasBankData) missingData.push('Số dư ngân hàng (bank_accounts)');
    if (!hasInvoiceData) missingData.push('Hóa đơn bán hàng (invoices)');
    if (!hasBillData) missingData.push('Hóa đơn mua hàng (bills)');
    if (!hasExpenseData) missingData.push('Chi phí định kỳ (expenses với is_recurring=true)');
    if (!hasOrderData) missingData.push('Đơn hàng eCommerce (external_orders)');
    if (!hasHistoricalData) missingData.push(`Lịch sử giao dịch ngân hàng (cần ≥7 ngày, hiện có ${historicalDays} ngày)`);

    // Data quality score
    let score = 0;
    if (hasBankData) score += 25;
    if (hasInvoiceData) score += 20;
    if (hasBillData) score += 20;
    if (hasHistoricalData) score += 25;
    if (hasExpenseData) score += 5;
    if (hasOrderData) score += 5;

    return {
      bankBalance,
      bankAccountCount: (bankAccounts || []).length,
      arTotal,
      arDueWithin30,
      arDueWithin60,
      arDueWithin90,
      arOverdue,
      invoiceCount: (invoices || []).length,
      apTotal,
      apDueWithin30,
      apDueWithin60,
      apDueWithin90,
      billCount: (bills || []).length,
      recurringExpensesMonthly: monthlyExpenses,
      expenseCount: (expenses || []).length,
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
  }, [bankAccounts, invoices, bills, expenses, orderStats, historicalStats]);

  const isLoading = tenantLoading || bankLoading || invoiceLoading || billLoading || expenseLoading || orderLoading || histLoading;

  return { inputs, isLoading };
}

export type ForecastMethod = 'rule-based' | 'simple';

// Generate forecast data from inputs
export function generateForecast(
  inputs: ForecastInputs, 
  days: number = 90, 
  method: ForecastMethod = 'rule-based',
  salesProjection?: SalesProjection
) {
  const forecast = [];
  const today = new Date();
  
  let balance = inputs.bankBalance;
  
  // Rule-based method: Collection probability curve
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
