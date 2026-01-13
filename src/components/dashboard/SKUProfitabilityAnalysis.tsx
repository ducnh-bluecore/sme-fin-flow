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
  RefreshCw,
  Eye,
  Globe,
  Calendar,
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
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatVND, formatVNDCompact, formatDateTime } from '@/lib/formatters';
import { FDP_THRESHOLDS } from '@/lib/fdp-formulas';
import {
  useCachedSKUProfitability,
  useRecalculateSKUProfitability,
  CachedSKUMetrics,
} from '@/hooks/useSKUProfitabilityCache';
import { useAllProblematicSKUs } from '@/hooks/useAllProblematicSKUs';
import { SKUCostBreakdownDialog } from './SKUCostBreakdownDialog';

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

// Aggregated SKU data across all channels
interface AggregatedSKU {
  sku: string;
  product_name: string | null;
  channels: string[];
  quantity: number;
  revenue: number;
  cogs: number;
  fees: number;
  profit: number;
  margin_percent: number;
  aov: number;
  status: string;
}

function SKUCard({ sku, onViewDetails }: { sku: AggregatedSKU; onViewDetails: () => void }) {
  const statusConfig = {
    profitable: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: TrendingUp },
    marginal: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Target },
    loss: { color: 'text-destructive', bg: 'bg-destructive/10', icon: TrendingDown },
  };

  const config = statusConfig[sku.status as keyof typeof statusConfig] || statusConfig.profitable;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors group",
        config.bg,
      )}
      onClick={onViewDetails}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{sku.product_name || sku.sku}</p>
          <p className="text-xs text-muted-foreground">{sku.sku}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
            {sku.channels.map((ch) => (
              <Badge key={ch} variant="outline" className="text-[10px] px-1.5 py-0">
                {ch}
              </Badge>
            ))}
          </div>
          <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Doanh thu</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm font-medium text-foreground cursor-help">
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
          <p className="text-xs text-muted-foreground">Lợi nhuận</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p
                  className={cn(
                    "text-sm font-medium cursor-help",
                    sku.profit >= 0 ? "text-emerald-500" : "text-destructive",
                  )}
                >
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
          <p className="text-xs text-muted-foreground">Margin</p>
          <p className={cn("text-sm font-medium", config.color)}>
            {sku.margin_percent.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">SL bán: {sku.quantity}</span>
          <span className="text-muted-foreground">AOV: {formatVNDCompact(sku.aov)}</span>
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
      className="p-4 rounded-lg bg-red-500/10 border-2 border-red-500/50"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={isSkuProfitChannelLoss ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}>
              SKU: {conflict.skuMargin > 0 ? '+' : ''}{conflict.skuMargin.toFixed(1)}%
            </Badge>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Badge className={!isSkuProfitChannelLoss ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}>
              Kênh: {conflict.channelMargin > 0 ? '+' : ''}{conflict.channelMargin.toFixed(1)}%
            </Badge>
          </div>
          <p className="text-sm text-foreground font-medium">{conflict.skuName}</p>
          <p className="text-xs text-muted-foreground mt-1">{conflict.suggestion}</p>
          <div className="mt-2 p-2 rounded bg-red-500/20">
            <p className="text-sm text-red-500 font-semibold">
              💰 Impact: {formatVNDCompact(conflict.impact)} - CẦN ACTION NGAY
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SKUProfitabilityAnalysis() {
  const { data, isLoading, error } = useCachedSKUProfitability();
  const { data: allProblematicSKUs, isLoading: loadingProblematic } = useAllProblematicSKUs();
  const recalculate = useRecalculateSKUProfitability();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'revenue'>('profit');
  const [selectedSKU, setSelectedSKU] = useState<{ sku: string; productName: string | null } | null>(null);
  const [showAllProblematic, setShowAllProblematic] = useState(false);

  // Count problematic SKUs that are NOT in current date range
  const problematicNotInRange = useMemo(() => {
    if (!allProblematicSKUs || !data?.skuMetrics) return [];
    const currentSKUs = new Set(data.skuMetrics.map(m => m.sku));
    return allProblematicSKUs.filter(p => !currentSKUs.has(p.sku));
  }, [allProblematicSKUs, data]);

  // Convert problematic SKUs to AggregatedSKU format
  const problematicAsAggregated = useMemo((): AggregatedSKU[] => {
    if (!allProblematicSKUs) return [];
    return allProblematicSKUs.map(p => ({
      sku: p.sku,
      product_name: p.product_name,
      channels: [p.channel],
      quantity: 0,
      revenue: p.revenue,
      cogs: p.cogs,
      fees: p.fees,
      profit: p.profit,
      margin_percent: p.margin_percent,
      aov: 0,
      status: p.margin_percent >= 10 ? 'profitable' : p.margin_percent >= 0 ? 'marginal' : 'loss'
    }));
  }, [allProblematicSKUs]);

  // Aggregate SKUs across channels
  const aggregatedSKUs = useMemo((): AggregatedSKU[] => {
    if (!data?.skuMetrics) return [];
    
    const skuMap = new Map<string, AggregatedSKU>();
    
    data.skuMetrics.forEach(m => {
      const key = m.sku; // Group by SKU only
      if (!skuMap.has(key)) {
        skuMap.set(key, {
          sku: m.sku,
          product_name: m.product_name,
          channels: [],
          quantity: 0,
          revenue: 0,
          cogs: 0,
          fees: 0,
          profit: 0,
          margin_percent: 0,
          aov: 0,
          status: 'profitable'
        });
      }
      
      const agg = skuMap.get(key)!;
      if (!agg.channels.includes(m.channel)) {
        agg.channels.push(m.channel);
      }
      agg.quantity += m.quantity;
      agg.revenue += m.revenue;
      agg.cogs += m.cogs;
      agg.fees += m.fees;
      agg.profit += m.profit;
    });
    
    // Calculate margin and status for aggregated data
    skuMap.forEach(agg => {
      agg.margin_percent = agg.revenue > 0 ? (agg.profit / agg.revenue) * 100 : 0;
      agg.aov = agg.quantity > 0 ? agg.revenue / agg.quantity : 0;
      agg.status = agg.margin_percent >= 10 ? 'profitable' : agg.margin_percent >= 0 ? 'marginal' : 'loss';
    });
    
    return Array.from(skuMap.values());
  }, [data]);

  const filteredSKUs = useMemo(() => {
    // Use all problematic SKUs when toggle is on, otherwise use date-filtered data
    const sourceData = showAllProblematic ? problematicAsAggregated : aggregatedSKUs;
    
    return sourceData
      .filter(sku => {
        if (searchQuery && !(sku.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
            !sku.sku.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        if (filterChannel !== 'all' && !sku.channels.includes(filterChannel)) return false;
        if (filterStatus !== 'all' && sku.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'profit') return b.profit - a.profit;
        if (sortBy === 'margin') return b.margin_percent - a.margin_percent;
        return b.revenue - a.revenue;
      });
  }, [aggregatedSKUs, problematicAsAggregated, showAllProblematic, searchQuery, filterChannel, filterStatus, sortBy]);

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

      // SKU profitable but channel losing - using FDP_THRESHOLDS
      if (m.margin_percent > FDP_THRESHOLDS.SKU_REVIEW_MARGIN_PERCENT && channelMargin < FDP_THRESHOLDS.SKU_STOP_MARGIN_PERCENT) {
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

      // Channel profitable but this SKU losing - using FDP_THRESHOLDS
      if (m.margin_percent < FDP_THRESHOLDS.SKU_STOP_MARGIN_PERCENT && channelMargin > FDP_THRESHOLDS.SKU_REVIEW_MARGIN_PERCENT) {
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
      <Card className="bg-muted/30">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          Không thể tải dữ liệu SKU
        </CardContent>
      </Card>
    );
  }

  // Show empty state with recalculate button if no cached data
  if (!data?.hasCachedData) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Chưa có dữ liệu SKU Profitability cho khoảng thời gian này.
          </p>
          <Button
            onClick={() => recalculate.mutate()}
            disabled={recalculate.isPending}
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
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Đang thiếu dữ liệu chi phí (COGS/fees) nên nhiều SKU hiển thị Lợi nhuận = Doanh thu
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {missingCosts.missingRows}/{missingCosts.revenueRows} SKU có doanh thu đang có
                  COGS=0 và fees=0. Nếu bạn muốn tính đúng, cần đồng bộ thêm giá vốn/chi phí bán
                  hàng cho kênh hiện tại.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert when problematic SKUs exist outside current date range */}
      {problematicNotInRange.length > 0 && !showAllProblematic && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  ⚠️ Có {problematicNotInRange.length} SKU lỗ/marginal KHÔNG hiển thị trong date range hiện tại
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Những SKU này đang được hiển thị trong "Quyết định hôm nay" (Dashboard) nhưng không nằm trong khoảng thời gian bạn đang chọn.
                  Bật "Xem tất cả SKU lỗ" bên dưới để thống nhất.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {problematicNotInRange.slice(0, 5).map(p => (
                    <Badge key={p.sku} variant="destructive" className="text-xs">
                      {p.product_name || p.sku}: {p.margin_percent.toFixed(1)}%
                    </Badge>
                  ))}
                  {problematicNotInRange.length > 5 && (
                    <Badge variant="outline" className="text-xs">+{problematicNotInRange.length - 5} khác</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Tổng SKU</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{data.summary.totalSKUs}</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Có lãi</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{data.summary.profitableSKUs}</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Marginal</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{data.summary.marginalSKUs}</p>
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Đang lỗ</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{data.summary.lossSKUs}</p>
          </CardContent>
        </Card>
      </div>


      {/* Conflicts / AI Insights */}
      {conflicts.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Phát hiện bất thường ({conflicts.length})
            </CardTitle>
            <CardDescription className="text-muted-foreground">
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
      <Card className="bg-muted/30">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Unit Economics theo SKU
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Phân tích lợi nhuận chi tiết từng SKU theo kênh
                {data.lastCalculated && (
                  <span className="ml-2 text-xs">
                    (Cập nhật: {formatDateTime(data.lastCalculated)})
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle to show all problematic SKUs regardless of date */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/50">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground hidden sm:inline">Tất cả SKU lỗ</span>
                      <Switch 
                        checked={showAllProblematic}
                        onCheckedChange={setShowAllProblematic}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Hiển thị tất cả SKU có margin {'<'} 10% (bỏ qua date range)</p>
                    <p className="text-xs text-muted-foreground">Thống nhất với "Quyết định hôm nay"</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="outline"
                size="sm"
                onClick={() => recalculate.mutate()}
                disabled={recalculate.isPending || showAllProblematic}
              >
                {recalculate.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1 hidden sm:inline">Tính lại</span>
              </Button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>

              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Kênh" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">Tất cả</SelectItem>
                  {channels.map((ch) => (
                    <SelectItem key={ch} value={ch}>
                      {ch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent className="z-50">
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
                <SKUCard
                  key={`${sku.sku}-${i}`}
                  sku={sku}
                  onViewDetails={() =>
                    setSelectedSKU({ sku: sku.sku, productName: sku.product_name })
                  }
                />
              ))}
            </div>

            {filteredSKUs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Không tìm thấy SKU nào
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>


      {/* Cost Breakdown Dialog */}
      <SKUCostBreakdownDialog
        open={!!selectedSKU}
        onOpenChange={(open) => !open && setSelectedSKU(null)}
        sku={selectedSKU?.sku || ''}
        productName={selectedSKU?.productName || null}
      />
    </div>
  );
}
