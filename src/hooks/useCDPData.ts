import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { useDateRange } from '@/contexts/DateRangeContext';
import { useMemo } from 'react';

// Types for CDP data
export interface CustomerValueData {
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  grossMargin: number;
  returnRate: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
  daysSinceLastOrder: number;
  purchaseFrequency: number; // orders per month
}

export interface PercentileDistribution {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  mean: number;
}

export interface ValueDistribution {
  revenue: PercentileDistribution;
  margin: PercentileDistribution;
  frequency: PercentileDistribution;
  returnRate: PercentileDistribution;
  aov: PercentileDistribution;
}

export interface SegmentSummary {
  name: string;
  customerCount: number;
  percentOfTotal: number;
  totalRevenue: number;
  avgRevenue: number;
  avgMargin: number;
  avgFrequency: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

// Calculate percentile from sorted array
function calculatePercentile(sortedArr: number[], percentile: number): number {
  if (sortedArr.length === 0) return 0;
  const index = (percentile / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedArr[lower];
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
}

// Calculate distribution stats
function calculateDistribution(values: number[]): PercentileDistribution {
  if (values.length === 0) {
    return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, min: 0, max: 0, mean: 0 };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    p10: calculatePercentile(sorted, 10),
    p25: calculatePercentile(sorted, 25),
    p50: calculatePercentile(sorted, 50),
    p75: calculatePercentile(sorted, 75),
    p90: calculatePercentile(sorted, 90),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
  };
}

export function useCDPData() {
  const { data: tenantId } = useActiveTenantId();
  const { dateRange } = useDateRange();
  
  // Fetch orders with customer info
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['cdp-orders', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('external_orders')
        .select(`
          id,
          customer_name,
          customer_phone,
          order_date,
          total_amount,
          cost_of_goods,
          status
        `)
        .eq('tenant_id', tenantId)
        .not('customer_phone', 'is', null)
        .order('order_date', { ascending: true })
        .limit(50000);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Aggregate customer data
  const customerData = useMemo<CustomerValueData[]>(() => {
    if (!ordersData || ordersData.length === 0) return [];
    
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      orders: { date: Date; amount: number; cogs: number; status: string }[];
    }>();
    
    for (const order of ordersData) {
      const key = order.customer_phone || order.customer_name || 'unknown';
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: order.customer_name || 'Unknown',
          phone: order.customer_phone || '',
          orders: [],
        });
      }
      
      customerMap.get(key)!.orders.push({
        date: new Date(order.order_date),
        amount: Number(order.total_amount) || 0,
        cogs: Number(order.cost_of_goods) || 0,
        status: order.status || 'delivered',
      });
    }
    
    const now = new Date();
    const result: CustomerValueData[] = [];
    
    for (const [customerId, data] of customerMap.entries()) {
      const deliveredOrders = data.orders.filter(o => 
        o.status !== 'cancelled' && o.status !== 'returned'
      );
      const returnedOrders = data.orders.filter(o => o.status === 'returned');
      
      if (deliveredOrders.length === 0) continue;
      
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.amount, 0);
      const totalCogs = deliveredOrders.reduce((sum, o) => sum + o.cogs, 0);
      const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;
      
