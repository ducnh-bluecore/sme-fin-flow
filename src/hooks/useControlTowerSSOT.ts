/**
 * ============================================
 * CONTROL TOWER SSOT HOOK
 * ============================================
 * 
 * Replaces useControlTowerAnalytics with real data from RPC.
 * NO hardcoded data, NO Math.random().
 * 
 * Uses: get_control_tower_summary RPC
 * 
 * @architecture Schema-per-Tenant v1.4.1
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export interface ControlTowerData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  uniqueCustomers: number;
  dailyData: Array<{
    date_val: string;
    date_label: string;
    revenue: number;
    orders: number;
  }>;
  channelData: Array<{
    channel: string;
    revenue: number;
    orders: number;
  }>;
  hourlyData: Array<{
    hour_val: number;
    hour_label: string;
    orders: number;
  }>;
  storeData: Array<{
    store_name: string;
    revenue: number;
    orders: number;
  }>;
  categoryData: Array<{
    category: string;
    value: number;
  }>;
  comparison: {
    currentRevenue: number;
    previousRevenue: number;
    revenueChange: number;
    currentOrders: number;
    previousOrders: number;
    ordersChange: number;
  };
  dataQuality: {
    hasRealData: boolean;
    orderCount: number;
    dateRange: { start: string; end: string };
  };
}

export function useControlTowerSSOT() {
  const { tenantId, isReady, callRpc } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['control-tower-ssot', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<ControlTowerData | null> => {
      if (!tenantId) return null;

      const { data, error } = await callRpc('get_control_tower_summary', {
        p_tenant_id: tenantId,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
      });

      if (error) {
        console.error('Control Tower RPC error:', error);
        throw error;
      }

      // Parse JSONB response
      const result = data as unknown as ControlTowerData;
      
      return {
        totalRevenue: result?.totalRevenue ?? 0,
        totalOrders: result?.totalOrders ?? 0,
        avgOrderValue: result?.avgOrderValue ?? 0,
        uniqueCustomers: result?.uniqueCustomers ?? 0,
        dailyData: result?.dailyData ?? [],
        channelData: result?.channelData ?? [],
        hourlyData: result?.hourlyData ?? [],
        storeData: result?.storeData ?? [],
        categoryData: result?.categoryData ?? [],
        comparison: result?.comparison ?? {
          currentRevenue: 0,
          previousRevenue: 0,
          revenueChange: 0,
          currentOrders: 0,
          previousOrders: 0,
          ordersChange: 0,
        },
        dataQuality: result?.dataQuality ?? {
          hasRealData: false,
          orderCount: 0,
          dateRange: { start: startDateStr, end: endDateStr },
        },
      };
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000, // Cache 2 minutes
  });
}

// Legacy format adapter for AnalyticsPage compatibility
export function useControlTowerAnalyticsSSoT() {
  const { data, isLoading, error } = useControlTowerSSOT();

  // Map to legacy format expected by AnalyticsPage
  const legacyData = data ? {
    revenueData: data.dailyData.map(d => ({
      date: d.date_label,
      revenue: d.revenue / 1_000_000, // Convert to millions for chart
      target: 0, // No target data in real system
    })),
    categoryData: data.categoryData.map(c => ({
      name: c.category,
      value: data.categoryData.length > 0 
        ? Math.round((c.value / data.categoryData.reduce((s, x) => s + x.value, 0)) * 100) 
        : 0,
      color: getCategoryColor(c.category),
    })),
    storePerformance: data.storeData.map(s => ({
      store: s.store_name,
      revenue: Math.round(s.revenue / 1_000_000), // Millions
      orders: s.orders,
      growth: 0, // Would need historical comparison
    })),
    hourlyData: data.hourlyData.map(h => ({
      hour: h.hour_label,
      orders: h.orders,
    })),
    summary: {
      totalRevenue: data.totalRevenue,
      totalOrders: data.totalOrders,
      newCustomers: data.uniqueCustomers,
      aov: data.avgOrderValue,
      revenueChange: data.comparison.revenueChange,
      ordersChange: data.comparison.ordersChange,
      customersChange: 0,
      aovChange: 0,
    },
    dataQuality: data.dataQuality,
  } : null;

  return { data: legacyData, isLoading, error };
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Điện thoại': '#3B82F6',
    'Laptop': '#10B981',
    'Phụ kiện': '#F59E0B',
    'Tablet': '#8B5CF6',
    'Thời trang': '#EC4899',
    'Mỹ phẩm': '#F97316',
    'Khác': '#6B7280',
  };
  return colors[category] || '#6B7280';
}
