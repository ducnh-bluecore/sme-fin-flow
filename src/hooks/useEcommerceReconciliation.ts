/**
 * ============================================
 * ECOMMERCE RECONCILIATION HOOK
 * ============================================
 * 
 * ⚠️ SSOT EXCEPTION: This hook intentionally queries external_orders (staging)
 * 
 * REASON: Reconciliation requires comparing staging data with bank/wallet 
 * settlements BEFORE data is finalized into cdp_orders. This is the only
 * legitimate use case for direct staging table access.
 * 
 * Architecture v1.4.1: Uses useTenantQueryBuilder for tenant-aware queries
 */

/* eslint-disable no-restricted-syntax */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { toast } from 'sonner';

export interface EcommerceOrder {
  id: string;
  platform: string;
  trackingCode: string;
  orderId: string;
  platformOrderId: string;
  orderDate: string;
  deliveredDate: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  walletAmount: number;
  estimatedAmount: number;
  variance: number;
  orderStatus: string;
  reconcileStatus: 'pending' | 'reconciled';
  isProcessed: boolean;
  items: Array<{ id: string; name: string; sku: string; quantity: number; price: number }>;
  deliveryEvents: Array<{ id: string; timestamp: string; status: string; description: string; location?: string }>;
}

export interface ShippingOrder {
  id: string;
  carrier: string;
  trackingCode: string;
  orderId: string;
  orderDate: string;
  deliveredDate: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  codAmount: number;
  shippingFee: number;
  netAmount: number;
  orderStatus: string;
  reconcileStatus: 'pending' | 'reconciled';
  isProcessed: boolean;
  deliveryEvents: Array<{ id: string; timestamp: string; status: string; description: string; location?: string }>;
}

export interface SettlementRecord {
  id: string;
  settlementId: string;
  periodStart: string;
  periodEnd: string;
  payoutDate: string | null;
  grossSales: number;
  totalOrders: number;
  totalFees: number;
  netAmount: number;
  status: string;
  isReconciled: boolean;
  varianceAmount: number | null;
  platform: string;
}

function mapChannelToPlatform(channel: string | null): string {
  if (!channel) return 'other';
  const lower = channel.toLowerCase();
  if (lower.includes('shopee')) return 'shopee';
  if (lower.includes('lazada')) return 'lazada';
  if (lower.includes('tiktok') || lower.includes('tik tok')) return 'tiktok';
  if (lower.includes('tiki')) return 'tiki';
  return 'other';
}

function mapShippingCarrier(carrier: string | null): string {
  if (!carrier) return 'other';
  const lower = carrier.toLowerCase();
  if (lower.includes('ghn') || lower.includes('giao hàng nhanh')) return 'ghn';
  if (lower.includes('ghtk') || lower.includes('tiết kiệm')) return 'ghtk';
  if (lower.includes('j&t') || lower.includes('jt')) return 'jt';
  if (lower.includes('viettel')) return 'viettel';
  if (lower.includes('vnpost') || lower.includes('bưu điện')) return 'vnpost';
  if (lower.includes('ninja')) return 'ninja';
  return 'other';
}

function mapOrderStatus(status: string | null, deliveredAt: string | null, cancelledAt: string | null): string {
  if (cancelledAt) return 'cancelled';
  if (deliveredAt) return 'delivered';
  if (status === 'shipped' || status === 'shipping') return 'shipping';
  if (status === 'completed') return 'completed';
  if (status === 'returned') return 'returned';
  return status || 'pending';
}

