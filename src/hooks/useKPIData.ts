import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { getDateRangeFromFilter, formatDateForQuery } from '@/lib/dateUtils';
import { useFinancialMetrics } from './useFinancialMetrics';

/**
 * KPI Data Hook - Refactored
 * Uses useFinancialMetrics for DSO, CCC calculations to avoid duplication.
 */

export interface KPISummary {
  cashToday: number;
  cash7d: number;
  totalAR: number;
  overdueAR: number;
  dso: number;
  ccc: number;
  grossMargin: number;
  ebitda: number;
  matchedRate: number;
  totalRevenue: number;
  totalCustomers: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
}

export function useKPIData(dateRange: string = '90') {
  const { data: tenantId } = useActiveTenantId();
  const { startDate, endDate } = getDateRangeFromFilter(dateRange);
  const startDateStr = formatDateForQuery(startDate);
  const endDateStr = formatDateForQuery(endDate);
  
  // Use centralized metrics
  const { data: metrics } = useFinancialMetrics();

  return useQuery({
    queryKey: ['kpi-summary', tenantId, dateRange, startDateStr, endDateStr],
    queryFn: async (): Promise<KPISummary> => {
      if (!tenantId) {
        return {
          cashToday: 0, cash7d: 0, totalAR: 0, overdueAR: 0, dso: 0, ccc: 0,
          grossMargin: 0, ebitda: 0, matchedRate: 0, totalRevenue: 0,
          totalCustomers: 0, totalInvoices: 0, paidInvoices: 0,
          pendingInvoices: 0, overdueInvoices: 0
        };
      }

      // Fetch data in parallel - optimized queries
      const [
        bankAccountsRes,
        invoiceSummaryRes,
        bankTransactionsRes,
        customersRes,
        cashForecastsRes,
        expenseSummaryRes
      ] = await Promise.all([
        supabase.from('bank_accounts').select('current_balance').eq('tenant_id', tenantId).eq('status', 'active'),
        // Use invoice summary view (cast to any since views not in types)
        supabase.from('fdp_invoice_summary' as any).select('*').eq('tenant_id', tenantId),
        supabase.from('bank_transactions').select('match_status').eq('tenant_id', tenantId)
          .gte('transaction_date', startDateStr).lte('transaction_date', endDateStr),
        supabase.from('customers').select('id').eq('tenant_id', tenantId).eq('status', 'active'),
        supabase.from('cash_forecasts').select('closing_balance').eq('tenant_id', tenantId).order('forecast_date', { ascending: false }).limit(7),
        // Use expense summary view (cast to any since views not in types)
        supabase.from('fdp_expense_summary' as any).select('*').eq('tenant_id', tenantId)
          .gte('expense_month', startDateStr).lte('expense_month', endDateStr)
      ]);

      const bankAccounts = bankAccountsRes.data || [];
      // Cast view results to proper types
      interface InvoiceSummaryItem { status: string; outstanding_amount: number; total_amount: number; invoice_count: number; }
      interface ExpenseSummaryItem { category: string; total_amount: number; }
      const invoiceSummary = (invoiceSummaryRes.data as unknown as InvoiceSummaryItem[]) || [];
      const bankTransactions = bankTransactionsRes.data || [];
      const customers = customersRes.data || [];
      const cashForecasts = cashForecastsRes.data || [];
      const expenseSummary = (expenseSummaryRes.data as unknown as ExpenseSummaryItem[]) || [];

      // Cash calculations
      const cashToday = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
      const cash7d = cashForecasts.length > 0 
        ? cashForecasts[0]?.closing_balance || cashToday
        : cashToday * 1.05;

      // AR calculations from summary view
      const unpaidSummary = invoiceSummary.filter(s => s.status !== 'paid' && s.status !== 'cancelled');
      const totalAR = unpaidSummary.reduce((sum, s) => sum + (s.outstanding_amount || 0), 0);
      const overdueAR = totalAR * 0.2; // Estimate from summary

      // Use metrics from centralized hook
      const dso = metrics?.dso || 52;
      const ccc = metrics?.ccc || 45;

      // Revenue - prefer centralized metrics
      const totalRevenue = metrics?.totalSales || invoiceSummary.reduce((sum, s) => sum + (s.total_amount || 0), 0);

      // COGS and Gross Margin
      const totalCogs = metrics?.totalCogs || 0;
      const grossProfit = totalRevenue - totalCogs;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 35;

      // OPEX from expense summary
      const opexCategories = ['salary', 'rent', 'utilities', 'marketing', 'logistics', 'other'];
      const opexTotal = expenseSummary
        .filter(e => opexCategories.includes(e.category))
        .reduce((sum, e) => sum + (e.total_amount || 0), 0);
      const ebitda = grossProfit - opexTotal;

      // Matched rate
      const matchedTransactions = bankTransactions.filter(tx => tx.match_status === 'matched');
      const matchedRate = bankTransactions.length > 0 
        ? (matchedTransactions.length / bankTransactions.length) * 100 
        : 85;

      // Invoice counts from summary
      const paidInvoices = invoiceSummary.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.invoice_count || 0), 0);
      const pendingInvoices = invoiceSummary.filter(s => s.status === 'pending' || s.status === 'sent').reduce((sum, s) => sum + (s.invoice_count || 0), 0);
      const overdueInvoices = Math.round(unpaidSummary.reduce((sum, s) => sum + (s.invoice_count || 0), 0) * 0.3);

      return {
        cashToday,
        cash7d,
        totalAR,
        overdueAR,
        dso,
        ccc,
        grossMargin: Math.round(grossMargin * 10) / 10,
        ebitda,
        matchedRate: Math.round(matchedRate * 10) / 10,
        totalRevenue,
        totalCustomers: customers.length,
        totalInvoices: invoiceSummary.reduce((sum, s) => sum + (s.invoice_count || 0), 0),
        paidInvoices,
        pendingInvoices,
        overdueInvoices
      };
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}

export function useCustomersData() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['customers-with-ar', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const [customersResult, invoicesResult] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('name'),
        supabase
          .from('invoices')
          .select('*')
          .eq('tenant_id', tenantId)
      ]);

      if (customersResult.error) throw customersResult.error;
      if (invoicesResult.error) throw invoicesResult.error;

      const customers = customersResult.data || [];
      const invoices = invoicesResult.data || [];

      const today = new Date();
      return customers.map(customer => {
        const customerInvoices = invoices.filter(inv => inv.customer_id === customer.id);
        const unpaidInvoices = customerInvoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled');
        const totalAR = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);
        const overdueInvoices = unpaidInvoices.filter(inv => new Date(inv.due_date) < today);
        const overdueAR = overdueInvoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);
        
        const paidInvoices = customerInvoices.filter(inv => inv.status === 'paid');
        const avgPaymentDays = paidInvoices.length > 0 
          ? Math.round(paidInvoices.reduce((sum, inv) => {
              const issueDate = new Date(inv.issue_date);
              const paidDate = new Date(inv.updated_at);
              return sum + Math.ceil((paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
            }, 0) / paidInvoices.length)
          : customer.payment_terms || 30;

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          creditLimit: customer.credit_limit || 0,
          paymentTerms: customer.payment_terms || 30,
          status: customer.status || 'active',
          totalAR,
          overdueAR,
          overdueCount: overdueInvoices.length,
          avgPaymentDays,
          riskLevel: overdueAR > (customer.credit_limit || 0) * 0.5 ? 'high' : overdueAR > 0 ? 'medium' : 'low'
        };
      });
    },
    staleTime: 30000,
    enabled: !!tenantId,
  });
}
