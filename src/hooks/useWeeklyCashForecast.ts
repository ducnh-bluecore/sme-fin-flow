import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { useCashRunway } from './useCashRunway';
import { format, addWeeks, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';

export type WeeklyForecastMethod = 'ai' | 'simple';

export interface WeeklyCashForecastData {
  currentCash: number;
  totalInflows: number;
  totalOutflows: number;
  endingCash: number;
  lowestPoint: number;
  lowestPointWeek: number;
  weeks: WeeklyForecast[];
  assumptions: ForecastAssumptions;
  scenarios: ScenarioComparison;
  // Raw data for formula display
  rawData: {
    bankAccountCount: number;
    pendingAR: number;
    pendingAP: number;
    historicalOrders: number;
    historicalExpenses: number;
  };
  method: WeeklyForecastMethod;
}

export interface WeeklyForecast {
  weekNumber: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  
  // Inflows
  expectedCollections: number;
  expectedSales: number;
  otherInflows: number;
  totalInflows: number;
  
  // Outflows
  payroll: number;
  rent: number;
  suppliers: number;
  marketing: number;
  utilities: number;
  otherExpenses: number;
  totalOutflows: number;
  
  // Net
  netCashFlow: number;
  closingBalance: number;
  
  // Confidence
  confidence: 'high' | 'medium' | 'low';
}

export interface ForecastAssumptions {
  collectionRate: number; // % of AR collected per week
  salesGrowthRate: number; // Weekly sales growth
  avgWeeklySales: number;
  avgWeeklyExpenses: number;
}

export interface ScenarioComparison {
  base: { endingCash: number; minCash: number };
  optimistic: { endingCash: number; minCash: number };
  pessimistic: { endingCash: number; minCash: number };
}

export function useWeeklyCashForecast(method: WeeklyForecastMethod = 'ai') {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr, startDate, endDate } = useDateRangeForQuery();
  // SSOT: Use useCashRunway for current cash position
  const { data: cashRunway, isLoading: isLoadingRunway } = useCashRunway();

  return useQuery({
    queryKey: ['weekly-cash-forecast', tenantId, startDateStr, endDateStr, method, cashRunway?.currentCash],
    queryFn: async (): Promise<WeeklyCashForecastData> => {
      if (!tenantId) {
        return getEmptyData();
      }

      const today = new Date();
      
      // SSOT: Get current cash from useCashRunway instead of calculating independently
      const currentCash = cashRunway?.currentCash || 0;

      // Fetch historical data for projections (excluding bank_accounts as we use SSOT)
      const [
        invoicesRes,
        billsRes,
        ordersRes,
        expensesRes
      ] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, total_amount, paid_amount, status, due_date')
          .eq('tenant_id', tenantId)
          .neq('status', 'paid')
          .neq('status', 'cancelled'),
        supabase
          .from('bills')
          .select('id, total_amount, paid_amount, status, due_date')
          .eq('tenant_id', tenantId)
          .neq('status', 'paid')
          .neq('status', 'cancelled'),
        // SSOT: Query cdp_orders instead of external_orders
        // cdp_orders only contains delivered orders, no status filter needed
        supabase
          .from('cdp_orders')
          .select('gross_revenue, order_at')
          .eq('tenant_id', tenantId)
          .gte('order_at', startDateStr)
          .lte('order_at', endDateStr)
          .limit(50000),
        supabase
          .from('expenses')
          .select('amount, expense_date, category, is_recurring')
          .eq('tenant_id', tenantId)
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr)
      ]);

      const invoices = invoicesRes.data || [];
      const bills = billsRes.data || [];
      // Map cdp_orders to legacy format
      const rawOrders = ordersRes.data || [];
      const orders = rawOrders.map(o => ({
        total_amount: Number((o as any).gross_revenue) || 0,
        order_date: (o as any).order_at,
        status: 'delivered' as const
      }));
      const expenses = expensesRes.data || [];

      // Calculate averages from historical data
      const daysInPeriod = Math.max(differenceInDays(endDate, startDate), 1);
      const weeksOfData = Math.max(daysInPeriod / 7, 1);
      const totalHistoricalSales = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const avgWeeklySales = totalHistoricalSales / weeksOfData;

      // Group expenses by category
      const expenseByCategory: Record<string, number> = {};
      expenses.forEach(e => {
        const cat = e.category || 'other';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (e.amount || 0);
      });

      const avgWeeklyPayroll = (expenseByCategory['salary'] || 0) / weeksOfData;
      const avgWeeklyRent = (expenseByCategory['rent'] || 0) / weeksOfData;
      const avgWeeklyMarketing = (expenseByCategory['marketing'] || 0) / weeksOfData;
      const avgWeeklyUtilities = (expenseByCategory['utilities'] || 0) / weeksOfData;
      const avgWeeklyLogistics = (expenseByCategory['logistics'] || 0) / weeksOfData;
      const avgWeeklyOther = (expenseByCategory['other'] || 0) / weeksOfData;
      const avgWeeklyExpenses = Object.values(expenseByCategory).reduce((a, b) => a + b, 0) / weeksOfData;

      // Pending collections (AR)
      const pendingAR = invoices.reduce((sum, inv) => 
        sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0);
      
      // Pending payments (AP)
      const pendingAP = bills.reduce((sum, bill) => 
        sum + ((bill.total_amount || 0) - (bill.paid_amount || 0)), 0);

      // Collection rate assumptions based on method
      // AI method: probability-based collection, growth rate
      // Simple method: fixed 15% AR/week
      const collectionRate = method === 'simple' ? 0.15 : 0.15; // Base rate same, but AI uses probability adjustments
      const salesGrowthRate = method === 'simple' ? 0 : 0.02; // No growth in simple method

      // AI method: probability multiplier based on week
      const getAICollectionMultiplier = (week: number) => {
        if (week <= 4) return 0.9; // High probability early
        if (week <= 8) return 0.75; // Medium probability
        return 0.6; // Lower probability for later weeks
      };

      // Generate 13-week forecast
      const weeks: WeeklyForecast[] = [];
      let openingBalance = currentCash;
      let remainingAR = pendingAR;
      let remainingAP = pendingAP;

      for (let week = 1; week <= 13; week++) {
        const weekStart = startOfWeek(addWeeks(today, week - 1), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(addWeeks(today, week - 1), { weekStartsOn: 1 });
        
        // Inflows - differ by method
        let expectedCollections: number;
        if (method === 'simple') {
          // Simple: fixed 15% of remaining AR
          expectedCollections = remainingAR * collectionRate;
        } else {
          // AI: 15% with probability adjustment
          expectedCollections = remainingAR * collectionRate * getAICollectionMultiplier(week);
        }
        remainingAR -= expectedCollections;
        
        const expectedSales = avgWeeklySales * Math.pow(1 + salesGrowthRate, week - 1);
        const otherInflows = 0;
        const totalInflows = expectedCollections + expectedSales + otherInflows;

        // Outflows - vary by week
        const isPayrollWeek = week % 2 === 0; // Biweekly payroll
        const isRentWeek = week === 1 || week === 5 || week === 9 || week === 13; // Monthly rent
        
        const payroll = isPayrollWeek ? avgWeeklyPayroll * 2 : 0;
        const rent = isRentWeek ? avgWeeklyRent * 4 : 0;
        const suppliers = Math.min(remainingAP * 0.1, avgWeeklyLogistics);
        remainingAP -= suppliers;
        const marketing = avgWeeklyMarketing;
        const utilities = week === 1 ? avgWeeklyUtilities * 4 : 0;
        const otherExpenses = avgWeeklyOther;
        const totalOutflows = payroll + rent + suppliers + marketing + utilities + otherExpenses;

        const netCashFlow = totalInflows - totalOutflows;
        const closingBalance = openingBalance + netCashFlow;

        // Confidence - only relevant for AI method, fixed for simple
        const confidence: 'high' | 'medium' | 'low' = method === 'simple' 
          ? 'high' // Simple method = high confidence (predictable)
          : (week <= 4 ? 'high' : week <= 8 ? 'medium' : 'low');

        weeks.push({
          weekNumber: week,
          weekLabel: `Tuần ${week}`,
          startDate: format(weekStart, 'dd/MM'),
          endDate: format(weekEnd, 'dd/MM'),
          openingBalance,
          expectedCollections,
          expectedSales,
          otherInflows,
          totalInflows,
          payroll,
          rent,
          suppliers,
          marketing,
          utilities,
          otherExpenses,
          totalOutflows,
          netCashFlow,
          closingBalance,
          confidence
        });

        openingBalance = closingBalance;
      }

      // Calculate totals
      const totalInflows = weeks.reduce((sum, w) => sum + w.totalInflows, 0);
      const totalOutflows = weeks.reduce((sum, w) => sum + w.totalOutflows, 0);
      const endingCash = weeks[weeks.length - 1]?.closingBalance || currentCash;
      
      const lowestPoint = Math.min(...weeks.map(w => w.closingBalance));
      const lowestPointWeek = weeks.findIndex(w => w.closingBalance === lowestPoint) + 1;

      // Scenario comparison
      const baseEndingCash = endingCash;
      const optimisticEndingCash = currentCash + totalInflows * 1.2 - totalOutflows * 0.9;
      const pessimisticEndingCash = currentCash + totalInflows * 0.8 - totalOutflows * 1.1;

      return {
        currentCash,
        totalInflows,
        totalOutflows,
        endingCash,
        lowestPoint,
        lowestPointWeek,
        weeks,
        assumptions: {
          collectionRate: collectionRate * 100,
          salesGrowthRate: salesGrowthRate * 100,
          avgWeeklySales,
          avgWeeklyExpenses
        },
        scenarios: {
          base: { 
            endingCash: baseEndingCash, 
            minCash: lowestPoint 
          },
          optimistic: { 
            endingCash: optimisticEndingCash, 
            minCash: Math.min(...weeks.map(w => w.openingBalance + w.totalInflows * 1.2 - w.totalOutflows * 0.9))
          },
          pessimistic: { 
            endingCash: pessimisticEndingCash,
            minCash: Math.min(...weeks.map(w => w.openingBalance + w.totalInflows * 0.8 - w.totalOutflows * 1.1))
          }
        },
        rawData: {
          bankAccountCount: cashRunway?.hasEnoughData ? 1 : 0, // Indicate cash data available from SSOT
          pendingAR,
          pendingAP,
          historicalOrders: orders.length,
          historicalExpenses: expenses.length
        },
        method
      };
    },
    enabled: !!tenantId && !isLoadingRunway, // Wait for cashRunway to load first
    staleTime: 5 * 60 * 1000
  });
}

function getEmptyData(): WeeklyCashForecastData {
  return {
    currentCash: 0,
    totalInflows: 0,
    totalOutflows: 0,
    endingCash: 0,
    lowestPoint: 0,
    lowestPointWeek: 0,
    weeks: [],
    assumptions: {
      collectionRate: 15,
      salesGrowthRate: 2,
      avgWeeklySales: 0,
      avgWeeklyExpenses: 0
    },
    scenarios: {
      base: { endingCash: 0, minCash: 0 },
      optimistic: { endingCash: 0, minCash: 0 },
      pessimistic: { endingCash: 0, minCash: 0 }
    },
    rawData: {
      bankAccountCount: 0,
      pendingAR: 0,
      pendingAP: 0,
      historicalOrders: 0,
      historicalExpenses: 0
    },
    method: 'ai'
  };
}
