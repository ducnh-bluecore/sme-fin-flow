/**
 * MDP Extended Data Hooks
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 * 
 * Data layer for Budget Optimizer, Customer LTV, ROI Analytics, Scenario Planner
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { useMemo } from 'react';

// === BUDGET OPTIMIZER TYPES ===
export interface ChannelBudgetData {
  channel: string;
  allocatedBudget: number;
  actualSpend: number;
  spendRate: number;
  suggestedBudget: number;
  currentROAS: number;
  projectedROAS: number;
  currentRevenue: number;
  projectedRevenue: number;
  confidence: number;
  action: 'increase' | 'decrease' | 'maintain';
  orders: number;
  cpa: number;
  currentBudget: number; // Legacy field
}

// === CUSTOMER LTV TYPES ===
export interface ChannelLTV {
  channel: string;
  ltv: number;
  cac: number;
  ratio: number;
  customers: number;
  avgOrderValue: number;
  repeatPurchaseRate: number;
}

export interface CustomerSegment {
  segment: string;
  ltv: number;
  percentage: number;
  count: number;
  action: string;
}

export interface CohortData {
  cohort: string;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
}

// === ROI ANALYTICS TYPES ===
export interface ChannelROI {
  channel: string;
  spend: number;
  revenue: number;
  profit: number;
  roi: number;
  roas: number;
  orders: number;
}

export interface CampaignROI {
  campaign: string;
  channel: string;
  spend: number;
  revenue: number;
  roi: number;
  status: 'running' | 'completed' | 'paused';
}

export interface ROITrend {
  month: string;
  roi: number;
  roas: number;
  spend: number;
}

// === SCENARIO PLANNER TYPES ===
export interface ScenarioBaseData {
  currentBudget: number;
  currentRevenue: number;
  currentROAS: number;
  currentCM: number;
  avgCPC: number;
  avgConversionRate: number;
  avgOrderValue: number;
}

// === FUNNEL TYPES ===
export interface FunnelMetrics {
  impressions: number;
  clicks: number;
  addToCart: number;
  checkout: number;
  orders: number;
  revenue: number;
}

export interface ChannelFunnel {
  channel: string;
  impressions: number;
  clicks: number;
  orders: number;
  cvr: number;
}

// ============ HOOKS ============

export function useBudgetOptimizerData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr, endDate, dateRange } = useDateRangeForQuery();
  
  const budgetAnchorDate = dateRange === 'all_time' ? new Date() : endDate;
  const budgetYear = budgetAnchorDate.getFullYear();
  const budgetMonth = budgetAnchorDate.getMonth() + 1;

  // Fetch allocated budgets
  const allocatedBudgetsQuery = useQuery({
    queryKey: ['budget-optimizer-allocated', tenantId, budgetYear, budgetMonth],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('channel_budgets', 'channel, budget_amount')
        .eq('year', budgetYear)
        .eq('month', budgetMonth);
      if (error) throw error;
      return (data || []) as unknown as Array<{ channel: string; budget_amount: number }>;
    },
    enabled: isReady,
  });

  // Fetch marketing expenses
  const expensesQuery = useQuery({
    queryKey: ['budget-optimizer-expenses', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('marketing_expenses', '*')
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);
      if (error) throw error;
      return (data || []) as unknown as Array<{ channel: string; amount: number }>;
    },
    enabled: isReady,
  });

  // Fetch campaigns
  const campaignsQuery = useQuery({
    queryKey: ['budget-optimizer-campaigns', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('promotion_campaigns', '*')
        .gte('start_date', startDateStr)
        .lte('end_date', endDateStr);
      if (error) throw error;
      return (data || []) as unknown as Array<{ channel: string; actual_cost: number; total_revenue: number; total_orders: number }>;
    },
    enabled: isReady,
  });

  // Fetch orders from cdp_orders
  const ordersQuery = useQuery({
    queryKey: ['budget-optimizer-orders', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('cdp_orders', 'channel, gross_revenue')
        .gte('order_at', startDateStr)
        .lte('order_at', endDateStr);
      if (error) throw error;
      return ((data || []) as unknown as Array<{ channel: string; gross_revenue: number }>).map(d => ({
        channel: d.channel,
        total_amount: Number(d.gross_revenue) || 0,
        status: 'delivered' as const
      }));
    },
    enabled: isReady,
  });

  const channelBudgets = useMemo<ChannelBudgetData[]>(() => {
    const allocatedBudgets = allocatedBudgetsQuery.data || [];
    const expenses = expensesQuery.data || [];
    const campaigns = campaignsQuery.data || [];
    const orders = ordersQuery.data || [];

    const allocatedMap = new Map<string, number>();
    allocatedBudgets.forEach(b => {
      const channel = (b.channel || 'other').toLowerCase();
      allocatedMap.set(channel, b.budget_amount || 0);
    });

    const channelMap = new Map<string, { spend: number; revenue: number; orders: number }>();

    expenses.forEach(exp => {
      const channel = ((exp as any).channel || 'Other').toLowerCase();
      const existing = channelMap.get(channel) || { spend: 0, revenue: 0, orders: 0 };
      existing.spend += (exp as any).amount || 0;
      channelMap.set(channel, existing);
    });

    campaigns.forEach(camp => {
      const channel = ((camp as any).channel || 'Other').toLowerCase();
      const existing = channelMap.get(channel) || { spend: 0, revenue: 0, orders: 0 };
      existing.spend += (camp as any).actual_cost || 0;
      existing.revenue += (camp as any).total_revenue || 0;
      existing.orders += (camp as any).total_orders || 0;
      channelMap.set(channel, existing);
    });

    orders.forEach(ord => {
      const channel = (ord.channel || 'Other').toLowerCase();
      const existing = channelMap.get(channel);
      if (existing && ord.status === 'delivered') {
        existing.revenue += ord.total_amount || 0;
        existing.orders += 1;
      }
    });

    const allChannels = new Set([...allocatedMap.keys(), ...channelMap.keys()]);

    return Array.from(allChannels)
      .map(channel => {
        const allocated = allocatedMap.get(channel) || 0;
        const data = channelMap.get(channel) || { spend: 0, revenue: 0, orders: 0 };
        
        const baseBudget = allocated > 0 ? allocated : data.spend;
        const actualSpend = data.spend;
        const spendRate = baseBudget > 0 ? (actualSpend / baseBudget) * 100 : 0;
        
        const currentROAS = actualSpend > 0 ? data.revenue / actualSpend : 0;
        const cpa = data.orders > 0 ? actualSpend / data.orders : 0;
        
        let action: ChannelBudgetData['action'];
        let suggestedMultiplier: number;
        let projectedROASMultiplier: number;
        let confidence: number;

        if (currentROAS >= 4) {
          action = 'increase';
          suggestedMultiplier = 1.3;
          projectedROASMultiplier = 0.95;
          confidence = 88;
        } else if (currentROAS >= 2.5) {
          action = 'increase';
          suggestedMultiplier = 1.15;
          projectedROASMultiplier = 1.05;
          confidence = 82;
        } else if (currentROAS >= 1.5) {
          action = 'maintain';
          suggestedMultiplier = 1.0;
          projectedROASMultiplier = 1.1;
          confidence = 75;
        } else if (currentROAS >= 1) {
          action = 'decrease';
          suggestedMultiplier = 0.7;
          projectedROASMultiplier = 1.3;
          confidence = 78;
        } else {
          action = 'decrease';
          suggestedMultiplier = 0.5;
          projectedROASMultiplier = 1.5;
          confidence = 85;
        }

        const suggestedBudget = baseBudget * suggestedMultiplier;
        const projectedROAS = currentROAS * projectedROASMultiplier;
        const projectedRevenue = suggestedBudget * projectedROAS;

        return {
          channel,
          allocatedBudget: allocated,
          actualSpend,
          spendRate,
          suggestedBudget,
          currentROAS,
          projectedROAS,
          currentRevenue: data.revenue,
          projectedRevenue,
          confidence,
          action,
          orders: data.orders,
          cpa,
          currentBudget: actualSpend,
        };
      })
      .filter(c => c.allocatedBudget > 0 || c.actualSpend > 0)
      .sort((a, b) => b.allocatedBudget - a.allocatedBudget || b.actualSpend - a.actualSpend);
  }, [allocatedBudgetsQuery.data, expensesQuery.data, campaignsQuery.data, ordersQuery.data]);

  return {
    channelBudgets,
    isLoading: allocatedBudgetsQuery.isLoading || expensesQuery.isLoading || campaignsQuery.isLoading || ordersQuery.isLoading,
    error: allocatedBudgetsQuery.error || expensesQuery.error || campaignsQuery.error || ordersQuery.error,
  };
}

export function useCustomerLTVData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  const ordersQuery = useQuery({
    queryKey: ['ltv-orders', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('cdp_orders', 'id, channel, customer_id, gross_revenue, order_at')
        .gte('order_at', startDateStr)
        .lte('order_at', endDateStr);
      if (error) throw error;
      return ((data || []) as unknown as Array<{ id: string; channel: string; customer_id: string; gross_revenue: number; order_at: string }>).map(d => ({
        id: d.id,
        channel: d.channel,
        customer_name: d.customer_id,
        total_amount: Number(d.gross_revenue) || 0,
        order_date: d.order_at,
        status: 'delivered' as const
      }));
    },
    enabled: isReady,
  });

  const expensesQuery = useQuery({
    queryKey: ['ltv-expenses', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('marketing_expenses', 'channel, amount')
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);
      if (error) throw error;
      return (data || []) as unknown as Array<{ channel: string; amount: number }>;
    },
    enabled: isReady,
  });

  const ltvByChannel = useMemo<ChannelLTV[]>(() => {
    const orders = ordersQuery.data || [];
    const expenses = expensesQuery.data || [];

    const channelMap = new Map<string, { customers: Set<string>; totalRevenue: number; orderCount: number }>();

    orders.forEach(ord => {
      const channel = ord.channel || 'Other';
      const existing = channelMap.get(channel) || { customers: new Set<string>(), totalRevenue: 0, orderCount: 0 };
      if (ord.customer_name) existing.customers.add(ord.customer_name);
      existing.totalRevenue += ord.total_amount || 0;
      existing.orderCount += 1;
      channelMap.set(channel, existing);
    });

    const expenseByChannel = new Map<string, number>();
    expenses.forEach(exp => {
      const channel = exp.channel || 'Other';
      expenseByChannel.set(channel, (expenseByChannel.get(channel) || 0) + (exp.amount || 0));
    });

    return Array.from(channelMap.entries())
      .filter(([_, data]) => data.customers.size > 0)
      .map(([channel, data]) => {
        const customerCount = data.customers.size;
        const avgOrderValue = data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0;
        const ordersPerCustomer = customerCount > 0 ? data.orderCount / customerCount : 0;
        const ltv = avgOrderValue * ordersPerCustomer * 12;
        const cac = expenseByChannel.get(channel) || 0;
        const cacPerCustomer = customerCount > 0 ? cac / customerCount : 0;
        const ratio = cacPerCustomer > 0 ? ltv / cacPerCustomer : 999;
        const repeatPurchaseRate = ordersPerCustomer > 1 ? ((ordersPerCustomer - 1) / ordersPerCustomer) * 100 : 0;

        return { channel, ltv, cac: cacPerCustomer, ratio, customers: customerCount, avgOrderValue, repeatPurchaseRate };
      })
      .sort((a, b) => b.ltv - a.ltv);
  }, [ordersQuery.data, expensesQuery.data]);

  const customerSegments = useMemo<CustomerSegment[]>(() => {
    const orders = ordersQuery.data || [];
    
    const customerOrders = new Map<string, { count: number; total: number }>();
    orders.forEach(ord => {
      const customer = ord.customer_name || 'Unknown';
      const existing = customerOrders.get(customer) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += ord.total_amount || 0;
      customerOrders.set(customer, existing);
    });

    const totalCustomers = customerOrders.size;
    if (totalCustomers === 0) return [];

    let champions = 0, loyal = 0, potential = 0, newCustomers = 0, atRisk = 0, hibernating = 0;
    let championsLtv = 0, loyalLtv = 0, potentialLtv = 0, newLtv = 0, riskLtv = 0, hibernatingLtv = 0;

    customerOrders.forEach((data) => {
      const ltv = data.total * 12 / Math.max(data.count, 1);
      if (data.count >= 10 && data.total >= 5000000) { champions++; championsLtv += ltv; }
      else if (data.count >= 5) { loyal++; loyalLtv += ltv; }
      else if (data.count >= 3) { potential++; potentialLtv += ltv; }
      else if (data.count === 1 && data.total > 0) { newCustomers++; newLtv += ltv; }
      else if (data.count >= 2 && data.total < 1000000) { atRisk++; riskLtv += ltv; }
      else { hibernating++; hibernatingLtv += ltv; }
    });

    return [
      { segment: 'Champions', ltv: champions > 0 ? championsLtv / champions : 0, percentage: (champions / totalCustomers) * 100, count: champions, action: 'Reward & Retain' },
      { segment: 'Loyal Customers', ltv: loyal > 0 ? loyalLtv / loyal : 0, percentage: (loyal / totalCustomers) * 100, count: loyal, action: 'Upsell & Cross-sell' },
      { segment: 'Potential Loyalists', ltv: potential > 0 ? potentialLtv / potential : 0, percentage: (potential / totalCustomers) * 100, count: potential, action: 'Engage & Nurture' },
      { segment: 'New Customers', ltv: newCustomers > 0 ? newLtv / newCustomers : 0, percentage: (newCustomers / totalCustomers) * 100, count: newCustomers, action: 'Onboard & Activate' },
      { segment: 'At Risk', ltv: atRisk > 0 ? riskLtv / atRisk : 0, percentage: (atRisk / totalCustomers) * 100, count: atRisk, action: 'Win Back Campaign' },
      { segment: 'Hibernating', ltv: hibernating > 0 ? hibernatingLtv / hibernating : 0, percentage: (hibernating / totalCustomers) * 100, count: hibernating, action: 'Re-engagement' },
    ].filter(s => s.count > 0);
  }, [ordersQuery.data]);

  const cohortData = useMemo<CohortData[]>(() => {
    // Simplified cohort - would need more complex logic for real cohort analysis
    return [];
  }, []);

  return {
    ltvByChannel,
    customerSegments,
    cohortData,
    isLoading: ordersQuery.isLoading || expensesQuery.isLoading,
    error: ordersQuery.error || expensesQuery.error,
  };
}

export function useROIAnalyticsData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  const expensesQuery = useQuery({
    queryKey: ['roi-expenses', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('marketing_expenses', '*')
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);
      if (error) throw error;
      return (data || []) as unknown as Array<{ channel: string; amount: number }>;
    },
    enabled: isReady,
  });

  const campaignsQuery = useQuery({
    queryKey: ['roi-campaigns', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('promotion_campaigns', '*')
        .gte('start_date', startDateStr)
        .lte('end_date', endDateStr);
      if (error) throw error;
      return (data || []) as unknown as Array<Record<string, unknown>>;
    },
    enabled: isReady,
  });

  const ordersQuery = useQuery({
    queryKey: ['roi-orders', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await buildSelectQuery('cdp_orders', 'channel, gross_revenue')
        .gte('order_at', startDateStr)
        .lte('order_at', endDateStr);
      if (error) throw error;
      return (data || []) as unknown as Array<{ channel: string; gross_revenue: number }>;
    },
    enabled: isReady,
  });

  const channelROI = useMemo<ChannelROI[]>(() => {
    const expenses = expensesQuery.data || [];
    const campaigns = campaignsQuery.data || [];
    const orders = ordersQuery.data || [];

    const channelMap = new Map<string, { spend: number; revenue: number; orders: number }>();

    expenses.forEach(exp => {
      const channel = ((exp as any).channel || 'Other').toLowerCase();
      const existing = channelMap.get(channel) || { spend: 0, revenue: 0, orders: 0 };
      existing.spend += (exp as any).amount || 0;
      channelMap.set(channel, existing);
    });

    campaigns.forEach(camp => {
      const channel = ((camp as any).channel || 'Other').toLowerCase();
      const existing = channelMap.get(channel) || { spend: 0, revenue: 0, orders: 0 };
      existing.spend += Number((camp as any).actual_cost) || 0;
      existing.revenue += Number((camp as any).total_revenue) || 0;
      existing.orders += Number((camp as any).total_orders) || 0;
      channelMap.set(channel, existing);
    });

    orders.forEach(ord => {
      const channel = (ord.channel || 'Other').toLowerCase();
      const existing = channelMap.get(channel);
      if (existing) {
        existing.revenue += Number(ord.gross_revenue) || 0;
        existing.orders += 1;
      }
    });

    return Array.from(channelMap.entries())
      .filter(([_, data]) => data.spend > 0)
      .map(([channel, data]) => {
        const profit = data.revenue * 0.3 - data.spend; // Assume 30% margin
        const roi = data.spend > 0 ? (profit / data.spend) * 100 : 0;
        const roas = data.spend > 0 ? data.revenue / data.spend : 0;
        return { channel, spend: data.spend, revenue: data.revenue, profit, roi, roas, orders: data.orders };
      })
      .sort((a, b) => b.roi - a.roi);
  }, [expensesQuery.data, campaignsQuery.data, ordersQuery.data]);

  const campaignROI = useMemo<CampaignROI[]>(() => {
    const campaigns = campaignsQuery.data || [];
    return campaigns.map(camp => {
      const spend = Number((camp as any).actual_cost) || 0;
      const revenue = Number((camp as any).total_revenue) || 0;
      const roi = spend > 0 ? ((revenue * 0.3 - spend) / spend) * 100 : 0;
      return {
        campaign: String((camp as any).name || 'Unnamed'),
        channel: String((camp as any).channel || 'Other'),
        spend,
        revenue,
        roi,
        status: (camp as any).status || 'completed',
      };
    }).sort((a, b) => b.roi - a.roi);
  }, [campaignsQuery.data]);

  return {
    channelROI,
    campaignROI,
    roiTrend: [] as ROITrend[], // Would need monthly aggregation
    isLoading: expensesQuery.isLoading || campaignsQuery.isLoading || ordersQuery.isLoading,
    error: expensesQuery.error || campaignsQuery.error || ordersQuery.error,
  };
}

export function useScenarioBaseData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['scenario-base-data', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<ScenarioBaseData> => {
      if (!tenantId) {
        return { currentBudget: 0, currentRevenue: 0, currentROAS: 0, currentCM: 0, avgCPC: 0, avgConversionRate: 0, avgOrderValue: 0 };
      }

      const [expensesResult, ordersResult] = await Promise.all([
        buildSelectQuery('marketing_expenses', 'amount')
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr),
        buildSelectQuery('cdp_orders', 'gross_revenue')
          .gte('order_at', startDateStr)
          .lte('order_at', endDateStr),
      ]);

      const expenses = (expensesResult.data || []) as unknown as Array<{ amount: number }>;
      const orders = (ordersResult.data || []) as unknown as Array<{ gross_revenue: number }>;

      const currentBudget = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const currentRevenue = orders.reduce((sum, o) => sum + (Number(o.gross_revenue) || 0), 0);
      const currentROAS = currentBudget > 0 ? currentRevenue / currentBudget : 0;
      const avgOrderValue = orders.length > 0 ? currentRevenue / orders.length : 0;

      return {
        currentBudget,
        currentRevenue,
        currentROAS,
        currentCM: currentRevenue * 0.3, // 30% margin
        avgCPC: currentBudget / Math.max(orders.length * 50, 1), // Assume 50 clicks per order
        avgConversionRate: 2, // Default 2%
        avgOrderValue,
      };
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFunnelData() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['funnel-data', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<{ overall: FunnelMetrics; byChannel: ChannelFunnel[] }> => {
      if (!tenantId) {
        return { overall: { impressions: 0, clicks: 0, addToCart: 0, checkout: 0, orders: 0, revenue: 0 }, byChannel: [] };
      }

      const { data: orders, error } = await buildSelectQuery('cdp_orders', 'channel, gross_revenue')
        .gte('order_at', startDateStr)
        .lte('order_at', endDateStr);

      if (error) throw error;

      const orderRows = (orders || []) as unknown as Array<{ channel: string; gross_revenue: number }>;
      const totalOrders = orderRows.length;
      const totalRevenue = orderRows.reduce((sum, o) => sum + (Number(o.gross_revenue) || 0), 0);

      // Estimate funnel metrics
      const overall: FunnelMetrics = {
        impressions: totalOrders * 500,
        clicks: totalOrders * 50,
        addToCart: totalOrders * 5,
        checkout: totalOrders * 2,
        orders: totalOrders,
        revenue: totalRevenue,
      };

      const channelMap = new Map<string, { orders: number; revenue: number }>();
      orderRows.forEach(o => {
        const channel = o.channel || 'Other';
        const existing = channelMap.get(channel) || { orders: 0, revenue: 0 };
        existing.orders += 1;
        existing.revenue += Number(o.gross_revenue) || 0;
        channelMap.set(channel, existing);
      });

      const byChannel: ChannelFunnel[] = Array.from(channelMap.entries()).map(([channel, data]) => ({
        channel,
        impressions: data.orders * 500,
        clicks: data.orders * 50,
        orders: data.orders,
        cvr: 2, // 2% default
      }));

      return { overall, byChannel };
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });
}
