/**
 * SKU Cost Breakdown Dialog
 * Shows detailed cost allocation per order for a specific SKU
 * Now using CDP SSOT via get_sku_cost_breakdown RPC
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
  ignoreDateRange?: boolean;
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
    shipping: number;
    other: number;
  };
}

// RPC response type
interface SKUBreakdownRow {
  order_id: string;
  order_key: string | null;
  channel: string | null;
  order_at: string;
  quantity: number;
  unit_price: number | null;
  line_revenue: number | null;
  line_cogs: number | null;
  line_margin: number | null;
  order_gross_revenue: number | null;
  order_platform_fee: number;
  order_shipping_fee: number;
  order_other_fees: number;
  revenue_share_pct: number;
  allocated_platform_fee: number;
  allocated_shipping_fee: number;
  allocated_other_fees: number;
  gross_profit: number;
  net_profit: number;
  margin_percent: number;
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

      // Use CDP SSOT via RPC - no more external_order_items
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_sku_cost_breakdown',
        {
          p_tenant_id: tenantId,
          p_sku: sku,
          p_start_date: ignoreDateRange ? '2020-01-01' : startDateStr,
          p_end_date: ignoreDateRange ? '2099-12-31' : endDateStr
        }
      );

      if (rpcError) {
        console.error('SKU cost breakdown RPC error:', rpcError);
        throw rpcError;
      }

      const rows = (rpcData as unknown as SKUBreakdownRow[]) || [];

      if (rows.length === 0) {
        return { breakdowns: [], summary: null, channelSummaries: [], fromCache: false };
      }

      // Map RPC response to OrderBreakdown interface
      const breakdowns: OrderBreakdown[] = rows.map(row => {
        const quantity = Number(row.quantity || 0);
        const unitPrice = Number(row.unit_price || 0);
        const lineRevenue = Number(row.line_revenue || 0);
        const lineCogs = Number(row.line_cogs || 0);
        const orderRevenue = Number(row.order_gross_revenue || 0);
        
        const platformFee = Number(row.order_platform_fee || 0);
        const shippingFee = Number(row.order_shipping_fee || 0);
        const otherFees = Number(row.order_other_fees || 0);
        const totalOrderFees = platformFee + shippingFee + otherFees;
        
        const allocatedPlatformFee = Number(row.allocated_platform_fee || 0);
        const allocatedShippingFee = Number(row.allocated_shipping_fee || 0);
        const allocatedOtherFees = Number(row.allocated_other_fees || 0);
        const allocatedFees = allocatedPlatformFee + allocatedShippingFee + allocatedOtherFees;
        
        const grossProfit = Number(row.gross_profit || 0);
        const netProfit = Number(row.net_profit || 0);
        const marginPercent = Number(row.margin_percent || 0);
        const revenueShare = Number(row.revenue_share_pct || 0);

        return {
          order_number: row.order_key?.slice(0, 8) || row.order_id.slice(0, 8),
          channel: row.channel || 'Unknown',
          order_date: row.order_at,
          quantity,
          unit_price: unitPrice,
          item_revenue: lineRevenue,
          unit_cogs: quantity > 0 ? lineCogs / quantity : 0,
          total_cogs: lineCogs,
          order_revenue: orderRevenue,
          platform_fee: platformFee,
          shipping_fee: shippingFee,
          other_fees: otherFees,
          total_order_fees: totalOrderFees,
          revenue_share: revenueShare,
          allocated_fees: allocatedFees,
          gross_profit: grossProfit,
          net_profit: netProfit,
          margin_percent: marginPercent
        };
      });

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
              shipping: 0,
              other: 0
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
        ch.feeBreakdown.shipping += b.shipping_fee * share;
        ch.feeBreakdown.other += b.other_fees * share;
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
          shipping: breakdowns.reduce((s, b) => s + b.shipping_fee * (b.revenue_share / 100), 0),
          other: breakdowns.reduce((s, b) => s + b.other_fees * (b.revenue_share / 100), 0),
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
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Tổng quan
              </TabsTrigger>
              <TabsTrigger value="channels">
                <Store className="h-4 w-4 mr-2" />
                Theo kênh ({data.channelSummaries.length})
              </TabsTrigger>
              <TabsTrigger value="orders">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Chi tiết đơn ({data.breakdowns.length})
              </TabsTrigger>
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
                  Phân bổ phí (theo tỷ lệ doanh thu)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phí sàn</p>
                      <p className="font-medium">{formatVNDCompact(data.summary.feeBreakdown.platform)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phí vận chuyển</p>
                      <p className="font-medium">{formatVNDCompact(data.summary.feeBreakdown.shipping)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phí khác</p>
                      <p className="font-medium">{formatVNDCompact(data.summary.feeBreakdown.other)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Channels Tab */}
            <TabsContent value="channels" className="space-y-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {data.channelSummaries.map((ch) => (
                    <div key={ch.channel} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-primary" />
                          <span className="font-medium">{ch.channel}</span>
                        </div>
                        <Badge variant={ch.margin >= 20 ? 'default' : ch.margin >= 0 ? 'secondary' : 'destructive'}>
                          {ch.margin.toFixed(1)}% margin
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Đơn hàng</p>
                          <p className="font-medium">{ch.orderCount} đơn • {ch.quantity} sp</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Doanh thu</p>
                          <p className="font-medium">{formatVNDCompact(ch.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">COGS + Phí</p>
                          <p className="font-medium text-amber-600">
                            {formatVNDCompact(ch.cogs)} + {formatVNDCompact(ch.fees)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Lợi nhuận</p>
                          <p className={`font-medium ${ch.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatVNDCompact(ch.profit)}
                          </p>
                        </div>
                      </div>

                      {/* Fee breakdown per channel */}
                      <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-purple-500" />
                          <span className="text-muted-foreground">Phí sàn:</span>
                          <span>{formatVNDCompact(ch.feeBreakdown.platform)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-blue-500" />
                          <span className="text-muted-foreground">Vận chuyển:</span>
                          <span>{formatVNDCompact(ch.feeBreakdown.shipping)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Receipt className="h-3 w-3 text-gray-500" />
                          <span className="text-muted-foreground">Khác:</span>
                          <span>{formatVNDCompact(ch.feeBreakdown.other)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {data.channelSummaries.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Không có dữ liệu theo kênh</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Đơn hàng</TableHead>
                      <TableHead>Kênh</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">SL</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">Phí phân bổ</TableHead>
                      <TableHead className="text-right">Lợi nhuận</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.breakdowns.map((b, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{b.order_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{b.channel}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {b.order_date ? format(new Date(b.order_date), 'dd/MM/yy') : '-'}
                        </TableCell>
                        <TableCell className="text-right">{b.quantity}</TableCell>
                        <TableCell className="text-right">{formatVNDCompact(b.item_revenue)}</TableCell>
                        <TableCell className="text-right text-amber-600">{formatVNDCompact(b.total_cogs)}</TableCell>
                        <TableCell className="text-right text-purple-600">
                          {formatVNDCompact(b.allocated_fees)}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({b.revenue_share.toFixed(0)}%)
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${b.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatVNDCompact(b.net_profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={b.margin_percent >= 20 ? 'default' : b.margin_percent >= 0 ? 'secondary' : 'destructive'} className="text-xs">
                            {b.margin_percent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {data.breakdowns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Không có dữ liệu đơn hàng trong khoảng thời gian này</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Không tìm thấy dữ liệu chi tiết cho SKU này trong khoảng thời gian đã chọn.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Hãy thử mở rộng khoảng thời gian hoặc kiểm tra lại SKU.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
