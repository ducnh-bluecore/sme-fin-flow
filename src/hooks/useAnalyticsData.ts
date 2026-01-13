import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getDateRangeFromFilter, formatDateForQuery } from '@/lib/dateUtils';
import { useCentralFinancialMetrics } from './useCentralFinancialMetrics';

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

// Using centralized getDateRangeFromFilter from dateUtils.ts

export function useAnalyticsData(dateRange: string = 'this_year') {
  const { data: tenantId } = useActiveTenantId();
  const { startDate, endDate } = getDateRangeFromFilter(dateRange);
  const dateStart = formatDateForQuery(startDate);
  const dateEnd = formatDateForQuery(endDate);

  // Use central financial metrics for DSO/DPO (Single Source of Truth)
  const { data: centralMetrics } = useCentralFinancialMetrics();

  return useQuery({
    queryKey: ['analytics-data', tenantId, dateRange, dateStart, dateEnd],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!tenantId) throw new Error('No tenant ID');

      const today = new Date();

      // Fetch all data in parallel
      const [
        invoicesResult,
        expensesResult,
        revenuesResult,
        bankAccountsResult,
        bankTransactionsResult,
        customersResult,
        cashForecastsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('issue_date', dateStart)
          .lte('issue_date', dateEnd),
        supabase
          .from('expenses')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('expense_date', dateStart)
          .lte('expense_date', dateEnd),
        supabase
          .from('revenues')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('start_date', dateStart)
          .lte('start_date', dateEnd),
        supabase
          .from('bank_accounts')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'active'),
        supabase
          .from('bank_transactions')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('transaction_date', dateStart)
          .lte('transaction_date', dateEnd),
        supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'active'),
        supabase
          .from('cash_forecasts')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('forecast_date', dateStart)
          .lte('forecast_date', dateEnd),
        supabase
          .from('payments')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('payment_date', dateStart)
          .lte('payment_date', dateEnd),
      ]);

      const invoices = invoicesResult.data || [];
      const expenses = expensesResult.data || [];
      const revenues = revenuesResult.data || [];
      const bankAccounts = bankAccountsResult.data || [];
      const bankTransactions = bankTransactionsResult.data || [];
      const customers = customersResult.data || [];
      const cashForecasts = cashForecastsResult.data || [];
      const payments = paymentsResult.data || [];

      // Calculate total revenue from invoices + revenues
      const invoiceRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const otherRevenue = revenues.reduce((sum, rev) => sum + (rev.amount || 0), 0);
      const totalRevenue = invoiceRevenue + otherRevenue;

      // Calculate total cost from expenses
      const totalCost = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      // Calculate profit
      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Monthly data aggregation - based on actual date range
      const monthlyData: MonthlyRevenueData[] = [];
      
      // Get unique months in the date range
      const monthsInRange: { start: Date; end: Date; label: string }[] = [];
      let currentMonth = startOfMonth(startDate);
      const endMonth = startOfMonth(endDate);
      
      while (currentMonth <= endMonth) {
        monthsInRange.push({
          start: currentMonth,
          end: endOfMonth(currentMonth),
          label: `T${currentMonth.getMonth() + 1}`,
        });
        currentMonth = startOfMonth(subMonths(currentMonth, -1));
      }

      for (const monthInfo of monthsInRange) {
        const monthStartStr = format(monthInfo.start, 'yyyy-MM-dd');
        const monthEndStr = format(monthInfo.end, 'yyyy-MM-dd');

        const monthInvoices = invoices.filter(inv => 
          inv.issue_date >= monthStartStr && inv.issue_date <= monthEndStr
        );
        const monthRevenues = revenues.filter(rev => 
          rev.start_date >= monthStartStr && rev.start_date <= monthEndStr
        );
        const monthExpenses = expenses.filter(exp => 
          exp.expense_date >= monthStartStr && exp.expense_date <= monthEndStr
        );

        const monthRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) +
                            monthRevenues.reduce((sum, rev) => sum + (rev.amount || 0), 0);
        const monthCost = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

        monthlyData.push({
          month: monthInfo.label,
          revenue: monthRevenue,
          cost: monthCost,
          profit: monthRevenue - monthCost,
        });
      }

      // Expense breakdown by category
      const expenseByCategory: Record<string, number> = {};
      expenses.forEach(exp => {
        const category = exp.category || 'other';
        expenseByCategory[category] = (expenseByCategory[category] || 0) + (exp.amount || 0);
      });

      const expenseBreakdown: ExpenseBreakdown[] = Object.entries(expenseByCategory)
        .map(([category, amount]) => ({
          name: EXPENSE_LABELS[category] || category,
          value: totalCost > 0 ? Math.round((amount / totalCost) * 100) : 0,
          amount,
          color: EXPENSE_COLORS[category] || 'hsl(var(--muted-foreground))',
        }))
        .sort((a, b) => b.amount - a.amount);

      // Cash flow data from cash forecasts
      const cashFlowData: CashFlowData[] = [];
      for (let month = 0; month < 6; month++) {
        const targetMonth = subMonths(today, 5 - month);
        const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(targetMonth), 'yyyy-MM-dd');

        const monthForecasts = cashForecasts.filter(cf => 
          cf.forecast_date >= monthStart && cf.forecast_date <= monthEnd
        );

        const inflow = monthForecasts.reduce((sum, cf) => sum + (cf.inflows || 0), 0);
        const outflow = monthForecasts.reduce((sum, cf) => sum + (cf.outflows || 0), 0);

        cashFlowData.push({
          month: `T${targetMonth.getMonth() + 1}`,
          inflow,
          outflow,
          net: inflow - outflow,
        });
      }

      // AR Metrics - Use central metrics for DSO (Single Source of Truth)
      const unpaidInvoices = invoices.filter(inv => 
        inv.status !== 'paid' && inv.status !== 'cancelled'
      );
      const totalAR = unpaidInvoices.reduce((sum, inv) => 
        sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0
      );
      
      const overdueInvoices = unpaidInvoices.filter(inv => 
        new Date(inv.due_date) < today
      );
      const overdueAR = overdueInvoices.reduce((sum, inv) => 
        sum + (inv.total_amount || 0) - (inv.paid_amount || 0), 0
      );

      const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const collectionRate = totalRevenue > 0 ? (paidAmount / totalRevenue) * 100 : 0;

      // Use central metrics DSO (Single Source of Truth)
      const dso = centralMetrics?.dso ?? 0;

      const arMetrics: ARMetrics = {
        totalAR,
        collected: paidAmount,
        overdue: overdueAR,
        dso,
        collectionRate: Math.min(collectionRate, 100),
      };

      // AP Metrics - Use central metrics DPO (Single Source of Truth)
      const totalAP = centralMetrics?.totalAP ?? 0;
      const dpo = centralMetrics?.dpo ?? 0;
      
      const apMetrics: APMetrics = {
        totalAP,
        paid: totalCost - totalAP,
        pending: totalAP,
        dpo,
      };

      // Invoice metrics
      const invoiceMetrics: InvoiceMetrics = {
        issued: invoices.length,
        pending: invoices.filter(inv => inv.status === 'pending' || inv.status === 'draft').length,
        overdue: overdueInvoices.length,
        avgValue: invoices.length > 0 ? totalRevenue / invoices.length : 0,
      };

      // EBITDA - Use central metrics (Single Source of Truth)
      const ebitda = centralMetrics?.ebitda ?? (totalProfit + 
        expenses.filter(exp => exp.category === 'depreciation').reduce((sum, exp) => sum + (exp.amount || 0), 0) +
        expenses.filter(exp => exp.category === 'interest').reduce((sum, exp) => sum + (exp.amount || 0), 0));

      // Growth calculations (compare with previous period - simplified as 0 for now)
      const revenueGrowth = 0;
      const costGrowth = 0;
      const profitGrowth = 0;

      return {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin,
        revenueGrowth,
        costGrowth,
        profitGrowth,
        monthlyData,
        expenseBreakdown,
        cashFlowData,
        arMetrics,
        apMetrics,
        invoiceMetrics,
        ebitda,
        customerCount: customers.length,
      };
    },
    staleTime: 60000,
    enabled: !!tenantId,
  });
}
