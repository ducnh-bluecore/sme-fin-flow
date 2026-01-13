import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { differenceInDays } from 'date-fns';

/**
 * ============================================
 * CENTRAL FINANCIAL METRICS HOOK
 * ============================================
 * 
 * Single source of truth for ALL financial metrics across the application.
 * Every page/component should use this hook instead of calculating metrics independently.
 * 
 * Metrics included:
 * - Cash Conversion Cycle: DSO, DPO, DIO, CCC
 * - Profitability: Gross Margin, EBITDA, Net Profit, Operating Margin
 * - Revenue: Total Revenue, Net Revenue, Revenue by source
 * - Working Capital: AR, AP, Inventory
 * - Cash: Total Cash, Cash Flow
 * 
 * Usage:
 *   const { data: metrics } = useCentralFinancialMetrics();
 *   console.log(metrics.grossMargin, metrics.ebitda, metrics.ccc);
 */

export interface CentralFinancialMetrics {
  // ========== CASH CONVERSION CYCLE ==========
  dso: number;              // Days Sales Outstanding
  dpo: number;              // Days Payable Outstanding  
  dio: number;              // Days Inventory Outstanding
  ccc: number;              // Cash Conversion Cycle = DSO + DIO - DPO

  // ========== PROFITABILITY ==========
  grossMargin: number;      // Gross Profit / Net Sales (%)
  ebitda: number;           // Earnings Before Interest, Taxes, Depreciation, Amortization
  ebitdaMargin: number;     // EBITDA / Net Sales (%)
  netProfit: number;        // Net Income
  netProfitMargin: number;  // Net Income / Net Sales (%)
  operatingMargin: number;  // Operating Income / Net Sales (%)

  // ========== REVENUE ==========
  totalRevenue: number;     // Gross revenue from all sources
  netRevenue: number;       // Net revenue after returns/discounts
  cogs: number;             // Cost of Goods Sold
  grossProfit: number;      // Net Revenue - COGS
  
  // Revenue breakdown
  invoiceRevenue: number;   // From B2B invoices
  orderRevenue: number;     // From e-commerce orders
  contractRevenue: number;  // From recurring contracts

  // ========== EXPENSES ==========
  totalOpex: number;        // Total operating expenses
  depreciation: number;     // Depreciation expense
  interestExpense: number;  // Interest expense
  taxExpense: number;       // Tax expense

  // ========== WORKING CAPITAL ==========
  totalAR: number;          // Total Accounts Receivable
  overdueAR: number;        // Overdue AR
  totalAP: number;          // Total Accounts Payable
  inventory: number;        // Inventory value (estimated)
  workingCapital: number;   // Current Assets - Current Liabilities

  // ========== CASH ==========
  cashOnHand: number;       // Total cash in bank accounts
  cashFlow: number;         // Net cash flow for period

  // ========== UNDERLYING VALUES ==========
  dailySales: number;
  dailyCogs: number;
  dailyPurchases: number;
  daysInPeriod: number;

  // ========== BENCHMARKS ==========
  industryBenchmark: {
    dso: number;
    dio: number;
    dpo: number;
    ccc: number;
    grossMargin: number;
    ebitdaMargin: number;
  };

  // ========== METADATA ==========
  dataStartDate: string;
  dataEndDate: string;
  lastUpdated: string;
}

// Category mapping for expense classification
const EXPENSE_CATEGORY_MAP: Record<string, 'cogs' | 'opex' | 'depreciation' | 'interest' | 'tax'> = {
  'cogs': 'cogs',
  'salary': 'opex',
  'rent': 'opex',
  'utilities': 'opex',
  'marketing': 'opex',
  'logistics': 'opex',
  'depreciation': 'depreciation',
  'interest': 'interest',
  'tax': 'tax',
  'other': 'opex',
};

// Fallback ratios when no expense data exists
const FALLBACK_RATIOS = {
  cogs: 0.65,
  opex: 0.20,
  depreciation: 0.018,
  interest: 0.013,
  tax: 0.20, // Tax rate
};

