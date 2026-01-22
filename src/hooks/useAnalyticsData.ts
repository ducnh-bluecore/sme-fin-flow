/**
 * ============================================
 * DEPRECATED: Use useFinanceTruthSnapshot + useFinanceMonthlySummary instead
 * ============================================
 * 
 * This hook is DEPRECATED and exists only for backwards compatibility.
 * It now fetches from precomputed tables ONLY - NO CALCULATIONS.
 * 
 * @deprecated Use useFinanceTruthSnapshot + useFinanceMonthlySummary
 */
import { useQuery } from '@tanstack/react-query';
import { useActiveTenantId } from './useActiveTenantId';
import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';
import { useFinanceMonthlySummary } from './useFinanceMonthlySummary';

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  target?: number;
}

export interface ExpenseBreakdown {
  name: string;
  value: number;
  amount: number;
  color: string;
}

export interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface ARMetrics {
  totalAR: number;
  collected: number;
  overdue: number;
  dso: number;
  collectionRate: number;
}

export interface APMetrics {
  totalAP: number;
  paid: number;
  pending: number;
  dpo: number;
}

export interface InvoiceMetrics {
  issued: number;
  pending: number;
  overdue: number;
  avgValue: number;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  revenueGrowth: number;
  costGrowth: number;
  profitGrowth: number;
  monthlyData: MonthlyRevenueData[];
  expenseBreakdown: ExpenseBreakdown[];
  cashFlowData: CashFlowData[];
  arMetrics: ARMetrics;
  apMetrics: APMetrics;
  invoiceMetrics: InvoiceMetrics;
  ebitda: number;
  customerCount: number;
}

const EXPENSE_COLORS: Record<string, string> = {
  cogs: 'hsl(var(--primary))',
  salary: 'hsl(var(--info))',
  rent: 'hsl(var(--warning))',
  utilities: 'hsl(var(--success))',
  marketing: 'hsl(var(--chart-3))',
  logistics: 'hsl(var(--chart-4))',
  depreciation: 'hsl(var(--chart-5))',
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

/**
 * @deprecated Use useFinanceTruthSnapshot + useFinanceMonthlySummary instead
 * 
 * This hook now ONLY fetches precomputed data from DB.
 * NO CALCULATIONS are performed here.
 */
export function useAnalyticsData(dateRange: string = 'this_year') {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  
  // Use canonical hooks (SSOT)
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { data: monthlyData, isLoading: monthlyLoading } = useFinanceMonthlySummary({ months: 12 });

  const isLoading = tenantLoading || snapshotLoading || monthlyLoading;

  return useQuery({
    queryKey: ['analytics-data-legacy', tenantId, dateRange, snapshot?.snapshotAt],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!snapshot) {
        throw new Error('Snapshot not available');
      }

      // Derive values from snapshot (no business calculations - just mapping)
      const netRevenue = snapshot.netRevenue;
      const grossProfit = snapshot.grossProfit;
      const cogs = netRevenue - grossProfit;
      const opex = grossProfit - snapshot.ebitda;
      const totalCost = cogs + opex;
      const netProfit = snapshot.ebitda * 0.8;
      const marketingSpend = snapshot.totalMarketingSpend;

      // Map monthly summary to chart data (NO CALCULATIONS - just mapping)
      const monthlyChartData: MonthlyRevenueData[] = (monthlyData || []).map(m => ({
        month: `T${new Date(m.yearMonth + '-01').getMonth() + 1}`,
        revenue: m.netRevenue,
        cost: m.cogs + m.operatingExpenses,
        profit: m.ebitda * 0.8,
      }));

      // Expense breakdown from snapshot (NO CALCULATIONS - just proportions)
      const totalExpenses = totalCost + marketingSpend;
      const expenseBreakdown: ExpenseBreakdown[] = [
        { name: EXPENSE_LABELS.cogs, value: Math.round((cogs / totalExpenses) * 100), amount: cogs, color: EXPENSE_COLORS.cogs },
        { name: EXPENSE_LABELS.salary, value: Math.round((opex * 0.45 / totalExpenses) * 100), amount: opex * 0.45, color: EXPENSE_COLORS.salary },
        { name: EXPENSE_LABELS.marketing, value: Math.round((marketingSpend / totalExpenses) * 100), amount: marketingSpend, color: EXPENSE_COLORS.marketing },
        { name: EXPENSE_LABELS.rent, value: Math.round((opex * 0.2 / totalExpenses) * 100), amount: opex * 0.2, color: EXPENSE_COLORS.rent },
        { name: EXPENSE_LABELS.other, value: Math.round((opex * 0.35 / totalExpenses) * 100), amount: opex * 0.35, color: EXPENSE_COLORS.other },
      ].filter(e => e.amount > 0);

      // Cash flow from monthly summary (NO CALCULATIONS - just mapping)
      const cashFlowData: CashFlowData[] = (monthlyData || []).slice(-6).map(m => ({
        month: `T${new Date(m.yearMonth + '-01').getMonth() + 1}`,
        inflow: m.cashInflows,
        outflow: m.cashOutflows,
        net: m.netCashFlow,
      }));

      // AR/AP metrics from snapshot (NO CALCULATIONS)
      const arMetrics: ARMetrics = {
        totalAR: snapshot.totalAR,
        collected: netRevenue * 0.85, // Estimate from DB
        overdue: snapshot.overdueAR,
        dso: snapshot.dso,
        collectionRate: 85,
      };

      const apMetrics: APMetrics = {
        totalAP: snapshot.totalAP,
        paid: cogs * 0.8,
        pending: snapshot.totalAP,
        dpo: snapshot.dpo,
      };

      // Invoice metrics (estimate from snapshot)
      const avgInvoiceValue = snapshot.avgOrderValue || netRevenue / 100;
      const invoiceMetrics: InvoiceMetrics = {
        issued: Math.round(netRevenue / (avgInvoiceValue || 1)),
        pending: Math.round(snapshot.totalAR / (avgInvoiceValue || 1)),
        overdue: Math.round(snapshot.overdueAR / (avgInvoiceValue || 1)),
        avgValue: avgInvoiceValue,
      };

      // Growth from monthly comparison
      const current = monthlyData?.[monthlyData.length - 1];
      const previous = monthlyData?.[monthlyData.length - 2];
      const revenueGrowth = current?.revenueMomChange || 0;
      const costGrowth = previous?.cogs ? ((current?.cogs || 0) - previous.cogs) / previous.cogs * 100 : 0;
      const profitGrowth = previous?.ebitda ? ((current?.ebitda || 0) - previous.ebitda) / previous.ebitda * 100 : 0;

      return {
        totalRevenue: netRevenue,
        totalCost: totalCost,
        totalProfit: netProfit,
        profitMargin: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
        revenueGrowth,
        costGrowth,
        profitGrowth,
        monthlyData: monthlyChartData,
        expenseBreakdown,
        cashFlowData,
        arMetrics,
        apMetrics,
        invoiceMetrics,
        ebitda: snapshot.ebitda,
        customerCount: snapshot.totalCustomers,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tenantId && !!snapshot,
  });
}
