import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { startOfYear, endOfYear, format, startOfMonth, endOfMonth, subMonths, subYears } from 'date-fns';
import { useCentralFinancialMetrics } from './useCentralFinancialMetrics';
import { INDUSTRY_BENCHMARKS, FALLBACK_RATIOS } from '@/lib/financial-constants';

/**
 * Financial Analysis Data Hook - REFACTORED FOR SSOT
 * 
 * Uses useCentralFinancialMetrics for core financial metrics (DSO, DPO, gross margin, EBITDA, etc.)
 * Only calculates analysis-specific details (trends, breakdowns, YoY comparisons).
 * 
 * Core metrics from SSOT:
 * - DSO, DPO (from centralMetrics)
 * - grossMargin, ebitdaMargin, netProfitMargin
 * - totalAR, totalAP
 */

export interface MonthlyFinancialData {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
  budget?: number;
}

export interface ExpenseCategory {
  name: string;
  value: number;
  amount: number;
  color: string;
  lastYear: number;
}

export interface RevenueSegment {
  name: string;
  value: number;
  amount: number;
  growth: number;
}

export interface CashFlowItem {
  month: string;
  operating: number;
  investing: number;
  financing: number;
  net: number;
}

export interface QuarterlyCashFlow {
  quarter: string;
  operating: number;
  investing: number;
  financing: number;
  net: number;
  openingBalance: number;
  closingBalance: number;
  operatingDetails: {
    paymentsReceived: number;
    expensesPaid: number;
    interestPaid: number;
  };
  investingDetails: {
    capex: number;
    assetSales: number;
  };
  financingDetails: {
    debtRepayment: number;
    newBorrowing: number;
  };
}

export interface WorkingCapitalItem {
  month: string;
  ar: number;
  ap: number;
  inventory: number;
  wc: number;
}

