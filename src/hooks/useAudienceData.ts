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
  // FDP-connected metrics
  contributionMargin: number;
  cashLocked: number;
  acquisitionCost: number;
  profitPerCustomer: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RFMSegment {
  name: string;
  description: string;
  count: number;
  percentage: number;
  avgRevenue: number;
  avgFrequency: number;
  avgRecency: number;
  recommendedAction: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  potentialValue: number;
  riskValue: number;
  color: string;
}

export interface CohortData {
  cohort: string;
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month4: number;
  month5: number;
  totalCustomers: number;
  avgLTV: number;
}

export interface SegmentProfitData {
  segment: string;
  revenue: number;
  cogs: number;
  marketingCost: number;
  contributionMargin: number;
  marginPercent: number;
  cashCollected: number;
  cashPending: number;
  cashAtRisk: number;
  recommendation: 'scale' | 'maintain' | 'optimize' | 'stop';
}

export interface ChurnRiskData {
  segment: string;
  customersAtRisk: number;
  potentialLoss: number;
  daysInactive: number;
  winBackProbability: number;
  recommendedAction: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export interface ActionableInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'action';
  title: string;
  description: string;
  impact: number;
  impactType: 'revenue' | 'cost' | 'cash';
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  deadline?: string;
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
  contributionMargin: number;
  growthRate: number;
}

export interface AudienceStats {
  totalCustomers: number;
  avgLTV: number;
  highValueCount: number;
  atRiskCount: number;
  newCustomersCount: number;
  repeatRate: number;
  // FDP-connected stats
  totalContributionMargin: number;
  avgCAC: number;
  ltcCacRatio: number;
  totalCashAtRisk: number;
  churnRiskValue: number;
}

interface OrderData {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  channel: string;
  status: string | null;
  total_amount: number | null;
  payment_status: string | null;
  order_date: string;
  province_name: string | null;
  shipping_fee: number | null;
  order_discount: number | null;
  cost_of_goods: number | null;
  net_profit: number | null;
}

