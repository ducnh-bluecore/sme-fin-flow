/**
 * Platform Ads Data Hook - SSOT
 * 
 * Fetches platform ads metrics from v_mdp_platform_ads_summary view.
 * Replaces hardcoded mock data in MDPDashboardPage and MarketingModePage.
 * 
 * @architecture database-first
 * @domain MDP
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import type { PlatformAdsData } from '@/components/mdp/marketing-mode/PlatformAdsOverview';

const PLATFORM_NAME_MAP: Record<string, string> = {
  shopee: 'Shopee Ads',
  lazada: 'Lazada Ads',
  tiktok: 'TikTok Shop',
  meta: 'Meta Ads',
  google: 'Google Ads',
  sendo: 'Sendo Ads',
};

export function usePlatformAdsData() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['platform-ads-data', tenantId],
    queryFn: async (): Promise<PlatformAdsData[]> => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('v_mdp_platform_ads_summary')
        .select('*')
        .eq('tenant_id', tenantId);
        
      if (error) throw error;
      
      if (!data || data.length === 0) return [];
      
      // Map database rows to PlatformAdsData interface
      return data.map(row => ({
        platform: PLATFORM_NAME_MAP[row.platform] || row.platform,
        platform_icon: row.platform_icon as PlatformAdsData['platform_icon'],
        is_active: row.is_active ?? true,
        spend_today: Number(row.spend_today) || 0,
        spend_month: Number(row.spend_month) || 0,
        budget_month: Number(row.budget_month) || 0,
        budget_utilization: Number(row.budget_utilization) || 0,
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        orders: Number(row.orders) || 0,
        revenue: Number(row.revenue) || 0,
        cpm: Number(row.cpm) || 0,
        cpc: Number(row.cpc) || 0,
        ctr: Number(row.ctr) || 0,
        cvr: Number(row.cvr) || 0,
        cpa: Number(row.cpa) || 0,
        roas: Number(row.roas) || 0,
        acos: Number(row.acos) || 0,
        add_to_cart: Number(row.add_to_cart) || 0,
        atc_rate: Number(row.atc_rate) || 0,
        quality_score: row.quality_score != null ? Number(row.quality_score) : undefined,
        relevance_score: row.relevance_score != null ? Number(row.relevance_score) : undefined,
        spend_trend: Number(row.spend_trend) || 0,
        cpa_trend: Number(row.cpa_trend) || 0,
        roas_trend: Number(row.roas_trend) || 0,
      }));
    },
    enabled: !!tenantId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