export function useCentralFinancialMetrics() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { startDateStr, endDateStr, startDate, endDate } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['central-financial-metrics', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<CentralFinancialMetrics> => {
      if (!tenantId) {
        return getEmptyCentralMetrics(startDateStr, endDateStr);
      }

      // Fetch all required data in parallel
      const [
        invoicesRes,
        billsRes,
        ordersRes,
        expensesRes,
        bankAccountsRes,
        revenuesRes,
        transactionsRes
      ] = await Promise.all([
        // Invoices for AR - ALL unpaid (AR is current balance, not period-based)
        supabase
          .from('invoices')
          .select('id, total_amount, paid_amount, status, issue_date, due_date, subtotal, discount_amount')
          .eq('tenant_id', tenantId)
          .not('status', 'eq', 'cancelled'),
        // Bills for AP - ALL unpaid (AP is current balance, not period-based)
        supabase
          .from('bills')
          .select('id, total_amount, paid_amount, status, bill_date, due_date')
          .eq('tenant_id', tenantId)
          .not('status', 'eq', 'cancelled'),
        // E-commerce orders
        supabase
          .from('external_orders')
          .select('total_amount, cost_of_goods, order_date, status, platform_fee, commission_fee, payment_fee, shipping_fee')
          .eq('tenant_id', tenantId)
          .gte('order_date', startDateStr)
          .lte('order_date', endDateStr),
        // Expenses
        supabase
          .from('expenses')
          .select('amount, expense_date, category')
          .eq('tenant_id', tenantId)
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr),
        // Bank accounts for cash
        supabase
          .from('bank_accounts')
          .select('current_balance, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'active'),
        // Recurring revenues
        supabase
          .from('revenues')
          .select('amount, start_date, end_date, revenue_type, source')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
        // Bank transactions for cash flow
        supabase
          .from('bank_transactions')
          .select('amount, transaction_type, transaction_date')
          .eq('tenant_id', tenantId)
          .gte('transaction_date', startDateStr)
          .lte('transaction_date', endDateStr)
      ]);

      const invoices = invoicesRes.data || [];
      const bills = billsRes.data || [];
      const orders = ordersRes.data || [];
      const expenses = expensesRes.data || [];
      const bankAccounts = bankAccountsRes.data || [];
      const revenues = revenuesRes.data || [];
      const transactions = transactionsRes.data || [];

      // ========== PERIOD CALCULATIONS ==========
      const daysInPeriod = Math.max(differenceInDays(endDate, startDate), 1);

      // ========== FILTER DATA BY PERIOD ==========
      const periodInvoices = invoices.filter(inv => {
        const date = new Date(inv.issue_date);
        return date >= startDate && date <= endDate;
      });

      const periodBills = bills.filter(bill => {
        const date = new Date(bill.bill_date);
        return date >= startDate && date <= endDate;
      });

      // ========== REVENUE CALCULATIONS ==========
      // Invoice revenue
      const invoiceRevenue = periodInvoices.reduce((sum, inv) => 
        sum + (inv.subtotal || inv.total_amount || 0) - (inv.discount_amount || 0), 0);

      // E-commerce order revenue
      const completedOrders = orders.filter(o => o.status === 'delivered');
      const orderRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const orderCogs = completedOrders.reduce((sum, o) => sum + (o.cost_of_goods || 0), 0);
      const orderFees = completedOrders.reduce((sum, o) => 
        sum + (o.platform_fee || 0) + (o.commission_fee || 0) + (o.payment_fee || 0) + (o.shipping_fee || 0), 0);

      // Contract revenue
      let contractRevenue = 0;
      revenues.forEach(rev => {
        const revStart = new Date(rev.start_date);
        const revEnd = rev.end_date ? new Date(rev.end_date) : endDate;
        
        if (revStart <= endDate && revEnd >= startDate) {
          if (rev.revenue_type === 'recurring') {
            const effectiveStart = revStart > startDate ? revStart : startDate;
            const effectiveEnd = revEnd < endDate ? revEnd : endDate;
            const months = Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (30 * 24 * 60 * 60 * 1000)));
            contractRevenue += (rev.amount || 0) * months;
          } else {
            contractRevenue += rev.amount || 0;
          }
        }
      });

      const totalRevenue = invoiceRevenue + orderRevenue + contractRevenue;
      const salesReturns = invoiceRevenue * 0.02;
      const netRevenue = totalRevenue - salesReturns;

      // ========== EXPENSE CALCULATIONS ==========
      const hasExpenseData = expenses.length > 0;
      let cogs = orderCogs;
      let totalOpex = 0;
      let depreciation = 0;
      let interestExpense = 0;
      let taxExpense = 0;

      if (hasExpenseData) {
        expenses.forEach(exp => {
          const amount = Number(exp.amount) || 0;
          const type = EXPENSE_CATEGORY_MAP[exp.category] || 'opex';
          
          switch (type) {
            case 'cogs':
              cogs += amount;
              break;
            case 'opex':
              totalOpex += amount;
              break;
            case 'depreciation':
              depreciation += amount;
              break;
            case 'interest':
              interestExpense += amount;
              break;
            case 'tax':
              taxExpense += amount;
              break;
          }
        });
      } else {
        // Use fallback ratios
        cogs = orderCogs > 0 ? orderCogs : netRevenue * FALLBACK_RATIOS.cogs;
        totalOpex = netRevenue * FALLBACK_RATIOS.opex;
        depreciation = netRevenue * FALLBACK_RATIOS.depreciation;
        interestExpense = netRevenue * FALLBACK_RATIOS.interest;
      }

      // ========== PROFITABILITY CALCULATIONS ==========
      const grossProfit = netRevenue - cogs;
      const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

      const operatingIncome = grossProfit - totalOpex;
      const operatingMargin = netRevenue > 0 ? (operatingIncome / netRevenue) * 100 : 0;

      const ebitda = operatingIncome + depreciation;
      const ebitdaMargin = netRevenue > 0 ? (ebitda / netRevenue) * 100 : 0;

      const incomeBeforeTax = operatingIncome - interestExpense;
      const calculatedTax = taxExpense > 0 ? taxExpense : (incomeBeforeTax > 0 ? incomeBeforeTax * FALLBACK_RATIOS.tax : 0);
      const netProfit = incomeBeforeTax - calculatedTax;
      const netProfitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

      // ========== WORKING CAPITAL CALCULATIONS ==========
      // AR - unpaid invoices
      const unpaidInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
      const totalAR = unpaidInvoices.reduce((sum, i) => 
        sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);
      
      const today = new Date();
      const overdueInvoices = unpaidInvoices.filter(i => new Date(i.due_date) < today);
      const overdueAR = overdueInvoices.reduce((sum, i) => 
        sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);

      // AP - unpaid bills
      const unpaidBills = bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled');
      const totalAP = unpaidBills.reduce((sum, b) => 
        sum + ((b.total_amount || 0) - (b.paid_amount || 0)), 0);

      // Inventory estimate (using COGS * 30 days as proxy)
      const dailyCogs = cogs / daysInPeriod;
      const inventory = dailyCogs * 30;

      // Working capital
      const workingCapital = totalAR + inventory - totalAP;

      // ========== CASH CALCULATIONS ==========
      const cashOnHand = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
      
      const cashInflows = transactions
        .filter(t => t.transaction_type === 'credit')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const cashOutflows = transactions
        .filter(t => t.transaction_type === 'debit')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const cashFlow = cashInflows - cashOutflows;

      // ========== CYCLE METRICS ==========
      const dailySales = netRevenue / daysInPeriod;
      
      // Total purchases for DPO calculation
      const totalBillAmount = periodBills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const cogsExpenses = expenses.filter(e => e.category === 'cogs');
      const totalCogsExpenses = cogsExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalPurchases = totalBillAmount + totalCogsExpenses + orderCogs;
      const dailyPurchases = totalPurchases / daysInPeriod;

      // Calculate DSO, DIO, DPO
      const dso = dailySales > 0 ? Math.round(totalAR / dailySales) : 45;
      const dio = dailyCogs > 0 ? Math.round(inventory / dailyCogs) : 30;
      const dpo = dailyPurchases > 0 ? Math.round(totalAP / dailyPurchases) : 30;
      const ccc = dso + dio - dpo;

      // ========== BENCHMARKS ==========
      const industryBenchmark = {
        dso: 35,
        dio: 45,
        dpo: 40,
        ccc: 40,
        grossMargin: 35,
        ebitdaMargin: 15
      };

      return {
        // Cycle metrics
        dso,
        dpo,
        dio,
        ccc,
        
        // Profitability
        grossMargin,
        ebitda,
        ebitdaMargin,
        netProfit,
        netProfitMargin,
        operatingMargin,
        
        // Revenue
        totalRevenue,
        netRevenue,
        cogs,
        grossProfit,
        invoiceRevenue,
        orderRevenue,
        contractRevenue,
        
        // Expenses
        totalOpex,
        depreciation,
        interestExpense,
        taxExpense,
        
        // Working capital
        totalAR,
        overdueAR,
        totalAP,
        inventory,
        workingCapital,
        
        // Cash
        cashOnHand,
        cashFlow,
        
        // Underlying values
        dailySales,
        dailyCogs,
        dailyPurchases,
        daysInPeriod,
        
        // Benchmarks
        industryBenchmark,
        
        // Metadata
        dataStartDate: startDateStr,
        dataEndDate: endDateStr,
        lastUpdated: new Date().toISOString()
      };
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

