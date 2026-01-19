import { useQuery, useQueryClient } from '@tanstack/react-query';
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
 * PERFORMANCE: This hook now uses a cache-first approach:
 * 1. Check for cached metrics in dashboard_kpi_cache
 * 2. If cache is fresh (<15 min), return immediately
 * 3. If cache is stale/missing, calculate real-time + update cache in background
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

// Max age for cache before recalculation (15 minutes)
const CACHE_MAX_AGE_MS = 15 * 60 * 1000;

export interface CentralFinancialMetrics {
  // ========== CASH CONVERSION CYCLE ==========
  // DSO = (AR / Net Revenue) * Days in Period
  // DIO = (Inventory / COGS) * Days in Period
  // DPO = (AP / COGS) * Days in Period
  // CCC = DSO + DIO - DPO
  dso: number;              // Days Sales Outstanding
  dpo: number;              // Days Payable Outstanding  
  dio: number;              // Days Inventory Outstanding
  ccc: number;              // Cash Conversion Cycle = DSO + DIO - DPO

  // ========== PROFITABILITY ==========
  // Gross Margin = (Net Revenue - COGS) / Net Revenue * 100%
  // Contribution Margin = (Net Revenue - COGS - Variable Costs) / Net Revenue * 100%
  grossMargin: number;      // Gross Profit / Net Revenue (%) - ONLY COGS
  contributionMargin: number; // CM / Net Revenue (%) - COGS + Variable Costs (shipping, marketing)
  ebitda: number;           // Earnings Before Interest, Taxes, Depreciation, Amortization
  ebitdaMargin: number;     // EBITDA / Net Revenue (%)
  netProfit: number;        // Net Income
  netProfitMargin: number;  // Net Income / Net Revenue (%)
  operatingMargin: number;  // Operating Income / Net Revenue (%)

  // ========== REVENUE ==========
  totalRevenue: number;     // Gross revenue from all sources
  netRevenue: number;       // Net revenue after returns/discounts
  cogs: number;             // Cost of Goods Sold
  grossProfit: number;      // Net Revenue - COGS
  contributionProfit: number; // Net Revenue - COGS - Variable Costs
  
  // Revenue breakdown
  invoiceRevenue: number;   // From B2B invoices
  orderRevenue: number;     // From e-commerce orders
  contractRevenue: number;  // From recurring contracts

