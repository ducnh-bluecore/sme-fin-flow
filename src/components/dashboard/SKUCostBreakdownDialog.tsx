/**
 * SKU Cost Breakdown Dialog
 * Shows detailed cost allocation per order for a specific SKU
 * Now with channel breakdown summary
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Receipt,
  Truck,
  CreditCard,
  Store,
  Percent,
  BarChart3
} from 'lucide-react';

interface SKUCostBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: string;
  productName: string | null;
  ignoreDateRange?: boolean; // New prop to skip date filtering
}

interface OrderBreakdown {
  order_number: string;
  channel: string;
  order_date: string;
  quantity: number;
  unit_price: number;
  item_revenue: number;
  unit_cogs: number;
  total_cogs: number;
  order_revenue: number;
  platform_fee: number;
  commission_fee: number;
  payment_fee: number;
  shipping_fee: number;
  other_fees: number;
  total_order_fees: number;
  revenue_share: number;
  allocated_fees: number;
  gross_profit: number;
  net_profit: number;
  margin_percent: number;
}

interface ChannelSummary {
  channel: string;
  orderCount: number;
  quantity: number;
  revenue: number;
  cogs: number;
  fees: number;
  profit: number;
  margin: number;
  feeBreakdown: {
    platform: number;
    commission: number;
    payment: number;
    shipping: number;
  };
}

export function SKUCostBreakdownDialog({ 
  open, 
  onOpenChange, 
  sku, 
  productName,
  ignoreDateRange = false
}: SKUCostBreakdownDialogProps) {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  const { data, isLoading } = useQuery({
    queryKey: ['sku-cost-breakdown', tenantId, sku, ignoreDateRange ? 'all' : startDateStr, ignoreDateRange ? 'all' : endDateStr],
    queryFn: async () => {
      if (!tenantId || !sku) return null;

      // First find items by SKU or product name
      const { data: items, error: itemsError } = await supabase
        .from('external_order_items')
        .select(`
          id,
          external_order_id,
          sku,
          product_name,
          quantity,
          unit_price,
          total_amount,
          unit_cogs,
          total_cogs,
          gross_profit
        `)
        .eq('tenant_id', tenantId)
        .or(`sku.eq.${sku},product_name.ilike.%${productName || sku}%`);

      if (itemsError) throw itemsError;
      
      // FALLBACK: If no order items found, use sku_profitability_cache
      if (!items || items.length === 0) {
        const { data: cacheData, error: cacheError } = await supabase
          .from('sku_profitability_cache')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('sku', sku);
        
        if (cacheError || !cacheData || cacheData.length === 0) {
          return { breakdowns: [], summary: null, channelSummaries: [], fromCache: true };
        }
        
        // Build channel summaries from cache
        const channelSummaries: ChannelSummary[] = cacheData.map(row => ({
          channel: row.channel || 'Unknown',
          orderCount: Math.ceil(Number(row.quantity || 0) / 2), // Estimate
          quantity: Number(row.quantity || 0),
          revenue: Number(row.revenue || 0),
          cogs: Number(row.cogs || 0),
          fees: Number(row.fees || 0),
          profit: Number(row.profit || 0),
          margin: Number(row.margin_percent || 0),
          feeBreakdown: {
            platform: Number(row.fees || 0) * 0.3,
            commission: Number(row.fees || 0) * 0.4,
            payment: Number(row.fees || 0) * 0.15,
            shipping: Number(row.fees || 0) * 0.15,
          }
        }));
        
        const totalRevenue = channelSummaries.reduce((s, c) => s + c.revenue, 0);
        const totalCogs = channelSummaries.reduce((s, c) => s + c.cogs, 0);
        const totalFees = channelSummaries.reduce((s, c) => s + c.fees, 0);
        const totalProfit = channelSummaries.reduce((s, c) => s + c.profit, 0);
        const totalQuantity = channelSummaries.reduce((s, c) => s + c.quantity, 0);
        
        return {
          breakdowns: [], // No order-level breakdown available from cache
          summary: {
            totalOrders: channelSummaries.reduce((s, c) => s + c.orderCount, 0),
            totalQuantity,
            totalRevenue,
            totalCogs,
            totalFees,
            totalProfit,
            avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
            feeBreakdown: {
              platform: totalFees * 0.3,
              commission: totalFees * 0.4,
              payment: totalFees * 0.15,
              shipping: totalFees * 0.15,
            }
          },
          channelSummaries,
          fromCache: true
        };
      }

      // Get order IDs
      const orderIds = [...new Set(items.map(i => i.external_order_id))];

      // Fetch orders - conditionally apply date filter
      let ordersQuery = supabase
        .from('external_orders')
        .select(`
          id,
          order_number,
          channel,
          order_date,
          total_amount,
          cost_of_goods,
          platform_fee,
          commission_fee,
          payment_fee,
          shipping_fee,
          other_fees,
          status
        `)
        .eq('tenant_id', tenantId)
        .in('id', orderIds)
        .in('status', ['pending', 'delivered']);
      
      // Only apply date filter if not ignoring date range
      if (!ignoreDateRange) {
        ordersQuery = ordersQuery
          .gte('order_date', startDateStr)
          .lte('order_date', endDateStr);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      const ordersMap = new Map(orders?.map(o => [o.id, o]) || []);

      // Calculate breakdowns
      const breakdowns: OrderBreakdown[] = [];

      items.forEach(item => {
        const order = ordersMap.get(item.external_order_id);
        if (!order) return;

        const qty = Number(item.quantity || 1);
        const unitPrice = Number(item.unit_price || 0);
        const itemTotalAmount = item.total_amount != null ? Number(item.total_amount) : null;
        const itemRevenue = itemTotalAmount != null && itemTotalAmount > 0 
          ? itemTotalAmount 
          : unitPrice * qty;

        const orderRevenue = Number(order.total_amount || 0);
        const revenueShare = orderRevenue > 0 ? itemRevenue / orderRevenue : 0;

        const platformFee = Number(order.platform_fee || 0);
        const commissionFee = Number(order.commission_fee || 0);
        const paymentFee = Number(order.payment_fee || 0);
        const shippingFee = Number(order.shipping_fee || 0);
        const otherFees = Number(order.other_fees || 0);
        const totalOrderFees = platformFee + commissionFee + paymentFee + shippingFee + otherFees;
        const allocatedFees = totalOrderFees * revenueShare;

        // Calculate COGS
        const unitCogs = item.unit_cogs != null ? Number(item.unit_cogs) : 0;
        const totalCogs = item.total_cogs != null ? Number(item.total_cogs) : 0;
        const grossProfit = item.gross_profit != null ? Number(item.gross_profit) : 0;
        const orderCogs = Number(order.cost_of_goods || 0);

        let itemCogs = 0;
        if (unitCogs > 0) {
          itemCogs = unitCogs * qty;
        } else if (totalCogs > 0) {
          itemCogs = totalCogs;
        } else if (grossProfit !== 0 && itemRevenue > 0) {
          itemCogs = Math.max(itemRevenue - grossProfit, 0);
        } else if (orderCogs > 0) {
          itemCogs = orderCogs * revenueShare;
        }

        const netProfit = itemRevenue - itemCogs - allocatedFees;
        const marginPercent = itemRevenue > 0 ? (netProfit / itemRevenue) * 100 : 0;

        breakdowns.push({
          order_number: order.order_number || 'N/A',
          channel: order.channel || 'Unknown',
          order_date: order.order_date,
          quantity: qty,
          unit_price: unitPrice,
          item_revenue: itemRevenue,
          unit_cogs: unitCogs,
          total_cogs: itemCogs,
          order_revenue: orderRevenue,
          platform_fee: platformFee,
          commission_fee: commissionFee,
          payment_fee: paymentFee,
          shipping_fee: shippingFee,
          other_fees: otherFees,
          total_order_fees: totalOrderFees,
          revenue_share: revenueShare * 100,
          allocated_fees: allocatedFees,
          gross_profit: itemRevenue - itemCogs,
          net_profit: netProfit,
          margin_percent: marginPercent
        });
      });

      // Sort by date
      breakdowns.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

      // Calculate channel summaries
      const channelMap = new Map<string, ChannelSummary>();
      breakdowns.forEach(b => {
        if (!channelMap.has(b.channel)) {
          channelMap.set(b.channel, {
            channel: b.channel,
            orderCount: 0,
            quantity: 0,
            revenue: 0,
            cogs: 0,
            fees: 0,
            profit: 0,
            margin: 0,
            feeBreakdown: {
              platform: 0,
              commission: 0,
              payment: 0,
              shipping: 0
            }
          });
        }
        const ch = channelMap.get(b.channel)!;
        ch.orderCount += 1;
        ch.quantity += b.quantity;
        ch.revenue += b.item_revenue;
        ch.cogs += b.total_cogs;
        ch.fees += b.allocated_fees;
        ch.profit += b.net_profit;
        // Calculate allocated fee breakdown per channel
        const share = b.revenue_share / 100;
        ch.feeBreakdown.platform += b.platform_fee * share;
        ch.feeBreakdown.commission += b.commission_fee * share;
        ch.feeBreakdown.payment += b.payment_fee * share;
        ch.feeBreakdown.shipping += b.shipping_fee * share;
      });
      
      const channelSummaries = Array.from(channelMap.values()).map(ch => ({
        ...ch,
        margin: ch.revenue > 0 ? (ch.profit / ch.revenue) * 100 : 0
      })).sort((a, b) => b.revenue - a.revenue);

      // Calculate summary
      const summary = {
        totalOrders: breakdowns.length,
        totalQuantity: breakdowns.reduce((s, b) => s + b.quantity, 0),
        totalRevenue: breakdowns.reduce((s, b) => s + b.item_revenue, 0),
        totalCogs: breakdowns.reduce((s, b) => s + b.total_cogs, 0),
        totalFees: breakdowns.reduce((s, b) => s + b.allocated_fees, 0),
        totalProfit: breakdowns.reduce((s, b) => s + b.net_profit, 0),
        avgMargin: breakdowns.length > 0 
          ? breakdowns.reduce((s, b) => s + b.margin_percent, 0) / breakdowns.length 
          : 0,
        feeBreakdown: {
          platform: breakdowns.reduce((s, b) => s + b.platform_fee * (b.revenue_share / 100), 0),
          commission: breakdowns.reduce((s, b) => s + b.commission_fee * (b.revenue_share / 100), 0),
          payment: breakdowns.reduce((s, b) => s + b.payment_fee * (b.revenue_share / 100), 0),
          shipping: breakdowns.reduce((s, b) => s + b.shipping_fee * (b.revenue_share / 100), 0),
        }
      };

      return { breakdowns, summary, channelSummaries, fromCache: false };
    },
    enabled: open && !!tenantId && !!sku
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Chi tiết phân bổ chi phí
          </DialogTitle>
          <DialogDescription>
            {productName || sku} • SKU: {sku}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : data?.summary ? (
          <Tabs defaultValue="overview" className="space-y-4">
            {/* Cache notice */}
            {data.fromCache && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>
                  Dữ liệu từ bộ nhớ đệm (cache). Chi tiết từng đơn hàng không khả dụng vì chưa có dữ liệu chi tiết line-item.
                </span>
              </div>
            )}
            
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Tổng quan
              </TabsTrigger>
              <TabsTrigger value="channels">
                <Store className="h-4 w-4 mr-2" />
                Theo kênh ({data.channelSummaries.length})
              </TabsTrigger>
              {!data.fromCache && (
                <TabsTrigger value="orders">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Chi tiết đơn ({data.breakdowns.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Số đơn</span>
                  </div>
                  <p className="text-lg font-bold">{data.summary.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">{data.summary.totalQuantity} sản phẩm</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Doanh thu</span>
                  </div>
                  <p className="text-lg font-bold">{formatVNDCompact(data.summary.totalRevenue)}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Giá vốn (COGS)</span>
                  </div>
                  <p className="text-lg font-bold text-amber-600">{formatVNDCompact(data.summary.totalCogs)}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    {data.summary.totalProfit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs text-muted-foreground">Lợi nhuận ròng</span>
                  </div>
                  <p className={`text-lg font-bold ${data.summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatVNDCompact(data.summary.totalProfit)}
                  </p>
                  <p className="text-xs text-muted-foreground">Margin: {data.summary.avgMargin.toFixed(1)}%</p>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" />
                  Phân bổ phí sàn (tổng: {formatVNDCompact(data.summary.totalFees)})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Platform Fee</p>
                      <p className="text-sm font-medium">{formatVNDCompact(data.summary.feeBreakdown.platform)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="text-sm font-medium">{formatVNDCompact(data.summary.feeBreakdown.commission)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Fee</p>
                      <p className="text-sm font-medium">{formatVNDCompact(data.summary.feeBreakdown.payment)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Shipping Fee</p>
                      <p className="text-sm font-medium">{formatVNDCompact(data.summary.feeBreakdown.shipping)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formula Explanation */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="text-sm font-medium mb-2">Công thức tính</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong className="text-foreground">Phí phân bổ</strong> = Tổng phí đơn × (Doanh thu item / Doanh thu đơn)</p>
                  <p><strong className="text-foreground">Lợi nhuận ròng</strong> = Doanh thu - COGS - Phí phân bổ</p>
                  <p><strong className="text-foreground">Margin</strong> = (Lợi nhuận ròng / Doanh thu) × 100%</p>
                </div>
              </div>
            </TabsContent>

            {/* Channels Tab */}
            <TabsContent value="channels" className="space-y-0">
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                  {/* Channel cards with fee breakdown */}
                  {data.channelSummaries.map((ch, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-sm px-3 py-1">
                          {ch.channel}
                        </Badge>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">{ch.orderCount} đơn</span>
                          <span className="text-muted-foreground">{ch.quantity} SP</span>
                          <span className={`font-medium ${ch.margin >= 10 ? 'text-emerald-600' : ch.margin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                            Margin: {ch.margin.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Main metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="p-2 rounded bg-background border">
                          <p className="text-xs text-muted-foreground">Doanh thu</p>
                          <p className="text-sm font-medium">{formatVNDCompact(ch.revenue)}</p>
                        </div>
                        <div className="p-2 rounded bg-background border">
                          <p className="text-xs text-muted-foreground">COGS</p>
                          <p className="text-sm font-medium text-amber-600">{formatVNDCompact(ch.cogs)}</p>
                        </div>
                        <div className="p-2 rounded bg-background border">
                          <p className="text-xs text-muted-foreground">Tổng phí sàn</p>
                          <p className="text-sm font-medium text-orange-600">{formatVNDCompact(ch.fees)}</p>
                        </div>
                        <div className="p-2 rounded bg-background border">
                          <p className="text-xs text-muted-foreground">Lợi nhuận ròng</p>
                          <p className={`text-sm font-medium ${ch.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatVNDCompact(ch.profit)}
                          </p>
                        </div>
                      </div>

                      {/* Fee breakdown */}
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Chi tiết phí sàn phân bổ
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="flex items-center gap-2">
                            <Store className="h-3.5 w-3.5 text-purple-500" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Platform</p>
                              <p className="text-xs font-medium">{formatVNDCompact(ch.feeBreakdown.platform)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Percent className="h-3.5 w-3.5 text-orange-500" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Commission</p>
                              <p className="text-xs font-medium">{formatVNDCompact(ch.feeBreakdown.commission)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Payment</p>
                              <p className="text-xs font-medium">{formatVNDCompact(ch.feeBreakdown.payment)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5 text-green-500" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Shipping</p>
                              <p className="text-xs font-medium">{formatVNDCompact(ch.feeBreakdown.shipping)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Total Summary */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <h4 className="text-sm font-medium mb-3">Tổng cộng tất cả kênh</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Tổng doanh thu</p>
                        <p className="text-sm font-bold">{formatVNDCompact(data.summary.totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tổng COGS</p>
                        <p className="text-sm font-bold text-amber-600">{formatVNDCompact(data.summary.totalCogs)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tổng phí sàn</p>
                        <p className="text-sm font-bold text-orange-600">{formatVNDCompact(data.summary.totalFees)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tổng lợi nhuận</p>
                        <p className={`text-sm font-bold ${data.summary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatVNDCompact(data.summary.totalProfit)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Đơn hàng</TableHead>
                        <TableHead>Kênh</TableHead>
                        <TableHead>Ngày</TableHead>
                        <TableHead className="text-right">SL</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                        <TableHead className="text-right">COGS</TableHead>
                        <TableHead className="text-right">% DT đơn</TableHead>
                        <TableHead className="text-right">Phí phân bổ</TableHead>
                        <TableHead className="text-right">Lợi nhuận</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.breakdowns.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{row.order_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {row.channel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(row.order_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-right">{row.quantity}</TableCell>
                          <TableCell className="text-right">{formatVNDCompact(row.item_revenue)}</TableCell>
                          <TableCell className="text-amber-600 text-right">{formatVNDCompact(row.total_cogs)}</TableCell>
                          <TableCell className="text-muted-foreground text-right">{row.revenue_share.toFixed(1)}%</TableCell>
                          <TableCell className="text-orange-600 text-right">{formatVNDCompact(row.allocated_fees)}</TableCell>
                          <TableCell className={`text-right font-medium ${row.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatVNDCompact(row.net_profit)}
                          </TableCell>
                          <TableCell className={`text-right ${row.margin_percent >= 10 ? 'text-emerald-600' : row.margin_percent >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                            {row.margin_percent.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            Không tìm thấy dữ liệu cho SKU này trong khoảng thời gian đã chọn
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