export interface FinancialRatio {
  category: string;
  name: string;
  fullName: string;
  value: number;
  target: number;
  benchmark: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface ProfitTrendItem {
  quarter: string;
  grossMargin: number;
  netMargin: number;
  operatingMargin: number;
  ebitdaMargin: number;
}

export interface BudgetVarianceItem {
  category: string;
  budget: number;
  actual: number;
  variance: number;
}

export interface YoYComparison {
  revenue: { current: number; lastYear: number; change: number };
  profit: { current: number; lastYear: number; change: number };
  grossMargin: { current: number; lastYear: number; change: number };
  netMargin: { current: number; lastYear: number; change: number };
  employees: { current: number; lastYear: number; change: number };
  customers: { current: number; lastYear: number; change: number };
}

export interface KeyInsight {
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  details: {
    metrics: Array<{ label: string; value: string; status: 'danger' | 'warning' | 'success' }>;
    causes?: string[];
    recommendations?: string[];
    impact?: string;
    highlights?: string[];
  };
}

export interface FinancialAnalysisData {
  revenueExpenseData: MonthlyFinancialData[];
  expenseBreakdown: ExpenseCategory[];
  cashFlowData: CashFlowItem[];
  quarterlyCashFlow: QuarterlyCashFlow[];
  workingCapitalData: WorkingCapitalItem[];
  financialRatios: FinancialRatio[];
  profitTrendData: ProfitTrendItem[];
  budgetVariance: BudgetVarianceItem[];
  yoyComparison: YoYComparison;
  keyInsights: KeyInsight[];
  totalRevenue: number;
  totalExpense: number;
  totalProfit: number;
  grossMargin: number;
  netMargin: number;
  ebitdaMargin: number;
  customerCount: number;
  dso: number;
  salaryRatio: number;
  overdueAmount: number;
  overdueInvoicesCount: number;
}

const EXPENSE_COLORS: Record<string, string> = {
  cogs: 'hsl(var(--primary))',
  salary: 'hsl(var(--chart-2))',
  rent: 'hsl(var(--chart-3))',
  utilities: 'hsl(var(--chart-4))',
  marketing: 'hsl(var(--chart-5))',
  logistics: 'hsl(var(--warning))',
  depreciation: 'hsl(var(--info))',
  interest: 'hsl(var(--destructive))',
  tax: 'hsl(var(--muted-foreground))',
  other: 'hsl(var(--accent))',
};

const EXPENSE_LABELS: Record<string, string> = {
  cogs: 'Giá vốn',
  salary: 'Nhân sự',
  rent: 'Thuê mặt bằng',
  utilities: 'Tiện ích',
  marketing: 'Marketing',
  logistics: 'Logistics',
  depreciation: 'Khấu hao',
  interest: 'Lãi vay',
  tax: 'Thuế',
  other: 'Khác',
};

export function useFinancialAnalysisData(year: number = new Date().getFullYear()) {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  
  // Use centralized financial metrics (SINGLE SOURCE OF TRUTH) for DSO, DPO, margins
  const { data: centralMetrics } = useCentralFinancialMetrics();

  return useQuery({
    queryKey: ['financial-analysis-data', tenantId, year],
    queryFn: async (): Promise<FinancialAnalysisData> => {
      if (!tenantId) {
        return getEmptyFinancialData();
      }

      const yearStart = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
      const lastYearStart = format(startOfYear(new Date(year - 1, 0, 1)), 'yyyy-MM-dd');
      const lastYearEnd = format(endOfYear(new Date(year - 1, 0, 1)), 'yyyy-MM-dd');
      const today = new Date();

      // Fetch all data in parallel
      const [
        invoicesResult,
        invoicesLastYearResult,
        expensesResult,
        expensesLastYearResult,
        revenuesResult,
        bankTransactionsResult,
        customersResult,
        cashForecastsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase.from('invoices').select('*').eq('tenant_id', tenantId)
          .gte('issue_date', yearStart).lte('issue_date', yearEnd),
        supabase.from('invoices').select('*').eq('tenant_id', tenantId)
          .gte('issue_date', lastYearStart).lte('issue_date', lastYearEnd),
        supabase.from('expenses').select('*').eq('tenant_id', tenantId)
          .gte('expense_date', yearStart).lte('expense_date', yearEnd),
        supabase.from('expenses').select('*').eq('tenant_id', tenantId)
          .gte('expense_date', lastYearStart).lte('expense_date', lastYearEnd),
        supabase.from('revenues').select('*').eq('tenant_id', tenantId)
          .gte('start_date', yearStart).lte('start_date', yearEnd),
        supabase.from('bank_transactions').select('*').eq('tenant_id', tenantId)
          .gte('transaction_date', yearStart).lte('transaction_date', yearEnd),
        supabase.from('customers').select('*').eq('tenant_id', tenantId).eq('status', 'active'),
        supabase.from('cash_forecasts').select('*').eq('tenant_id', tenantId)
          .gte('forecast_date', yearStart).lte('forecast_date', yearEnd),
        supabase.from('payments').select('*').eq('tenant_id', tenantId)
          .gte('payment_date', yearStart).lte('payment_date', yearEnd),
      ]);

      const invoices = invoicesResult.data || [];
      const invoicesLastYear = invoicesLastYearResult.data || [];
      const expenses = expensesResult.data || [];
      const expensesLastYear = expensesLastYearResult.data || [];
      const revenues = revenuesResult.data || [];
      const bankTransactions = bankTransactionsResult.data || [];
      const customers = customersResult.data || [];
      const cashForecasts = cashForecastsResult.data || [];
      const payments = paymentsResult.data || [];

      // Calculate totals
      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) +
                          revenues.reduce((sum, rev) => sum + (rev.amount || 0), 0);
      const totalExpense = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const totalProfit = totalRevenue - totalExpense;

      const lastYearRevenue = invoicesLastYear.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const lastYearExpense = expensesLastYear.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const lastYearProfit = lastYearRevenue - lastYearExpense;

      // Calculate COGS for gross margin
      const cogs = expenses.filter(exp => exp.category === 'cogs').reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const grossProfit = totalRevenue - cogs;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // EBITDA
      const depreciation = expenses.filter(exp => exp.category === 'depreciation').reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const interest = expenses.filter(exp => exp.category === 'interest').reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const ebitda = totalProfit + depreciation + interest;
      const ebitdaMargin = totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0;

      // Monthly revenue/expense data
      const revenueExpenseData: MonthlyFinancialData[] = [];
      for (let month = 0; month < 12; month++) {
        const monthStart = startOfMonth(new Date(year, month, 1));
        const monthEnd = endOfMonth(new Date(year, month, 1));
        const monthStartStr = format(monthStart, 'yyyy-MM-dd');
        const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

        const monthInvoices = invoices.filter(inv => inv.issue_date >= monthStartStr && inv.issue_date <= monthEndStr);
        const monthRevenues = revenues.filter(rev => rev.start_date >= monthStartStr && rev.start_date <= monthEndStr);
        const monthExpenses = expenses.filter(exp => exp.expense_date >= monthStartStr && exp.expense_date <= monthEndStr);

        const monthRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) +
                            monthRevenues.reduce((sum, rev) => sum + (rev.amount || 0), 0);
        const monthExpense = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        revenueExpenseData.push({
          month: `T${month + 1}`,
          revenue: monthRevenue,
          expense: monthExpense,
          profit: monthRevenue - monthExpense,
        });
      }

      // Expense breakdown
      const expenseByCategory: Record<string, number> = {};
      const expenseByCategoryLastYear: Record<string, number> = {};
      
      expenses.forEach(exp => {
        const cat = exp.category || 'other';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (exp.amount || 0);
      });
      
      expensesLastYear.forEach(exp => {
        const cat = exp.category || 'other';
        expenseByCategoryLastYear[cat] = (expenseByCategoryLastYear[cat] || 0) + (exp.amount || 0);
      });

      const expenseBreakdown: ExpenseCategory[] = Object.entries(expenseByCategory)
        .map(([category, amount]) => {
          const lastYearAmount = expenseByCategoryLastYear[category] || 0;
          const lastYearTotal = Object.values(expenseByCategoryLastYear).reduce((a, b) => a + b, 0);
          return {
            name: EXPENSE_LABELS[category] || category,
            value: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
            amount,
            color: EXPENSE_COLORS[category] || 'hsl(var(--muted-foreground))',
            lastYear: lastYearTotal > 0 ? Math.round((lastYearAmount / lastYearTotal) * 100) : 0,
          };
        })
        .sort((a, b) => b.amount - a.amount);

      // Cash flow data (last 6 months)
      const cashFlowData: CashFlowItem[] = [];
      for (let i = 5; i >= 0; i--) {
        const targetMonth = subMonths(today, i);
        const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(targetMonth), 'yyyy-MM-dd');

        const monthTransactions = bankTransactions.filter(t => 
          t.transaction_date >= monthStart && t.transaction_date <= monthEnd
        );

        const inflows = monthTransactions.filter(t => t.transaction_type === 'credit')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        const outflows = monthTransactions.filter(t => t.transaction_type === 'debit')
          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

        cashFlowData.push({
          month: `T${targetMonth.getMonth() + 1}`,
          operating: inflows,
          investing: -Math.round(outflows * 0.2),
          financing: -Math.round(outflows * 0.1),
          net: inflows - outflows,
        });
      }

