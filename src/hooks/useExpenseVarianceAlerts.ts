/**
 * Hook to fetch expense variance alerts
 * Compares Baseline/Estimates vs Actual expenses
 */
import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

export interface ExpenseVarianceAlert {
  tenant_id: string;
  category: string;
  name: string;
  estimated: number;
  actual: number;
  variance: number;
  variance_percent: number;
  alert_status: 'underestimate' | 'overestimate' | 'on_track';
  alert_month: string;
}

export function useExpenseVarianceAlerts() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['expense-variance-alerts', tenantId],
    queryFn: async (): Promise<ExpenseVarianceAlert[]> => {
      if (!tenantId) return [];

      let query = client
        .from('v_expense_variance_alerts')
        .select('*');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching expense variance alerts:', error);
        return [];
      }

      return (data || []) as ExpenseVarianceAlert[];
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Get only alerts with issues (underestimate or overestimate)
 */
export function useExpenseVarianceIssues() {
  const { data: alerts, ...rest } = useExpenseVarianceAlerts();

  const issues = (alerts || []).filter(
    (a) => a.alert_status === 'underestimate' || a.alert_status === 'overestimate'
  );

  return {
    data: issues,
    hasIssues: issues.length > 0,
    underestimates: issues.filter((a) => a.alert_status === 'underestimate'),
    overestimates: issues.filter((a) => a.alert_status === 'overestimate'),
    ...rest,
  };
}
