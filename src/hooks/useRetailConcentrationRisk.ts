/**
 * useRetailConcentrationRisk - SSOT Hook for Retail Concentration Risks
 * 
 * Phase 3: Migrated to useTenantSupabaseCompat for Schema-per-Tenant support
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';

export interface ChannelConcentration {
  name: string;
  revenue: number;
  pct: number;
}

export interface CategoryConcentration {
  name: string;
  revenue: number;
  pct: number;
}

export interface CustomerConcentration {
  id: string;
  revenue: number;
  pct: number;
  orders: number;
}

export interface SKUConcentration {
  id: string;
  name: string;
  category: string;
  margin: number;
  pct: number;
}

export interface SeasonalPattern {
  month: string;
  revenue: number;
  index: number;
}

export interface ConcentrationAlert {
  type: 'channel' | 'category' | 'customer' | 'sku' | 'seasonal';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface RetailConcentrationData {
  channelData: ChannelConcentration[];
  categoryData: CategoryConcentration[];
  customerData: CustomerConcentration[];
  skuData: SKUConcentration[];
  seasonalData: SeasonalPattern[];
  alerts: ConcentrationAlert[];
  top1ChannelPct: number;
  top1CategoryPct: number;
  top10CustomerPct: number;
  top5SKUMarginPct: number;
  maxSeasonalityIndex: number;
}

function generateAlerts(data: Record<string, unknown>): ConcentrationAlert[] {
  const alerts: ConcentrationAlert[] = [];
  
  const top1ChannelPct = Number(data.top1_channel_pct) || 0;
  const top1CategoryPct = Number(data.top1_category_pct) || 0;
  const top10CustomerPct = Number(data.top10_customer_pct) || 0;
  const top5SKUMarginPct = Number(data.top5_sku_margin_pct) || 0;
  const maxSeasonalityIndex = Number(data.max_seasonality_index) || 1;
  
  const channelData = (data.channel_concentration as ChannelConcentration[]) || [];
  const categoryData = (data.category_concentration as CategoryConcentration[]) || [];
  
  if (top1ChannelPct > 50) {
    alerts.push({
      type: 'channel',
      severity: top1ChannelPct > 70 ? 'high' : 'medium',
      message: `${channelData[0]?.name || 'Kênh top 1'} chiếm ${top1ChannelPct.toFixed(0)}% doanh thu - rủi ro phụ thuộc platform`
    });
  }
  
  if (top1CategoryPct > 40) {
    alerts.push({
      type: 'category',
      severity: top1CategoryPct > 60 ? 'high' : 'medium',
      message: `Danh mục "${categoryData[0]?.name || 'Top 1'}" chiếm ${top1CategoryPct.toFixed(0)}% - cần đa dạng hóa sản phẩm`
    });
  }
  
  if (top10CustomerPct > 30) {
    alerts.push({
      type: 'customer',
      severity: top10CustomerPct > 50 ? 'high' : 'medium',
      message: `Top 10 khách hàng chiếm ${top10CustomerPct.toFixed(0)}% doanh thu - rủi ro mất khách lớn`
    });
  }
  
  if (top5SKUMarginPct > 30) {
    alerts.push({
      type: 'sku',
      severity: top5SKUMarginPct > 50 ? 'high' : 'medium',
      message: `Top 5 SKU đóng góp ${top5SKUMarginPct.toFixed(0)}% lợi nhuận - Hero product risk`
    });
  }
  
  if (maxSeasonalityIndex > 1.5) {
    alerts.push({
      type: 'seasonal',
      severity: maxSeasonalityIndex > 2 ? 'high' : 'medium',
      message: `Seasonality Index = ${maxSeasonalityIndex.toFixed(2)} - Cash lock risk trước peak season`
    });
  }
  
  return alerts;
}

export function useRetailConcentrationRisk() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery<RetailConcentrationData>({
    queryKey: ['retail-concentration-risk', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');
      
      let query = (client as any)
        .from('v_retail_concentration_risk')
        .select('*')
        .limit(1);
      
      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data: rows, error } = await query;
      
      if (error) throw error;
      const data = rows?.[0] as Record<string, unknown> | undefined;
      
      if (!data) {
        return {
          channelData: [],
          categoryData: [],
          customerData: [],
          skuData: [],
          seasonalData: [],
          alerts: [],
          top1ChannelPct: 0,
          top1CategoryPct: 0,
          top10CustomerPct: 0,
          top5SKUMarginPct: 0,
          maxSeasonalityIndex: 1,
        };
      }
      
      const rawData = data as Record<string, unknown>;
      
      return {
        channelData: (rawData.channel_concentration as ChannelConcentration[]) || [],
        categoryData: (rawData.category_concentration as CategoryConcentration[]) || [],
        customerData: (rawData.customer_concentration as CustomerConcentration[]) || [],
        skuData: (rawData.sku_concentration as SKUConcentration[]) || [],
        seasonalData: (rawData.seasonal_pattern as SeasonalPattern[]) || [],
        alerts: generateAlerts(rawData),
        top1ChannelPct: Number(rawData.top1_channel_pct) || 0,
        top1CategoryPct: Number(rawData.top1_category_pct) || 0,
        top10CustomerPct: Number(rawData.top10_customer_pct) || 0,
        top5SKUMarginPct: Number(rawData.top5_sku_margin_pct) || 0,
        maxSeasonalityIndex: Number(rawData.max_seasonality_index) || 1,
      };
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });
}
