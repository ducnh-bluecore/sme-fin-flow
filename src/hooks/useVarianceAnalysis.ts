/**
 * Variance Analysis Hook - Refactored
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries.
 * Uses scenario_monthly_plans as the source of budget data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface VarianceItem {
  id: string;
  tenant_id: string;
  analysis_period: string;
  period_type: 'weekly' | 'monthly' | 'quarterly';
  category: string;
  subcategory: string | null;
  channel: string | null;
  budget_amount: number;
  actual_amount: number;
  prior_period_amount: number;
  prior_year_amount: number;
  variance_to_budget: number;
  variance_pct_budget: number;
  variance_to_prior: number;
  yoy_variance: number;
  yoy_variance_pct: number;
  variance_drivers: VarianceDriver[];
  is_significant: boolean;
  requires_action: boolean;
  action_taken: string | null;
  created_at: string;
}

export interface VarianceDriver {
  factor: string;
  impact: number;
  direction: 'positive' | 'negative';
  explanation: string;
}

export interface VarianceSummary {
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  variancePercent: number;
  significantVariances: VarianceItem[];
  byCategory: Record<string, { budget: number; actual: number; variance: number }>;
  favorableCount: number;
  unfavorableCount: number;
  actionRequired: number;
}

export function useVarianceAnalysis(periodType: 'monthly' | 'quarterly' = 'monthly') {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  
  return useQuery({
    queryKey: ['variance-analysis', tenantId, periodType],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('variance_analysis', '*')
        .eq('period_type', periodType)
        .order('analysis_period', { ascending: false })
        .order('is_significant', { ascending: false });
      
      if (error) throw error;
      // Map data to handle JSON fields properly
      return ((data || []) as unknown as any[]).map(item => ({
        ...item,
        variance_drivers: (item.variance_drivers as unknown as VarianceDriver[]) || [],
      })) as VarianceItem[];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useVarianceSummary(periodType: 'monthly' | 'quarterly' = 'monthly') {
  const { data: variances, isLoading } = useVarianceAnalysis(periodType);
  
  const summary: VarianceSummary = {
    totalBudget: 0,
    totalActual: 0,
    totalVariance: 0,
    variancePercent: 0,
    significantVariances: [],
    byCategory: {},
    favorableCount: 0,
    unfavorableCount: 0,
    actionRequired: 0,
  };
  
  if (!variances || variances.length === 0) {
    return { data: summary, isLoading };
  }
  
  // Get current period only
  const currentPeriod = variances[0]?.analysis_period;
  const currentPeriodItems = variances.filter(v => v.analysis_period === currentPeriod);
  
  currentPeriodItems.forEach(v => {
    summary.totalBudget += v.budget_amount;
    summary.totalActual += v.actual_amount;
    summary.totalVariance += v.variance_to_budget;
    
    // Track by category
    if (!summary.byCategory[v.category]) {
      summary.byCategory[v.category] = { budget: 0, actual: 0, variance: 0 };
    }
    summary.byCategory[v.category].budget += v.budget_amount;
    summary.byCategory[v.category].actual += v.actual_amount;
    summary.byCategory[v.category].variance += v.variance_to_budget;
    
    // Favorable vs unfavorable
    if (v.category === 'revenue') {
      if (v.variance_to_budget >= 0) summary.favorableCount++;
      else summary.unfavorableCount++;
    } else {
      if (v.variance_to_budget <= 0) summary.favorableCount++;
      else summary.unfavorableCount++;
    }
    
    if (v.requires_action) summary.actionRequired++;
  });
  
  summary.variancePercent = summary.totalBudget !== 0 
    ? (summary.totalVariance / summary.totalBudget) * 100 
    : 0;
  
  summary.significantVariances = currentPeriodItems.filter(v => v.is_significant);
  
  return { data: summary, isLoading };
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

export function useGenerateVarianceAnalysis() {
  const queryClient = useQueryClient();
  const { client, tenantId, shouldAddTenantFilter, buildInsertQuery, buildSelectQuery } = useTenantQueryBuilder();
  
  return useMutation({
    mutationFn: async (periodDate?: Date) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const targetDate = periodDate || new Date();
      const periodStart = startOfMonth(targetDate);
      const periodEnd = endOfMonth(targetDate);
      const periodStr = format(periodStart, 'yyyy-MM-01');
      const targetMonth = targetDate.getMonth() + 1;
      const targetYear = targetDate.getFullYear();
      
      const priorPeriodStart = startOfMonth(subMonths(targetDate, 1));
      const priorPeriodEnd = endOfMonth(subMonths(targetDate, 1));
      
      const priorYearStart = startOfMonth(subMonths(targetDate, 12));
      const priorYearEnd = endOfMonth(subMonths(targetDate, 12));
      
      // Get primary scenario for budget data
      const { data: scenarios } = await buildSelectQuery('scenarios', 'id')
        .eq('is_primary', true)
        .limit(1);
      
      const primaryScenarioId = (scenarios as unknown as any[])?.[0]?.id;
      
      // Get budget from scenario_monthly_plans
      let revenueBudget = 0;
      let opexBudget = 0;
      
      if (primaryScenarioId) {
        const { data: plans } = await client
          .from('scenario_monthly_plans')
          .select('*')
          .eq('scenario_id', primaryScenarioId)
          .eq('year', targetYear);
        
        const planRows = (plans || []) as unknown as PlanRow[];
        const revenuePlan = planRows.find(p => p.metric_type === 'revenue');
        const opexPlan = planRows.find(p => p.metric_type === 'opex');
        
        const monthKey = `month_${targetMonth}` as MonthKey;
        revenueBudget = revenuePlan ? Number(revenuePlan[monthKey]) || 0 : 0;
        opexBudget = opexPlan ? Number(opexPlan[monthKey]) || 0 : 0;
      }
      
      // Build queries with conditional tenant filtering
      let ordersQuery = client
        .from('cdp_orders')
        .select('gross_revenue')
        .gte('order_at', format(periodStart, 'yyyy-MM-dd'))
        .lte('order_at', format(periodEnd, 'yyyy-MM-dd'));

      let expensesQuery = client
        .from('expenses')
        .select('amount, category')
        .gte('expense_date', format(periodStart, 'yyyy-MM-dd'))
        .lte('expense_date', format(periodEnd, 'yyyy-MM-dd'));

      let priorOrdersQuery = client
        .from('cdp_orders')
        .select('gross_revenue')
        .gte('order_at', format(priorPeriodStart, 'yyyy-MM-dd'))
        .lte('order_at', format(priorPeriodEnd, 'yyyy-MM-dd'));

      let priorExpensesQuery = client
        .from('expenses')
        .select('amount')
        .gte('expense_date', format(priorPeriodStart, 'yyyy-MM-dd'))
        .lte('expense_date', format(priorPeriodEnd, 'yyyy-MM-dd'));

      let pyOrdersQuery = client
        .from('cdp_orders')
        .select('gross_revenue')
        .gte('order_at', format(priorYearStart, 'yyyy-MM-dd'))
        .lte('order_at', format(priorYearEnd, 'yyyy-MM-dd'));

      let pyExpensesQuery = client
        .from('expenses')
        .select('amount')
        .gte('expense_date', format(priorYearStart, 'yyyy-MM-dd'))
        .lte('expense_date', format(priorYearEnd, 'yyyy-MM-dd'));

      if (shouldAddTenantFilter) {
        ordersQuery = ordersQuery.eq('tenant_id', tenantId);
        expensesQuery = expensesQuery.eq('tenant_id', tenantId);
        priorOrdersQuery = priorOrdersQuery.eq('tenant_id', tenantId);
        priorExpensesQuery = priorExpensesQuery.eq('tenant_id', tenantId);
        pyOrdersQuery = pyOrdersQuery.eq('tenant_id', tenantId);
        pyExpensesQuery = pyExpensesQuery.eq('tenant_id', tenantId);
      }

      const [
        { data: orders },
        { data: expenses },
        { data: priorOrders },
        { data: priorExpenses },
        { data: pyOrders },
        { data: pyExpenses },
      ] = await Promise.all([
        ordersQuery,
        expensesQuery,
        priorOrdersQuery,
        priorExpensesQuery,
        pyOrdersQuery,
        pyExpensesQuery,
      ]);
      
      // Calculate totals
      const actualRevenue = (orders as any[])?.reduce((sum, o) => sum + Number(o.gross_revenue), 0) || 0;
      const actualExpense = (expenses as any[])?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const priorRevenue = (priorOrders as any[])?.reduce((sum, o) => sum + Number(o.gross_revenue), 0) || 0;
      const priorExpense = (priorExpenses as any[])?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const pyRevenue = (pyOrders as any[])?.reduce((sum, o) => sum + Number(o.gross_revenue), 0) || 0;
      const pyExpense = (pyExpenses as any[])?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      
      // Use scenario budget or fallback to actuals if no budget
      const finalRevenueBudget = revenueBudget || actualRevenue;
      const finalExpenseBudget = opexBudget || actualExpense;
      
      // Create variance records
      const varianceRecords = [
        {
          tenant_id: tenantId,
          analysis_period: periodStr,
          period_type: 'monthly',
          category: 'revenue',
          subcategory: null,
          channel: null,
          budget_amount: finalRevenueBudget,
          actual_amount: actualRevenue,
          prior_period_amount: priorRevenue,
          prior_year_amount: pyRevenue,
          variance_drivers: generateVarianceDrivers('revenue', actualRevenue, finalRevenueBudget),
          requires_action: finalRevenueBudget > 0 && Math.abs((actualRevenue - finalRevenueBudget) / finalRevenueBudget) > 0.15,
        },
        {
          tenant_id: tenantId,
          analysis_period: periodStr,
          period_type: 'monthly',
          category: 'expense',
          subcategory: null,
          channel: null,
          budget_amount: finalExpenseBudget,
          actual_amount: actualExpense,
          prior_period_amount: priorExpense,
          prior_year_amount: pyExpense,
          variance_drivers: generateVarianceDrivers('expense', actualExpense, finalExpenseBudget),
          requires_action: finalExpenseBudget > 0 && Math.abs((actualExpense - finalExpenseBudget) / finalExpenseBudget) > 0.15,
        },
      ];
      
      // Cast variance_drivers to JSON for Supabase
      const insertData = varianceRecords.map(r => ({
        tenant_id: r.tenant_id,
        analysis_period: r.analysis_period,
        period_type: r.period_type,
        category: r.category,
        subcategory: r.subcategory,
        channel: r.channel,
        budget_amount: r.budget_amount,
        actual_amount: r.actual_amount,
        prior_period_amount: r.prior_period_amount,
        prior_year_amount: r.prior_year_amount,
        variance_drivers: JSON.parse(JSON.stringify(r.variance_drivers)),
        requires_action: r.requires_action,
      }));
      
      const { error } = await client
        .from('variance_analysis')
        .upsert(insertData as any, {
          onConflict: 'tenant_id,analysis_period,period_type,category,subcategory,channel',
        });
      
      if (error) throw error;
      
      return varianceRecords.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['variance-analysis'] });
      toast.success(`Đã tạo ${count} phân tích chênh lệch từ kịch bản Primary`);
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

function generateVarianceDrivers(category: string, actual: number, budget: number): VarianceDriver[] {
  const variance = actual - budget;
  const variancePct = budget !== 0 ? (variance / budget) * 100 : 0;
  const drivers: VarianceDriver[] = [];
  
  if (Math.abs(variancePct) < 5) {
    drivers.push({
      factor: 'Thực hiện đúng kế hoạch',
      impact: variance,
      direction: variance >= 0 ? 'positive' : 'negative',
      explanation: 'Chênh lệch trong phạm vi cho phép (<5%)',
    });
  } else if (category === 'revenue') {
    if (variance > 0) {
      drivers.push({
        factor: 'Doanh thu vượt kế hoạch',
        impact: variance,
        direction: 'positive',
        explanation: `Tăng ${variancePct.toFixed(1)}% so với ngân sách`,
      });
    } else {
      drivers.push({
        factor: 'Doanh thu thấp hơn kế hoạch',
        impact: variance,
        direction: 'negative',
        explanation: `Giảm ${Math.abs(variancePct).toFixed(1)}% so với ngân sách. Cần phân tích nguyên nhân và điều chỉnh chiến lược.`,
      });
    }
  } else {
    if (variance > 0) {
      drivers.push({
        factor: 'Chi phí vượt ngân sách',
        impact: variance,
        direction: 'negative',
        explanation: `Tăng ${variancePct.toFixed(1)}% so với kế hoạch. Cần kiểm soát chi tiêu.`,
      });
    } else {
      drivers.push({
        factor: 'Tiết kiệm chi phí',
        impact: variance,
        direction: 'positive',
        explanation: `Giảm ${Math.abs(variancePct).toFixed(1)}% so với ngân sách`,
      });
    }
  }
  
  return drivers;
}

export function useUpdateVarianceAction() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();
  
  return useMutation({
    mutationFn: async ({ id, actionTaken }: { id: string; actionTaken: string }) => {
      const { data, error } = await buildUpdateQuery('variance_analysis', { 
        action_taken: actionTaken,
        requires_action: false,
      })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variance-analysis', tenantId] });
      toast.success('Đã cập nhật hành động');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}
