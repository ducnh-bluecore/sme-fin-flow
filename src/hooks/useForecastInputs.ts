import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useMemo } from 'react';

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
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();

  // Fetch all required data in parallel
  const { data: bankAccounts, isLoading: bankLoading } = useQuery({
    queryKey: ['forecast-bank-accounts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('bank_accounts')
        .select('id, current_balance, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  const { data: invoices, isLoading: invoiceLoading } = useQuery({
    queryKey: ['forecast-invoices', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, due_date, status')
        .eq('tenant_id', tenantId)
        .in('status', ['sent', 'issued', 'overdue', 'partial']);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  const { data: bills, isLoading: billLoading } = useQuery({
    queryKey: ['forecast-bills', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('bills')
        .select('id, total_amount, paid_amount, due_date, status')
        .eq('tenant_id', tenantId)
        .in('status', ['approved', 'pending', 'partial']);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  const { data: expenses, isLoading: expenseLoading } = useQuery({
    queryKey: ['forecast-expenses', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('expenses')
        .select('id, amount, is_recurring, recurring_period, expense_date, description')
        .eq('tenant_id', tenantId)
        .eq('is_recurring', true);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  const { data: orders, isLoading: orderLoading } = useQuery({
    queryKey: ['forecast-orders', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('external_orders')
        .select('id, seller_income, status, delivered_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'delivered')
        .limit(50000);
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  // DB-First: Use RPC to get historical stats (avoids 1000 row limit)
  const { data: historicalStats, isLoading: histLoading } = useQuery({
    queryKey: ['forecast-historical-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .rpc('get_forecast_historical_stats', { 
          p_tenant_id: tenantId,
          p_days: 90
        });
      
      if (error) {
        console.error('[useForecastInputs] RPC error:', error);
        return null;
      }
      
      // RPC returns array with single row
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!tenantId,
    staleTime: 60000,
  });

  const inputs = useMemo<ForecastInputs>(() => {
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const in60Days = new Date(today);
    in60Days.setDate(in60Days.getDate() + 60);
    const in90Days = new Date(today);
    in90Days.setDate(in90Days.getDate() + 90);

    // Bank balance
    const bankBalance = (bankAccounts || []).reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
    
    // AR calculations
    const arData = (invoices || []).map(inv => ({
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
    const apData = (bills || []).map(bill => ({
      balance: (bill.total_amount || 0) - (bill.paid_amount || 0),
      dueDate: new Date(bill.due_date),
    }));
    
    const apTotal = apData.reduce((sum, a) => sum + a.balance, 0);
    const apDueWithin30 = apData.filter(a => a.dueDate <= in30Days).reduce((sum, a) => sum + a.balance, 0);
    const apDueWithin60 = apData.filter(a => a.dueDate <= in60Days).reduce((sum, a) => sum + a.balance, 0);
    const apDueWithin90 = apData.filter(a => a.dueDate <= in90Days).reduce((sum, a) => sum + a.balance, 0);

    // Recurring expenses (monthly) - Only count UNIQUE expense types from most recent month
    // Group expenses by description/type and take the most recent value for each
    const expensesByType = new Map<string, number>();
    const sortedExpenses = [...(expenses || [])].sort((a, b) => {
      const dateA = a.expense_date ? new Date(a.expense_date).getTime() : 0;
      const dateB = b.expense_date ? new Date(b.expense_date).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
    
    // For each expense type, only keep the most recent value
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

    // Pending settlements (orders delivered but not yet paid out, typically T+7-14)
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const pendingSettlements = (orders || [])
      .filter(o => o.delivered_at && new Date(o.delivered_at) > fourteenDaysAgo)
      .reduce((sum, o) => sum + (o.seller_income || 0), 0);

    // Historical averages - now from RPC (DB-First)
    const totalCredit = Number(historicalStats?.total_credit) || 0;
    const totalDebit = Number(historicalStats?.total_debit) || 0;
    const historicalDays = Number(historicalStats?.unique_days) || 1;

    // Data status
    const hasBankData = (bankAccounts || []).length > 0;
    const hasInvoiceData = (invoices || []).length > 0;
    const hasBillData = (bills || []).length > 0;
    const hasExpenseData = (expenses || []).length > 0;
    const hasOrderData = (orders || []).length > 0;
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
      orderCount: (orders || []).length,
      avgDailyInflow: totalCredit / historicalDays,
      avgDailyOutflow: totalDebit / historicalDays,
      historicalDays,
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
  }, [bankAccounts, invoices, bills, expenses, orders, historicalStats]);

  const isLoading = tenantLoading || bankLoading || invoiceLoading || billLoading || expenseLoading || orderLoading || histLoading;

  return { inputs, isLoading };
}

export type ForecastMethod = 'ai' | 'simple';

// Generate forecast data from inputs
export function generateForecast(inputs: ForecastInputs, days: number = 90, method: ForecastMethod = 'ai') {
  const forecast = [];
  const today = new Date();
  
  let balance = inputs.bankBalance;
  
  // AI method: Collection probability curve (decreases as days past due increase)
  const getCollectionProbability = (daysFromDue: number) => {
    if (daysFromDue <= 0) return 0.85; // Before due: 85%
    if (daysFromDue <= 30) return 0.70; // 1-30 days overdue: 70%
    if (daysFromDue <= 60) return 0.50; // 31-60 days: 50%
    if (daysFromDue <= 90) return 0.30; // 61-90 days: 30%
    return 0.10; // >90 days: 10%
  };

  // Simple method: Fixed 15% AR per week = ~2.14% per day
  const SIMPLE_DAILY_COLLECTION_RATE = 0.15 / 7; // 15%/week

  // Daily expense rate from recurring
  const dailyRecurringExpense = inputs.recurringExpensesMonthly / 30;
  
  // Track remaining AR for simple method
  let remainingAR = inputs.arTotal;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // Expected inflows
    let inflow = 0;
    
    if (method === 'simple') {
      // Simple method: Fixed 15% AR/week (~2.14%/day)
      const dailyCollection = remainingAR * SIMPLE_DAILY_COLLECTION_RATE;
      inflow += dailyCollection;
      remainingAR -= dailyCollection;
      
      // eCommerce settlements
      if (i >= 7 && i <= 21) {
        inflow += inputs.pendingSettlements / 14;
      }
    } else {
      // AI method: AR collections based on probability
      if (i < 30) {
        inflow += (inputs.arDueWithin30 / 30) * getCollectionProbability(i);
      } else if (i < 60) {
        inflow += (inputs.arDueWithin60 - inputs.arDueWithin30) / 30 * getCollectionProbability(i - 30);
      } else {
        inflow += (inputs.arDueWithin90 - inputs.arDueWithin60) / 30 * getCollectionProbability(i - 60);
      }
      
      // Overdue AR (collect 3% daily with decreasing probability)
      inflow += (inputs.arOverdue * 0.03) * getCollectionProbability(i + 30);
      
      // eCommerce settlements (typically 7-14 days after delivery)
      if (i >= 7 && i <= 21) {
        inflow += inputs.pendingSettlements / 14;
      }
    }
    
    // Add historical average if we don't have specific AR data
    if (!inputs.dataStatus.hasInvoiceData && inputs.dataStatus.hasHistoricalData) {
      inflow = inputs.avgDailyInflow;
    }

    // Expected outflows
    let outflow = 0;
    
    // AP payments (spread based on due dates)
    if (i < 30) {
      outflow += inputs.apDueWithin30 / 30;
    } else if (i < 60) {
      outflow += (inputs.apDueWithin60 - inputs.apDueWithin30) / 30;
    } else {
      outflow += (inputs.apDueWithin90 - inputs.apDueWithin60) / 30;
    }
    
    // Recurring expenses
    outflow += dailyRecurringExpense;
    
    // Add historical average if we don't have specific AP data
    if (!inputs.dataStatus.hasBillData && inputs.dataStatus.hasHistoricalData) {
      outflow = inputs.avgDailyOutflow;
    }

    // Update balance
    balance = balance + inflow - outflow;
    
    // Confidence intervals
    let upperBound: number;
    let lowerBound: number;

    if (method === 'simple') {
      // Simple method: No confidence bands
      upperBound = balance;
      lowerBound = balance;
    } else {
      // AI method: Widen over time (1.2%/day, max 60%)
      const uncertainty = Math.min(0.6, i * 0.012);
      upperBound = balance * (1 + uncertainty);
      lowerBound = balance * (1 - uncertainty);

      // If balance is negative, math above can invert bounds; normalize.
      if (upperBound < lowerBound) {
        const tmp = upperBound;
        upperBound = lowerBound;
        lowerBound = tmp;
      }
    }

    forecast.push({
      date: date.toISOString().split('T')[0],
      displayDate: `${date.getDate()}/${date.getMonth() + 1}`,
      // IMPORTANT: do not clamp negative balances to 0.
      // Negative cash is a critical signal and must be surfaced.
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
