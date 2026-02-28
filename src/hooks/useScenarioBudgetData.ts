/**
 * useScenarioBudgetData - Scenario Budget Data Hook
 * 
 * Fetches budget data from scenario_monthly_plans for use in:
 * - Budget vs Actual page
 * - Variance Analysis page  
 * - Rolling Forecast page
 * 
 * Architecture v1.4.1: Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

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
  const { buildSelectQuery, client, tenantId, isReady } = useTenantQueryBuilder();
  const year = targetYear || new Date().getFullYear();

  return useQuery({
    queryKey: ['scenario-budget-data', tenantId, selectedScenarioId, year],
    queryFn: async (): Promise<ScenarioBudgetResult> => {
      if (!tenantId) {
        return getEmptyResult(year);
      }

      // Fetch scenarios
      const { data: scenarios } = await buildSelectQuery('scenarios', 'id, name, is_primary')
        .order('is_primary', { ascending: false });

      const scenarioList = scenarios || [];
      
      if (scenarioList.length === 0) {
        return getEmptyResult(year);
      }

      // Determine active scenario
      let activeScenario = (scenarioList as any[]).find(s => s.id === selectedScenarioId);
      if (!activeScenario) {
        activeScenario = (scenarioList as any[]).find(s => s.is_primary) || scenarioList[0];
      }

      // Fetch monthly plans for the active scenario
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

      // Fetch actuals
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      // SSOT: Query cdp_orders instead of external_orders
      const [ordersRes, expensesRes] = await Promise.all([
        buildSelectQuery('cdp_orders', 'gross_revenue, order_at')
          .gte('order_at', startOfYear)
          .lte('order_at', endOfYear),
        buildSelectQuery('expenses', 'amount, expense_date')
          .gte('expense_date', startOfYear)
          .lte('expense_date', endOfYear),
      ]);

      const rawOrders = ordersRes.data || [];
      const orders = (rawOrders as any[]).map(o => ({
        total_amount: Number(o.gross_revenue) || 0,
        order_date: o.order_at
      }));
      const expenses = (expensesRes.data || []) as any[];

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
          opexVariance: plannedOpex - actualOpex,
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
        
        let pR = 0, pO = 0, pE = 0, aR = 0, aO = 0, aE = 0, rV = 0, oV = 0, eV = 0;
        for (const m of quarterMonths) {
          pR += m.plannedRevenue; pO += m.plannedOpex; pE += m.plannedEbitda;
          aR += m.actualRevenue; aO += m.actualOpex; aE += m.actualEbitda;
          rV += m.revenueVariance; oV += m.opexVariance; eV += m.ebitdaVariance;
        }
        quarterly.push({
          quarter: q, year,
          plannedRevenue: pR, plannedOpex: pO, plannedEbitda: pE,
          actualRevenue: aR, actualOpex: aO, actualEbitda: aE,
          revenueVariance: rV, opexVariance: oV, ebitdaVariance: eV,
        });
      }

      // Build YTD
      const currentMonth = new Date().getMonth() + 1;
      const ytdMonths = monthly.filter(m => m.month <= currentMonth);
      
      let ytdPlannedRevenue = 0, ytdPlannedOpex = 0, ytdPlannedEbitda = 0;
      let ytdActualRevenue = 0, ytdActualOpex = 0, ytdActualEbitda = 0;
      for (const m of ytdMonths) {
        ytdPlannedRevenue += m.plannedRevenue; ytdPlannedOpex += m.plannedOpex; ytdPlannedEbitda += m.plannedEbitda;
        ytdActualRevenue += m.actualRevenue; ytdActualOpex += m.actualOpex; ytdActualEbitda += m.actualEbitda;
      }

      let favorableCount = 0;
      let unfavorableCount = 0;
      ytdMonths.forEach(m => {
        if (m.revenueVariance >= 0) favorableCount++; else unfavorableCount++;
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
        scenarios: scenarioList as any
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
