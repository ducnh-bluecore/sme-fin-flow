import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

/**
 * Scenario Budget Data Hook
 * Fetches budget data from scenario_monthly_plans for use in:
 * - Budget vs Actual page
 * - Variance Analysis page  
 * - Rolling Forecast page
 * 
 * Schema: scenario_monthly_plans has metric_type (revenue, opex, ebitda)
 * and month_1 through month_12 columns for each metric.
 */

export interface ScenarioBudgetMonth {
  month: number;
  year: number;
  plannedRevenue: number;
  plannedOpex: number;
  plannedEbitda: number;
  actualRevenue: number;
  actualOpex: number;
  actualEbitda: number;
  revenueVariance: number;
  opexVariance: number;
  ebitdaVariance: number;
  revenueVariancePct: number;
  opexVariancePct: number;
  ebitdaVariancePct: number;
}

export interface ScenarioBudgetQuarter {
  quarter: number;
  year: number;
  plannedRevenue: number;
  plannedOpex: number;
  plannedEbitda: number;
  actualRevenue: number;
  actualOpex: number;
  actualEbitda: number;
  revenueVariance: number;
  opexVariance: number;
  ebitdaVariance: number;
}

export interface ScenarioBudgetYTD {
  plannedRevenue: number;
  plannedOpex: number;
  plannedEbitda: number;
  actualRevenue: number;
  actualOpex: number;
  actualEbitda: number;
  revenueVariance: number;
  opexVariance: number;
  ebitdaVariance: number;
  revenueVariancePct: number;
  opexVariancePct: number;
  ebitdaVariancePct: number;
  progress: number;
  favorableCount: number;
  unfavorableCount: number;
}

export interface ScenarioBudgetResult {
  scenarioId: string | null;
  scenarioName: string;
  isPrimary: boolean;
  year: number;
  monthly: ScenarioBudgetMonth[];
  quarterly: ScenarioBudgetQuarter[];
  ytd: ScenarioBudgetYTD;
  scenarios: Array<{ id: string; name: string; is_primary: boolean }>;
}

interface Props {
  selectedScenarioId?: string | null;
  targetYear?: number;
}

type MonthKey = 'month_1' | 'month_2' | 'month_3' | 'month_4' | 'month_5' | 'month_6' | 
                'month_7' | 'month_8' | 'month_9' | 'month_10' | 'month_11' | 'month_12';

interface PlanRow {
  id: string;
  scenario_id: string;
  metric_type: string;
  year: number;
  month_1: number;
  month_2: number;
  month_3: number;
  month_4: number;
  month_5: number;
  month_6: number;
  month_7: number;
  month_8: number;
  month_9: number;
  month_10: number;
  month_11: number;
  month_12: number;
}

