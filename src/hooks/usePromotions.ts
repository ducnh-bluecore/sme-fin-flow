/**
 * usePromotions - Hook for promotion campaigns management
 * 
 * @architecture Schema-per-Tenant v1.4.1 / DB-First SSOT
 * Summary aggregation via get_promotion_campaign_summary RPC
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

// Updated interface to match promotion_campaigns table (SSOT)
export interface PromotionCampaign {
  id: string;
  tenant_id: string;
  campaign_name: string;
  campaign_type: string | null;
  channel: string | null;
  start_date: string;
  end_date: string;
  budget: number;
  actual_cost: number;
  total_orders: number;
  total_revenue: number;
  total_discount_given: number;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
  acos: number;
  platform_icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionROIData {
  promotion: PromotionCampaign;
  totalRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  discountEfficiency: number;
  totalOrders: number;
  roi: number;
  roas: number;
  costPerOrder: number;
  impressions: number;
  clicks: number;
  ctr: number;
  acos: number;
}

export interface KiotVietDiscountSummary {
  channel: string;
  total_orders: number;
  orders_with_discount: number;
  total_gross_revenue: number;
  total_discount: number;
  net_revenue: number;
  avg_discount_per_order: number;
}

export interface PromotionSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  totalBudget: number;
  totalOrders: number;
  totalImpressions: number;
  totalClicks: number;
  avgROAS: number;
  avgCTR: number;
  budgetUtilization: number;
  topPerformer: PromotionROIData | undefined;
  worstPerformer: PromotionROIData | undefined;
}

// Main hook - queries promotion_campaigns (SSOT)
export const usePromotions = () => {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['promotion-campaigns', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('promotion_campaigns', '*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return ((data as unknown as any[]) || []) as PromotionCampaign[];
    },
    enabled: !!tenantId && isReady,
  });
};

// ROI calculations - DB-First via RPC for summary
export const usePromotionROI = () => {
  const { data: campaigns = [], isLoading } = usePromotions();
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  // DB-First: Get aggregated summary from RPC
  const { data: dbSummary } = useQuery({
    queryKey: ['promotion-campaign-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await callRpc('get_promotion_campaign_summary', {
        p_tenant_id: tenantId,
      });
      if (error) {
        console.error('[usePromotionROI] RPC error:', error);
        return null;
      }
      return data as any;
    },
    enabled: !!tenantId && isReady,
  });

  // Per-campaign ROI mapping (no aggregation, just per-record derivation from DB columns)
  const roiData: PromotionROIData[] = campaigns.map(camp => {
    const actualCost = camp.actual_cost || 0;
    const totalRevenue = camp.total_revenue || 0;
    const totalOrders = camp.total_orders || 0;
    const totalDiscount = camp.total_discount_given || 0;
    const netRevenue = totalRevenue - totalDiscount;
    
    return {
      promotion: camp,
      totalRevenue,
      totalDiscount,
      netRevenue,
      discountEfficiency: totalDiscount > 0 ? netRevenue / totalDiscount : 0,
      totalOrders,
      roi: actualCost > 0 ? ((totalRevenue - actualCost) / actualCost) * 100 : 0,
      roas: camp.roas || (actualCost > 0 ? totalRevenue / actualCost : 0),
      costPerOrder: totalOrders > 0 ? actualCost / totalOrders : 0,
      impressions: camp.impressions || 0,
      clicks: camp.clicks || 0,
      ctr: camp.ctr || 0,
      acos: camp.acos || 0,
    };
  });

  const sortedByRoas = [...roiData].sort((a, b) => b.roas - a.roas);

  // Use DB-computed summary values
  const summary: PromotionSummary = {
    totalCampaigns: Number(dbSummary?.total_campaigns) || campaigns.length,
    activeCampaigns: Number(dbSummary?.active_campaigns) || 0,
    totalSpend: Number(dbSummary?.total_spend) || 0,
    totalBudget: Number(dbSummary?.total_budget) || 0,
    totalRevenue: Number(dbSummary?.total_revenue) || 0,
    totalDiscount: Number(dbSummary?.total_discount) || 0,
    netRevenue: Number(dbSummary?.net_revenue) || 0,
    totalOrders: Number(dbSummary?.total_orders) || 0,
    totalImpressions: Number(dbSummary?.total_impressions) || 0,
    totalClicks: Number(dbSummary?.total_clicks) || 0,
    avgROAS: Number(dbSummary?.avg_roas) || 0,
    avgCTR: Number(dbSummary?.avg_ctr) || 0,
    budgetUtilization: Number(dbSummary?.budget_utilization) || 0,
    topPerformer: sortedByRoas[0],
    worstPerformer: sortedByRoas[sortedByRoas.length - 1],
  };

  return { campaigns, roiData, summary, isLoading };
};

// Channel aggregation - DB-First via RPC
export const usePromotionsByChannel = () => {
  const { callRpc, tenantId, isReady } = useTenantQueryBuilder();

  const { data: dbSummary } = useQuery({
    queryKey: ['promotion-campaign-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await callRpc('get_promotion_campaign_summary', {
        p_tenant_id: tenantId,
      });
      if (error) return null;
      return data as any;
    },
    enabled: !!tenantId && isReady,
  });

  return ((dbSummary?.by_channel as any[]) || []).map((ch: any) => ({
    channel: ch.channel || 'Other',
    campaigns: Number(ch.campaigns) || 0,
    spend: Number(ch.spend) || 0,
    revenue: Number(ch.revenue) || 0,
    orders: Number(ch.orders) || 0,
    impressions: Number(ch.impressions) || 0,
    clicks: Number(ch.clicks) || 0,
    roas: Number(ch.roas) || 0,
    ctr: Number(ch.ctr) || 0,
  }));
};

// Mutation hooks for CRUD operations
export const useCreatePromotion = () => {
  const queryClient = useQueryClient();
  const { buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (campaign: Omit<PromotionCampaign, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildInsertQuery('promotion_campaigns', campaign)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['promotion-campaign-summary'] });
      toast.success('Đã tạo chiến dịch khuyến mãi');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useUpdatePromotion = () => {
  const queryClient = useQueryClient();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PromotionCampaign> & { id: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await buildUpdateQuery('promotion_campaigns', updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['promotion-campaign-summary'] });
      toast.success('Đã cập nhật chiến dịch');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useDeletePromotion = () => {
  const queryClient = useQueryClient();
  const { buildDeleteQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { error } = await buildDeleteQuery('promotion_campaigns')
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['promotion-campaign-summary'] });
      toast.success('Đã xóa chiến dịch');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

// Legacy exports for backward compatibility (deprecated)
export type Promotion = PromotionCampaign;
export type PromotionPerformance = any;
