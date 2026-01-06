import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { startOfMonth, subMonths, format } from 'date-fns';

interface CashRunwayData {
  currentCash: number;
  avgMonthlyBurn: number;
  runwayMonths: number | null;
  runwayDays: number | null;
  hasEnoughData: boolean;
  dataMonths: number;
  burnBreakdown: {
    bills: number;
    expenses: number;
    total: number;
  };
}

export function useCashRunway() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['cash-runway', tenantId],
    queryFn: async (): Promise<CashRunwayData> => {
      if (!tenantId) {
        return {
          currentCash: 0,
          avgMonthlyBurn: 0,
          runwayMonths: null,
          runwayDays: null,
          hasEnoughData: false,
          dataMonths: 0,
          burnBreakdown: { bills: 0, expenses: 0, total: 0 }
        };
      }

      // Get current cash balance from bank accounts
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      const currentCash = bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;

      // Calculate average monthly burn rate from last 6 months
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 6));
      const today = new Date();

      // Get bills (AP) paid in last 6 months
      const { data: bills } = await supabase
        .from('bills')
        .select('total_amount, bill_date')
        .eq('tenant_id', tenantId)
        .in('status', ['paid', 'approved'])
        .gte('bill_date', format(sixMonthsAgo, 'yyyy-MM-dd'))
        .lte('bill_date', format(today, 'yyyy-MM-dd'));

      // Get expenses in last 6 months
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('tenant_id', tenantId)
        .gte('expense_date', format(sixMonthsAgo, 'yyyy-MM-dd'))
        .lte('expense_date', format(today, 'yyyy-MM-dd'));

      const totalBills = bills?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalBurn = totalBills + totalExpenses;

      // Determine how many months of data we have
      const hasAnyBurnData = (bills?.length || 0) > 0 || (expenses?.length || 0) > 0;
      
      // Calculate actual months with data
      const allDates = [
        ...(bills?.map(b => b.bill_date) || []),
        ...(expenses?.map(e => e.expense_date) || [])
      ].filter(Boolean);

      let dataMonths = 0;
      if (allDates.length > 0) {
        const uniqueMonths = new Set(allDates.map(d => d.substring(0, 7)));
        dataMonths = uniqueMonths.size;
      }

      // Need at least 1 month of data to calculate runway
      const hasEnoughData = dataMonths >= 1 && hasAnyBurnData;

      let avgMonthlyBurn = 0;
      let runwayMonths: number | null = null;
      let runwayDays: number | null = null;

      if (hasEnoughData && dataMonths > 0) {
        avgMonthlyBurn = totalBurn / dataMonths;
        
        if (avgMonthlyBurn > 0) {
          runwayMonths = currentCash / avgMonthlyBurn;
          runwayDays = Math.round(runwayMonths * 30);
        } else if (currentCash > 0) {
          // No burn rate but has cash = infinite runway
          runwayMonths = Infinity;
          runwayDays = Infinity;
        }
      }

      return {
        currentCash,
        avgMonthlyBurn,
        runwayMonths,
        runwayDays,
        hasEnoughData,
        dataMonths,
        burnBreakdown: {
          bills: totalBills / Math.max(dataMonths, 1),
          expenses: totalExpenses / Math.max(dataMonths, 1),
          total: avgMonthlyBurn
        }
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