// Fetch e-commerce orders from external_orders (staging - SSOT exception for reconciliation)
export function useEcommerceOrders() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['ecommerce-orders-reconciliation', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('external_orders')
        .select(`
          id, external_order_id, order_number, channel, order_date, delivered_at, cancelled_at,
          customer_name, customer_phone, shipping_address, items, total_amount, seller_income,
          platform_fee, commission_fee, status, tracking_number, shipping_carrier, payment_status,
          fulfillment_status, shipping_fee
        `)
        .gte('order_date', startDateStr)
        .lte('order_date', endDateStr)
        .order('order_date', { ascending: false })
        .limit(50000);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders: EcommerceOrder[] = ((data || []) as any[]).map((order) => {
        const platform = mapChannelToPlatform(order.channel);
        const walletAmount = Number(order.seller_income) || 0;
        const estimatedAmount = Number(order.total_amount) || 0;
        const address = order.shipping_address as { address?: string } | null;
        
        const rawItems = (order.items as Array<{ product_name?: string; sku?: string; quantity?: number; price?: number }>) || [];
        const items = rawItems.map((item, idx) => ({
          id: String(idx + 1),
          name: item.product_name || 'Sản phẩm',
          sku: item.sku || 'N/A',
          quantity: item.quantity || 1,
          price: item.price || 0
        }));

        const deliveryEvents: EcommerceOrder['deliveryEvents'] = [];
        if (order.order_date) {
          deliveryEvents.push({
            id: '1',
            timestamp: order.order_date,
            status: 'confirmed',
            description: 'Đơn hàng đã được xác nhận'
          });
        }
        if (order.delivered_at) {
          deliveryEvents.unshift({
            id: '0',
            timestamp: order.delivered_at,
            status: 'delivered',
            description: 'Đã giao hàng thành công'
          });
        }

        const orderStatus = mapOrderStatus(order.status, order.delivered_at, order.cancelled_at);
        const isDelivered = orderStatus === 'delivered' || orderStatus === 'completed';
        
        return {
          id: order.id,
          platform,
          trackingCode: order.tracking_number || order.external_order_id || '',
          orderId: order.order_number || order.external_order_id || '',
          platformOrderId: order.external_order_id || '',
          orderDate: order.order_date?.split('T')[0] || '',
          deliveredDate: order.delivered_at?.split('T')[0] || null,
          customerName: order.customer_name || 'Khách hàng',
          customerPhone: order.customer_phone || '',
          customerAddress: address?.address || '',
          walletAmount,
          estimatedAmount,
          variance: walletAmount - estimatedAmount,
          orderStatus,
          reconcileStatus: (isDelivered && order.payment_status === 'paid') ? 'reconciled' : 'pending' as const,
          isProcessed: order.payment_status === 'paid' && isDelivered,
          items,
          deliveryEvents
        };
      });

      return orders;
    },
    staleTime: 60000,
    enabled: !!tenantId && isReady,
  });
}

// Transform external_orders to ShippingOrder format (for COD orders)
export function useShippingOrders() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantQueryBuilder();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['shipping-orders-reconciliation', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('external_orders')
        .select(`
          id, external_order_id, order_number, channel, order_date, delivered_at, cancelled_at,
          customer_name, customer_phone, shipping_address, total_amount, shipping_fee, seller_income,
          status, tracking_number, shipping_carrier, payment_method, payment_status, fulfillment_status
        `)
        .eq('payment_method', 'cod')
        .gte('order_date', startDateStr)
        .lte('order_date', endDateStr)
        .order('order_date', { ascending: false })
        .limit(50000);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders: ShippingOrder[] = ((data || []) as any[]).map((order) => {
        const carrier = mapShippingCarrier(order.shipping_carrier);
        const address = order.shipping_address as { address?: string } | null;
        const codAmount = Number(order.total_amount) || 0;
        const shippingFee = Number(order.shipping_fee) || 0;
        
        const orderStatus = mapOrderStatus(order.status, order.delivered_at, order.cancelled_at);
        const isDelivered = orderStatus === 'delivered' || orderStatus === 'completed';

        const deliveryEvents: ShippingOrder['deliveryEvents'] = [];
        if (order.order_date) {
          deliveryEvents.push({
            id: '1',
            timestamp: order.order_date,
            status: 'created',
            description: 'Tạo đơn hàng'
          });
        }
        if (order.delivered_at) {
          deliveryEvents.unshift({
            id: '0',
            timestamp: order.delivered_at,
            status: 'delivered',
            description: 'Giao hàng thành công'
          });
        }

        return {
          id: order.id,
          carrier,
          trackingCode: order.tracking_number || '',
          orderId: order.order_number || order.external_order_id || '',
          orderDate: order.order_date?.split('T')[0] || '',
          deliveredDate: order.delivered_at?.split('T')[0] || null,
          customerName: order.customer_name || 'Khách hàng',
          customerPhone: order.customer_phone || '',
          customerAddress: address?.address || '',
          codAmount,
          shippingFee,
          netAmount: codAmount - shippingFee,
          orderStatus,
          reconcileStatus: (isDelivered && order.payment_status === 'paid') ? 'reconciled' : 'pending' as const,
          isProcessed: order.payment_status === 'paid' && isDelivered,
          deliveryEvents
        };
      });

      return orders;
    },
    staleTime: 60000,
    enabled: !!tenantId && isReady,
  });
}