export function useScenarioBudgetData({ selectedScenarioId, targetYear }: Props = {}) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const year = targetYear || new Date().getFullYear();

  return useQuery({
    queryKey: ['scenario-budget-data', tenantId, selectedScenarioId, year],
    queryFn: async (): Promise<ScenarioBudgetResult> => {
      if (!tenantId) {
        return getEmptyResult(year);
      }

      // Fetch scenarios
      let scenarioQuery = client
        .from('scenarios')
        .select('id, name, is_primary')
        .order('is_primary', { ascending: false });

      if (shouldAddTenantFilter) {
        scenarioQuery = scenarioQuery.eq('tenant_id', tenantId);
      }

      const { data: scenarios } = await scenarioQuery;

      const scenarioList = scenarios || [];
      
      if (scenarioList.length === 0) {
        return getEmptyResult(year);
      }

      // Determine active scenario
      let activeScenario = scenarioList.find(s => s.id === selectedScenarioId);
      if (!activeScenario) {
        activeScenario = scenarioList.find(s => s.is_primary) || scenarioList[0];
      }

      // Fetch monthly plans for the active scenario
      // Schema: metric_type = 'revenue' | 'opex' | 'ebitda', month_1 to month_12
      const { data: plans } = await client
        .from('scenario_monthly_plans')
        .select('*')
        .eq('scenario_id', activeScenario.id)
        .eq('year', year);

      const planRows = (plans || []) as unknown as PlanRow[];

      // Extract planned values by metric type
      const revenuePlan = planRows.find(p => p.metric_type === 'revenue');
      const opexPlan = planRows.find(p => p.metric_type === 'opex');
      const ebitdaPlan = planRows.find(p => p.metric_type === 'ebitda');

      // Fetch actuals from external_orders and expenses
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      // SSOT: Query cdp_orders instead of external_orders
      // cdp_orders only contains delivered orders, no status filter needed
      let ordersQuery = client
        .from('cdp_orders')
        .select('gross_revenue, order_at')
        .gte('order_at', startOfYear)
        .lte('order_at', endOfYear);

      let expensesQuery = client
        .from('expenses')
        .select('amount, expense_date')
        .gte('expense_date', startOfYear)
        .lte('expense_date', endOfYear);

      if (shouldAddTenantFilter) {
        ordersQuery = ordersQuery.eq('tenant_id', tenantId);
        expensesQuery = expensesQuery.eq('tenant_id', tenantId);
      }

      const [ordersRes, expensesRes] = await Promise.all([ordersQuery, expensesQuery]);

      // Map cdp_orders to legacy format for compatibility
      const rawOrders = ordersRes.data || [];
      const orders = rawOrders.map(o => ({
        total_amount: Number((o as any).gross_revenue) || 0,
        order_date: (o as any).order_at
      }));
      const expenses = expensesRes.data || [];

      // Aggregate actuals by month
      const actualsByMonth: Record<number, { revenue: number; opex: number }> = {};
      for (let m = 1; m <= 12; m++) {
        actualsByMonth[m] = { revenue: 0, opex: 0 };
      }

      orders.forEach(o => {
        const month = parseInt(o.order_date?.substring(5, 7) || '0');
        if (month >= 1 && month <= 12) {
          actualsByMonth[month].revenue += o.total_amount || 0;
        }
      });

      expenses.forEach(e => {
        const month = parseInt(e.expense_date?.substring(5, 7) || '0');
        if (month >= 1 && month <= 12) {
          actualsByMonth[month].opex += e.amount || 0;
        }
      });

      // Helper to get month value from plan row
      const getMonthValue = (plan: PlanRow | undefined, month: number): number => {
        if (!plan) return 0;
        const key = `month_${month}` as MonthKey;
        return Number(plan[key]) || 0;
      };

      // Build monthly data
      const monthly: ScenarioBudgetMonth[] = [];

      for (let m = 1; m <= 12; m++) {
        const actual = actualsByMonth[m];

        const plannedRevenue = getMonthValue(revenuePlan, m);
        const plannedOpex = getMonthValue(opexPlan, m);
        const plannedEbitda = getMonthValue(ebitdaPlan, m) || (plannedRevenue - plannedOpex);
        
        const actualRevenue = actual.revenue;
        const actualOpex = actual.opex;
        const actualEbitda = actualRevenue - actualOpex;

        monthly.push({
          month: m,
          year,
          plannedRevenue,
          plannedOpex,
          plannedEbitda,
          actualRevenue,
          actualOpex,
          actualEbitda,
          revenueVariance: actualRevenue - plannedRevenue,
          opexVariance: plannedOpex - actualOpex, // Favorable if spent less
          ebitdaVariance: actualEbitda - plannedEbitda,
          revenueVariancePct: plannedRevenue > 0 ? ((actualRevenue - plannedRevenue) / plannedRevenue) * 100 : 0,
          opexVariancePct: plannedOpex > 0 ? ((plannedOpex - actualOpex) / plannedOpex) * 100 : 0,
          ebitdaVariancePct: plannedEbitda > 0 ? ((actualEbitda - plannedEbitda) / plannedEbitda) * 100 : 0
        });
      }

      // Build quarterly data
      const quarterly: ScenarioBudgetQuarter[] = [];
      for (let q = 1; q <= 4; q++) {
        const startMonth = (q - 1) * 3;
        const quarterMonths = monthly.slice(startMonth, startMonth + 3);
        
        quarterly.push({
          quarter: q,
          year,
          plannedRevenue: quarterMonths.reduce((s, m) => s + m.plannedRevenue, 0),
          plannedOpex: quarterMonths.reduce((s, m) => s + m.plannedOpex, 0),
          plannedEbitda: quarterMonths.reduce((s, m) => s + m.plannedEbitda, 0),
          actualRevenue: quarterMonths.reduce((s, m) => s + m.actualRevenue, 0),
          actualOpex: quarterMonths.reduce((s, m) => s + m.actualOpex, 0),
          actualEbitda: quarterMonths.reduce((s, m) => s + m.actualEbitda, 0),
          revenueVariance: quarterMonths.reduce((s, m) => s + m.revenueVariance, 0),
          opexVariance: quarterMonths.reduce((s, m) => s + m.opexVariance, 0),
          ebitdaVariance: quarterMonths.reduce((s, m) => s + m.ebitdaVariance, 0)
        });
      }

      // Build YTD
      const currentMonth = new Date().getMonth() + 1;
      const ytdMonths = monthly.filter(m => m.month <= currentMonth);
      
      const ytdPlannedRevenue = ytdMonths.reduce((s, m) => s + m.plannedRevenue, 0);
      const ytdPlannedOpex = ytdMonths.reduce((s, m) => s + m.plannedOpex, 0);
      const ytdPlannedEbitda = ytdMonths.reduce((s, m) => s + m.plannedEbitda, 0);
      const ytdActualRevenue = ytdMonths.reduce((s, m) => s + m.actualRevenue, 0);
      const ytdActualOpex = ytdMonths.reduce((s, m) => s + m.actualOpex, 0);
      const ytdActualEbitda = ytdMonths.reduce((s, m) => s + m.actualEbitda, 0);

      let favorableCount = 0;
      let unfavorableCount = 0;
      ytdMonths.forEach(m => {
        // Revenue: favorable if actual >= planned
        if (m.revenueVariance >= 0) favorableCount++; else unfavorableCount++;
        // OPEX: favorable if spent less
        if (m.opexVariance >= 0) favorableCount++; else unfavorableCount++;
      });

      const ytd: ScenarioBudgetYTD = {
        plannedRevenue: ytdPlannedRevenue,
        plannedOpex: ytdPlannedOpex,
        plannedEbitda: ytdPlannedEbitda,
        actualRevenue: ytdActualRevenue,
        actualOpex: ytdActualOpex,
        actualEbitda: ytdActualEbitda,
        revenueVariance: ytdActualRevenue - ytdPlannedRevenue,
        opexVariance: ytdPlannedOpex - ytdActualOpex,
        ebitdaVariance: ytdActualEbitda - ytdPlannedEbitda,
        revenueVariancePct: ytdPlannedRevenue > 0 ? ((ytdActualRevenue - ytdPlannedRevenue) / ytdPlannedRevenue) * 100 : 0,
        opexVariancePct: ytdPlannedOpex > 0 ? ((ytdPlannedOpex - ytdActualOpex) / ytdPlannedOpex) * 100 : 0,
        ebitdaVariancePct: ytdPlannedEbitda > 0 ? ((ytdActualEbitda - ytdPlannedEbitda) / ytdPlannedEbitda) * 100 : 0,
        progress: (currentMonth / 12) * 100,
        favorableCount,
        unfavorableCount
      };

      return {
        scenarioId: activeScenario.id,
        scenarioName: activeScenario.name,
        isPrimary: activeScenario.is_primary || false,
        year,
        monthly,
        quarterly,
        ytd,
        scenarios: scenarioList
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000
  });
}

function getEmptyResult(year: number): ScenarioBudgetResult {
  const emptyYTD: ScenarioBudgetYTD = {
    plannedRevenue: 0, plannedOpex: 0, plannedEbitda: 0,
    actualRevenue: 0, actualOpex: 0, actualEbitda: 0,
    revenueVariance: 0, opexVariance: 0, ebitdaVariance: 0,
    revenueVariancePct: 0, opexVariancePct: 0, ebitdaVariancePct: 0,
    progress: 0, favorableCount: 0, unfavorableCount: 0
  };

  return {
    scenarioId: null,
    scenarioName: '',
    isPrimary: false,
    year,
    monthly: [],
    quarterly: [],
    ytd: emptyYTD,
    scenarios: []
  };
}
