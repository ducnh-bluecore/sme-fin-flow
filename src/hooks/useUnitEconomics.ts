import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { startOfMonth, format } from 'date-fns';

export interface UnitEconomicsData {
  // Per Order Metrics
  avgOrderValue: number;
  cogsPerOrder: number;
  platformFeesPerOrder: number;
  shippingCostPerOrder: number;
  contributionMarginPerOrder: number;
  contributionMarginPercent: number;
  
  // Customer Metrics
  totalCustomers: number;
  newCustomersThisMonth: number;
  repeatCustomerRate: number;
  avgOrdersPerCustomer: number;
  customerLifetimeValue: number; // LTV
  customerAcquisitionCost: number; // CAC
  ltvCacRatio: number;
  
  // Marketing Efficiency
  totalMarketingSpend: number;
  costPerAcquisition: number;
  returnOnAdSpend: number; // ROAS
  marketingEfficiencyRatio: number; // MER = Revenue / Marketing Spend
  
  // Profitability by Channel
  channelMetrics: ChannelUnitMetrics[];
  
  // Trends
  monthlyTrends: MonthlyUnitTrend[];

  // Raw data for formula display
  rawData: {
    totalOrders: number;
    totalRevenue: number;
    totalCogs: number;
    totalPlatformFees: number;
    totalShippingCost: number;
    uniqueBuyers: number;
    repeatBuyers: number;
  };
}

export interface ChannelUnitMetrics {
  channel: string;
  orders: number;
  revenue: number;
  cogs: number;
  fees: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  aov: number;
}

export interface MonthlyUnitTrend {
  month: string;
  aov: number;
  contributionMargin: number;
  ltvCacRatio: number;
  roas: number;
}

