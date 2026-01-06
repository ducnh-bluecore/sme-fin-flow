import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { differenceInDays } from 'date-fns';

/**
 * Centralized Financial Metrics Hook
 * Single source of truth for DSO, DPO, DIO, CCC calculations
 * Used by: CashConversionCycle, WorkingCapital, KPIData, Dashboard
 */

export interface FinancialMetrics {
  // Core cycle metrics
  dso: number; // Days Sales Outstanding
  dpo: number; // Days Payable Outstanding  
  dio: number; // Days Inventory Outstanding
  ccc: number; // Cash Conversion Cycle = DSO + DIO - DPO

  // Underlying values
  avgAR: number;
  avgAP: number;
  avgInventory: number;
  dailySales: number;
  dailyCogs: number;
  dailyPurchases: number;

  // Totals for the period
  totalSales: number;
  totalCogs: number;
  totalPurchases: number;
  totalExpenses: number;
  daysInPeriod: number;

  // Industry benchmarks
  industryBenchmark: {
    dso: number;
    dio: number;
    dpo: number;
    ccc: number;
  };
}

export function useFinancialMetrics() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr, startDate, endDate } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['financial-metrics', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<FinancialMetrics> => {
      if (!tenantId) {
        return getEmptyMetrics();
      }

      // Fetch all required data in parallel
      const [
        invoicesRes,
        billsRes,
        ordersRes,
        expensesRes
      ] = await Promise.all([
        // AR data - invoices
        supabase
          .from('invoices')
          .select('id, total_amount, paid_amount, status, issue_date, due_date')
          .eq('tenant_id', tenantId)
          .gte('issue_date', startDateStr)
          .lte('issue_date', endDateStr),
        // AP data - bills
        supabase
          .from('bills')
          .select('id, total_amount, paid_amount, status, bill_date, due_date')
          .eq('tenant_id', tenantId)
          .gte('bill_date', startDateStr)
          .lte('bill_date', endDateStr),
        // Sales data from orders
        supabase
          .from('external_orders')
          .select('total_amount, cost_of_goods, order_date, status')
          .eq('tenant_id', tenantId)
          .gte('order_date', startDateStr)
          .lte('order_date', endDateStr),
        // Expenses
        supabase
          .from('expenses')
          .select('amount, expense_date, category')
          .eq('tenant_id', tenantId)
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr)
      ]);

      const invoices = invoicesRes.data || [];
      const bills = billsRes.data || [];
      const orders = ordersRes.data || [];
      const expenses = expensesRes.data || [];

      // Calculate period
      const daysInPeriod = Math.max(differenceInDays(endDate, startDate), 1);

      // Calculate total sales and COGS
      const completedOrders = orders.filter(o => o.status === 'delivered');
      const totalSales = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalCogs = completedOrders.reduce((sum, o) => sum + (o.cost_of_goods || 0), 0);
      
      const dailySales = totalSales / daysInPeriod;
      const dailyCogs = totalCogs / daysInPeriod;

      // Total expenses
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Total purchases (bills + COGS expenses)
      const cogsExpenses = expenses.filter(e => e.category === 'cogs');
      const totalBillAmount = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const totalCogsExpenses = cogsExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalPurchases = totalBillAmount + totalCogsExpenses;
      const dailyPurchases = totalPurchases / daysInPeriod;

      // Current AR (unpaid invoices)
      const unpaidInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
      const avgAR = unpaidInvoices.reduce((sum, i) => 
        sum + ((i.total_amount || 0) - (i.paid_amount || 0)), 0);

      // Current AP (unpaid bills)
      const unpaidBills = bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled');
      const avgAP = unpaidBills.reduce((sum, b) => 
        sum + ((b.total_amount || 0) - (b.paid_amount || 0)), 0);

      // Estimate inventory (using COGS * 30 days as proxy)
      const avgInventory = dailyCogs * 30;

      // Calculate DSO, DIO, DPO
      const dso = dailySales > 0 ? Math.round(avgAR / dailySales) : 45;
      const dio = dailyCogs > 0 ? Math.round(avgInventory / dailyCogs) : 30;
      const dpo = dailyPurchases > 0 ? Math.round(avgAP / dailyPurchases) : 30;
      const ccc = dso + dio - dpo;

      // Industry benchmarks (e-commerce/retail)
      const industryBenchmark = {
        dso: 35,
        dio: 45,
        dpo: 40,
        ccc: 40
      };

      return {
        dso,
        dpo,
        dio,
        ccc,
        avgAR,
        avgAP,
        avgInventory,
        dailySales,
        dailyCogs,
        dailyPurchases,
        totalSales,
        totalCogs,
        totalPurchases,
        totalExpenses,
        daysInPeriod,
        industryBenchmark
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000
  });
}

function getEmptyMetrics(): FinancialMetrics {
  return {
    dso: 0,
    dpo: 0,
    dio: 0,
    ccc: 0,
    avgAR: 0,
    avgAP: 0,
    avgInventory: 0,
    dailySales: 0,
    dailyCogs: 0,
    dailyPurchases: 0,
    totalSales: 0,
    totalCogs: 0,
    totalPurchases: 0,
    totalExpenses: 0,
    daysInPeriod: 0,
    industryBenchmark: { dso: 35, dio: 45, dpo: 40, ccc: 40 }
  };
}
