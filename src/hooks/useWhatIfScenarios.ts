import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface WhatIfParams {
  revenueChange: number;
  cogsChange: number;
  opexChange: number;
  arDaysChange: number;
  apDaysChange: number;
  priceChange: number;
  volumeChange: number;
}

export interface WhatIfResults {
  revenue: number;
  revenueChange: number;
  ebitda: number;
  ebitdaChange: number;
  grossMargin: number;
  marginChange: number;
  projectedCash: number;
  cashChange: number;
}

export interface RetailChannelConfig {
  enabled: boolean;
  revenueShare: number;
  growthRate: number;
}

export interface RetailParams {
  channels: Record<string, RetailChannelConfig>;
  costs: {
    cogsRate: number;
    onlineMarketingCost: number;
    marketingAdsCost?: {
      offline: number;
      online: number;
      shopee: number;
      lazada: number;
      tiki: number;
      tiktok: number;
    };
    // General marketing costs for branding/multi-channel ads (% of total revenue)
    generalMarketingCost?: {
      facebookAds: number; // Facebook/Instagram Ads
      googleAds: number; // Google Ads, YouTube
      otherAds: number; // Influencer, KOL, Affiliate, PR, etc.
    };
    marketplaceCommission: Record<string, number>;
    shippingCostPerOrder: number;
    packagingCostPerOrder: number;
    offlineRentCost: number;
  };
  operations: {
    avgOrderValue: number;
    returnRate: number;
    returnCostPercent: number;
  };
  overhead: {
    numberOfStores: number;
    offlineStaffPerStore: number;
    avgStaffCost: number;
    warehouseRent: number;
    techInfraCost: number;
  };
}

export interface MonthlyTrendData {
  month: string;
  baseEbitda: number;
  projectedEbitda: number;
  cumulativeBaseEbitda: number;
  cumulativeProjectedEbitda: number;
}

export interface WhatIfScenario {
  id: string;
  tenant_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  params: WhatIfParams;
  results: WhatIfResults;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  control_mode: 'simple' | 'retail';
  retail_params: RetailParams | null;
  monthly_trend_data: MonthlyTrendData[] | null;
}

export function useWhatIfScenarios() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['what-if-scenarios', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = client
        .from('what_if_scenarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        params: item.params as unknown as WhatIfParams,
        results: item.results as unknown as WhatIfResults,
        control_mode: (item.control_mode || 'simple') as 'simple' | 'retail',
        retail_params: item.retail_params as unknown as RetailParams | null,
        monthly_trend_data: item.monthly_trend_data as unknown as MonthlyTrendData[] | null,
      })) as WhatIfScenario[];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useSaveWhatIfScenario() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (scenario: {
      name: string;
      description?: string;
      params: WhatIfParams;
      results: WhatIfResults;
      control_mode?: 'simple' | 'retail';
      retail_params?: RetailParams | null;
      monthly_trend_data?: MonthlyTrendData[] | null;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const insertData = {
        tenant_id: tenantId,
        created_by: user?.id || null,
        name: scenario.name,
        description: scenario.description || null,
        params: JSON.parse(JSON.stringify(scenario.params)),
        results: JSON.parse(JSON.stringify(scenario.results)),
        control_mode: scenario.control_mode || 'simple',
        retail_params: scenario.retail_params ? JSON.parse(JSON.stringify(scenario.retail_params)) : null,
        monthly_trend_data: scenario.monthly_trend_data ? JSON.parse(JSON.stringify(scenario.monthly_trend_data)) : null,
      };

      const { data, error } = await client
        .from('what_if_scenarios')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['what-if-scenarios'] });
      toast.success('Đã lưu kịch bản What-If');
    },
    onError: (error) => {
      console.error('Error saving scenario:', error);
      toast.error('Không thể lưu kịch bản');
    },
  });
}

export function useUpdateWhatIfScenario() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Partial<{
        name: string;
        description: string | null;
        is_favorite: boolean;
        params: WhatIfParams;
        results: WhatIfResults;
      }>;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.is_favorite !== undefined) updateData.is_favorite = updates.is_favorite;
      if (updates.params !== undefined) updateData.params = updates.params;
      if (updates.results !== undefined) updateData.results = updates.results;

      const { data, error } = await client
        .from('what_if_scenarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['what-if-scenarios'] });
    },
    onError: (error) => {
      console.error('Error updating scenario:', error);
      toast.error('Không thể cập nhật kịch bản');
    },
  });
}

export function useDeleteWhatIfScenario() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('what_if_scenarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['what-if-scenarios'] });
      toast.success('Đã xóa kịch bản');
    },
    onError: (error) => {
      console.error('Error deleting scenario:', error);
      toast.error('Không thể xóa kịch bản');
    },
  });
}
