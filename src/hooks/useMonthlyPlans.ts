import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';

export interface MonthlyPlan {
  id: string;
  tenant_id: string;
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
  total_target: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyActual {
  id: string;
  tenant_id: string;
  metric_type: string;
  year: number;
  month: number;
  actual_value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch monthly plans for a scenario
export function useMonthlyPlans(scenarioId: string | undefined, year: number) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['monthly-plans', tenantId, scenarioId, year],
    queryFn: async () => {
      if (!tenantId || !scenarioId) return [];

      const { data, error } = await supabase
        .from('scenario_monthly_plans')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('scenario_id', scenarioId)
        .eq('year', year);

      if (error) throw error;
      return data as MonthlyPlan[];
    },
    enabled: !!tenantId && !!scenarioId,
  });
}

// Fetch monthly actuals
export function useMonthlyActuals(year: number) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['monthly-actuals', tenantId, year],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('scenario_monthly_actuals')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('year', year)
        .order('month', { ascending: true });

      if (error) throw error;
      return data as MonthlyActual[];
    },
    enabled: !!tenantId,
  });
}

// Save or update monthly plan
export function useSaveMonthlyPlan() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({
      scenarioId,
      metricType,
      year,
      monthlyValues,
      totalTarget,
    }: {
      scenarioId: string;
      metricType: string;
      year: number;
      monthlyValues: number[];
      totalTarget: number;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const planData = {
        tenant_id: tenantId,
        scenario_id: scenarioId,
        metric_type: metricType,
        year,
        month_1: monthlyValues[0] || 0,
        month_2: monthlyValues[1] || 0,
        month_3: monthlyValues[2] || 0,
        month_4: monthlyValues[3] || 0,
        month_5: monthlyValues[4] || 0,
        month_6: monthlyValues[5] || 0,
        month_7: monthlyValues[6] || 0,
        month_8: monthlyValues[7] || 0,
        month_9: monthlyValues[8] || 0,
        month_10: monthlyValues[9] || 0,
        month_11: monthlyValues[10] || 0,
        month_12: monthlyValues[11] || 0,
        total_target: totalTarget,
      };

      // First check if exists
      const { data: existing } = await supabase
        .from('scenario_monthly_plans')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('scenario_id', scenarioId)
        .eq('metric_type', metricType)
        .eq('year', year)
        .maybeSingle();

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from('scenario_monthly_plans')
          .update(planData)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from('scenario_monthly_plans')
          .insert(planData)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-plans'] });
      // Refresh any reporting views that aggregate plans (Budget vs Actual, etc.)
      queryClient.invalidateQueries({
        queryKey: ['scenario-budget-data', tenantId, variables?.scenarioId, variables?.year],
      });
      queryClient.invalidateQueries({ queryKey: ['scenario-budget-data'] });
      toast.success('Đã lưu kế hoạch');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

// Save or update monthly actual
export function useSaveMonthlyActual() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({
      metricType,
      year,
      month,
      actualValue,
      notes,
    }: {
      metricType: string;
      year: number;
      month: number;
      actualValue: number;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const actualData = {
        tenant_id: tenantId,
        metric_type: metricType,
        year,
        month,
        actual_value: actualValue,
        notes: notes || null,
      };

      // First check if exists
      const { data: existing } = await supabase
        .from('scenario_monthly_actuals')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('metric_type', metricType)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      let result;
      if (existing) {
        result = await supabase
          .from('scenario_monthly_actuals')
          .update(actualData)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('scenario_monthly_actuals')
          .insert(actualData)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-actuals'] });
      // Budget vs Actual derives actuals directly from orders/expenses, but other pages may rely on this.
      queryClient.invalidateQueries({ queryKey: ['scenario-budget-data'] });
      toast.success('Đã lưu số liệu thực tế');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
}

// Helper to convert plan to array
export function planToArray(plan: MonthlyPlan | undefined): number[] {
  if (!plan) return Array(12).fill(0);
  return [
    plan.month_1,
    plan.month_2,
    plan.month_3,
    plan.month_4,
    plan.month_5,
    plan.month_6,
    plan.month_7,
    plan.month_8,
    plan.month_9,
    plan.month_10,
    plan.month_11,
    plan.month_12,
  ];
}

// Helper to get actuals as array
export function actualsToArray(actuals: MonthlyActual[], metricType: string): number[] {
  const result = Array(12).fill(0);
  actuals
    .filter((a) => a.metric_type === metricType)
    .forEach((a) => {
      if (a.month >= 1 && a.month <= 12) {
        result[a.month - 1] = a.actual_value;
      }
    });
  return result;
}