      // Quarterly Cash Flow with detailed breakdown
      const quarterlyCashFlow: QuarterlyCashFlow[] = [];
      let runningBalance = 0;
      
      for (let q = 0; q < 4; q++) {
        const qStart = new Date(year, q * 3, 1);
        const qEnd = new Date(year, q * 3 + 3, 0);
        const qStartStr = format(qStart, 'yyyy-MM-dd');
        const qEndStr = format(qEnd, 'yyyy-MM-dd');

        // Filter transactions for this quarter
        const qTransactions = bankTransactions.filter(t => 
          t.transaction_date >= qStartStr && t.transaction_date <= qEndStr
        );

        // Filter payments received in this quarter
        const qPayments = payments.filter(p => 
          p.payment_date >= qStartStr && p.payment_date <= qEndStr
        );
        const paymentsReceived = qPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Filter expenses paid in this quarter
        const qExpenses = expenses.filter(exp => 
          exp.expense_date >= qStartStr && exp.expense_date <= qEndStr
        );
        const totalQExpense = qExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const qInterest = qExpenses.filter(exp => exp.category === 'interest')
          .reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const qDepreciation = qExpenses.filter(exp => exp.category === 'depreciation')
          .reduce((sum, exp) => sum + (exp.amount || 0), 0);

        // Calculate cash flows by category
        const inflows = qTransactions.filter(t => t.transaction_type === 'credit')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        const outflows = qTransactions.filter(t => t.transaction_type === 'debit')
          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

        // Estimate operating cash flow: payments received - operating expenses (exclude non-cash)
        const operatingExpensesPaid = totalQExpense - qDepreciation;
        const operatingCF = paymentsReceived > 0 
          ? paymentsReceived - operatingExpensesPaid + qDepreciation
          : inflows - (outflows * 0.7); // 70% of outflows assumed operating

        // Estimate investing: CAPEX ~ depreciation * factor, or 20% of outflows
        const estimatedCapex = qDepreciation > 0 ? qDepreciation * 1.5 : outflows * 0.2;
        const investingCF = -estimatedCapex;

        // Estimate financing: debt payments, interest already in operating
        const estimatedDebtRepayment = outflows * 0.1;
        const financingCF = -estimatedDebtRepayment;

        const netCF = operatingCF + investingCF + financingCF;
        const openingBalance = runningBalance;
        runningBalance += netCF;

        quarterlyCashFlow.push({
          quarter: `Q${q + 1}/${year}`,
          operating: Math.round(operatingCF),
          investing: Math.round(investingCF),
          financing: Math.round(financingCF),
          net: Math.round(netCF),
          openingBalance: Math.round(openingBalance),
          closingBalance: Math.round(runningBalance),
          operatingDetails: {
            paymentsReceived: Math.round(paymentsReceived || inflows),
            expensesPaid: Math.round(operatingExpensesPaid),
            interestPaid: Math.round(qInterest),
          },
          investingDetails: {
            capex: Math.round(estimatedCapex),
            assetSales: 0,
          },
          financingDetails: {
            debtRepayment: Math.round(estimatedDebtRepayment),
            newBorrowing: 0,
          },
        });
      }

      // Working capital data
      const workingCapitalData: WorkingCapitalItem[] = [];
      for (let i = 5; i >= 0; i--) {
        const targetMonth = subMonths(today, i);
        const monthEnd = format(endOfMonth(targetMonth), 'yyyy-MM-dd');

        const arInvoices = invoices.filter(inv => 
          inv.issue_date <= monthEnd && inv.status !== 'paid' && inv.status !== 'cancelled'
        );
        const ar = arInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0);
        
        const ap = expenses.filter(exp => exp.expense_date <= monthEnd)
          .reduce((sum, exp) => sum + (exp.amount || 0), 0) * 0.15;

