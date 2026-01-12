/**
 * SKU Profitability Analysis Component
 * 
 * Provides deep analysis at SKU level:
 * 1. Unit economics per SKU
 * 2. Break-even analysis
 * 3. Detection of "SKU lãi nhưng kênh lỗ"
 * 4. Detection of "kênh lãi nhưng SKU lỗ"
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  DollarSign,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatVND, formatVNDCompact } from '@/lib/formatters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

interface SKUMetrics {
  sku: string;
  name: string;
  channel: string;
  quantity: number;
  revenue: number;
  cogs: number;
  fees: number;
  profit: number;
  margin: number;
  aov: number;
  breakEvenQty: number;
  currentQtyVsBE: number; // % above/below break-even
  status: 'profitable' | 'marginal' | 'loss';
}

interface ChannelSKUConflict {
  type: 'sku_profit_channel_loss' | 'channel_profit_sku_loss';
  sku: string;
  skuName: string;
  channel: string;
  skuMargin: number;
  channelMargin: number;
  impact: number;
  suggestion: string;
}

function useSKUProfitability() {
  const { data: tenantId } = useActiveTenantId();
  const { startDateStr, endDateStr } = useDateRangeForQuery();

  return useQuery({
    queryKey: ['sku-profitability', tenantId, startDateStr, endDateStr],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data: orders, error } = await supabase
        .from('external_orders')
        .select(`
          *,
          external_order_items (*)
        `)
        .eq('tenant_id', tenantId)
        .gte('order_date', startDateStr)
        .lte('order_date', endDateStr)
        .eq('status', 'delivered');

      if (error) throw error;

      // Calculate SKU-level metrics
      const skuMap = new Map<string, {
        sku: string;
        name: string;
        channels: Map<string, { qty: number; revenue: number; cogs: number; fees: number }>;
      }>();

      const channelTotals = new Map<string, { revenue: number; cogs: number; fees: number; profit: number }>();

      orders?.forEach(order => {
        const channel = (order.channel || 'unknown').toUpperCase();
        const orderFees = (order.platform_fee || 0) + (order.commission_fee || 0) + 
                         (order.payment_fee || 0) + (order.shipping_fee || 0);
        
        const items = order.external_order_items || [];
        const feePerItem = items.length > 0 ? orderFees / items.length : 0;

        // Update channel totals
        if (!channelTotals.has(channel)) {
          channelTotals.set(channel, { revenue: 0, cogs: 0, fees: 0, profit: 0 });
        }
        const chTotal = channelTotals.get(channel)!;
        chTotal.revenue += order.total_amount || 0;
        chTotal.fees += orderFees;
        chTotal.cogs += order.cost_of_goods || 0;
        chTotal.profit = chTotal.revenue - chTotal.cogs - chTotal.fees;

        items.forEach((item: any) => {
          const sku = item.sku || item.product_name || 'Unknown';
          const name = item.product_name || sku;
          
          if (!skuMap.has(sku)) {
            skuMap.set(sku, { sku, name, channels: new Map() });
          }
          
          const skuData = skuMap.get(sku)!;
          if (!skuData.channels.has(channel)) {
            skuData.channels.set(channel, { qty: 0, revenue: 0, cogs: 0, fees: 0 });
          }
          
          const chData = skuData.channels.get(channel)!;
          chData.qty += item.quantity || 1;
          chData.revenue += item.total_amount || (item.unit_price * (item.quantity || 1)) || 0;
          chData.cogs += item.cost_price ? item.cost_price * (item.quantity || 1) : 0;
          chData.fees += feePerItem;
        });
      });

      // Convert to metrics array
      const skuMetrics: SKUMetrics[] = [];
      
      skuMap.forEach((data, sku) => {
        data.channels.forEach((chData, channel) => {
          const profit = chData.revenue - chData.cogs - chData.fees;
          const margin = chData.revenue > 0 ? (profit / chData.revenue) * 100 : 0;
          const aov = chData.qty > 0 ? chData.revenue / chData.qty : 0;
          
          // Break-even: Fixed costs / (Price - Variable Cost per unit)
          const pricePerUnit = chData.qty > 0 ? chData.revenue / chData.qty : 0;
          const variableCostPerUnit = chData.qty > 0 ? (chData.cogs + chData.fees) / chData.qty : 0;
          const contributionPerUnit = pricePerUnit - variableCostPerUnit;
          const breakEvenQty = contributionPerUnit > 0 ? Math.ceil(0 / contributionPerUnit) : Infinity; // No fixed cost assumed per SKU
          const currentQtyVsBE = breakEvenQty > 0 && breakEvenQty < Infinity 
            ? ((chData.qty - breakEvenQty) / breakEvenQty) * 100 
            : chData.qty > 0 ? 100 : 0;

          skuMetrics.push({
            sku,
            name: data.name,
            channel,
            quantity: chData.qty,
            revenue: chData.revenue,
            cogs: chData.cogs,
            fees: chData.fees,
            profit,
            margin,
            aov,
            breakEvenQty,
            currentQtyVsBE,
            status: margin >= 10 ? 'profitable' : margin >= 0 ? 'marginal' : 'loss'
          });
        });
      });

      // Detect conflicts
      const conflicts: ChannelSKUConflict[] = [];
      
      // Group SKU metrics by SKU
      const skuGroups = new Map<string, SKUMetrics[]>();
      skuMetrics.forEach(m => {
        if (!skuGroups.has(m.sku)) skuGroups.set(m.sku, []);
        skuGroups.get(m.sku)!.push(m);
      });

      // Find conflicts
      skuGroups.forEach((metrics, sku) => {
        metrics.forEach(m => {
          const channelTotal = channelTotals.get(m.channel);
          if (!channelTotal) return;

          const channelMargin = channelTotal.revenue > 0 
            ? (channelTotal.profit / channelTotal.revenue) * 100 
            : 0;

          // SKU profitable but channel losing
          if (m.margin > 5 && channelMargin < -5) {
            conflicts.push({
              type: 'sku_profit_channel_loss',
              sku: m.sku,
              skuName: m.name,
              channel: m.channel,
              skuMargin: m.margin,
              channelMargin,
              impact: Math.abs(channelTotal.profit),
              suggestion: `SKU "${m.name}" có margin tốt (${m.margin.toFixed(1)}%) nhưng kênh ${m.channel} đang lỗ. Xem xét tăng bán SKU này hoặc cắt các SKU lỗ khác trên kênh.`
            });
          }

          // Channel profitable but this SKU losing
          if (m.margin < -5 && channelMargin > 5) {
            conflicts.push({
              type: 'channel_profit_sku_loss',
              sku: m.sku,
              skuName: m.name,
              channel: m.channel,
              skuMargin: m.margin,
              channelMargin,
              impact: Math.abs(m.profit),
              suggestion: `SKU "${m.name}" đang lỗ (${m.margin.toFixed(1)}%) dù kênh ${m.channel} lãi. Xem xét tăng giá, giảm quảng cáo hoặc ngừng bán SKU này trên kênh.`
            });
          }
        });
      });

      // Sort conflicts by impact
      conflicts.sort((a, b) => b.impact - a.impact);

      // Summary stats
      const profitable = skuMetrics.filter(m => m.status === 'profitable');
      const marginal = skuMetrics.filter(m => m.status === 'marginal');
      const loss = skuMetrics.filter(m => m.status === 'loss');

      return {
        skuMetrics: skuMetrics.sort((a, b) => b.profit - a.profit),
        conflicts,
        summary: {
          totalSKUs: new Set(skuMetrics.map(m => m.sku)).size,
          profitableSKUs: new Set(profitable.map(m => m.sku)).size,
          marginalSKUs: new Set(marginal.map(m => m.sku)).size,
          lossSKUs: new Set(loss.map(m => m.sku)).size,
          totalProfit: skuMetrics.reduce((s, m) => s + m.profit, 0),
          avgMargin: skuMetrics.length > 0 
            ? skuMetrics.reduce((s, m) => s + m.margin, 0) / skuMetrics.length 
            : 0
        }
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000
  });
}

function SKUCard({ sku }: { sku: SKUMetrics }) {
  const statusConfig = {
    profitable: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: TrendingUp },
    marginal: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Target },
    loss: { color: 'text-red-400', bg: 'bg-red-500/10', icon: TrendingDown }
  };
  
  const config = statusConfig[sku.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border ${config.bg} border-slate-700/50`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{sku.name}</p>
          <p className="text-xs text-slate-500">{sku.sku}</p>
        </div>
        <Badge className={`${config.bg} ${config.color} text-xs`}>
          {sku.channel}
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-slate-500">Doanh thu</p>
          <p className="text-sm font-medium text-slate-200">{formatVNDCompact(sku.revenue)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Lợi nhuận</p>
          <p className={`text-sm font-medium ${sku.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatVNDCompact(sku.profit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Margin</p>
          <p className={`text-sm font-medium ${config.color}`}>
            {sku.margin.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-700/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">SL bán: {sku.quantity}</span>
          <span className="text-slate-500">AOV: {formatVNDCompact(sku.aov)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function ConflictAlert({ conflict }: { conflict: ChannelSKUConflict }) {
  const isSkuProfitChannelLoss = conflict.type === 'sku_profit_channel_loss';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Sparkles className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={isSkuProfitChannelLoss ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}>
              SKU: {conflict.skuMargin > 0 ? '+' : ''}{conflict.skuMargin.toFixed(1)}%
            </Badge>
            <ChevronRight className="h-3 w-3 text-slate-500" />
            <Badge className={!isSkuProfitChannelLoss ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}>
              Kênh: {conflict.channelMargin > 0 ? '+' : ''}{conflict.channelMargin.toFixed(1)}%
            </Badge>
          </div>
          <p className="text-sm text-slate-300 font-medium">{conflict.skuName}</p>
          <p className="text-xs text-slate-400 mt-1">{conflict.suggestion}</p>
          <p className="text-xs text-amber-400 mt-2">
            Impact: {formatVNDCompact(conflict.impact)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function SKUProfitabilityAnalysis() {
  const { data, isLoading, error } = useSKUProfitability();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'revenue'>('profit');

  const filteredSKUs = useMemo(() => {
    if (!data?.skuMetrics) return [];
    
    return data.skuMetrics
      .filter(sku => {
        if (searchQuery && !sku.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !sku.sku.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        if (filterChannel !== 'all' && sku.channel !== filterChannel) return false;
        if (filterStatus !== 'all' && sku.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'profit') return b.profit - a.profit;
        if (sortBy === 'margin') return b.margin - a.margin;
        return b.revenue - a.revenue;
      });
  }, [data, searchQuery, filterChannel, filterStatus, sortBy]);

  const channels = useMemo(() => {
    if (!data?.skuMetrics) return [];
    return [...new Set(data.skuMetrics.map(m => m.channel))];
  }, [data]);

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-8 text-center text-slate-400">
          Không thể tải dữ liệu SKU
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs text-slate-400">Tổng SKU</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{data.summary.totalSKUs}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Có lãi</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{data.summary.profitableSKUs}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400">Marginal</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{data.summary.marginalSKUs}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-xs text-slate-400">Đang lỗ</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{data.summary.lossSKUs}</p>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts / AI Insights */}
      {data.conflicts.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Phát hiện bất thường ({data.conflicts.length})
            </CardTitle>
            <CardDescription className="text-slate-400">
              Các SKU có margin khác biệt với kênh bán - cần xem xét
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data.conflicts.slice(0, 5).map((conflict, i) => (
                <ConflictAlert key={i} conflict={conflict} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SKU List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Unit Economics theo SKU
              </CardTitle>
              <CardDescription className="text-slate-400">
                Phân tích lợi nhuận chi tiết từng SKU theo kênh
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-slate-800/50 border-slate-700"
                />
              </div>
              
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Kênh" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="all">Tất cả</SelectItem>
                  {channels.map(ch => (
                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="profitable">Có lãi</SelectItem>
                  <SelectItem value="marginal">Marginal</SelectItem>
                  <SelectItem value="loss">Đang lỗ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSKUs.map((sku, i) => (
                <SKUCard key={`${sku.sku}-${sku.channel}-${i}`} sku={sku} />
              ))}
            </div>
            
            {filteredSKUs.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Không tìm thấy SKU nào
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