/**
 * Get empty metrics object for initial/loading states
 */
function getEmptyCentralMetrics(startDate: string, endDate: string): CentralFinancialMetrics {
  return {
    dso: 0,
    dpo: 0,
    dio: 0,
    ccc: 0,
    grossMargin: 0,
    ebitda: 0,
    ebitdaMargin: 0,
    netProfit: 0,
    netProfitMargin: 0,
    operatingMargin: 0,
    totalRevenue: 0,
    netRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    invoiceRevenue: 0,
    orderRevenue: 0,
    contractRevenue: 0,
    totalOpex: 0,
    depreciation: 0,
    interestExpense: 0,
    taxExpense: 0,
    totalAR: 0,
    overdueAR: 0,
    totalAP: 0,
    inventory: 0,
    workingCapital: 0,
    cashOnHand: 0,
    cashFlow: 0,
    dailySales: 0,
    dailyCogs: 0,
    dailyPurchases: 0,
    daysInPeriod: 0,
    industryBenchmark: { dso: 35, dio: 45, dpo: 40, ccc: 40, grossMargin: 35, ebitdaMargin: 15 },
    dataStartDate: startDate,
    dataEndDate: endDate,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Re-export for backwards compatibility
 * Other hooks should migrate to useCentralFinancialMetrics
 */
export { getEmptyCentralMetrics };
