import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

/**
 * Unified Revenue Hook
 * Single source of truth for all revenue data
 * Sources:
 * - invoices: B2B/Traditional sales
 * - external_orders: E-commerce/Channel sales (Shopee, Lazada, Tiki, etc.)
 * - revenues: Recurring contracts and manual entries
 */

export interface RevenueSource {
  source: 'invoices' | 'external_orders' | 'revenues';
  label: string;
  amount: number;
  count: number;
}

export interface ChannelRevenue {
  channel: string;
  grossRevenue: number;
  fees: number;
  cogs: number;
  netRevenue: number;
  profit: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface MonthlyRevenue {
  month: string;
  invoiceRevenue: number;
  orderRevenue: number;
  contractRevenue: number;
  totalRevenue: number;
}

export interface UnifiedRevenueData {
  // Totals
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMargin: number;
  
  // By source
  bySource: RevenueSource[];
  
  // By channel (for e-commerce)
  byChannel: ChannelRevenue[];
  
  // Monthly breakdown
  monthlyData: MonthlyRevenue[];
  
  // Raw counts
  invoiceCount: number;
  orderCount: number;
  contractCount: number;
}

export function useUnifiedRevenue() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr, startDate, endDate } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['unified-revenue', tenantId, startDateStr, endDateStr],
    queryFn: async (): Promise<UnifiedRevenueData> => {
      if (!tenantId) {
        return getEmptyRevenueData();
      }

      // Fetch all revenue sources in parallel
      const [invoicesRes, ordersRes, revenuesRes] = await Promise.all([
        // B2B invoices
        supabase
          .from('invoices')
          .select('id, total_amount, paid_amount, status, issue_date, subtotal, discount_amount')
          .eq('tenant_id', tenantId)
          .not('status', 'eq', 'cancelled')
          .gte('issue_date', startDateStr)
          .lte('issue_date', endDateStr),
        // E-commerce orders
        supabase
          .from('external_orders')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'delivered')
          .gte('order_date', startDateStr)
          .lte('order_date', endDateStr),
        // Manual contracts/revenues
        supabase
          .from('revenues')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .gte('start_date', startDateStr)
          .lte('start_date', endDateStr)
      ]);

      const invoices = invoicesRes.data || [];
      const orders = ordersRes.data || [];
      const revenues = revenuesRes.data || [];

      // Calculate invoice revenue
      const invoiceRevenue = invoices.reduce((sum, inv) => 
        sum + (inv.subtotal || inv.total_amount || 0) - (inv.discount_amount || 0), 0);

      // Calculate order revenue and costs
      const orderGrossRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const orderFees = orders.reduce((sum, o) => 
        sum + (o.platform_fee || 0) + (o.commission_fee || 0) + (o.payment_fee || 0) + (o.shipping_fee || 0), 0);
      const orderCogs = orders.reduce((sum, o) => sum + (o.cost_of_goods || 0), 0);

      // Calculate contract revenue (handle recurring)
      let contractRevenue = 0;
      revenues.forEach(rev => {
        if (rev.revenue_type === 'recurring') {
          // Calculate months in period
          const revStart = new Date(rev.start_date);
          const revEnd = rev.end_date ? new Date(rev.end_date) : endDate;
          const effectiveStart = revStart > startDate ? revStart : startDate;
          const effectiveEnd = revEnd < endDate ? revEnd : endDate;
          const months = Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (30 * 24 * 60 * 60 * 1000)));
          contractRevenue += (rev.amount || 0) * months;
        } else {
          contractRevenue += rev.amount || 0;
        }
      });

      // Total revenue
      const totalRevenue = invoiceRevenue + orderGrossRevenue + contractRevenue;
      
      // Estimate COGS for invoices (use 65% if no actual data)
      const invoiceCogs = invoiceRevenue * 0.65;
      const totalCogs = orderCogs + invoiceCogs;
      
      const grossProfit = totalRevenue - totalCogs - orderFees;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // By source
      const bySource: RevenueSource[] = ([
        { source: 'invoices' as const, label: 'B2B/Hóa đơn', amount: invoiceRevenue, count: invoices.length },
        { source: 'external_orders' as const, label: 'E-commerce', amount: orderGrossRevenue, count: orders.length },
        { source: 'revenues' as const, label: 'Hợp đồng', amount: contractRevenue, count: revenues.length }
      ] as RevenueSource[]).filter(s => s.amount > 0);

      // By channel
      const channelMap: Record<string, { 
        gross: number; fees: number; cogs: number; count: number 
      }> = {};
      
      orders.forEach(o => {
        const channel = (o.channel || 'unknown').toUpperCase();
        if (!channelMap[channel]) {
          channelMap[channel] = { gross: 0, fees: 0, cogs: 0, count: 0 };
        }
        channelMap[channel].gross += o.total_amount || 0;
        channelMap[channel].fees += (o.platform_fee || 0) + (o.commission_fee || 0) + 
                                    (o.payment_fee || 0) + (o.shipping_fee || 0);
        channelMap[channel].cogs += o.cost_of_goods || 0;
        channelMap[channel].count += 1;
      });

      const byChannel: ChannelRevenue[] = Object.entries(channelMap).map(([channel, data]) => ({
        channel,
        grossRevenue: data.gross,
        fees: data.fees,
        cogs: data.cogs,
        netRevenue: data.gross - data.fees,
        profit: data.gross - data.fees - data.cogs,
        orderCount: data.count,
        avgOrderValue: data.count > 0 ? data.gross / data.count : 0
      })).sort((a, b) => b.grossRevenue - a.grossRevenue);

      // Monthly breakdown
      const monthlyMap: Record<string, { invoice: number; order: number; contract: number }> = {};
      
      invoices.forEach(inv => {
        const month = inv.issue_date?.substring(0, 7) || '';
        if (!monthlyMap[month]) monthlyMap[month] = { invoice: 0, order: 0, contract: 0 };
        monthlyMap[month].invoice += (inv.subtotal || inv.total_amount || 0) - (inv.discount_amount || 0);
      });

      orders.forEach(o => {
        const month = o.order_date?.substring(0, 7) || '';
        if (!monthlyMap[month]) monthlyMap[month] = { invoice: 0, order: 0, contract: 0 };
        monthlyMap[month].order += o.total_amount || 0;
      });

      const monthlyData: MonthlyRevenue[] = Object.entries(monthlyMap)
        .map(([month, data]) => ({
          month,
          invoiceRevenue: data.invoice,
          orderRevenue: data.order,
          contractRevenue: data.contract,
          totalRevenue: data.invoice + data.order + data.contract
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        totalRevenue,
        totalCogs,
        grossProfit,
        grossMargin,
        bySource,
        byChannel,
        monthlyData,
        invoiceCount: invoices.length,
        orderCount: orders.length,
        contractCount: revenues.length
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000
  });
}

function getEmptyRevenueData(): UnifiedRevenueData {
  return {
    totalRevenue: 0,
    totalCogs: 0,
    grossProfit: 0,
    grossMargin: 0,
    bySource: [],
    byChannel: [],
    monthlyData: [],
    invoiceCount: 0,
    orderCount: 0,
    contractCount: 0
  };
}
