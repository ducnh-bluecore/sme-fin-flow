/**
 * usePromotions - Hook for promotion campaigns management
 * 
 * Migrated to useTenantQueryBuilder (Schema-per-Tenant v1.4.1)
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
  // Marketing metrics from DB
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
  discountEfficiency: number; // Net revenue per 1 VND discount
  totalOrders: number;
  roi: number;
  roas: number;
  costPerOrder: number;
  impressions: number;
  clicks: number;
  ctr: number;
  acos: number;
}

// KiotViet discount summary from cdp_orders
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

// Main hook - now queries promotion_campaigns (SSOT)
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

// ROI calculations hook
export const usePromotionROI = () => {
  const { data: campaigns = [], isLoading } = usePromotions();

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
      roi: actualCost > 0 
        ? ((totalRevenue - actualCost) / actualCost) * 100 
        : 0,
      roas: camp.roas || (actualCost > 0 ? totalRevenue / actualCost : 0),
      costPerOrder: totalOrders > 0 ? actualCost / totalOrders : 0,
      impressions: camp.impressions || 0,
      clicks: camp.clicks || 0,
      ctr: camp.ctr || 0,
      acos: camp.acos || 0,
    };
  });

  // Calculate summary
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.actual_cost || 0), 0);
  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.total_revenue || 0), 0);
  const totalDiscount = campaigns.reduce((sum, c) => sum + (c.total_discount_given || 0), 0);
  const netRevenue = totalRevenue - totalDiscount;
  const totalOrders = campaigns.reduce((sum, c) => sum + (c.total_orders || 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);

  const sortedByRoas = [...roiData].sort((a, b) => b.roas - a.roas);

  const summary: PromotionSummary = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalSpend,
    totalBudget,
    totalRevenue,
    totalDiscount,
    netRevenue,
    totalOrders,
    totalImpressions,
    totalClicks,
    avgROAS: roiData.length > 0 
      ? roiData.reduce((sum, r) => sum + r.roas, 0) / roiData.length 
      : 0,
    avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    budgetUtilization: totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0,
    topPerformer: sortedByRoas[0],
    worstPerformer: sortedByRoas[sortedByRoas.length - 1],
  };

  return { campaigns, roiData, summary, isLoading };
};

// Channel aggregation hook
export const usePromotionsByChannel = () => {
  const { roiData } = usePromotionROI();

  const channelData = roiData.reduce((acc, item) => {
    const channel = item.promotion.channel || 'Other';
    if (!acc[channel]) {
      acc[channel] = {
        channel,
        campaigns: 0,
        spend: 0,
        revenue: 0,
        orders: 0,
        impressions: 0,
        clicks: 0,
      };
    }
    acc[channel].campaigns++;
    acc[channel].spend += item.promotion.actual_cost || 0;
    acc[channel].revenue += item.totalRevenue;
    acc[channel].orders += item.totalOrders;
    acc[channel].impressions += item.impressions;
    acc[channel].clicks += item.clicks;
    return acc;
  }, {} as Record<string, { channel: string; campaigns: number; spend: number; revenue: number; orders: number; impressions: number; clicks: number }>);

  return Object.values(channelData).map(ch => ({
    ...ch,
    roas: ch.spend > 0 ? ch.revenue / ch.spend : 0,
    ctr: ch.impressions > 0 ? (ch.clicks / ch.impressions) * 100 : 0,
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
