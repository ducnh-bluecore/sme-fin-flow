/**
 * useCDPCreditRisk
 * 
 * Hook to fetch customer credit risk data from FDP AR aging.
 * Part of Case 8: FDP → CDP flow.
 * 
 * Refactored to Schema-per-Tenant architecture.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';
import { toast } from 'sonner';

interface CustomerCreditRisk {
  id: string;
  customerId: string;
  totalAR: number;
  overdueAR: number;
  daysOverdue: number;
  creditScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  equityRiskMultiplier: number;
  lastSyncAt: string;
}

interface CreditRiskRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  total_ar: number | null;
  overdue_ar: number | null;
  days_overdue: number | null;
  credit_score: number | null;
  risk_level: string | null;
  equity_risk_multiplier: number | null;
  source_module: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToRisk(row: CreditRiskRow): CustomerCreditRisk {
  return {
    id: row.id,
    customerId: row.customer_id,
    totalAR: row.total_ar ?? 0,
    overdueAR: row.overdue_ar ?? 0,
    daysOverdue: row.days_overdue ?? 0,
    creditScore: row.credit_score ?? 100,
    riskLevel: (row.risk_level as CustomerCreditRisk['riskLevel']) ?? 'low',
    equityRiskMultiplier: row.equity_risk_multiplier ?? 1.0,
    lastSyncAt: row.last_sync_at ?? row.created_at,
  };
}

export function useCDPCreditRisk(customerId?: string) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery<CustomerCreditRisk | null>({
    queryKey: ['cdp-credit-risk', tenantId, customerId],
    queryFn: async () => {
      if (!tenantId || !customerId) return null;

      let query = client
        .from('cdp_customer_credit_risk' as any)
        .select('*')
        .eq('customer_id', customerId);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error fetching credit risk:', error);
        return null;
      }

      if (!data) return null;

      return mapRowToRisk(data as unknown as CreditRiskRow);
    },
    enabled: !!tenantId && !!customerId && isReady,
  });
}

/**
 * Get all customers with credit risk issues
 */
export function useCDPHighRiskCustomers() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery<CustomerCreditRisk[]>({
    queryKey: ['cdp-high-risk-customers', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('cdp_customer_credit_risk' as any)
        .select('*')
        .in('risk_level', ['medium', 'high', 'critical'])
        .order('credit_score', { ascending: true });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching high risk customers:', error);
        return [];
      }

      return ((data ?? []) as unknown as CreditRiskRow[]).map(mapRowToRisk);
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Trigger sync of AR data from FDP to CDP
 */
export function useSyncARToCDP() {
  const { client, tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client.rpc('fdp_push_ar_to_cdp' as any, {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['cdp-credit-risk'] });
      queryClient.invalidateQueries({ queryKey: ['cdp-high-risk-customers'] });
      toast.success(`Đã đồng bộ ${count} bản ghi rủi ro tín dụng từ FDP`);
    },
    onError: (error) => {
      console.error('Failed to sync AR to CDP:', error);
      toast.error('Lỗi khi đồng bộ dữ liệu công nợ');
    },
  });
}