export function useUnitEconomics() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr, dateRange } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['unit-economics', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<UnitEconomicsData> => {
      if (!tenantId) {
        return getEmptyData();
      }

      const thisMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

      // Fetch all data in parallel
      const [
        ordersRes,
        customersRes,
        expensesRes
      ] = await Promise.all([
        supabase
          .from('external_orders')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('order_date', startDateStr)
          .lte('order_date', endDateStr),
        supabase
          .from('customers')
          .select('id, created_at')
          .eq('tenant_id', tenantId),
        supabase
          .from('expenses')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr)
      ]);

      const orders = ordersRes.data || [];
      const customers = customersRes.data || [];
      const expenses = expensesRes.data || [];

      // Filter completed orders
      const completedOrders = orders.filter(o => o.status === 'delivered');
      const totalOrders = completedOrders.length;

      if (totalOrders === 0) {
        return getEmptyData();
      }

      // Per Order Metrics
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalCogs = completedOrders.reduce((sum, o) => sum + (o.cost_of_goods || 0), 0);
      const totalPlatformFees = completedOrders.reduce((sum, o) => 
        sum + (o.platform_fee || 0) + (o.commission_fee || 0) + (o.payment_fee || 0), 0);
      const totalShippingCost = completedOrders.reduce((sum, o) => sum + (o.shipping_fee || 0), 0);

      const avgOrderValue = totalRevenue / totalOrders;
      const cogsPerOrder = totalCogs / totalOrders;
      const platformFeesPerOrder = totalPlatformFees / totalOrders;
      const shippingCostPerOrder = totalShippingCost / totalOrders;
      const contributionMarginPerOrder = avgOrderValue - cogsPerOrder - platformFeesPerOrder - shippingCostPerOrder;
      const contributionMarginPercent = (contributionMarginPerOrder / avgOrderValue) * 100;

      // Customer Metrics
      const totalCustomers = customers.length;
      const newCustomersThisMonth = customers.filter(c => 
        c.created_at >= thisMonthStart
      ).length;

      // Count unique buyers from orders
      const uniqueBuyers = new Set(completedOrders.map(o => o.customer_name || o.external_order_id)).size;
      
      // Calculate repeat rate based on buyer frequency
      const buyerOrderCount: Record<string, number> = {};
      completedOrders.forEach(o => {
        const buyer = o.customer_name || o.external_order_id;
        buyerOrderCount[buyer] = (buyerOrderCount[buyer] || 0) + 1;
      });
      const repeatBuyers = Object.values(buyerOrderCount).filter(count => count > 1).length;
      const repeatCustomerRate = uniqueBuyers > 0 ? (repeatBuyers / uniqueBuyers) * 100 : 0;
      
      const avgOrdersPerCustomer = uniqueBuyers > 0 ? totalOrders / uniqueBuyers : 0;

      // Marketing expenses
      const marketingExpenses = expenses.filter(e => e.category === 'marketing');
      const totalMarketingSpend = marketingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // CAC = Marketing Spend / New Customers
      const customerAcquisitionCost = newCustomersThisMonth > 0 
        ? totalMarketingSpend / Math.max(newCustomersThisMonth, 1) 
        : totalMarketingSpend / Math.max(uniqueBuyers / 6, 1); // Estimate monthly new customers

      // LTV = AOV * Avg Orders Per Customer * Contribution Margin %
      const customerLifetimeValue = avgOrderValue * avgOrdersPerCustomer * (contributionMarginPercent / 100);

      const ltvCacRatio = customerAcquisitionCost > 0 ? customerLifetimeValue / customerAcquisitionCost : 0;

      // Marketing Efficiency
      const costPerAcquisition = customerAcquisitionCost;
      const returnOnAdSpend = totalMarketingSpend > 0 ? totalRevenue / totalMarketingSpend : 0;
      const marketingEfficiencyRatio = totalMarketingSpend > 0 ? totalRevenue / totalMarketingSpend : 0;

      // Channel Metrics
      const channelMap: Record<string, ChannelUnitMetrics> = {};
      completedOrders.forEach(order => {
        const channel = (order.channel || 'unknown').toUpperCase();
        if (!channelMap[channel]) {
          channelMap[channel] = {
            channel,
            orders: 0,
            revenue: 0,
            cogs: 0,
            fees: 0,
            contributionMargin: 0,
            contributionMarginPercent: 0,
            aov: 0
          };
        }
        channelMap[channel].orders += 1;
        channelMap[channel].revenue += order.total_amount || 0;
        channelMap[channel].cogs += order.cost_of_goods || 0;
        channelMap[channel].fees += (order.platform_fee || 0) + (order.commission_fee || 0) + 
                                    (order.payment_fee || 0) + (order.shipping_fee || 0);
      });

      const channelMetrics = Object.values(channelMap).map(c => ({
        ...c,
        contributionMargin: c.revenue - c.cogs - c.fees,
        contributionMarginPercent: c.revenue > 0 ? ((c.revenue - c.cogs - c.fees) / c.revenue) * 100 : 0,
        aov: c.orders > 0 ? c.revenue / c.orders : 0
      })).sort((a, b) => b.revenue - a.revenue);

      // Monthly Trends
      const monthlyMap: Record<string, { revenue: number; cogs: number; fees: number; orders: number; marketing: number }> = {};
      completedOrders.forEach(order => {
        const month = order.order_date?.substring(0, 7) || '';
        if (!monthlyMap[month]) {
          monthlyMap[month] = { revenue: 0, cogs: 0, fees: 0, orders: 0, marketing: 0 };
        }
        monthlyMap[month].revenue += order.total_amount || 0;
        monthlyMap[month].cogs += order.cost_of_goods || 0;
        monthlyMap[month].fees += (order.platform_fee || 0) + (order.commission_fee || 0) + 
                                  (order.payment_fee || 0) + (order.shipping_fee || 0);
        monthlyMap[month].orders += 1;
      });

      marketingExpenses.forEach(exp => {
        const month = exp.expense_date?.substring(0, 7) || '';
        if (monthlyMap[month]) {
          monthlyMap[month].marketing += exp.amount || 0;
        }
      });

      const monthlyTrends: MonthlyUnitTrend[] = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => {
          const aov = data.orders > 0 ? data.revenue / data.orders : 0;
          const cm = data.revenue - data.cogs - data.fees;
          const cmPercent = data.revenue > 0 ? (cm / data.revenue) * 100 : 0;
          const roas = data.marketing > 0 ? data.revenue / data.marketing : 0;
          return {
            month,
            aov,
            contributionMargin: cmPercent,
            ltvCacRatio: ltvCacRatio, // Simplified - use overall ratio
            roas
          };
        });

      return {
        avgOrderValue,
        cogsPerOrder,
        platformFeesPerOrder,
        shippingCostPerOrder,
        contributionMarginPerOrder,
        contributionMarginPercent,
        totalCustomers,
        newCustomersThisMonth,
        repeatCustomerRate,
        avgOrdersPerCustomer,
        customerLifetimeValue,
        customerAcquisitionCost,
        ltvCacRatio,
        totalMarketingSpend,
        costPerAcquisition,
        returnOnAdSpend,
        marketingEfficiencyRatio,
        channelMetrics,
        monthlyTrends,
        rawData: {
          totalOrders,
          totalRevenue,
          totalCogs,
          totalPlatformFees,
          totalShippingCost,
          uniqueBuyers,
          repeatBuyers
        }
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000
  });
}

function getEmptyData(): UnitEconomicsData {
  return {
    avgOrderValue: 0,
    cogsPerOrder: 0,
    platformFeesPerOrder: 0,
    shippingCostPerOrder: 0,
    contributionMarginPerOrder: 0,
    contributionMarginPercent: 0,
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    repeatCustomerRate: 0,
    avgOrdersPerCustomer: 0,
    customerLifetimeValue: 0,
    customerAcquisitionCost: 0,
    ltvCacRatio: 0,
    totalMarketingSpend: 0,
    costPerAcquisition: 0,
    returnOnAdSpend: 0,
    marketingEfficiencyRatio: 0,
    channelMetrics: [],
    monthlyTrends: [],
    rawData: {
      totalOrders: 0,
      totalRevenue: 0,
      totalCogs: 0,
      totalPlatformFees: 0,
      totalShippingCost: 0,
      uniqueBuyers: 0,
      repeatBuyers: 0
    }
  };
}