      const dates = deliveredOrders.map(o => o.date);
      const firstOrderDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const lastOrderDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      const daysSinceLastOrder = Math.floor(
        (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const monthsActive = Math.max(1, 
        (lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      const returnRate = data.orders.length > 0 
        ? (returnedOrders.length / data.orders.length) * 100 
        : 0;
      
      result.push({
        customerId,
        customerName: data.name,
        customerPhone: data.phone,
        totalRevenue,
        orderCount: deliveredOrders.length,
        avgOrderValue: totalRevenue / deliveredOrders.length,
        grossMargin,
        returnRate,
        firstOrderDate,
        lastOrderDate,
        daysSinceLastOrder,
        purchaseFrequency: deliveredOrders.length / monthsActive,
      });
    }
    
    return result;
  }, [ordersData]);

  // Calculate value distribution
  const valueDistribution = useMemo<ValueDistribution | null>(() => {
    if (customerData.length === 0) return null;
    
    return {
      revenue: calculateDistribution(customerData.map(c => c.totalRevenue)),
      margin: calculateDistribution(customerData.map(c => c.grossMargin)),
      frequency: calculateDistribution(customerData.map(c => c.purchaseFrequency)),
      returnRate: calculateDistribution(customerData.map(c => c.returnRate)),
      aov: calculateDistribution(customerData.map(c => c.avgOrderValue)),
    };
  }, [customerData]);

  // Calculate segment summaries (value-based tiers)
  const segmentSummaries = useMemo<SegmentSummary[]>(() => {
    if (customerData.length === 0 || !valueDistribution) return [];
    
    const p90 = valueDistribution.revenue.p90;
    const p75 = valueDistribution.revenue.p75;
    const p50 = valueDistribution.revenue.p50;
    const p25 = valueDistribution.revenue.p25;
    
    const segments = [
      { name: 'Top 10%', min: p90, max: Infinity },
      { name: 'P75-P90', min: p75, max: p90 },
      { name: 'P50-P75', min: p50, max: p75 },
      { name: 'P25-P50', min: p25, max: p50 },
      { name: 'Bottom 25%', min: 0, max: p25 },
    ];
    
    return segments.map(seg => {
      const customers = customerData.filter(
        c => c.totalRevenue >= seg.min && c.totalRevenue < seg.max
      );
      
      if (customers.length === 0) {
        return {
          name: seg.name,
          customerCount: 0,
          percentOfTotal: 0,
          totalRevenue: 0,
          avgRevenue: 0,
          avgMargin: 0,
          avgFrequency: 0,
          trend: 'stable' as const,
          trendPercent: 0,
        };
      }
      
      const totalRevenue = customers.reduce((sum, c) => sum + c.totalRevenue, 0);
      const avgMargin = customers.reduce((sum, c) => sum + c.grossMargin, 0) / customers.length;
      const avgFrequency = customers.reduce((sum, c) => sum + c.purchaseFrequency, 0) / customers.length;
      
      return {
        name: seg.name,
        customerCount: customers.length,
        percentOfTotal: (customers.length / customerData.length) * 100,
        totalRevenue,
        avgRevenue: totalRevenue / customers.length,
        avgMargin,
        avgFrequency,
        trend: 'stable' as const, // TODO: Calculate actual trend
        trendPercent: 0,
      };
    });
  }, [customerData, valueDistribution]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (customerData.length === 0) {
      return {
        totalCustomers: 0,
        totalRevenue: 0,
        avgCustomerValue: 0,
        avgOrderValue: 0,
        avgFrequency: 0,
        top20Revenue: 0,
        top20Percent: 0,
      };
    }
    
    const totalRevenue = customerData.reduce((sum, c) => sum + c.totalRevenue, 0);
    const avgFrequency = customerData.reduce((sum, c) => sum + c.purchaseFrequency, 0) / customerData.length;
    
    // Top 20% contribution
    const sortedByRevenue = [...customerData].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const top20Count = Math.ceil(customerData.length * 0.2);
    const top20Revenue = sortedByRevenue.slice(0, top20Count).reduce((sum, c) => sum + c.totalRevenue, 0);
    
    return {
      totalCustomers: customerData.length,
      totalRevenue,
      avgCustomerValue: totalRevenue / customerData.length,
      avgOrderValue: customerData.reduce((sum, c) => sum + c.avgOrderValue, 0) / customerData.length,
      avgFrequency,
      top20Revenue,
      top20Percent: (top20Revenue / totalRevenue) * 100,
    };
  }, [customerData]);

  // Data Quality Metrics (per CDP Constitution)
  const dataQualityMetrics = useMemo(() => {
    if (!ordersData || ordersData.length === 0) {
      return {
        identityCoverage: 0,
        cogsCoverage: 0,
        totalOrders: 0,
        ordersWithIdentity: 0,
        ordersWithCogs: 0,
        isReliable: false,
      };
    }
    
    const totalOrders = ordersData.length;
    const ordersWithIdentity = ordersData.filter(o => 
      o.customer_phone || o.customer_name
    ).length;
    const ordersWithCogs = ordersData.filter(o => 
      o.cost_of_goods && Number(o.cost_of_goods) > 0
    ).length;
    
    const identityCoverage = (ordersWithIdentity / totalOrders) * 100;
    const cogsCoverage = (ordersWithCogs / totalOrders) * 100;
    
    return {
      identityCoverage,
      cogsCoverage,
      totalOrders,
      ordersWithIdentity,
      ordersWithCogs,
      isReliable: identityCoverage >= 80 && cogsCoverage >= 70,
    };
  }, [ordersData]);

  return {
    customerData,
    valueDistribution,
    segmentSummaries,
    summaryStats,
    dataQualityMetrics,
    isLoading: ordersLoading,
  };
}
