/**
 * SKU Profitability Analysis Component
 * 
 * Provides deep analysis at SKU level:
 * 1. Unit economics per SKU
 * 2. Break-even analysis
 * 3. Detection of "SKU lãi nhưng kênh lỗ"
 * 4. Detection of "kênh lãi nhưng SKU lỗ"
 * 
 * Uses cache table for faster loading
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  Search,
  ChevronRight,
  Sparkles,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatVND, formatVNDCompact, formatDateTime } from '@/lib/formatters';
import { useCachedSKUProfitability, useRecalculateSKUProfitability, CachedSKUMetrics } from '@/hooks/useSKUProfitabilityCache';

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

function SKUCard({ sku }: { sku: CachedSKUMetrics }) {
  const statusConfig = {
    profitable: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: TrendingUp },
    marginal: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Target },
    loss: { color: 'text-red-400', bg: 'bg-red-500/10', icon: TrendingDown }
  };
  
  const config = statusConfig[sku.status as keyof typeof statusConfig] || statusConfig.profitable;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border ${config.bg} border-slate-700/50`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{sku.product_name || sku.sku}</p>
          <p className="text-xs text-slate-500">{sku.sku}</p>
        </div>
        <Badge className={`${config.bg} ${config.color} text-xs`}>
          {sku.channel}
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-slate-500">Doanh thu</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm font-medium text-slate-200 cursor-help">
                  {formatVNDCompact(sku.revenue)}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formatVND(sku.revenue)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div>
          <p className="text-xs text-slate-500">Lợi nhuận</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className={`text-sm font-medium cursor-help ${sku.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatVNDCompact(sku.profit)}
                </p>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formatVND(sku.profit)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div>
          <p className="text-xs text-slate-500">Margin</p>
          <p className={`text-sm font-medium ${config.color}`}>
            {sku.margin_percent.toFixed(1)}%
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
  const { data, isLoading, error } = useCachedSKUProfitability();
  const recalculate = useRecalculateSKUProfitability();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'revenue'>('profit');

  const filteredSKUs = useMemo(() => {
    if (!data?.skuMetrics) return [];
    
    return data.skuMetrics
      .filter(sku => {
        if (searchQuery && !(sku.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
            !sku.sku.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        if (filterChannel !== 'all' && sku.channel !== filterChannel) return false;
        if (filterStatus !== 'all' && sku.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'profit') return b.profit - a.profit;
        if (sortBy === 'margin') return b.margin_percent - a.margin_percent;
        return b.revenue - a.revenue;
      });
  }, [data, searchQuery, filterChannel, filterStatus, sortBy]);

  const channels = useMemo(() => {
    if (!data?.skuMetrics) return [];
    return [...new Set(data.skuMetrics.map(m => m.channel))];
  }, [data]);

  // Calculate conflicts from cached data
  const conflicts = useMemo(() => {
    if (!data?.skuMetrics || data.skuMetrics.length === 0) return [];

    const result: ChannelSKUConflict[] = [];

    // Group by channel to calculate channel-level margins
    const channelTotals = new Map<string, { revenue: number; profit: number }>();
    data.skuMetrics.forEach(m => {
      if (!channelTotals.has(m.channel)) {
        channelTotals.set(m.channel, { revenue: 0, profit: 0 });
      }
      const ch = channelTotals.get(m.channel)!;
      ch.revenue += m.revenue;
      ch.profit += m.profit;
    });

    data.skuMetrics.forEach(m => {
      const channelTotal = channelTotals.get(m.channel);
      if (!channelTotal) return;

      const channelMargin = channelTotal.revenue > 0 
        ? (channelTotal.profit / channelTotal.revenue) * 100 
        : 0;

      // SKU profitable but channel losing
      if (m.margin_percent > 5 && channelMargin < -5) {
        result.push({
          type: 'sku_profit_channel_loss',
          sku: m.sku,
          skuName: m.product_name || m.sku,
          channel: m.channel,
          skuMargin: m.margin_percent,
          channelMargin,
          impact: Math.abs(channelTotal.profit),
          suggestion: `SKU "${m.product_name || m.sku}" có margin tốt (${m.margin_percent.toFixed(1)}%) nhưng kênh ${m.channel} đang lỗ. Xem xét tăng bán SKU này hoặc cắt các SKU lỗ khác trên kênh.`
        });
      }

      // Channel profitable but this SKU losing
      if (m.margin_percent < -5 && channelMargin > 5) {
        result.push({
          type: 'channel_profit_sku_loss',
          sku: m.sku,
          skuName: m.product_name || m.sku,
          channel: m.channel,
          skuMargin: m.margin_percent,
          channelMargin,
          impact: Math.abs(m.profit),
          suggestion: `SKU "${m.product_name || m.sku}" đang lỗ (${m.margin_percent.toFixed(1)}%) dù kênh ${m.channel} lãi. Xem xét tăng giá, giảm quảng cáo hoặc ngừng bán SKU này trên kênh.`
        });
      }
    });

    return result.sort((a, b) => b.impact - a.impact);
  }, [data]);

  const missingCosts = useMemo(() => {
    const metrics = data?.skuMetrics || [];
    const revenueRows = metrics.filter(m => (m.revenue || 0) > 0);
    const missing = revenueRows.filter(m => (m.cogs || 0) === 0 && (m.fees || 0) === 0);

    return {
      revenueRows: revenueRows.length,
      missingRows: missing.length,
      missingRatio: revenueRows.length > 0 ? missing.length / revenueRows.length : 0,
    };
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

  if (error) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-8 text-center text-slate-400">
          Không thể tải dữ liệu SKU
        </CardContent>
      </Card>
    );
  }

  // Show empty state with recalculate button if no cached data
  if (!data?.hasCachedData) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 mb-4">
            Chưa có dữ liệu SKU Profitability cho khoảng thời gian này.
          </p>
          <Button 
            onClick={() => recalculate.mutate()}
            disabled={recalculate.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {recalculate.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Đang tính toán...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tính toán SKU Profitability
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {missingCosts.missingRows > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-100">
                  Đang thiếu dữ liệu chi phí (COGS/fees) nên nhiều SKU hiển thị Lợi nhuận = Doanh thu
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {missingCosts.missingRows}/{missingCosts.revenueRows} SKU có doanh thu đang có COGS=0 và fees=0.
                  Nếu bạn muốn tính đúng, cần đồng bộ thêm giá vốn/chi phí bán hàng cho kênh hiện tại.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
      {conflicts.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Phát hiện bất thường ({conflicts.length})
            </CardTitle>
            <CardDescription className="text-slate-400">
              Các SKU có margin khác biệt với kênh bán - cần xem xét
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {conflicts.slice(0, 5).map((conflict, i) => (
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
                {data.lastCalculated && (
                  <span className="ml-2 text-xs">
                    (Cập nhật: {formatDateTime(data.lastCalculated)})
                  </span>
                )}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => recalculate.mutate()}
                disabled={recalculate.isPending}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                {recalculate.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Tính lại</span>
              </Button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Tìm SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
              
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Kênh" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 z-50">
                  <SelectItem value="all" className="text-slate-200 focus:bg-slate-700 focus:text-slate-100">Tất cả</SelectItem>
                  {channels.map(ch => (
                    <SelectItem key={ch} value={ch} className="text-slate-200 focus:bg-slate-700 focus:text-slate-100">{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200 z-50">
                  <SelectItem value="all" className="text-slate-200 focus:bg-slate-700 focus:text-slate-100">Tất cả</SelectItem>
                  <SelectItem value="profitable" className="text-slate-200 focus:bg-slate-700 focus:text-slate-100">Có lãi</SelectItem>
                  <SelectItem value="marginal" className="text-slate-200 focus:bg-slate-700 focus:text-slate-100">Marginal</SelectItem>
                  <SelectItem value="loss" className="text-slate-200 focus:bg-slate-700 focus:text-slate-100">Đang lỗ</SelectItem>
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
