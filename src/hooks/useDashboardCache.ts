import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';

export interface DashboardKPICache {
  id: string;
  tenant_id: string;
  cash_today: number;
  cash_7d: number;
  total_ar: number;
  overdue_ar: number;
  dso: number;
  ccc: number;
  gross_margin: number;
  ebitda: number;
  auto_match_rate: number;
  total_revenue: number;
  total_cogs: number;
  total_opex: number;
  invoice_count: number;
  overdue_invoice_count: number;
  transaction_count: number;
  matched_transaction_count: number;
  date_range_start: string | null;
  date_range_end: string | null;
  calculated_at: string;
}

// Max age for cache before refresh (1 hour)
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

export function useDashboardKPICache(dateRange: string = '90') {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['dashboard-kpi-cache', tenantId],
    queryFn: async (): Promise<DashboardKPICache | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('dashboard_kpi_cache')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching dashboard KPI cache:', error);
        return null;
      }

      // Check if cache is stale and needs refresh
      if (data) {
        const cacheAge = Date.now() - new Date(data.calculated_at).getTime();
        if (cacheAge > CACHE_MAX_AGE_MS) {
          // Trigger background refresh
          supabase.rpc('refresh_dashboard_kpi_cache', { 
            p_tenant_id: tenantId,
            p_date_range: parseInt(dateRange) || 90
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-kpi-cache', tenantId] });
          });
        }
      } else {
        // No cache exists, create it
        supabase.rpc('refresh_dashboard_kpi_cache', { 
          p_tenant_id: tenantId,
          p_date_range: parseInt(dateRange) || 90
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpi-cache', tenantId] });
        });
      }

      return data as DashboardKPICache | null;
    },
    enabled: !!tenantId && !tenantLoading,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Convert cache to the format expected by useDashboardKPIs
  const kpis = query.data ? {
    cashToday: query.data.cash_today || 0,
    cash7d: query.data.cash_7d || 0,
    totalAR: query.data.total_ar || 0,
    overdueAR: query.data.overdue_ar || 0,
    dso: query.data.dso || 0,
    ccc: query.data.ccc || 0,
    grossMargin: query.data.gross_margin || 0,
    ebitda: query.data.ebitda || 0,
    autoMatchRate: query.data.auto_match_rate || 0,
  } : null;

  return {
    ...query,
    data: kpis,
    cacheData: query.data,
  };
}

export function useRefreshDashboardKPICache() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (dateRange: number = 90) => {
      if (!tenantId) throw new Error('No tenant');

      const { error } = await supabase.rpc('refresh_dashboard_kpi_cache', {
        p_tenant_id: tenantId,
        p_date_range: dateRange,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpi-cache', tenantId] });
    },
  });
}
