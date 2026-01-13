import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { format, startOfMonth, subMonths } from 'date-fns';
import { useCentralFinancialMetrics } from './useCentralFinancialMetrics';

/**
 * Cash Conversion Cycle Hook - Refactored
 * Now uses useFinancialMetrics for core calculations to avoid duplication.
 * Adds CCC-specific features: trends, working capital impact.
 */

export interface CashConversionCycleData {
  // Core Metrics (from useFinancialMetrics)
  dso: number;
  dio: number;  
  dpo: number;
  ccc: number;

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

      // Calculate monthly trends
      const trends: CCCTrend[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(today, i));
        const monthStr = format(monthStart, 'yyyy-MM');
        
        const monthInvoices = invoices.filter(inv => inv.issue_date?.startsWith(monthStr));
        const monthBills = bills.filter(b => b.bill_date?.startsWith(monthStr));
        const monthOrders = orders.filter(o => o.order_date?.startsWith(monthStr));
        
        const monthSales = monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const monthCogs = monthOrders.reduce((sum, o) => sum + (o.cost_of_goods || 0), 0);
        const monthAR = monthInvoices
          .filter(i => i.status !== 'paid')
          .reduce((sum, i) => sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);
        const monthAP = monthBills
          .filter(b => b.status !== 'paid')
          .reduce((sum, b) => sum + ((b.total_amount || 0) - (b.paid_amount || 0)), 0);

        const monthDailySales = monthSales / 30;
        const monthDailyCogs = monthCogs / 30;
        const monthInventory = monthDailyCogs * 30;

        const monthDso = monthDailySales > 0 ? Math.round(monthAR / monthDailySales) : metrics.dso;
        const monthDio = monthDailyCogs > 0 ? Math.round(monthInventory / monthDailyCogs) : metrics.dio;
        const monthDpo = 30;
        
        trends.push({
          month: format(monthStart, 'MM/yyyy'),
          dso: monthDso,
          dio: monthDio,
          dpo: monthDpo,
          ccc: monthDso + monthDio - monthDpo
        });
      }

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
    avgAR: 0,
    avgInventory: 0,
    avgAP: 0,
    dailySales: 0,
    dailyCogs: 0,
    dailyPurchases: 0,
    trends: [],
    industryBenchmark: { dso: 35, dio: 45, dpo: 40, ccc: 40 },
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
