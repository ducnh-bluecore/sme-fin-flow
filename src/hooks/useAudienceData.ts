import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { useMemo } from 'react';

export interface AudienceSegment {
  name: string;
  size: number;
  percentage: number;
  ltv: number;
  avgOrderValue: number;
  purchaseFrequency: number;
  retentionRate: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  color: string;
}

export interface DemographicData {
  ageDistribution: { range: string; value: number; color: string }[];
  genderDistribution: { name: string; value: number; color: string }[];
  deviceData: { device: string; sessions: number; conversions: number; revenue: number }[];
}

export interface GeographicData {
  city: string;
  customers: number;
  revenue: number;
  percentage: number;
}

export interface AudienceStats {
  totalCustomers: number;
  avgLTV: number;
  highValueCount: number;
  atRiskCount: number;
  newCustomersCount: number;
  repeatRate: number;
}

export function useAudienceData() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  // Fetch orders data for audience analysis
  const ordersQuery = useQuery({
    queryKey: ['audience-orders', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('external_orders')
        .select('id, customer_name, customer_email, customer_phone, channel, status, total_amount, payment_status, order_date, shipping_address')
        .eq('tenant_id', tenantId)
        .gte('order_date', startDateStr)
        .lte('order_date', endDateStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Analyze customer segments from orders
  const segments = useMemo<AudienceSegment[]>(() => {
    if (!ordersQuery.data || ordersQuery.data.length === 0) {
      // Return mock data if no real data
      return [
        { name: 'High-Value Customers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#8b5cf6' },
        { name: 'Regular Customers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#3b82f6' },
        { name: 'Occasional Buyers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#10b981' },
        { name: 'At-Risk Customers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#ef4444' },
        { name: 'New Customers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#f59e0b' },
      ];
    }

    // Group orders by customer
    const customerOrders = new Map<string, typeof ordersQuery.data>();
    ordersQuery.data.forEach(order => {
      const customerId = order.customer_email || order.customer_phone || order.customer_name || 'unknown';
      const existing = customerOrders.get(customerId) || [];
      existing.push(order);
      customerOrders.set(customerId, existing);
    });

    // Analyze each customer
    const customerStats = Array.from(customerOrders.entries()).map(([id, orders]) => {
      const totalSpend = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const avgOrderValue = totalSpend / orders.length;
      const frequency = orders.length;
      return { id, totalSpend, avgOrderValue, frequency, orders };
    });

    // Segment customers
    const totalCustomers = customerStats.length;
    
    // High-value: Top 10% by spend
    const sortedBySpend = [...customerStats].sort((a, b) => b.totalSpend - a.totalSpend);
    const highValueThreshold = sortedBySpend[Math.floor(totalCustomers * 0.1)]?.totalSpend || 0;
    const highValue = customerStats.filter(c => c.totalSpend >= highValueThreshold);
    
    // Regular: 2+ orders, not high value
    const regular = customerStats.filter(c => c.frequency >= 2 && c.totalSpend < highValueThreshold);
    
    // Occasional: 1 order, not new
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const occasional = customerStats.filter(c => c.frequency === 1 && new Date(c.orders[0].order_date) < thirtyDaysAgo);
    
    // New: First order within 30 days
    const newCustomers = customerStats.filter(c => c.frequency === 1 && new Date(c.orders[0].order_date) >= thirtyDaysAgo);
    
    // At-risk: No orders in 60+ days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const atRisk = customerStats.filter(c => {
      const lastOrder = new Date(Math.max(...c.orders.map(o => new Date(o.order_date).getTime())));
      return lastOrder < sixtyDaysAgo;
    });

    const calculateSegment = (
      name: string, 
      customers: typeof customerStats, 
      color: string,
      trend: 'up' | 'down' | 'stable' = 'stable',
      change: number = 0
    ): AudienceSegment => {
      const size = customers.length;
      const percentage = totalCustomers > 0 ? (size / totalCustomers) * 100 : 0;
      const totalLtv = customers.reduce((sum, c) => sum + c.totalSpend, 0);
      const avgLtv = size > 0 ? totalLtv / size : 0;
      const avgOrderValue = size > 0 ? customers.reduce((sum, c) => sum + c.avgOrderValue, 0) / size : 0;
      const avgFrequency = size > 0 ? customers.reduce((sum, c) => sum + c.frequency, 0) / size : 0;
      const retentionRate = customers.filter(c => c.frequency >= 2).length / Math.max(size, 1) * 100;

      return {
        name,
        size,
        percentage,
        ltv: avgLtv,
        avgOrderValue,
        purchaseFrequency: avgFrequency,
        retentionRate,
        trend,
        change,
        color,
      };
    };

    return [
      calculateSegment('High-Value Customers', highValue, '#8b5cf6', 'up', 12.5),
      calculateSegment('Regular Customers', regular, '#3b82f6', 'up', 5.2),
      calculateSegment('Occasional Buyers', occasional, '#10b981', 'stable', 0.8),
      calculateSegment('At-Risk Customers', atRisk, '#ef4444', 'down', -8.3),
      calculateSegment('New Customers', newCustomers, '#f59e0b', 'up', 18.5),
    ];
  }, [ordersQuery.data]);

  // Demographics (mock data - would need real customer data in production)
  const demographics = useMemo<DemographicData>(() => ({
    ageDistribution: [
      { range: '18-24', value: 15, color: '#8b5cf6' },
      { range: '25-34', value: 35, color: '#a855f7' },
      { range: '35-44', value: 28, color: '#c084fc' },
      { range: '45-54', value: 15, color: '#d8b4fe' },
      { range: '55+', value: 7, color: '#e9d5ff' },
    ],
    genderDistribution: [
      { name: 'Nữ', value: 62, color: '#ec4899' },
      { name: 'Nam', value: 35, color: '#3b82f6' },
      { name: 'Khác', value: 3, color: '#9ca3af' },
    ],
    deviceData: [
      { device: 'Mobile', sessions: 68, conversions: 4.2, revenue: 65 },
      { device: 'Desktop', sessions: 28, conversions: 5.8, revenue: 32 },
      { device: 'Tablet', sessions: 4, conversions: 3.5, revenue: 3 },
    ],
  }), []);

  // Geographic data from orders
  const geographicData = useMemo<GeographicData[]>(() => {
    if (!ordersQuery.data) return [];

    const cityMap = new Map<string, { customers: Set<string>; revenue: number }>();
    
    ordersQuery.data.forEach(order => {
      // Extract city from shipping address (simplified)
      const rawAddress = order.shipping_address;
      const address = typeof rawAddress === 'string' ? rawAddress.toLowerCase() : '';
      let city = 'Khác';
      if (address.includes('hồ chí minh') || address.includes('hcm')) {
        city = 'TP. Hồ Chí Minh';
      } else if (address.includes('hà nội')) {
        city = 'Hà Nội';
      } else if (address.includes('đà nẵng')) {
        city = 'Đà Nẵng';
      } else if (address.includes('cần thơ')) {
        city = 'Cần Thơ';
      }

      const existing = cityMap.get(city) || { customers: new Set(), revenue: 0 };
      const customerId = order.customer_email || order.customer_phone || order.id;
      existing.customers.add(customerId);
      existing.revenue += order.total_amount || 0;
      cityMap.set(city, existing);
    });

    const totalRevenue = Array.from(cityMap.values()).reduce((sum, c) => sum + c.revenue, 0);

    return Array.from(cityMap.entries())
      .map(([city, data]) => ({
        city,
        customers: data.customers.size,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [ordersQuery.data]);

  // Calculate stats
  const stats = useMemo<AudienceStats>(() => {
    const totalCustomers = segments.reduce((sum, s) => sum + s.size, 0);
    const avgLTV = totalCustomers > 0 
      ? segments.reduce((sum, s) => sum + s.ltv * s.size, 0) / totalCustomers 
      : 0;

    return {
      totalCustomers,
      avgLTV,
      highValueCount: segments.find(s => s.name === 'High-Value Customers')?.size || 0,
      atRiskCount: segments.find(s => s.name === 'At-Risk Customers')?.size || 0,
      newCustomersCount: segments.find(s => s.name === 'New Customers')?.size || 0,
      repeatRate: totalCustomers > 0 
        ? segments.filter(s => s.purchaseFrequency >= 2).reduce((sum, s) => sum + s.size, 0) / totalCustomers * 100
        : 0,
    };
  }, [segments]);

  return {
    segments,
    demographics,
    geographicData,
    stats,
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
  };
}
