/**
 * useMDPChannelROI
 * 
 * Hook to manage channel ROI data from MDP for FDP budget allocation.
 * Part of Case 10: MDP → FDP flow.
 * 
 * Refactored to Schema-per-Tenant architecture.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';
import {
  CrossModuleData,
  ConfidenceLevel,
  createCrossModuleData,
} from '@/types/cross-module';
import { toast } from 'sonner';

interface BudgetRecommendation {
  channel: string;
  currentSpend: number;
  attributedRevenue: number;
  roas: number;
  profitRoas?: number;
  recommendedChange: number;
  recommendationReason: string;
  newCustomers: number;
  cac?: number;
}

interface BudgetRecommendationRPC {
  channel: string;
  current_spend: number;
  attributed_revenue: number;
  roas: number;
  profit_roas: number | null;
  recommended_change: number;
  recommendation_reason: string;
  new_customers: number;
  cac: number | null;
  confidence_level: string;
  data_source: string;
  is_cross_module: boolean;
}

interface UseBudgetRecommendationsOptions {
  lookbackDays?: number;
}

/**
 * Get budget recommendations for FDP
 */
export function useFDPBudgetRecommendations(options: UseBudgetRecommendationsOptions = {}) {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();
  const { lookbackDays = 30 } = options;

  return useQuery<CrossModuleData<BudgetRecommendation[]>>({
    queryKey: ['fdp-budget-recommendations', tenantId, lookbackDays],
    queryFn: async () => {
      if (!tenantId) {
        return createCrossModuleData<BudgetRecommendation[]>(
          [],
          'ESTIMATED',
          'no_tenant',
          false
        );
      }

      const { data, error } = await client.rpc('fdp_get_budget_recommendations' as any, {
        p_tenant_id: tenantId,
        p_lookback_days: lookbackDays,
      });

      if (error) {
        console.error('Error fetching budget recommendations:', error);
        return createCrossModuleData<BudgetRecommendation[]>(
          [],
          'ESTIMATED',
          'error_fallback',
          false
        );
      }

      const results = (data ?? []) as BudgetRecommendationRPC[];

      if (results.length === 0 || results[0]?.channel === 'no_data') {
        return createCrossModuleData<BudgetRecommendation[]>(
          [],
          'ESTIMATED',
          'no_data',
          false
        );
      }

      const recommendations = results.map((r) => ({
        channel: r.channel,
        currentSpend: r.current_spend ?? 0,
        attributedRevenue: r.attributed_revenue ?? 0,
        roas: r.roas ?? 0,
        profitRoas: r.profit_roas ?? undefined,
        recommendedChange: r.recommended_change ?? 1.0,
        recommendationReason: r.recommendation_reason ?? '',
        newCustomers: r.new_customers ?? 0,
        cac: r.cac ?? undefined,
      }));

      // Use the highest confidence level from all channels
      const confidenceLevel = results.some((r) => r.confidence_level === 'LOCKED')
        ? 'LOCKED'
        : results.some((r) => r.confidence_level === 'OBSERVED')
        ? 'OBSERVED'
        : 'ESTIMATED';

      return createCrossModuleData<BudgetRecommendation[]>(
        recommendations,
        confidenceLevel as ConfidenceLevel,
        results[0]?.data_source ?? 'unknown',
        results[0]?.is_cross_module ?? false,
        results[0]?.is_cross_module ? 'MDP' : undefined
      );
    },
    enabled: !!tenantId && isReady,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

interface PushChannelROIParams {
  channel: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  totalSpend: number;
  attributedRevenue: number;
  attributedOrders: number;
  newCustomers: number;
  profitRoas?: number;
  contributionMargin?: number;
}

/**
 * Push channel ROI from MDP to FDP
 */
export function usePushChannelROIToFDP() {
  const { client, tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PushChannelROIParams) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client.rpc('mdp_push_channel_roi_to_fdp' as any, {
        p_tenant_id: tenantId,
        p_channel: params.channel,
        p_period_start: params.periodStart,
        p_period_end: params.periodEnd,
        p_total_spend: params.totalSpend,
        p_attributed_revenue: params.attributedRevenue,
        p_attributed_orders: params.attributedOrders,
        p_new_customers: params.newCustomers,
        p_profit_roas: params.profitRoas ?? null,
        p_contribution_margin: params.contributionMargin ?? null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fdp-budget-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['mdp-channel-roi'] });
      toast.success('Đã đồng bộ ROI kênh sang FDP');
    },
    onError: (error) => {
      console.error('Failed to push channel ROI:', error);
      toast.error('Lỗi khi đồng bộ ROI kênh');
    },
  });
}

/**
 * Get all channel ROI records for management
 */
export function useMDPAllChannelROI(lookbackDays: number = 90) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['mdp-channel-roi', tenantId, lookbackDays],
    queryFn: async () => {
      if (!tenantId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);

      let query = client
        .from('mdp_channel_roi' as any)
        .select('*')
        .gte('period_end', startDate.toISOString().split('T')[0])
        .order('period_end', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching channel ROI:', error);
        return [];
      }

      return (data ?? []) as unknown as Array<{
        id: string;
        channel: string;
        period_start: string;
        period_end: string;
        total_spend: number;
        attributed_revenue: number;
        roas: number;
        profit_roas: number | null;
        recommended_budget_change: number;
        recommendation_reason: string;
        new_customers: number;
        cac: number | null;
      }>;
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Batch push channel ROI data
 */
export function useBatchPushChannelROI() {
  const { client, tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: PushChannelROIParams[]) => {
      if (!tenantId) throw new Error('No tenant selected');

      const results = await Promise.all(
        records.map((params) =>
          client.rpc('mdp_push_channel_roi_to_fdp' as any, {
            p_tenant_id: tenantId,
            p_channel: params.channel,
            p_period_start: params.periodStart,
            p_period_end: params.periodEnd,
            p_total_spend: params.totalSpend,
            p_attributed_revenue: params.attributedRevenue,
            p_attributed_orders: params.attributedOrders,
            p_new_customers: params.newCustomers,
            p_profit_roas: params.profitRoas ?? null,
            p_contribution_margin: params.contributionMargin ?? null,
          })
        )
      );

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} records failed to sync`);
      }

      return results.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['fdp-budget-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['mdp-channel-roi'] });
      toast.success(`Đã đồng bộ ${count} bản ghi ROI kênh`);
    },
    onError: (error) => {
      console.error('Failed to batch push channel ROI:', error);
      toast.error('Lỗi khi đồng bộ hàng loạt');
    },
  });
}
