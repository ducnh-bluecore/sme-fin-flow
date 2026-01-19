import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { format, startOfMonth, subMonths, getDaysInMonth } from 'date-fns';
import { useCentralFinancialMetrics } from './useCentralFinancialMetrics';
import { 
  constrainDays, 
  calculateTurnoverFromDays,
  INDUSTRY_BENCHMARKS 
} from '@/lib/financial-constants';

/**
 * Cash Conversion Cycle Hook - Refactored
 * Now uses useCentralFinancialMetrics for core calculations to avoid duplication.
 * Adds CCC-specific features: trends, working capital impact, turnover ratios.
 * 
 * FDP Manifesto: Single Source of Truth
 * All DSO/DIO/DPO/CCC values come from central metrics with constraints applied.
 */

export interface CashConversionCycleData {
  // Core Metrics (from useCentralFinancialMetrics - CONSTRAINED)
  dso: number;
  dio: number;  
  dpo: number;
  ccc: number;

  // Turnover Ratios (calculated from days: 365/days)
  arTurnover: number;      // 365 / DSO
  inventoryTurnover: number; // 365 / DIO
  apTurnover: number;      // 365 / DPO

  // Details
  avgAR: number;
  avgInventory: number;
  avgAP: number;
  dailySales: number;
  dailyCogs: number;
  dailyPurchases: number;

  // Trends
  trends: CCCTrend[];
  
  // Benchmarks
  industryBenchmark: {
    dso: number;
    dio: number;
    dpo: number;
    ccc: number;
  };

  // Working Capital Impact
  workingCapitalTied: number;
  potentialSavings: number;

  // Raw data for formula display
  rawData: {
    totalSales: number;
    totalCogs: number;
    totalPurchases: number;
    daysInPeriod: number;
  };
}

export interface CCCTrend {
  month: string;
  dso: number;
  dio: number;
  dpo: number;
  ccc: number;
}

