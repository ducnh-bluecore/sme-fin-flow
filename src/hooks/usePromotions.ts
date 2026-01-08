import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface Promotion {
  id: string;
  tenant_id: string;
  promotion_name: string;
  promotion_code: string | null;
  promotion_type: string;
  channel: string | null;
  start_date: string;
  end_date: string;
  budget: number;
  actual_spend: number;
  target_revenue: number;
  actual_revenue: number;
  target_orders: number;
  actual_orders: number;
  discount_value: number | null;
  min_order_value: number | null;
  max_discount: number | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionPerformance {
  id: string;
  tenant_id: string;
  promotion_id: string;
  performance_date: string;
  orders_count: number;
  gross_revenue: number;
  discount_given: number;
  net_revenue: number;
  cogs: number;
  gross_profit: number;
  new_customers: number;
  repeat_customers: number;
  avg_order_value: number;
  created_at: string;
}

export interface PromotionROI {
  promotion: Promotion;
  totalRevenue: number;
  totalDiscount: number;
  totalCOGS: number;
  grossProfit: number;
  roi: number; // (revenue - cost) / cost * 100
  roas: number; // revenue / spend
  costPerOrder: number;
  conversionRate: number;
  incrementalRevenue: number;
}

export const usePromotions = () => {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['promotions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('promotions' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return (data as unknown) as Promotion[];
    },
    enabled: !!tenantId,
  });
};

export const usePromotionPerformance = (promotionId?: string) => {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['promotion-performance', tenantId, promotionId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('promotion_performance' as any)
        .select('*')
        .eq('tenant_id', tenantId);

      if (promotionId) {
        query = query.eq('promotion_id', promotionId);
      }

      const { data, error } = await query.order('performance_date', { ascending: false });

      if (error) throw error;
      return (data as unknown) as PromotionPerformance[];
    },
    enabled: !!tenantId,
  });
};

export const usePromotionROI = () => {
  const { data: promotions = [], isLoading: promotionsLoading } = usePromotions();
  const { data: performance = [], isLoading: performanceLoading } = usePromotionPerformance();

  const roiData: PromotionROI[] = promotions.map(promo => {
    const promoPerf = performance.filter(p => p.promotion_id === promo.id);
    
    const totalRevenue = promoPerf.reduce((sum, p) => sum + p.gross_revenue, 0);
    const totalDiscount = promoPerf.reduce((sum, p) => sum + p.discount_given, 0);
    const totalCOGS = promoPerf.reduce((sum, p) => sum + p.cogs, 0);
    const totalOrders = promoPerf.reduce((sum, p) => sum + p.orders_count, 0);
    const grossProfit = promoPerf.reduce((sum, p) => sum + p.gross_profit, 0);

    const totalCost = promo.actual_spend + totalDiscount + totalCOGS;
    const roi = totalCost > 0 ? ((grossProfit - promo.actual_spend) / promo.actual_spend) * 100 : 0;
    const roas = promo.actual_spend > 0 ? totalRevenue / promo.actual_spend : 0;
    const costPerOrder = totalOrders > 0 ? promo.actual_spend / totalOrders : 0;

    return {
      promotion: promo,
      totalRevenue,
      totalDiscount,
      totalCOGS,
      grossProfit,
      roi,
      roas,
      costPerOrder,
      conversionRate: promo.target_orders > 0 ? (totalOrders / promo.target_orders) * 100 : 0,
      incrementalRevenue: totalRevenue - (promo.actual_spend + totalDiscount),
    };
  });

  const summary = {
    totalPromotions: promotions.length,
    activePromotions: promotions.filter(p => p.status === 'active').length,
    totalSpend: promotions.reduce((sum, p) => sum + p.actual_spend, 0),
    totalRevenue: roiData.reduce((sum, r) => sum + r.totalRevenue, 0),
    avgROI: roiData.length > 0 ? roiData.reduce((sum, r) => sum + r.roi, 0) / roiData.length : 0,
    avgROAS: roiData.length > 0 ? roiData.reduce((sum, r) => sum + r.roas, 0) / roiData.length : 0,
    topPerformer: roiData.sort((a, b) => b.roi - a.roi)[0],
    worstPerformer: roiData.sort((a, b) => a.roi - b.roi)[0],
  };

  return {
    promotions,
    roiData,
    summary,
    isLoading: promotionsLoading || performanceLoading,
  };
};

export const useCreatePromotion = () => {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (promotion: Omit<Promotion, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('promotions' as any)
        .insert({ ...promotion, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Đã tạo chương trình khuyến mãi');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useUpdatePromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Promotion> & { id: string }) => {
      const { data, error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Đã cập nhật chương trình');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};

export const useDeletePromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Đã xóa chương trình');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
};
