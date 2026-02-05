/**
 * useFDPActualRevenue
 * 
 * Hook to manage FDP actual revenue data for CDP equity recalibration.
 * Part of Case 7: FDP → CDP flow.
 * 
 * Architecture v1.4.1: Uses useTenantQueryBuilder for automatic table mapping
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import {
  CrossModuleData,
  ConfidenceLevel,
  createCrossModuleData,
} from '@/types/cross-module';
import { toast } from 'sonner';

interface ActualRevenue {
  periodYear: number;
  periodMonth: number;
  actualRevenue: number;
  actualMargin?: number;
  forecastVariancePercent?: number;
  isFinalized: boolean;
}

interface ActualRevenueRPC {
  period_year: number;
  period_month: number;
  actual_revenue: number | null;
  actual_margin: number | null;
  forecast_variance_percent: number | null;
  is_finalized: boolean;
  confidence_level: string;
  data_source: string;
  is_cross_module: boolean;
}

interface UseCDPActualRevenueOptions {
  year?: number;
  month?: number;
}

/**
 * Get actual revenue for CDP recalibration
 */
export function useCDPActualRevenue(options: UseCDPActualRevenueOptions = {}) {
  const { tenantId, isReady } = useTenantSupabaseCompat();
  const { callRpc } = useTenantQueryBuilder();
  const { year, month } = options;

  return useQuery<CrossModuleData<ActualRevenue[]>>({
    queryKey: ['cdp-actual-revenue', tenantId, year, month],
    queryFn: async () => {
      if (!tenantId) {
        return createCrossModuleData<ActualRevenue[]>(
          [],
          'ESTIMATED',
          'no_tenant',
          false
        );
      }

      const { data, error } = await callRpc<ActualRevenueRPC[]>('cdp_get_actual_revenue_for_calibration', {
        p_tenant_id: tenantId,
        p_year: year ?? null,
        p_month: month ?? null,
      });

      if (error) {
        console.error('Error fetching actual revenue:', error);
        return createCrossModuleData<ActualRevenue[]>(
          [],
          'ESTIMATED',
          'error_fallback',
          false
        );
      }

      const results = data ?? [];

      if (results.length === 0 || results[0]?.actual_revenue === null) {
        return createCrossModuleData<ActualRevenue[]>(
          [],
          'ESTIMATED',
          'no_data',
          false
        );
      }

      const revenues = results
        .filter((r) => r.actual_revenue !== null)
        .map((r) => ({
          periodYear: r.period_year,
          periodMonth: r.period_month,
          actualRevenue: r.actual_revenue ?? 0,
          actualMargin: r.actual_margin ?? undefined,
          forecastVariancePercent: r.forecast_variance_percent ?? undefined,
          isFinalized: r.is_finalized ?? false,
        }));

      const confidenceLevel = results.some((r) => r.confidence_level === 'LOCKED')
        ? 'LOCKED'
        : results.some((r) => r.confidence_level === 'OBSERVED')
        ? 'OBSERVED'
        : 'ESTIMATED';

      return createCrossModuleData<ActualRevenue[]>(
        revenues,
        confidenceLevel as ConfidenceLevel,
        results[0]?.data_source ?? 'unknown',
        results[0]?.is_cross_module ?? false,
        results[0]?.is_cross_module ? 'FDP' : undefined
      );
    },
    enabled: !!tenantId && isReady,
    staleTime: 10 * 60 * 1000,
  });
}

interface PushActualRevenueParams {
  year: number;
  month: number;
  netRevenue: number;
  grossRevenue?: number;
  cogs?: number;
  contributionMargin?: number;
  orderCount?: number;
  customerCount?: number;
}

/**
 * Push actual revenue from FDP to CDP
 */
export function usePushActualRevenueToCDP() {
  const { tenantId } = useTenantSupabaseCompat();
  const { callRpc } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PushActualRevenueParams) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await callRpc<string>('fdp_push_actual_revenue_to_cdp', {
        p_tenant_id: tenantId,
        p_year: params.year,
        p_month: params.month,
        p_net_revenue: params.netRevenue,
        p_gross_revenue: params.grossRevenue ?? null,
        p_cogs: params.cogs ?? null,
        p_contribution_margin: params.contributionMargin ?? null,
        p_order_count: params.orderCount ?? null,
        p_customer_count: params.customerCount ?? null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cdp-actual-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['cdp-equity-calibration'] });
      toast.success('Đã đồng bộ doanh thu thực tế sang CDP');
    },
    onError: (error) => {
      console.error('Failed to push actual revenue:', error);
      toast.error('Lỗi khi đồng bộ doanh thu thực tế');
    },
  });
}

/**
 * Get all actual revenue records
 */
export function useFDPAllActualRevenue() {
  const { tenantId, isReady } = useTenantSupabaseCompat();
  const { buildSelectQuery } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['fdp-all-actual-revenue', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('fdp_actual_revenue_for_cdp', '*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (error) {
        console.error('Error fetching all actual revenue:', error);
        return [];
      }

      return (data ?? []) as unknown as Array<{
        id: string;
        period_year: number;
        period_month: number;
        actual_net_revenue: number;
        actual_gross_revenue: number | null;
        actual_cogs: number | null;
        actual_contribution_margin: number | null;
        forecast_variance_percent: number | null;
        is_finalized: boolean;
        synced_at: string;
      }>;
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Run daily cross-module sync
 */
export function useRunCrossModuleSync() {
  const { tenantId } = useTenantSupabaseCompat();
  const { callRpc } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await callRpc<Array<{
        sync_step: string;
        records_affected: number;
        status: string;
      }>>('cross_module_run_daily_sync', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (results) => {
      // Invalidate all cross-module queries
      queryClient.invalidateQueries({ queryKey: ['mdp-segment-ltv'] });
      queryClient.invalidateQueries({ queryKey: ['mdp-churn-signals'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-queue'] });
      queryClient.invalidateQueries({ queryKey: ['cross-module-variance-alerts'] });

      const totalRecords = results.reduce((sum, r) => sum + r.records_affected, 0);
      toast.success(`Đã đồng bộ xong ${totalRecords} bản ghi cross-module`);
    },
    onError: (error) => {
      console.error('Failed to run cross-module sync:', error);
      toast.error('Lỗi khi chạy đồng bộ cross-module');
    },
  });
}