export function useCashConversionCycle() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();
  
  // Use centralized financial metrics (single source of truth)
  const { data: metrics, isLoading: metricsLoading } = useCentralFinancialMetrics();

  return useQuery({
    queryKey: ['cash-conversion-cycle', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<CashConversionCycleData> => {
      if (!tenantId || !metrics) {
        return getEmptyData();
      }

      const today = new Date();

      // Fetch historical data for trends
      const [invoicesRes, billsRes, ordersRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, total_amount, paid_amount, status, issue_date')
          .eq('tenant_id', tenantId)
          .gte('issue_date', format(subMonths(today, 6), 'yyyy-MM-dd')),
        supabase
          .from('bills')
          .select('id, total_amount, paid_amount, status, bill_date')
          .eq('tenant_id', tenantId)
          .gte('bill_date', format(subMonths(today, 6), 'yyyy-MM-dd')),
        supabase
          .from('external_orders')
          .select('total_amount, cost_of_goods, order_date, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'delivered')
          .gte('order_date', format(subMonths(today, 6), 'yyyy-MM-dd'))
      ]);

      const invoices = invoicesRes.data || [];
      const bills = billsRes.data || [];
      const orders = ordersRes.data || [];

      // Calculate monthly trends using CORRECT formulas with constraints
      const trends: CCCTrend[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(today, i));
        const monthStr = format(monthStart, 'yyyy-MM');
        const daysInMonth = getDaysInMonth(monthStart);
        
        const monthInvoices = invoices.filter(inv => inv.issue_date?.startsWith(monthStr));
        const monthBills = bills.filter(b => b.bill_date?.startsWith(monthStr));
        const monthOrders = orders.filter(o => o.order_date?.startsWith(monthStr));
        
        // Revenue and COGS for the month
        const monthSales = monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const monthCogs = monthOrders.reduce((sum, o) => sum + (o.cost_of_goods || 0), 0);
        
        // AR and AP at end of month (unpaid balances)
        const monthAR = monthInvoices
          .filter(i => i.status !== 'paid')
          .reduce((sum, i) => sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);
        const monthAP = monthBills
          .filter(b => b.status !== 'paid')
          .reduce((sum, b) => sum + ((b.total_amount || 0) - (b.paid_amount || 0)), 0);

        // Correct formulas: DSO = (AR / Revenue) * Days
        // Use month's actual days for accurate calculation
        const rawMonthDso = monthSales > 0 ? (monthAR / monthSales) * daysInMonth : metrics.dso;
        const monthDso = constrainDays(rawMonthDso, 'dso');
        
        // DIO = (Inventory / COGS) * Days - estimate inventory as COGS * 30 days
        const monthInventory = monthCogs > 0 ? (monthCogs / daysInMonth) * 30 : 0;
        const rawMonthDio = monthCogs > 0 ? (monthInventory / monthCogs) * daysInMonth : metrics.dio;
        const monthDio = constrainDays(rawMonthDio, 'dio');
        
        // DPO = (AP / COGS) * Days - use actual AP and COGS
        const rawMonthDpo = monthCogs > 0 ? (monthAP / monthCogs) * daysInMonth : 30;
        const monthDpo = constrainDays(rawMonthDpo, 'dpo');
        
        // CCC = DSO + DIO - DPO (with constraint)
        const rawMonthCcc = monthDso + monthDio - monthDpo;
        const monthCcc = constrainDays(rawMonthCcc, 'ccc');
        
        trends.push({
          month: format(monthStart, 'MM/yyyy'),
          dso: monthDso,
          dio: monthDio,
          dpo: monthDpo,
          ccc: monthCcc
        });
      }

      // Calculate turnover ratios from days (correct formula: 365 / Days)
      const arTurnover = calculateTurnoverFromDays(metrics.dso);
      const inventoryTurnover = calculateTurnoverFromDays(metrics.dio);
      const apTurnover = calculateTurnoverFromDays(metrics.dpo);

      // Working capital impact
      const workingCapitalTied = (metrics.totalAR || 0) + (metrics.inventory || 0) - (metrics.totalAP || 0);
      const currentDailyWorkingCapital = metrics.dailySales * metrics.ccc;
      const benchmarkDailyWorkingCapital = metrics.dailySales * metrics.industryBenchmark.ccc;
      const potentialSavings = Math.max(0, currentDailyWorkingCapital - benchmarkDailyWorkingCapital);

      return {
        dso: metrics.dso,
        dio: metrics.dio,
        dpo: metrics.dpo,
        ccc: metrics.ccc,
        arTurnover,
        inventoryTurnover,
        apTurnover,
        avgAR: metrics.totalAR,
        avgInventory: metrics.inventory,
        avgAP: metrics.totalAP,
        dailySales: metrics.dailySales,
        dailyCogs: metrics.dailyCogs,
        dailyPurchases: metrics.dailyPurchases,
        trends,
        industryBenchmark: {
          dso: metrics.industryBenchmark.dso,
          dio: metrics.industryBenchmark.dio,
          dpo: metrics.industryBenchmark.dpo,
          ccc: metrics.industryBenchmark.ccc,
        },
        workingCapitalTied,
        potentialSavings,
        rawData: {
          totalSales: metrics.netRevenue,
          totalCogs: metrics.cogs,
          totalPurchases: metrics.dailyPurchases * metrics.daysInPeriod,
          daysInPeriod: metrics.daysInPeriod
        }
      };
    },
    enabled: !!tenantId && !metricsLoading && !!metrics,
    staleTime: 5 * 60 * 1000
  });
}

function getEmptyData(): CashConversionCycleData {
  return {
    dso: 0,
    dio: 0,
    dpo: 0,
    ccc: 0,
    arTurnover: 0,
    inventoryTurnover: 0,
    apTurnover: 0,
    avgAR: 0,
    avgInventory: 0,
    avgAP: 0,
    dailySales: 0,
    dailyCogs: 0,
    dailyPurchases: 0,
    trends: [],
    industryBenchmark: { 
      dso: INDUSTRY_BENCHMARKS.dso, 
      dio: INDUSTRY_BENCHMARKS.dio, 
      dpo: INDUSTRY_BENCHMARKS.dpo, 
      ccc: INDUSTRY_BENCHMARKS.ccc 
    },
    workingCapitalTied: 0,
    potentialSavings: 0,
    rawData: {
      totalSales: 0,
      totalCogs: 0,
      totalPurchases: 0,
      daysInPeriod: 0
    }
  };
}
