/**
 * useUpcomingPaymentAlerts - Hook for upcoming payment alerts
 * 
 * Fetches fixed costs with payment due dates coming up in the next 7 days
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { BaselineCategory } from './useExpenseBaselines';

// =============================================================
// TYPES
// =============================================================

export type AlertLevel = 'critical' | 'warning' | 'info';

export interface UpcomingPaymentAlert {
  id: string;
  tenantId: string;
  category: BaselineCategory;
  name: string;
  monthlyAmount: number;
  paymentDueDay: number;
  nextPaymentDate: string;
  daysUntilDue: number;
  alertLevel: AlertLevel;
}

// =============================================================
// MAIN HOOK
// =============================================================

export function useUpcomingPaymentAlerts() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['upcoming-payment-alerts', tenantId],
    queryFn: async (): Promise<UpcomingPaymentAlert[]> => {
      if (!tenantId) return [];

      let query = client
        .from('v_upcoming_payment_alerts')
        .select('*')
        .order('days_until_due', { ascending: true });
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useUpcomingPaymentAlerts] Error:', error);
        throw error;
      }

      return (data || []).map((row) => ({
        id: String(row.id),
        tenantId: String(row.tenant_id),
        category: row.category as BaselineCategory,
        name: String(row.name),
        monthlyAmount: Number(row.monthly_amount),
        paymentDueDay: Number(row.payment_due_day),
        nextPaymentDate: String(row.next_payment_date),
        daysUntilDue: Number(row.days_until_due),
        alertLevel: row.alert_level as AlertLevel,
      }));
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 60 * 1000, // Refresh every hour
  });
}