// Fetch channel settlements
export function useChannelSettlements() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['channel-settlements', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('channel_settlements', `
        id, settlement_id, period_start, period_end, payout_date, gross_sales, total_orders,
        total_fees, net_amount, status, is_reconciled, variance_amount, integration_id,
        connector_integrations (connector_name, connector_type)
      `)
        .order('period_end', { ascending: false })
        .limit(50);

      if (error) throw error;

      const settlements: SettlementRecord[] = ((data || []) as any[]).map((s) => {
        const integration = s.connector_integrations as { connector_name?: string } | null;
        return {
          id: s.id,
          settlementId: s.settlement_id,
          periodStart: s.period_start,
          periodEnd: s.period_end,
          payoutDate: s.payout_date,
          grossSales: Number(s.gross_sales) || 0,
          totalOrders: s.total_orders || 0,
          totalFees: Number(s.total_fees) || 0,
          netAmount: Number(s.net_amount) || 0,
          status: s.status || 'pending',
          isReconciled: s.is_reconciled || false,
          varianceAmount: s.variance_amount ? Number(s.variance_amount) : null,
          platform: mapChannelToPlatform(integration?.connector_name || '')
        };
      });

      return settlements;
    },
    staleTime: 60000,
    enabled: !!tenantId && isReady,
  });
}

// Mark orders as reconciled
export function useMarkOrderReconciled() {
  const queryClient = useQueryClient();
  const { client } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ orderIds, type }: { orderIds: string[]; type: 'ecommerce' | 'shipping' }) => {
      const { error } = await client
        .from('external_orders')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .in('id', orderIds);

      if (error) throw error;
      return { orderIds, type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce-orders-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-orders-reconciliation'] });
      toast.success(`Đã đánh dấu ${data.orderIds.length} đơn hàng là đã đối soát`);
    },
    onError: (error) => {
      toast.error('Lỗi khi đối soát: ' + error.message);
    }
  });
}

// Mark settlement as reconciled
export function useMarkSettlementReconciled() {
  const queryClient = useQueryClient();
  const { client } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ settlementId, varianceNotes }: { settlementId: string; varianceNotes?: string }) => {
      const { error } = await client
        .from('channel_settlements')
        .update({
          is_reconciled: true,
          reconciled_at: new Date().toISOString(),
          variance_notes: varianceNotes
        })
        .eq('id', settlementId);

      if (error) throw error;
      return { settlementId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-settlements'] });
      toast.success('Đã đối soát settlement thành công');
    },
    onError: (error) => {
      toast.error('Lỗi khi đối soát: ' + error.message);
    }
  });
}

// Get reconciliation statistics - uses RPC for server-side aggregation
export function useReconciliationStats() {
  const { tenantId, isReady, callRpc } = useTenantQueryBuilder();

  const { data: stats } = useQuery({
    queryKey: ['reconciliation-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await callRpc('get_reconciliation_stats', {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: !!tenantId && isReady,
    staleTime: 2 * 60 * 1000,
  });

  const e = stats?.ecommerce || {};
  const s = stats?.shipping || {};
  const st = stats?.settlement || {};

  return {
    ecommerce: {
      total: Number(e.total) || 0,
      variance: Number(e.variance) || 0,
      pendingCount: Number(e.pendingCount) || 0,
      reconciledCount: Number(e.reconciledCount) || 0,
      orderCount: Number(e.orderCount) || 0,
    },
    shipping: {
      total: Number(s.total) || 0,
      pendingCount: Number(s.pendingCount) || 0,
      reconciledCount: Number(s.reconciledCount) || 0,
      orderCount: Number(s.orderCount) || 0,
    },
    settlements: {
      total: Number(st.total) || 0,
      pendingCount: Number(st.pendingCount) || 0,
      reconciledCount: Number(st.reconciledCount) || 0,
      count: Number(st.count) || 0,
    },
  };
}
