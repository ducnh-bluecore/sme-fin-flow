/**
 * useWhatIfDefaults - What-If scenario defaults hook
 * 
 * Refactored to use Schema-per-Tenant architecture.
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from './useTenantSupabase';
import { WhatIfParams, RetailParams } from './useWhatIfScenarios';

export interface WhatIfDefaultsData {
  // Simple mode defaults
  simpleParams: WhatIfParams;
  
  // Retail mode defaults  
  retailParams: RetailParams;
  
  // Base metrics from actual data
  baseMetrics: {
    totalRevenue: number;
    totalCogs: number;
    totalFees: number;
    totalOrders: number;
    avgOrderValue: number;
    returnRate: number;
    channelDistribution: Record<string, { revenue: number; orders: number; share: number; growthRate: number }>;
    commissionRates: Record<string, number>;
    monthlyGrowthRate: number;
  };
  
  hasData: boolean;
}

interface ChannelMetric {
  revenue: number;
  orders: number;
  cogs: number;
  fees: number;
  aov: number;
  share: number;
}

export function useWhatIfDefaults() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['what-if-defaults', tenantId],
    queryFn: async (): Promise<WhatIfDefaultsData> => {
      // First, try to get cached metrics
      let cacheQuery = client
        .from('whatif_metrics_cache')
        .select('*');
      
      if (shouldAddTenantFilter) {
        cacheQuery = cacheQuery.eq('tenant_id', tenantId);
      }
      
      const { data: cachedMetrics, error: cacheError } = await cacheQuery.maybeSingle();

      // If cache exists and is recent (less than 1 hour old), use it
      if (cachedMetrics && !cacheError) {
        const cacheAge = Date.now() - new Date(cachedMetrics.calculated_at).getTime();
        const ONE_HOUR = 60 * 60 * 1000;
        
        if (cacheAge < ONE_HOUR) {
          console.log(`✅ Đã tải dữ liệu từ cache (${cachedMetrics.order_count} đơn hàng đã tính trước)`);
          return buildDefaultsFromCache(cachedMetrics);
        }
      }

      // If no cache or stale, trigger refresh and return from cache
      console.log('🔄 Đang tính toán metrics...');
      
      // Call the refresh function via RPC
      await client.rpc('refresh_whatif_metrics_cache', { p_tenant_id: tenantId });

      // Fetch the freshly computed cache
      let freshQuery = client
        .from('whatif_metrics_cache')
        .select('*');
      
      if (shouldAddTenantFilter) {
        freshQuery = freshQuery.eq('tenant_id', tenantId);
      }
      
      const { data: freshCache } = await freshQuery.maybeSingle();

      if (freshCache) {
        console.log(`✅ Đã tính xong metrics từ ${freshCache.order_count} đơn hàng`);
        return buildDefaultsFromCache(freshCache);
      }

      // Fallback to empty defaults if no data
      return getEmptyDefaults();
    },
    enabled: !!tenantId && isReady,
    staleTime: 300000, // 5 minutes
  });
}

// Build defaults from cached metrics
function buildDefaultsFromCache(cache: {
  total_revenue: number;
  total_cogs: number;
  total_fees: number;
  total_orders: number;
  avg_order_value: number;
  return_rate: number;
  monthly_growth_rate: number;
  channel_metrics: unknown;
  marketing_cost: number;
  overhead_cost: number;
  order_count: number;
}): WhatIfDefaultsData {
  const channelMetrics = (cache.channel_metrics || {}) as Record<string, ChannelMetric>;
  
  // Build channel distribution from cached data
  const channelDistribution: Record<string, { revenue: number; orders: number; share: number; growthRate: number }> = {};
  const commissionRates: Record<string, number> = {};

  Object.entries(channelMetrics).forEach(([channel, data]) => {
    const normalizedChannel = normalizeChannelName(channel);
    const channelData = data as ChannelMetric;
    
    channelDistribution[normalizedChannel] = {
      revenue: channelData.revenue || 0,
      orders: channelData.orders || 0,
      share: channelData.share || 0,
      growthRate: cache.monthly_growth_rate || 0,
    };
    
    // Calculate commission rate from fees
    if (channelData.revenue > 0) {
      commissionRates[normalizedChannel] = Math.round((channelData.fees / channelData.revenue) * 1000) / 10;
    }
  });

  const totalRevenue = cache.total_revenue || 0;
  const avgOrderValue = cache.avg_order_value || 0;
  const cogsRate = totalRevenue > 0 ? (cache.total_cogs / totalRevenue) * 100 : 65;
  
  // Build retail params
  const retailParams: RetailParams = {
    channels: {
      offline: {
        enabled: !!channelDistribution['offline'],
        revenueShare: channelDistribution['offline']?.share || 0,
        growthRate: channelDistribution['offline']?.growthRate || 0,
      },
      online: {
        enabled: !!channelDistribution['online'] || !!channelDistribution['website'],
        revenueShare: (channelDistribution['online']?.share || 0) + (channelDistribution['website']?.share || 0),
        growthRate: channelDistribution['online']?.growthRate || channelDistribution['website']?.growthRate || 0,
      },
      shopee: {
        enabled: !!channelDistribution['shopee'],
        revenueShare: channelDistribution['shopee']?.share || 0,
        growthRate: channelDistribution['shopee']?.growthRate || 0,
      },
      lazada: {
        enabled: !!channelDistribution['lazada'],
        revenueShare: channelDistribution['lazada']?.share || 0,
        growthRate: channelDistribution['lazada']?.growthRate || 0,
      },
      tiki: {
        enabled: !!channelDistribution['tiki'],
        revenueShare: channelDistribution['tiki']?.share || 0,
        growthRate: channelDistribution['tiki']?.growthRate || 0,
      },
      tiktok: {
        enabled: !!channelDistribution['tiktok'],
        revenueShare: channelDistribution['tiktok']?.share || 0,
        growthRate: channelDistribution['tiktok']?.growthRate || 0,
      },
    },
    costs: {
      cogsRate: Math.round(cogsRate * 10) / 10,
      onlineMarketingCost: 0,
      marketingAdsCost: {
        offline: 2,
        online: 10,
        shopee: 8,
        lazada: 10,
        tiki: 5,
        tiktok: 15,
      },
      generalMarketingCost: {
        facebookAds: 3,
        googleAds: 2,
        otherAds: 1,
      },
      marketplaceCommission: {
        shopee: commissionRates['shopee'] || 5,
        lazada: commissionRates['lazada'] || 5,
        tiki: commissionRates['tiki'] || 5,
        tiktok: commissionRates['tiktok'] || 8,
      },
      shippingCostPerOrder: Math.round(avgOrderValue * 0.05),
      packagingCostPerOrder: Math.round(avgOrderValue * 0.01),
      offlineRentCost: Math.round(cache.overhead_cost * 0.3),
    },
    operations: {
      avgOrderValue: Math.round(avgOrderValue),
      returnRate: Math.round(cache.return_rate * 10) / 10,
      returnCostPercent: 10,
    },
    overhead: {
      numberOfStores: 1,
      offlineStaffPerStore: 3,
      avgStaffCost: Math.round(cache.overhead_cost * 0.4 / 3),
      warehouseRent: Math.round(cache.overhead_cost * 0.15),
      techInfraCost: Math.round(cache.overhead_cost * 0.15),
    },
  };

  const simpleParams: WhatIfParams = {
    revenueChange: 0,
    cogsChange: 0,
    opexChange: 0,
    arDaysChange: 0,
    apDaysChange: 0,
    priceChange: 0,
    volumeChange: 0,
  };

  return {
    simpleParams,
    retailParams,
    baseMetrics: {
      totalRevenue: cache.total_revenue,
      totalCogs: cache.total_cogs,
      totalFees: cache.total_fees,
      totalOrders: cache.total_orders,
      avgOrderValue: cache.avg_order_value,
      returnRate: cache.return_rate,
      channelDistribution,
      commissionRates,
      monthlyGrowthRate: cache.monthly_growth_rate,
    },
    hasData: cache.order_count > 0,
  };
}

// Helper function
function normalizeChannelName(channel: string): string {
  const normalized = (channel || '').toLowerCase().trim();
  
  if (normalized.includes('shopee')) return 'shopee';
  if (normalized.includes('lazada')) return 'lazada';
  if (normalized.includes('tiki')) return 'tiki';
  if (normalized.includes('tiktok') || normalized.includes('tik tok')) return 'tiktok';
  if (normalized.includes('offline') || normalized.includes('store') || normalized.includes('retail')) return 'offline';
  if (normalized.includes('online') || normalized.includes('website') || normalized.includes('web')) return 'online';
  
  return normalized || 'other';
}

function getEmptyDefaults(): WhatIfDefaultsData {
  return {
    simpleParams: {
      revenueChange: 0,
      cogsChange: 0,
      opexChange: 0,
      arDaysChange: 0,
      apDaysChange: 0,
      priceChange: 0,
      volumeChange: 0,
    },
    retailParams: {
      channels: {
        offline: { enabled: true, revenueShare: 30, growthRate: 5 },
        online: { enabled: true, revenueShare: 20, growthRate: 15 },
        shopee: { enabled: true, revenueShare: 25, growthRate: 10 },
        lazada: { enabled: true, revenueShare: 15, growthRate: 8 },
        tiki: { enabled: false, revenueShare: 5, growthRate: 5 },
        tiktok: { enabled: true, revenueShare: 5, growthRate: 25 },
      },
      costs: {
        cogsRate: 65,
        onlineMarketingCost: 0,
        marketingAdsCost: {
          offline: 2,
          online: 10,
          shopee: 8,
          lazada: 10,
          tiki: 5,
          tiktok: 15,
        },
        generalMarketingCost: {
          facebookAds: 3,
          googleAds: 2,
          otherAds: 1,
        },
        marketplaceCommission: {
          shopee: 5,
          lazada: 5,
          tiki: 5,
          tiktok: 8,
        },
        shippingCostPerOrder: 25000,
        packagingCostPerOrder: 5000,
        offlineRentCost: 50000000,
      },
      operations: {
        avgOrderValue: 500000,
        returnRate: 3,
        returnCostPercent: 10,
      },
      overhead: {
        numberOfStores: 1,
        offlineStaffPerStore: 3,
        avgStaffCost: 10000000,
        warehouseRent: 30000000,
        techInfraCost: 10000000,
      },
    },
    baseMetrics: {
      totalRevenue: 0,
      totalCogs: 0,
      totalFees: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      returnRate: 0,
      channelDistribution: {},
      commissionRates: {},
      monthlyGrowthRate: 0,
    },
    hasData: false,
  };
}