interface CustomerMetric {
  id: string;
  totalSpend: number;
  avgOrderValue: number;
  frequency: number;
  recencyDays: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
  contributionMargin: number;
  cashCollected: number;
  cashPending: number;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  rfmScore: number;
  orders: OrderData[];
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
        .select('id, customer_name, customer_email, customer_phone, channel, status, total_amount, payment_status, order_date, province_name, shipping_fee, order_discount, cost_of_goods, net_profit')
        .eq('tenant_id', tenantId)
        .gte('order_date', startDateStr)
        .lte('order_date', endDateStr)
        .limit(50000);
      if (error) throw error;
      return (data || []) as OrderData[];
    },
    enabled: !!tenantId,
  });

  // Fetch channel revenue for cost data - use cdp_orders (SSOT)
  const channelRevenueQuery = useQuery({
    queryKey: ['audience-channel-revenue', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('cdp_orders')
        .select('channel, net_revenue, order_at')
        .eq('tenant_id', tenantId)
        .gte('order_at', startDateStr)
        .lte('order_at', endDateStr);
      if (error) throw error;
      return (data || []).map(d => ({ ...d, net_revenue: Number(d.net_revenue) || 0 }));
    },
    enabled: !!tenantId,
  });

  // Calculate customer-level metrics
  const customerMetrics = useMemo<CustomerMetric[]>(() => {
    if (!ordersQuery.data || ordersQuery.data.length === 0) return [];

    const customerOrders = new Map<string, OrderData[]>();
    ordersQuery.data.forEach(order => {
      const customerId = order.customer_email || order.customer_phone || order.customer_name || 'unknown';
      const existing = customerOrders.get(customerId) || [];
      existing.push(order);
      customerOrders.set(customerId, existing);
    });

    const now = new Date();
    return Array.from(customerOrders.entries()).map(([id, orders]) => {
      const totalSpend = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const avgOrderValue = totalSpend / orders.length;
      const frequency = orders.length;
      
      // Calculate recency (days since last order)
      const lastOrderDate = new Date(Math.max(...orders.map(o => new Date(o.order_date).getTime())));
      const recencyDays = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate first order date for cohort
      const firstOrderDate = new Date(Math.min(...orders.map(o => new Date(o.order_date).getTime())));
      
      // Use actual COGS if available, otherwise estimate at 60%
      const estimatedCOGS = orders.reduce((sum, o) => sum + (o.cost_of_goods || (o.total_amount || 0) * 0.6), 0);
      const contributionMargin = totalSpend - estimatedCOGS;
      
      // Cash status
      const paidOrders = orders.filter(o => o.payment_status === 'paid' || o.payment_status === 'completed');
      const pendingOrders = orders.filter(o => o.payment_status === 'pending' || o.payment_status === 'cod');
      const cashCollected = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const cashPending = pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      // RFM Scores (1-5 scale)
      const recencyScore = recencyDays <= 7 ? 5 : recencyDays <= 30 ? 4 : recencyDays <= 60 ? 3 : recencyDays <= 90 ? 2 : 1;
      const frequencyScore = frequency >= 10 ? 5 : frequency >= 5 ? 4 : frequency >= 3 ? 3 : frequency >= 2 ? 2 : 1;
      const monetaryScore = totalSpend >= 10000000 ? 5 : totalSpend >= 5000000 ? 4 : totalSpend >= 2000000 ? 3 : totalSpend >= 500000 ? 2 : 1;
      
      return {
        id,
        totalSpend,
        avgOrderValue,
        frequency,
        recencyDays,
        firstOrderDate,
        lastOrderDate,
        contributionMargin,
        cashCollected,
        cashPending,
        recencyScore,
        frequencyScore,
        monetaryScore,
        rfmScore: recencyScore + frequencyScore + monetaryScore,
        orders,
      };
    });
  }, [ordersQuery.data]);

  // RFM Segments
  const rfmSegments = useMemo<RFMSegment[]>(() => {
    if (customerMetrics.length === 0) {
      return [
        { name: 'Champions', description: 'Mua gần đây, thường xuyên, chi tiêu nhiều', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, recommendedAction: 'Reward & retain', priority: 'high', potentialValue: 0, riskValue: 0, color: '#8b5cf6' },
        { name: 'Loyal', description: 'Mua thường xuyên, phản hồi tốt', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, recommendedAction: 'Upsell & cross-sell', priority: 'high', potentialValue: 0, riskValue: 0, color: '#3b82f6' },
        { name: 'Potential Loyalist', description: 'Khách mới với tiềm năng cao', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, recommendedAction: 'Engagement campaigns', priority: 'medium', potentialValue: 0, riskValue: 0, color: '#10b981' },
        { name: 'At Risk', description: 'Từng mua nhiều, giờ không hoạt động', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, recommendedAction: 'Win-back campaigns', priority: 'critical', potentialValue: 0, riskValue: 0, color: '#f59e0b' },
        { name: 'Hibernating', description: 'Không hoạt động lâu, LTV thấp', count: 0, percentage: 0, avgRevenue: 0, avgFrequency: 0, avgRecency: 0, recommendedAction: 'Đánh giá chi phí win-back', priority: 'low', potentialValue: 0, riskValue: 0, color: '#ef4444' },
      ];
    }

    // Categorize customers into RFM segments
    const champions = customerMetrics.filter(c => c.recencyScore >= 4 && c.frequencyScore >= 4 && c.monetaryScore >= 4);
    const loyal = customerMetrics.filter(c => c.frequencyScore >= 4 && c.monetaryScore >= 3 && !champions.includes(c));
    const potentialLoyalist = customerMetrics.filter(c => c.recencyScore >= 4 && c.frequencyScore <= 2 && c.monetaryScore >= 2);
    const atRisk = customerMetrics.filter(c => c.recencyScore <= 2 && (c.frequencyScore >= 3 || c.monetaryScore >= 3));
    const hibernating = customerMetrics.filter(c => c.recencyScore <= 2 && c.frequencyScore <= 2 && c.monetaryScore <= 2);

    const total = customerMetrics.length;

    const createSegment = (
      name: string,
      description: string,
      customers: CustomerMetric[],
      action: string,
      priority: 'critical' | 'high' | 'medium' | 'low',
      color: string
    ): RFMSegment => {
      const count = customers.length;
      const avgRevenue = count > 0 ? customers.reduce((sum, c) => sum + c.totalSpend, 0) / count : 0;
      const avgFrequency = count > 0 ? customers.reduce((sum, c) => sum + c.frequency, 0) / count : 0;
      const avgRecency = count > 0 ? customers.reduce((sum, c) => sum + c.recencyDays, 0) / count : 0;
      const potentialValue = customers.reduce((sum, c) => sum + c.contributionMargin * 2, 0); // 2x potential
      const riskValue = customers.reduce((sum, c) => sum + c.contributionMargin, 0);

      return {
        name,
        description,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
        avgRevenue,
        avgFrequency,
        avgRecency,
        recommendedAction: action,
        priority,
        potentialValue,
        riskValue,
        color,
      };
    };

    return [
      createSegment('Champions', 'Mua gần đây, thường xuyên, chi tiêu nhiều', champions, 'Reward & retain, exclusive offers', 'high', '#8b5cf6'),
      createSegment('Loyal', 'Mua thường xuyên, phản hồi tốt', loyal, 'Upsell & cross-sell, loyalty program', 'high', '#3b82f6'),
      createSegment('Potential Loyalist', 'Khách mới với tiềm năng cao', potentialLoyalist, 'Engagement campaigns, nurture', 'medium', '#10b981'),
      createSegment('At Risk', 'Từng mua nhiều, giờ không hoạt động', atRisk, 'Win-back campaigns, special offers', 'critical', '#f59e0b'),
      createSegment('Hibernating', 'Không hoạt động lâu, LTV thấp', hibernating, 'Đánh giá ROI của win-back', 'low', '#ef4444'),
    ];
  }, [customerMetrics]);

  // Cohort Analysis
  const cohortData = useMemo<CohortData[]>(() => {
    if (customerMetrics.length === 0) return [];

    // Group customers by acquisition month
    const cohorts = new Map<string, CustomerMetric[]>();
    customerMetrics.forEach(customer => {
      const cohortMonth = customer.firstOrderDate.toISOString().slice(0, 7);
      const existing = cohorts.get(cohortMonth) || [];
      existing.push(customer);
      cohorts.set(cohortMonth, existing);
    });

    return Array.from(cohorts.entries())
      .map(([cohort, customers]) => {
        const cohortDate = new Date(cohort + '-01');
        const totalCustomers = customers.length;
        const avgLTV = customers.reduce((sum, c) => sum + c.totalSpend, 0) / totalCustomers;

        // Calculate retention by month
        const retentionByMonth = [0, 1, 2, 3, 4, 5].map(monthOffset => {
          const targetMonth = new Date(cohortDate);
          targetMonth.setMonth(targetMonth.getMonth() + monthOffset);
          const targetMonthStr = targetMonth.toISOString().slice(0, 7);
          
          const activeCustomers = customers.filter(c => 
            c.orders.some(o => o.order_date.slice(0, 7) === targetMonthStr)
          ).length;
          
          return totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;
        });

        return {
          cohort,
          month0: retentionByMonth[0],
          month1: retentionByMonth[1],
          month2: retentionByMonth[2],
          month3: retentionByMonth[3],
          month4: retentionByMonth[4],
          month5: retentionByMonth[5],
          totalCustomers,
          avgLTV,
        };
      })
      .sort((a, b) => b.cohort.localeCompare(a.cohort))
      .slice(0, 6);
  }, [customerMetrics]);

  // Segment Profit Attribution (connected to FDP)
  const segmentProfitData = useMemo<SegmentProfitData[]>(() => {
    if (customerMetrics.length === 0) return [];

    // Estimate marketing cost from channel revenue (approximation)
    const totalChannelRevenue = channelRevenueQuery.data?.reduce((sum, cr) => sum + (cr.net_revenue || 0), 0) || 0;
    const estimatedMarketingCost = totalChannelRevenue * 0.15; // Estimate 15% marketing spend

    // Group by value segment
    const segments = [
      { name: 'High-Value', filter: (c: CustomerMetric) => c.monetaryScore >= 4 },
      { name: 'Medium-Value', filter: (c: CustomerMetric) => c.monetaryScore === 3 },
      { name: 'Low-Value', filter: (c: CustomerMetric) => c.monetaryScore <= 2 },
    ];

    const totalRevenue = customerMetrics.reduce((sum, c) => sum + c.totalSpend, 0);

    return segments.map(segment => {
      const customers = customerMetrics.filter(segment.filter);
      const revenue = customers.reduce((sum, c) => sum + c.totalSpend, 0);
      const cogs = customers.reduce((sum, c) => {
        const customerCogs = c.orders.reduce((oSum, o) => oSum + (o.cost_of_goods || (o.total_amount || 0) * 0.6), 0);
        return sum + customerCogs;
      }, 0);
      const revenueShare = totalRevenue > 0 ? revenue / totalRevenue : 0;
      const marketingCost = estimatedMarketingCost * revenueShare;
      const contributionMargin = revenue - cogs - marketingCost;
      const marginPercent = revenue > 0 ? (contributionMargin / revenue) * 100 : 0;
      const cashCollected = customers.reduce((sum, c) => sum + c.cashCollected, 0);
      const cashPending = customers.reduce((sum, c) => sum + c.cashPending, 0);
      const cashAtRisk = cashPending * 0.15; // 15% estimated default rate

      let recommendation: 'scale' | 'maintain' | 'optimize' | 'stop';
      if (marginPercent >= 30 && cashAtRisk / revenue < 0.05) {
        recommendation = 'scale';
      } else if (marginPercent >= 15) {
        recommendation = 'maintain';
      } else if (marginPercent >= 0) {
        recommendation = 'optimize';
      } else {
        recommendation = 'stop';
      }

      return {
        segment: segment.name,
        revenue,
        cogs,
        marketingCost,
        contributionMargin,
        marginPercent,
        cashCollected,
        cashPending,
        cashAtRisk,
        recommendation,
      };
    });
  }, [customerMetrics, channelRevenueQuery.data]);

  // Churn Risk Analysis
  const churnRiskData = useMemo<ChurnRiskData[]>(() => {
    if (customerMetrics.length === 0) return [];

    const riskGroups = [
      { segment: 'Critical Risk (90+ days)', minDays: 90, maxDays: Infinity, urgency: 'critical' as const },
      { segment: 'High Risk (60-90 days)', minDays: 60, maxDays: 90, urgency: 'high' as const },
      { segment: 'Medium Risk (30-60 days)', minDays: 30, maxDays: 60, urgency: 'medium' as const },
    ];

    return riskGroups.map(group => {
      const customers = customerMetrics.filter(c => 
        c.recencyDays >= group.minDays && c.recencyDays < group.maxDays && c.frequency >= 2
      );
      
      const potentialLoss = customers.reduce((sum, c) => sum + c.contributionMargin, 0);
      const avgDaysInactive = customers.length > 0 
        ? customers.reduce((sum, c) => sum + c.recencyDays, 0) / customers.length 
        : 0;
      
      // Win-back probability decreases with inactivity
      const winBackProbability = group.urgency === 'critical' ? 15 : group.urgency === 'high' ? 35 : 55;

      const actions: Record<string, string> = {
        critical: 'Aggressive discount (20-30%) hoặc personal outreach',
        high: 'Targeted email + exclusive offer',
        medium: 'Re-engagement campaign + reminder',
      };

      return {
        segment: group.segment,
        customersAtRisk: customers.length,
        potentialLoss,
        daysInactive: avgDaysInactive,
        winBackProbability,
        recommendedAction: actions[group.urgency],
        urgency: group.urgency,
      };
    }).filter(g => g.customersAtRisk > 0);
  }, [customerMetrics]);

  // Actionable Insights (AI-like recommendations)
  const actionableInsights = useMemo<ActionableInsight[]>(() => {
    const insights: ActionableInsight[] = [];

    // Champions segment insight
    const championsSegment = rfmSegments.find(s => s.name === 'Champions');
    if (championsSegment && championsSegment.count > 0) {
      insights.push({
        id: 'champions-upsell',
        type: 'opportunity',
        title: `${championsSegment.count} Champions sẵn sàng upsell`,
        description: `Segment Champions có LTV trung bình ${(championsSegment.avgRevenue / 1000000).toFixed(1)}M. Tiềm năng tăng ${((championsSegment.potentialValue - championsSegment.riskValue) / 1000000).toFixed(1)}M revenue.`,
        impact: championsSegment.potentialValue - championsSegment.riskValue,
        impactType: 'revenue',
        priority: 'high',
        action: 'Tạo exclusive offer cho Champions',
      });
    }

    // At-risk segment insight
    const atRiskSegment = rfmSegments.find(s => s.name === 'At Risk');
    if (atRiskSegment && atRiskSegment.count > 0) {
      insights.push({
        id: 'at-risk-alert',
        type: 'risk',
        title: `${atRiskSegment.count} khách hàng At-Risk cần hành động`,
        description: `Nếu không win-back, mất ${(atRiskSegment.riskValue / 1000000).toFixed(1)}M contribution margin. Win-back cost ước tính ${(atRiskSegment.riskValue * 0.1 / 1000000).toFixed(1)}M.`,
        impact: atRiskSegment.riskValue,
        impactType: 'revenue',
        priority: 'critical',
        action: 'Chạy win-back campaign ngay',
        deadline: '7 ngày',
      });
    }

    // Cash at risk insight
    const totalCashAtRisk = segmentProfitData.reduce((sum, s) => sum + s.cashAtRisk, 0);
    if (totalCashAtRisk > 0) {
      insights.push({
        id: 'cash-risk',
        type: 'risk',
        title: `${(totalCashAtRisk / 1000000).toFixed(1)}M cash at risk từ pending payments`,
        description: 'COD và pending payments có nguy cơ không thu được. Cần follow-up hoặc chuyển sang prepaid.',
        impact: totalCashAtRisk,
        impactType: 'cash',
        priority: 'high',
        action: 'Review COD policy và follow-up pending',
      });
    }

    // Segment optimization insight
    const lowValueSegment = segmentProfitData.find(s => s.segment === 'Low-Value');
    if (lowValueSegment && lowValueSegment.marginPercent < 10) {
      insights.push({
        id: 'low-value-optimize',
        type: 'action',
        title: 'Segment Low-Value có margin thấp',
        description: `Margin chỉ ${lowValueSegment.marginPercent.toFixed(1)}%. Cân nhắc giảm marketing spend hoặc tăng AOV.`,
        impact: lowValueSegment.marketingCost,
        impactType: 'cost',
        priority: 'medium',
        action: 'Giảm budget cho acquisition Low-Value',
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [rfmSegments, segmentProfitData]);

  // Original segments (enhanced)
  const segments = useMemo<AudienceSegment[]>(() => {
    if (!ordersQuery.data || ordersQuery.data.length === 0) {
      return [
        { name: 'High-Value Customers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#8b5cf6', contributionMargin: 0, cashLocked: 0, acquisitionCost: 0, profitPerCustomer: 0, riskLevel: 'low' },
        { name: 'Regular Customers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#3b82f6', contributionMargin: 0, cashLocked: 0, acquisitionCost: 0, profitPerCustomer: 0, riskLevel: 'low' },
        { name: 'Occasional Buyers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#10b981', contributionMargin: 0, cashLocked: 0, acquisitionCost: 0, profitPerCustomer: 0, riskLevel: 'low' },
        { name: 'At-Risk Customers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#ef4444', contributionMargin: 0, cashLocked: 0, acquisitionCost: 0, profitPerCustomer: 0, riskLevel: 'high' },
        { name: 'New Customers', size: 0, percentage: 0, ltv: 0, avgOrderValue: 0, purchaseFrequency: 0, retentionRate: 0, trend: 'stable', change: 0, color: '#f59e0b', contributionMargin: 0, cashLocked: 0, acquisitionCost: 0, profitPerCustomer: 0, riskLevel: 'low' },
      ];
    }

    const totalCustomers = customerMetrics.length;
    
    // High-value: Top 10% by spend
    const sortedBySpend = [...customerMetrics].sort((a, b) => b.totalSpend - a.totalSpend);
    const highValueThreshold = sortedBySpend[Math.floor(totalCustomers * 0.1)]?.totalSpend || 0;
    const highValue = customerMetrics.filter(c => c.totalSpend >= highValueThreshold);
    
    // Regular: 2+ orders, not high value
    const regular = customerMetrics.filter(c => c.frequency >= 2 && c.totalSpend < highValueThreshold);
    
    // Occasional: 1 order, not new
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const occasional = customerMetrics.filter(c => c.frequency === 1 && c.firstOrderDate < thirtyDaysAgo);
    
    // New: First order within 30 days
    const newCustomers = customerMetrics.filter(c => c.frequency === 1 && c.firstOrderDate >= thirtyDaysAgo);
    
    // At-risk: No orders in 60+ days
    const atRisk = customerMetrics.filter(c => c.recencyDays >= 60);

    const calculateSegment = (
      name: string, 
      customers: CustomerMetric[], 
      color: string,
      trend: 'up' | 'down' | 'stable' = 'stable',
      change: number = 0,
      riskLevel: 'low' | 'medium' | 'high' = 'low'
    ): AudienceSegment => {
      const size = customers.length;
      const percentage = totalCustomers > 0 ? (size / totalCustomers) * 100 : 0;
      const totalLtv = customers.reduce((sum, c) => sum + c.totalSpend, 0);
      const avgLtv = size > 0 ? totalLtv / size : 0;
      const avgOrderValue = size > 0 ? customers.reduce((sum, c) => sum + c.avgOrderValue, 0) / size : 0;
      const avgFrequency = size > 0 ? customers.reduce((sum, c) => sum + c.frequency, 0) / size : 0;
      const retentionRate = customers.filter(c => c.frequency >= 2).length / Math.max(size, 1) * 100;
      const contributionMargin = customers.reduce((sum, c) => sum + c.contributionMargin, 0);
      const cashLocked = customers.reduce((sum, c) => sum + c.cashPending, 0);
      const acquisitionCost = avgLtv * 0.15; // Estimated 15% of LTV
      const profitPerCustomer = size > 0 ? contributionMargin / size : 0;

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
        contributionMargin,
        cashLocked,
        acquisitionCost,
        profitPerCustomer,
        riskLevel,
      };
    };

    return [
      calculateSegment('High-Value Customers', highValue, '#8b5cf6', 'up', 12.5, 'low'),
      calculateSegment('Regular Customers', regular, '#3b82f6', 'up', 5.2, 'low'),
      calculateSegment('Occasional Buyers', occasional, '#10b981', 'stable', 0.8, 'medium'),
      calculateSegment('At-Risk Customers', atRisk, '#ef4444', 'down', -8.3, 'high'),
      calculateSegment('New Customers', newCustomers, '#f59e0b', 'up', 18.5, 'low'),
    ];
  }, [customerMetrics, ordersQuery.data]);

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

  // Geographic data from orders (enhanced with province_name)
  const geographicData = useMemo<GeographicData[]>(() => {
    if (!ordersQuery.data) return [];

    const cityMap = new Map<string, { customers: Set<string>; revenue: number; orders: OrderData[] }>();
    
    ordersQuery.data.forEach(order => {
      // Use province_name directly
      let city = order.province_name || 'Khác';
      if (!city || city === '') city = 'Khác';

      const existing = cityMap.get(city) || { customers: new Set(), revenue: 0, orders: [] };
      const customerId = order.customer_email || order.customer_phone || order.id;
      existing.customers.add(customerId);
      existing.revenue += order.total_amount || 0;
      existing.orders.push(order);
      cityMap.set(city, existing);
    });

    const totalRevenue = Array.from(cityMap.values()).reduce((sum, c) => sum + c.revenue, 0);

    return Array.from(cityMap.entries())
      .map(([city, data]) => {
        const cogs = data.orders.reduce((sum, o) => sum + (o.cost_of_goods || (o.total_amount || 0) * 0.6), 0);
        const contributionMargin = data.revenue - cogs;
        
        return {
          city,
          customers: data.customers.size,
          revenue: data.revenue,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
          contributionMargin,
          growthRate: Math.random() * 30 - 5, // Mock growth rate - would need historical comparison
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [ordersQuery.data]);

  // Calculate stats (enhanced)
  const stats = useMemo<AudienceStats>(() => {
    const totalCustomers = segments.reduce((sum, s) => sum + s.size, 0);
    const avgLTV = totalCustomers > 0 
      ? segments.reduce((sum, s) => sum + s.ltv * s.size, 0) / totalCustomers 
      : 0;
    const totalContributionMargin = segments.reduce((sum, s) => sum + s.contributionMargin, 0);
    const avgCAC = avgLTV * 0.15;
    const ltcCacRatio = avgCAC > 0 ? avgLTV / avgCAC : 0;
    const totalCashAtRisk = segmentProfitData.reduce((sum, s) => sum + s.cashAtRisk, 0);
    const churnRiskValue = churnRiskData.reduce((sum, c) => sum + c.potentialLoss, 0);

    return {
      totalCustomers,
      avgLTV,
      highValueCount: segments.find(s => s.name === 'High-Value Customers')?.size || 0,
      atRiskCount: segments.find(s => s.name === 'At-Risk Customers')?.size || 0,
      newCustomersCount: segments.find(s => s.name === 'New Customers')?.size || 0,
      repeatRate: totalCustomers > 0 
        ? segments.filter(s => s.purchaseFrequency >= 2).reduce((sum, s) => sum + s.size, 0) / totalCustomers * 100
        : 0,
      totalContributionMargin,
      avgCAC,
      ltcCacRatio,
      totalCashAtRisk,
      churnRiskValue,
    };
  }, [segments, segmentProfitData, churnRiskData]);

  return {
    segments,
    demographics,
    geographicData,
    stats,
    rfmSegments,
    cohortData,
    segmentProfitData,
    churnRiskData,
    actionableInsights,
    isLoading: ordersQuery.isLoading || channelRevenueQuery.isLoading,
    error: ordersQuery.error || channelRevenueQuery.error,
  };
}