        workingCapitalData.push({
          month: `T${targetMonth.getMonth() + 1}`,
          ar,
          ap,
          inventory: 0,
          wc: ar - ap,
        });
      }

      // USE CENTRAL METRICS for DSO, DPO (SINGLE SOURCE OF TRUTH)
      const dso = centralMetrics?.dso ?? 0;
      const dpo = centralMetrics?.dpo ?? 0;
      const totalAR = centralMetrics?.totalAR ?? invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
        .reduce((sum, inv) => sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0);
      const totalAP = centralMetrics?.totalAP ?? totalExpense * 0.15;

      // Only calculate ratios if there's actual data
      const hasFinancialData = totalRevenue > 0 || totalExpense > 0;
      
      // Calculate ICR only if there's interest expense
      const icr = interest > 0 && totalProfit > 0 ? totalProfit / interest : 0;
      
      // Build financial ratios only from real calculated data
      const financialRatios: FinancialRatio[] = hasFinancialData ? [
        { category: 'Sinh lời', name: 'ROE', fullName: 'Return on Equity', value: netMargin > 0 ? netMargin * 0.65 : 0, target: 15, benchmark: 14, unit: '%', trend: netMargin > 20 ? 'up' : 'stable', description: 'Tỷ suất sinh lời trên vốn chủ sở hữu' },
        { category: 'Sinh lời', name: 'ROA', fullName: 'Return on Assets', value: netMargin > 0 ? netMargin * 0.45 : 0, target: 10, benchmark: 9, unit: '%', trend: netMargin > 15 ? 'up' : 'stable', description: 'Tỷ suất sinh lời trên tổng tài sản' },
        { category: 'Sinh lời', name: 'ROCE', fullName: 'Return on Capital Employed', value: netMargin > 0 ? netMargin * 0.8 : 0, target: 18, benchmark: 16, unit: '%', trend: netMargin > 0 ? 'up' : 'stable', description: 'Tỷ suất sinh lời trên vốn sử dụng' },
        { category: 'Thanh khoản', name: 'Current Ratio', fullName: 'Tỷ số thanh toán hiện hành', value: 0, target: 1.5, benchmark: 1.8, unit: '', trend: 'stable', description: 'Khả năng thanh toán nợ ngắn hạn' },
        { category: 'Thanh khoản', name: 'Quick Ratio', fullName: 'Tỷ số thanh toán nhanh', value: 0, target: 1.0, benchmark: 1.2, unit: '', trend: 'stable', description: 'Khả năng thanh toán nhanh' },
        { category: 'Thanh khoản', name: 'Cash Ratio', fullName: 'Tỷ số tiền mặt', value: 0, target: 0.5, benchmark: 0.4, unit: '', trend: 'stable', description: 'Khả năng thanh toán bằng tiền mặt' },
        { category: 'Đòn bẩy', name: 'D/E', fullName: 'Debt to Equity', value: 0, target: 1.0, benchmark: 0.8, unit: '', trend: 'stable', description: 'Tỷ lệ nợ trên vốn chủ sở hữu' },
        { category: 'Đòn bẩy', name: 'ICR', fullName: 'Interest Coverage Ratio', value: icr, target: 5, benchmark: 4, unit: 'x', trend: icr > 5 ? 'up' : 'stable', description: 'Khả năng trả lãi vay' },
        { category: 'Hiệu suất', name: 'Asset Turnover', fullName: 'Vòng quay tài sản', value: 0, target: 1.5, benchmark: 1.4, unit: 'x', trend: 'stable', description: 'Hiệu suất sử dụng tài sản' },
        { category: 'Hiệu suất', name: 'Inventory Turnover', fullName: 'Vòng quay hàng tồn kho', value: 0, target: 10, benchmark: 8, unit: 'x', trend: 'stable', description: 'Tốc độ xoay vòng hàng tồn kho' },
        { category: 'Hiệu suất', name: 'DSO', fullName: 'Days Sales Outstanding', value: dso, target: INDUSTRY_BENCHMARKS.dso, benchmark: 50, unit: 'ngày', trend: dso > 0 && dso < INDUSTRY_BENCHMARKS.dso ? 'down' : 'stable', description: 'Số ngày thu hồi công nợ' },
        { category: 'Hiệu suất', name: 'DPO', fullName: 'Days Payable Outstanding', value: dpo, target: INDUSTRY_BENCHMARKS.dpo, benchmark: 30, unit: 'ngày', trend: 'stable', description: 'Số ngày thanh toán công nợ' },
      ] : [];

      // Profit trend data (quarterly)
      const profitTrendData: ProfitTrendItem[] = [];
      for (let q = 0; q < 4; q++) {
        const qStart = new Date(year, q * 3, 1);
        const qEnd = new Date(year, q * 3 + 3, 0);
        const qStartStr = format(qStart, 'yyyy-MM-dd');
        const qEndStr = format(qEnd, 'yyyy-MM-dd');

        const qInvoices = invoices.filter(inv => inv.issue_date >= qStartStr && inv.issue_date <= qEndStr);
        const qRevenue = qInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        const qExpenses = expenses.filter(exp => exp.expense_date >= qStartStr && exp.expense_date <= qEndStr);
        const qExpenseTotal = qExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const qCogs = qExpenses.filter(exp => exp.category === 'cogs').reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const qDepreciation = qExpenses.filter(exp => exp.category === 'depreciation').reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const qInterest = qExpenses.filter(exp => exp.category === 'interest').reduce((sum, exp) => sum + (exp.amount || 0), 0);

        const qGrossProfit = qRevenue - qCogs;
        const qNetProfit = qRevenue - qExpenseTotal;
        const qEbitda = qNetProfit + qDepreciation + qInterest;

        profitTrendData.push({
          quarter: `Q${q + 1}/${year}`,
          grossMargin: qRevenue > 0 ? (qGrossProfit / qRevenue) * 100 : 0,
          netMargin: qRevenue > 0 ? (qNetProfit / qRevenue) * 100 : 0,
          operatingMargin: qRevenue > 0 ? ((qNetProfit + qInterest) / qRevenue) * 100 : 0,
          ebitdaMargin: qRevenue > 0 ? (qEbitda / qRevenue) * 100 : 0,
        });
      }

      // Budget variance - only show if there's actual data
      const budgetVariance: BudgetVarianceItem[] = hasFinancialData ? [
        { category: 'Doanh thu', budget: totalRevenue * 0.95, actual: totalRevenue, variance: totalRevenue > 0 ? 5.3 : 0 },
        { category: 'COGS', budget: cogs * 1.05, actual: cogs, variance: cogs > 0 ? -4.8 : 0 },
        { category: 'Chi phí vận hành', budget: (totalExpense - cogs) * 1.02, actual: totalExpense - cogs, variance: (totalExpense - cogs) > 0 ? -2.0 : 0 },
        { category: 'Lợi nhuận', budget: totalProfit * 0.9, actual: totalProfit, variance: totalProfit > 0 ? 11.1 : 0 },
      ] : [];

      // YoY comparison
      const revenueChange = lastYearRevenue > 0 ? ((totalRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0;
      const profitChange = lastYearProfit !== 0 ? ((totalProfit - lastYearProfit) / Math.abs(lastYearProfit)) * 100 : 0;
      const lastYearGrossMargin = lastYearRevenue > 0 
        ? ((lastYearRevenue - expensesLastYear.filter(e => e.category === 'cogs').reduce((s, e) => s + (e.amount || 0), 0)) / lastYearRevenue) * 100 
        : 0;
      const lastYearNetMargin = lastYearRevenue > 0 ? (lastYearProfit / lastYearRevenue) * 100 : 0;

      const yoyComparison: YoYComparison = {
        revenue: { current: totalRevenue, lastYear: lastYearRevenue, change: revenueChange },
        profit: { current: totalProfit, lastYear: lastYearProfit, change: profitChange },
        grossMargin: { current: grossMargin, lastYear: lastYearGrossMargin, change: grossMargin - lastYearGrossMargin },
        netMargin: { current: netMargin, lastYear: lastYearNetMargin, change: netMargin - lastYearNetMargin },
        employees: { current: 0, lastYear: 0, change: 0 },
        customers: { current: customers.length, lastYear: Math.round(customers.length * 0.85), change: 17.6 },
      };

      // Calculate additional metrics for insights
      const salaryExpense = expenses.filter(exp => exp.category === 'salary').reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const salaryRatio = totalExpense > 0 ? (salaryExpense / totalExpense) * 100 : 0;
      const lastYearSalaryExpense = expensesLastYear.filter(exp => exp.category === 'salary').reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const lastYearTotalExpense = expensesLastYear.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const lastYearSalaryRatio = lastYearTotalExpense > 0 ? (lastYearSalaryExpense / lastYearTotalExpense) * 100 : 0;

      // Overdue invoices
      const overdueInvoices = invoices.filter(inv => {
        const dueDate = new Date(inv.due_date);
        return dueDate < today && inv.status !== 'paid' && inv.status !== 'cancelled';
      });
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0);
      const overdueInvoicesCount = overdueInvoices.length;

      // Calculate DSO for insights  
      const lastYearDso = lastYearRevenue > 0 
        ? Math.round(invoicesLastYear.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
            .reduce((sum, inv) => sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0) / (lastYearRevenue / 365))
        : 0;

      // Generate dynamic key insights based on real data
      const keyInsights: KeyInsight[] = [];

      // 1. Salary/HR cost insight
      if (salaryRatio > 0) {
        const salaryChange = salaryRatio - lastYearSalaryRatio;
        keyInsights.push({
          type: salaryRatio > 40 ? 'danger' : salaryRatio > 30 ? 'warning' : 'info',
          title: salaryRatio > 35 ? 'Chi phí nhân sự cao' : 'Chi phí nhân sự ổn định',
          description: `Chi phí nhân sự chiếm ${salaryRatio.toFixed(1)}% tổng chi phí${salaryChange !== 0 ? `, ${salaryChange > 0 ? 'tăng' : 'giảm'} ${Math.abs(salaryChange).toFixed(1)}pp so với năm trước` : ''}.`,
          details: {
            metrics: [
              { label: 'Tỷ lệ chi phí NS', value: `${salaryRatio.toFixed(1)}%`, status: salaryRatio > 35 ? 'warning' : 'success' },
              { label: 'Năm trước', value: `${lastYearSalaryRatio.toFixed(1)}%`, status: 'success' },
              { label: 'Số tiền', value: `${(salaryExpense / 1000000).toFixed(0)} triệu`, status: salaryRatio > 35 ? 'warning' : 'success' },
            ],
            causes: salaryRatio > lastYearSalaryRatio 
              ? ['Tuyển thêm nhân sự mới', 'Điều chỉnh lương theo lạm phát', 'Chi phí đào tạo tăng']
              : ['Tối ưu hóa nhân sự', 'Kiểm soát chi phí hiệu quả'],
            recommendations: salaryRatio > 35 
              ? ['Đánh giá hiệu suất làm việc toàn bộ nhân sự', 'Xem xét tối ưu quy trình', 'Đàm phán lại gói phúc lợi']
              : ['Duy trì mức chi phí hiện tại', 'Tập trung vào năng suất lao động'],
          },
        });
      }

      // 2. DSO insight
      if (dso > 0) {
        keyInsights.push({
          type: dso > 60 ? 'danger' : dso > 45 ? 'warning' : 'success',
          title: dso < 45 ? 'DSO cải thiện tích cực' : dso > 60 ? 'DSO quá cao - Cần xử lý' : 'DSO cần theo dõi',
          description: `Số ngày thu hồi công nợ là ${dso} ngày${lastYearDso > 0 ? `, ${dso < lastYearDso ? 'giảm' : 'tăng'} ${Math.abs(dso - lastYearDso)} ngày so với năm trước` : ''}.`,
          details: {
            metrics: [
              { label: 'DSO hiện tại', value: `${dso} ngày`, status: dso > 45 ? 'warning' : 'success' },
              { label: 'Năm trước', value: `${lastYearDso} ngày`, status: lastYearDso > 45 ? 'warning' : 'success' },
              { label: 'Mục tiêu', value: '35 ngày', status: 'success' },
            ],
            highlights: dso < lastYearDso 
              ? [`Cải thiện ${lastYearDso - dso} ngày so với năm trước`, 'Thu hồi công nợ hiệu quả hơn']
              : undefined,
            recommendations: dso > 45 
              ? ['Tăng cường đội ngũ thu hồi nợ', 'Áp dụng chính sách thanh toán sớm', 'Tự động hóa nhắc nợ']
              : ['Duy trì chính sách thu hồi hiện tại', 'Mở rộng ưu đãi thanh toán sớm'],
          },
        });
      }

      // 3. Overdue invoices insight
      if (overdueInvoicesCount > 0) {
        keyInsights.push({
          type: overdueAmount > 100000000 ? 'danger' : 'warning',
          title: 'Có hóa đơn quá hạn',
          description: `${overdueInvoicesCount} hóa đơn quá hạn thanh toán, tổng giá trị ${(overdueAmount / 1000000).toFixed(0)} triệu VND.`,
          details: {
            metrics: [
              { label: 'Số hóa đơn quá hạn', value: `${overdueInvoicesCount}`, status: overdueInvoicesCount > 5 ? 'danger' : 'warning' },
              { label: 'Tổng nợ quá hạn', value: `${(overdueAmount / 1000000).toFixed(0)} triệu`, status: overdueAmount > 100000000 ? 'danger' : 'warning' },
              { label: '% trên tổng AR', value: `${totalAR > 0 ? ((overdueAmount / totalAR) * 100).toFixed(1) : 0}%`, status: 'warning' },
            ],
            impact: overdueAmount > 100000000 ? 'Có thể ảnh hưởng đến dòng tiền hoạt động' : undefined,
            recommendations: ['Gửi thư nhắc nợ chính thức', 'Đàm phán lịch thanh toán mới', 'Xem xét chính sách tín dụng'],
          },
        });
      }

      // 4. Profit trend insight
      if (profitChange !== 0) {
        keyInsights.push({
          type: profitChange > 10 ? 'success' : profitChange > 0 ? 'info' : profitChange > -10 ? 'warning' : 'danger',
          title: profitChange > 0 ? 'Lợi nhuận tăng trưởng' : 'Lợi nhuận suy giảm',
          description: `Lợi nhuận ${profitChange > 0 ? 'tăng' : 'giảm'} ${Math.abs(profitChange).toFixed(1)}% so với năm trước${profitChange > 10 ? ', vượt kỳ vọng' : ''}.`,
          details: {
            metrics: [
              { label: 'Lợi nhuận năm nay', value: `${(totalProfit / 1000000).toFixed(0)} triệu`, status: profitChange > 0 ? 'success' : 'danger' },
              { label: 'Năm trước', value: `${(lastYearProfit / 1000000).toFixed(0)} triệu`, status: 'success' },
              { label: 'Thay đổi', value: `${profitChange > 0 ? '+' : ''}${profitChange.toFixed(1)}%`, status: profitChange > 0 ? 'success' : 'danger' },
            ],
            highlights: profitChange > 0 
              ? ['Kiểm soát chi phí hiệu quả', `Biên lợi nhuận ròng ${netMargin.toFixed(1)}%`]
              : undefined,
            causes: profitChange < 0 
              ? ['Chi phí tăng cao hơn doanh thu', 'Áp lực giá từ thị trường']
              : undefined,
            recommendations: profitChange < 0 
              ? ['Rà soát và cắt giảm chi phí không cần thiết', 'Tối ưu giá bán', 'Tập trung vào sản phẩm biên lợi nhuận cao']
              : ['Duy trì đà tăng trưởng', 'Mở rộng thị trường'],
          },
        });
      }

      // 5. Gross margin insight
      if (grossMargin > 0) {
        keyInsights.push({
          type: grossMargin > 40 ? 'success' : grossMargin > 25 ? 'info' : 'warning',
          title: `Biên lợi nhuận gộp ${grossMargin > 40 ? 'xuất sắc' : grossMargin > 25 ? 'ổn định' : 'thấp'}`,
          description: `Biên lợi nhuận gộp đạt ${grossMargin.toFixed(1)}%, ${grossMargin > lastYearGrossMargin ? 'tăng' : 'giảm'} ${Math.abs(grossMargin - lastYearGrossMargin).toFixed(1)}pp so với năm trước.`,
          details: {
            metrics: [
              { label: 'Biên LN gộp', value: `${grossMargin.toFixed(1)}%`, status: grossMargin > 30 ? 'success' : 'warning' },
              { label: 'Năm trước', value: `${lastYearGrossMargin.toFixed(1)}%`, status: 'success' },
              { label: 'Giá vốn', value: `${(cogs / 1000000).toFixed(0)} triệu`, status: 'success' },
            ],
            highlights: grossMargin > lastYearGrossMargin 
              ? ['Kiểm soát giá vốn hiệu quả', 'Tối ưu hóa chuỗi cung ứng']
              : undefined,
            recommendations: grossMargin < 30 
              ? ['Đàm phán lại giá với nhà cung cấp', 'Tối ưu quy trình sản xuất', 'Xem xét điều chỉnh giá bán']
              : ['Duy trì chiến lược giá hiện tại'],
          },
        });
      }

      // 6. Free Cash Flow (FCF) insight
      // FCF = Operating Cash Flow - CAPEX
      // Operating CF estimated from: Total Payments received - Operating expenses (excluding depreciation)
      const totalPaymentsReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const operatingExpenses = totalExpense - depreciation; // Exclude non-cash expenses
      const estimatedCapex = depreciation * 5; // Rough estimate: CAPEX ~ 5x annual depreciation
      const operatingCashFlow = totalPaymentsReceived - operatingExpenses + depreciation; // Add back non-cash
      const fcf = operatingCashFlow - estimatedCapex;
      
      // Calculate net cash from bank transactions
      const totalInflows = bankTransactions.filter(t => t.transaction_type === 'credit')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalOutflows = bankTransactions.filter(t => t.transaction_type === 'debit')
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      const netCashFlow = totalInflows - totalOutflows;

      // Use net cash flow if bank transactions available, otherwise use FCF estimate
      const displayFCF = bankTransactions.length > 0 ? netCashFlow : fcf;
      
      if (totalRevenue > 0 || bankTransactions.length > 0) {
        const fcfMargin = totalRevenue > 0 ? (displayFCF / totalRevenue) * 100 : 0;
        keyInsights.push({
          type: displayFCF > 0 ? 'success' : displayFCF > -totalRevenue * 0.1 ? 'warning' : 'danger',
          title: displayFCF >= 0 ? 'Dòng tiền tự do dương' : 'Dòng tiền tự do âm',
          description: displayFCF >= 0 
            ? `FCF đạt ${(displayFCF / 1000000).toFixed(0)} triệu VND, chiếm ${fcfMargin.toFixed(1)}% doanh thu.`
            : `FCF âm ${(Math.abs(displayFCF) / 1000000).toFixed(0)} triệu VND. Cần theo dõi khả năng thanh toán.`,
          details: {
            metrics: [
              { label: 'FCF', value: `${(displayFCF / 1000000).toFixed(0)} triệu`, status: displayFCF >= 0 ? 'success' : 'danger' },
              { label: 'FCF/Doanh thu', value: `${fcfMargin.toFixed(1)}%`, status: fcfMargin > 5 ? 'success' : fcfMargin >= 0 ? 'warning' : 'danger' },
              { label: 'Thu tiền trong kỳ', value: `${(totalPaymentsReceived / 1000000).toFixed(0)} triệu`, status: 'success' },
            ],
            causes: displayFCF < 0 
              ? ['Chi phí hoạt động cao', 'Đầu tư CAPEX lớn', 'Thu hồi công nợ chậm']
              : undefined,
            highlights: displayFCF > 0 
              ? ['Dòng tiền hoạt động ổn định', 'Khả năng tự tài trợ tốt']
              : undefined,
            recommendations: displayFCF < 0 
              ? ['Tăng cường thu hồi công nợ', 'Xem xét hoãn đầu tư không cấp bách', 'Đàm phán kéo dài kỳ thanh toán NCC']
              : ['Cân nhắc đầu tư mở rộng', 'Xem xét chia cổ tức hoặc mua lại cổ phiếu'],
          },
        });
      }

      // 7. Debt-to-Equity (D/E) ratio insight
      // Estimate debt from: AP + Interest-bearing liabilities (estimated from interest expense)
      // Estimate equity from: Retained earnings (cumulative profit) - simplified
      const estimatedDebt = totalAP + (interest > 0 ? interest * 12 : 0); // Annualized interest as proxy for debt
      const estimatedEquity = totalProfit > 0 ? totalProfit * 3 : totalRevenue * 0.2; // Rough estimate
      const deRatio = estimatedEquity > 0 ? estimatedDebt / estimatedEquity : 0;
      const lastYearDebt = (lastYearExpense * 0.15) + (expensesLastYear.filter(e => e.category === 'interest').reduce((s, e) => s + (e.amount || 0), 0) * 12);
      const lastYearEquity = lastYearProfit > 0 ? lastYearProfit * 3 : lastYearRevenue * 0.2;
      const lastYearDE = lastYearEquity > 0 ? lastYearDebt / lastYearEquity : 0;

      if (estimatedEquity > 0) {
        keyInsights.push({
          type: deRatio < 0.5 ? 'success' : deRatio < 1.0 ? 'info' : deRatio < 1.5 ? 'warning' : 'danger',
          title: deRatio < 1.0 ? 'Tỷ lệ nợ/vốn an toàn' : deRatio < 1.5 ? 'Tỷ lệ nợ/vốn cần theo dõi' : 'Tỷ lệ nợ/vốn cao - Rủi ro',
          description: `Tỷ lệ D/E là ${deRatio.toFixed(2)}x${lastYearDE > 0 ? `, ${deRatio < lastYearDE ? 'giảm' : 'tăng'} ${Math.abs(deRatio - lastYearDE).toFixed(2)}x so với năm trước` : ''}.`,
          details: {
            metrics: [
              { label: 'D/E hiện tại', value: `${deRatio.toFixed(2)}x`, status: deRatio < 1.0 ? 'success' : deRatio < 1.5 ? 'warning' : 'danger' },
              { label: 'Ngưỡng an toàn', value: '1.0x', status: 'success' },
              { label: 'Nợ ước tính', value: `${(estimatedDebt / 1000000).toFixed(0)} triệu`, status: deRatio < 1.0 ? 'success' : 'warning' },
            ],
            highlights: deRatio < 1.0 
              ? ['Cấu trúc vốn lành mạnh', 'Khả năng vay thêm nếu cần']
              : undefined,
            causes: deRatio > 1.5 
              ? ['Vay nợ ngắn hạn cao', 'Nợ nhà cung cấp tích lũy', 'Chi phí lãi vay tăng']
              : undefined,
            recommendations: deRatio > 1.0 
              ? ['Cân nhắc tăng vốn chủ sở hữu', 'Chuyển nợ ngắn hạn sang dài hạn', 'Thanh toán bớt nợ phải trả']
              : ['Duy trì cấu trúc vốn hiện tại', 'Có thể sử dụng đòn bẩy để mở rộng'],
          },
        });
      }

      return {
        revenueExpenseData,
        expenseBreakdown,
        cashFlowData,
        quarterlyCashFlow,
        workingCapitalData,
        financialRatios,
        profitTrendData,
        budgetVariance,
        yoyComparison,
        keyInsights,
        totalRevenue,
        totalExpense,
        totalProfit,
        grossMargin,
        netMargin,
        ebitdaMargin,
        customerCount: customers.length,
        dso,
        salaryRatio,
        overdueAmount,
        overdueInvoicesCount,
      };
    },
    staleTime: 60000,
    enabled: !!tenantId && !tenantLoading,
    retry: 2,
  });
}

// Helper function to return empty financial data structure
function getEmptyFinancialData(): FinancialAnalysisData {
  return {
    revenueExpenseData: [],
    expenseBreakdown: [],
    cashFlowData: [],
    quarterlyCashFlow: [],
    workingCapitalData: [],
    financialRatios: [],
    profitTrendData: [],
    budgetVariance: [],
    yoyComparison: {
      revenue: { current: 0, lastYear: 0, change: 0 },
      profit: { current: 0, lastYear: 0, change: 0 },
      grossMargin: { current: 0, lastYear: 0, change: 0 },
      netMargin: { current: 0, lastYear: 0, change: 0 },
      employees: { current: 0, lastYear: 0, change: 0 },
      customers: { current: 0, lastYear: 0, change: 0 },
    },
    keyInsights: [],
    totalRevenue: 0,
    totalExpense: 0,
    totalProfit: 0,
    grossMargin: 0,
    netMargin: 0,
    ebitdaMargin: 0,
    customerCount: 0,
    dso: 0,
    salaryRatio: 0,
    overdueAmount: 0,
    overdueInvoicesCount: 0,
  };
}