  // ========== EXPENSES ==========
  totalOpex: number;        // Total operating expenses (fixed)
  variableCosts: number;    // Variable costs (shipping, marketing)
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
  cashNext7Days: number;    // Forecasted cash position in 7 days

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

// Import centralized constants (SSOT for benchmarks and ratios)
import { 
  INDUSTRY_BENCHMARKS, 
  FALLBACK_RATIOS as CENTRAL_FALLBACK_RATIOS 
} from '@/lib/financial-constants';

// Use centralized fallback ratios
const FALLBACK_RATIOS = CENTRAL_FALLBACK_RATIOS;

export function useCentralFinancialMetrics() {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { startDateStr, endDateStr, startDate, endDate } = useDateRangeForQuery();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['central-financial-metrics', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<CentralFinancialMetrics> => {
      if (!tenantId) {
        return getEmptyCentralMetrics(startDateStr, endDateStr);
      }

      // ========== CACHE-FIRST APPROACH ==========
      // Check for fresh cached data first to reduce load time
      const { data: cachedData } = await supabase
        .from('dashboard_kpi_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (cachedData?.calculated_at) {
        const cacheAge = Date.now() - new Date(cachedData.calculated_at).getTime();
        const dateRangeMatches = 
          cachedData.date_range_start === startDateStr && 
          cachedData.date_range_end === endDateStr;

        // If cache is fresh and matches date range, return immediately
        if (cacheAge < CACHE_MAX_AGE_MS && dateRangeMatches) {
          return mapCacheToMetrics(cachedData, startDateStr, endDateStr);
        }
      }

      // Cache is stale or missing - calculate fresh metrics

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
        // E-commerce orders with items for accurate COGS
        supabase
          .from('external_orders')
          .select(`
            id, total_amount, order_date, status, platform_fee, commission_fee, payment_fee, shipping_fee,
            external_order_items(total_amount, total_cogs, gross_profit, quantity, unit_price, unit_cogs)
          `)
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

      // E-commerce order revenue - calculate COGS from order items for accuracy
      const completedOrders = orders.filter(o => o.status === 'delivered');
      const orderRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      // Calculate COGS from external_order_items (more accurate than order-level)
      const orderCogs = completedOrders.reduce((sum, o) => {
        const items = (o as any).external_order_items || [];
        return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.total_cogs || 0), 0);
      }, 0);
      
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
      // Variable costs from order fees (platform fee, commission, shipping in orders)
      const platformFeesFromOrders = completedOrders.reduce((sum, o) => 
        sum + (o.platform_fee || 0) + (o.commission_fee || 0) + (o.payment_fee || 0), 0);
      const shippingFromOrders = completedOrders.reduce((sum, o) => sum + (o.shipping_fee || 0), 0);
      
      const hasExpenseData = expenses.length > 0;
      let cogs = orderCogs;
      let totalOpex = 0;
      let depreciation = 0;
      let interestExpense = 0;
      let taxExpense = 0;
      let marketingSpend = 0;
      let shippingCosts = shippingFromOrders; // Shipping from orders
      let platformFees = platformFeesFromOrders; // Platform fees from orders

      if (hasExpenseData) {
        expenses.forEach(exp => {
          const amount = Number(exp.amount) || 0;
          const category = exp.category?.toLowerCase() || 'other';
          
          switch (category) {
            case 'cogs':
              cogs += amount;
              break;
            case 'marketing':
              // Marketing is a VARIABLE cost, not fixed opex
              marketingSpend += amount;
              break;
            case 'logistics':
              // Logistics/Shipping is a VARIABLE cost
              shippingCosts += amount;
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
            default:
              // salary, rent, utilities, other = FIXED opex
              totalOpex += amount;
              break;
          }
        });
      } else {
        // Use fallback ratios when no expense data
        cogs = orderCogs > 0 ? orderCogs : netRevenue * FALLBACK_RATIOS.cogs;
        totalOpex = netRevenue * FALLBACK_RATIOS.opex;
        depreciation = netRevenue * FALLBACK_RATIOS.depreciation;
        interestExpense = netRevenue * FALLBACK_RATIOS.interest;
      }

      // Variable Costs = Platform Fees + Shipping + Marketing
      // These vary DIRECTLY with sales volume
      const variableCosts = platformFees + shippingCosts + marketingSpend;

      // ========== PROFITABILITY CALCULATIONS - CORRECT FORMULAS ==========
      // Gross Profit = Net Revenue - COGS (only COGS, no variable costs)
      const grossProfit = netRevenue - cogs;
      // Gross Margin = (Net Revenue - COGS) / Net Revenue * 100%
      const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

      // Contribution Profit = Net Revenue - COGS - Variable Costs (shipping, marketing)
      const contributionProfit = netRevenue - cogs - variableCosts;
      // Contribution Margin = (Net Revenue - COGS - Variable Costs) / Net Revenue * 100%
      const contributionMargin = netRevenue > 0 ? (contributionProfit / netRevenue) * 100 : 0;

      // Operating Income = Contribution Profit - Fixed Opex
      // (Operating Income is after ALL operating costs: variable + fixed)
      const operatingIncome = contributionProfit - totalOpex;
      const operatingMargin = netRevenue > 0 ? (operatingIncome / netRevenue) * 100 : 0;

      // EBITDA = Operating Income + Depreciation (add back non-cash expense)
      // This measures operating profitability before non-cash and financing costs
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
      const dailyCogs = daysInPeriod > 0 ? cogs / daysInPeriod : 0;
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

      // Cash Next 7 Days = Cash Today + Forecast Inflows (AR collections) - Outflows (AP payments)
      // Estimate: 15% of AR collected per week, 20% of AP paid per week
      const forecastedCollections = totalAR * 0.15;
      const forecastedPayments = totalAP * 0.20;
      const forecastedSalesInflow = (netRevenue / daysInPeriod) * 7 * 0.8; // 80% of weekly sales collected
      const cashNext7Days = cashOnHand + forecastedCollections + forecastedSalesInflow - forecastedPayments;

      // ========== CYCLE METRICS - CORRECT DSO/DIO/DPO FORMULAS ==========
      // DSO = (AR / Net Revenue) * Days in Period
      // DIO = (Inventory / COGS) * Days in Period  
      // DPO = (AP / COGS) * Days in Period
      // CCC = DSO + DIO - DPO
      
      const dailySales = daysInPeriod > 0 ? netRevenue / daysInPeriod : 0;
      
      // Total purchases for DPO calculation
      const totalBillAmount = periodBills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const cogsExpenses = expenses.filter(e => e.category === 'cogs');
      const totalCogsExpenses = cogsExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalPurchases = totalBillAmount + totalCogsExpenses + orderCogs;
      const dailyPurchases = daysInPeriod > 0 ? totalPurchases / daysInPeriod : 0;

      // DSO = (AR / Net Revenue) * Days - measures how long to collect revenue
      const dso = netRevenue > 0 ? Math.round((totalAR / netRevenue) * daysInPeriod) : 0;
      // DIO = (Inventory / COGS) * Days - measures how long inventory sits
      const dio = cogs > 0 ? Math.round((inventory / cogs) * daysInPeriod) : 0;
      // DPO = (AP / COGS) * Days - measures how long to pay suppliers
      const dpo = cogs > 0 ? Math.round((totalAP / cogs) * daysInPeriod) : 0;
      // CCC = DSO + DIO - DPO
      const ccc = dso + dio - dpo;

      // ========== BENCHMARKS - Use centralized constants (SSOT) ==========
      const industryBenchmark = {
        dso: INDUSTRY_BENCHMARKS.dso,
        dio: INDUSTRY_BENCHMARKS.dio,
        dpo: INDUSTRY_BENCHMARKS.dpo,
        ccc: INDUSTRY_BENCHMARKS.ccc,
        grossMargin: INDUSTRY_BENCHMARKS.grossMargin,
        ebitdaMargin: INDUSTRY_BENCHMARKS.ebitdaMargin
      };

      const metrics: CentralFinancialMetrics = {
        // Cycle metrics
        dso,
        dpo,
        dio,
        ccc,
        
        // Profitability
        grossMargin,
        contributionMargin,
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
        contributionProfit,
        invoiceRevenue,
        orderRevenue,
        contractRevenue,
        
        // Expenses
        totalOpex,
        variableCosts,
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
        cashNext7Days,
        
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

      // ========== UPDATE CACHE IN BACKGROUND ==========
      // Don't await - let it run in background
      supabase.rpc('refresh_central_metrics_cache', {
        p_tenant_id: tenantId,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
      }).then(() => {
        // Invalidate cache query to pick up new values
        queryClient.invalidateQueries({ queryKey: ['central-metrics-cache', tenantId] });
      });

      return metrics;
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
    contributionMargin: 0,
    ebitda: 0,
    ebitdaMargin: 0,
    netProfit: 0,
    netProfitMargin: 0,
    operatingMargin: 0,
    totalRevenue: 0,
    netRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    contributionProfit: 0,
    invoiceRevenue: 0,
    orderRevenue: 0,
    contractRevenue: 0,
    totalOpex: 0,
    variableCosts: 0,
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
    cashNext7Days: 0,
    dailySales: 0,
    dailyCogs: 0,
    dailyPurchases: 0,
    daysInPeriod: 0,
    industryBenchmark: { dso: INDUSTRY_BENCHMARKS.dso, dio: INDUSTRY_BENCHMARKS.dio, dpo: INDUSTRY_BENCHMARKS.dpo, ccc: INDUSTRY_BENCHMARKS.ccc, grossMargin: INDUSTRY_BENCHMARKS.grossMargin, ebitdaMargin: INDUSTRY_BENCHMARKS.ebitdaMargin },
    dataStartDate: startDate,
    dataEndDate: endDate,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Map cached row to CentralFinancialMetrics
 */
function mapCacheToMetrics(
  cached: Record<string, unknown>, 
  startDate: string, 
  endDate: string
): CentralFinancialMetrics {
  // Calculate contribution margin from gross profit
  const grossProfit = Number(cached.gross_profit) || 0;
  const variableCosts = Number(cached.variable_costs) || 0;
  const netRevenue = Number(cached.net_revenue) || 0;
  const contributionProfit = grossProfit - variableCosts;
  const contributionMargin = netRevenue > 0 ? (contributionProfit / netRevenue) * 100 : 0;
  
  return {
    dso: (cached.dso as number) ?? 0,
    dpo: (cached.dpo as number) ?? 0,
    dio: (cached.dio as number) ?? 0,
    ccc: (cached.ccc as number) ?? 0,
    grossMargin: Number(cached.gross_margin) || 0,
    contributionMargin,
    ebitda: Number(cached.ebitda) || 0,
    ebitdaMargin: Number(cached.ebitda_margin) || 0,
    netProfit: Number(cached.net_profit) || 0,
    netProfitMargin: Number(cached.net_profit_margin) || 0,
    operatingMargin: Number(cached.operating_margin) || 0,
    totalRevenue: Number(cached.total_revenue) || 0,
    netRevenue,
    cogs: Number(cached.total_cogs) || 0,
    grossProfit,
    contributionProfit,
    invoiceRevenue: Number(cached.invoice_revenue) || 0,
    orderRevenue: Number(cached.order_revenue) || 0,
    contractRevenue: Number(cached.contract_revenue) || 0,
    totalOpex: Number(cached.total_opex) || 0,
    variableCosts,
    depreciation: Number(cached.depreciation) || 0,
    interestExpense: Number(cached.interest_expense) || 0,
    taxExpense: Number(cached.tax_expense) || 0,
    totalAR: Number(cached.total_ar) || 0,
    overdueAR: Number(cached.overdue_ar) || 0,
    totalAP: Number(cached.total_ap) || 0,
    inventory: Number(cached.inventory) || 0,
    workingCapital: Number(cached.working_capital) || 0,
    cashOnHand: Number(cached.cash_today) || 0,
    cashFlow: Number(cached.cash_flow) || 0,
    cashNext7Days: Number(cached.cash_next_7_days) || Number(cached.cash_today) || 0,
    dailySales: Number(cached.daily_sales) || 0,
    dailyCogs: Number(cached.daily_cogs) || 0,
    dailyPurchases: Number(cached.daily_purchases) || 0,
    daysInPeriod: (cached.days_in_period as number) ?? 90,
    industryBenchmark: {
      dso: INDUSTRY_BENCHMARKS.dso,
      dio: INDUSTRY_BENCHMARKS.dio,
      dpo: INDUSTRY_BENCHMARKS.dpo,
      ccc: INDUSTRY_BENCHMARKS.ccc,
      grossMargin: INDUSTRY_BENCHMARKS.grossMargin,
      ebitdaMargin: INDUSTRY_BENCHMARKS.ebitdaMargin,
    },
    dataStartDate: (cached.date_range_start as string) || startDate,
    dataEndDate: (cached.date_range_end as string) || endDate,
    lastUpdated: (cached.calculated_at as string) || new Date().toISOString(),
  };
}

/**
 * Re-export for backwards compatibility
 * Other hooks should migrate to useCentralFinancialMetrics
 */
export { getEmptyCentralMetrics };
