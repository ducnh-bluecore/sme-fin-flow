import { useState, useMemo } from 'react';
import { useMDPDataSSOT, MDP_THRESHOLDS } from '@/hooks/useMDPDataSSOT';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  Layers,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Scale,
  Wallet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { useNavigate } from 'react-router-dom';

// Channel Performance with Financial Truth
interface ChannelAnalysis {
  channel: string;
  // Marketing metrics
  campaigns: number;
  activeCampaigns: number;
  adSpend: number;
  revenue: number;
  orders: number;
  roas: number;
  cpa: number;
  // Financial Truth (from CMO Mode)
  contributionMargin: number;
  contributionMarginPercent: number;
  profitRoas: number;
  // Cash metrics
  cashReceived: number;
  cashPending: number;
  cashConversionRate: number;
  isCashPositive: boolean;
  // Scores
  marginScore: number; // -100 to 100
  cashScore: number; // -100 to 100
  overallScore: number;
  recommendation: 'scale' | 'maintain' | 'reduce' | 'stop';
  issues: string[];
}

const RECOMMENDATION_CONFIG = {
  scale: { label: 'SCALE', color: 'text-green-500', bg: 'bg-green-500/10', icon: TrendingUp },
  maintain: { label: 'DUY TRÌ', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Minus },
  reduce: { label: 'GIẢM', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: TrendingDown },
  stop: { label: 'DỪNG', color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
};

export default function ChannelsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('matrix');
  
  const { 
    marketingPerformance,
    profitAttribution,
    cashImpact,
    isLoading, 
    error 
  } = useMDPDataSSOT();

  // Aggregate and analyze channels
  const channelAnalysis = useMemo<ChannelAnalysis[]>(() => {
    if (!marketingPerformance?.length) return [];

    const channelMap = new Map<string, ChannelAnalysis>();

    // Aggregate marketing performance by channel
    marketingPerformance.forEach(campaign => {
      const existing = channelMap.get(campaign.channel);
      if (existing) {
        existing.campaigns += 1;
        existing.activeCampaigns += campaign.status === 'active' ? 1 : 0;
        existing.adSpend += campaign.spend;
        existing.revenue += campaign.revenue;
        existing.orders += campaign.orders;
      } else {
        channelMap.set(campaign.channel, {
          channel: campaign.channel,
          campaigns: 1,
          activeCampaigns: campaign.status === 'active' ? 1 : 0,
          adSpend: campaign.spend,
          revenue: campaign.revenue,
          orders: campaign.orders,
          roas: 0,
          cpa: 0,
          contributionMargin: 0,
          contributionMarginPercent: 0,
          profitRoas: 0,
          cashReceived: 0,
          cashPending: 0,
          cashConversionRate: 0,
          isCashPositive: false,
          marginScore: 0,
          cashScore: 0,
          overallScore: 0,
          recommendation: 'maintain',
          issues: [],
        });
      }
    });

    // Enrich with profit attribution data
    profitAttribution?.forEach(profit => {
      const channel = channelMap.get(profit.channel);
      if (channel) {
        channel.contributionMargin += profit.contribution_margin;
      }
    });

    // Enrich with cash impact data
    cashImpact?.forEach(cash => {
      const channel = channelMap.get(cash.channel);
      if (channel) {
        channel.cashReceived += cash.cash_received;
        channel.cashPending += cash.pending_cash;
        channel.isCashPositive = cash.is_cash_positive;
      }
    });

    // Calculate derived metrics and scores
    return Array.from(channelMap.values()).map(ch => {
      // Calculate ROAS & CPA
      ch.roas = ch.adSpend > 0 ? ch.revenue / ch.adSpend : 0;
      ch.cpa = ch.orders > 0 ? ch.adSpend / ch.orders : 0;
      
      // Calculate margin metrics
      ch.contributionMarginPercent = ch.revenue > 0 
        ? (ch.contributionMargin / ch.revenue) * 100 
        : 0;
      ch.profitRoas = ch.adSpend > 0 ? ch.contributionMargin / ch.adSpend : 0;
      
      // Calculate cash metrics
      const totalCash = ch.cashReceived + ch.cashPending;
      ch.cashConversionRate = totalCash > 0 ? ch.cashReceived / totalCash : 0;
      ch.isCashPositive = ch.cashConversionRate >= MDP_THRESHOLDS.MIN_CASH_CONVERSION;

      // Score calculations (-100 to 100) with quadrant-based placement
      // Instead of continuous scores, we place items clearly within quadrants
      // to avoid clustering on axes
      
      const isGoodMargin = ch.contributionMarginPercent >= MDP_THRESHOLDS.MIN_CM_PERCENT;
      const isGoodCash = ch.cashConversionRate >= MDP_THRESHOLDS.MIN_CASH_CONVERSION;
      
      // Margin Score: place within left or right half with variation
      // Use actual CM% to create spread within the quadrant
      const marginVariation = Math.min(40, Math.abs(ch.contributionMarginPercent) * 2);
      if (isGoodMargin) {
        // Right half: 20 to 90 (good margin)
        ch.marginScore = 20 + marginVariation + Math.random() * 10;
      } else if (ch.contributionMarginPercent >= 0) {
        // Left half: -10 to -40 (low positive margin)
        ch.marginScore = -10 - marginVariation - Math.random() * 10;
      } else {
        // Left half: -30 to -80 (negative margin)
        ch.marginScore = -30 - marginVariation - Math.random() * 10;
      }
      
      // Cash Score: place within top or bottom half with variation
      // Use actual cash conversion to create spread within the quadrant
      const cashVariation = Math.min(40, ch.cashConversionRate * 50);
      if (isGoodCash) {
        // Top half: 20 to 80 (good cash)
        ch.cashScore = 20 + cashVariation + Math.random() * 10;
      } else if (ch.cashConversionRate >= 0.5) {
        // Bottom half: -10 to -40 (moderate cash)
        ch.cashScore = -10 - cashVariation - Math.random() * 10;
      } else {
        // Bottom half: -30 to -70 (poor cash)
        ch.cashScore = -30 - (0.5 - ch.cashConversionRate) * 100 - Math.random() * 10;
      }
      
      // Clamp scores to valid range
      ch.marginScore = Math.max(-100, Math.min(100, ch.marginScore));
      ch.cashScore = Math.max(-100, Math.min(100, ch.cashScore));

      // Overall Score (weighted average)
      ch.overallScore = ch.marginScore * 0.6 + ch.cashScore * 0.4;

      // Determine issues
      ch.issues = [];
      if (ch.contributionMarginPercent < 0) {
        ch.issues.push('Margin âm');
      } else if (ch.contributionMarginPercent < MDP_THRESHOLDS.MIN_CM_PERCENT) {
        ch.issues.push('Margin thấp');
      }
      if (ch.cashConversionRate < MDP_THRESHOLDS.MIN_CASH_CONVERSION) {
        ch.issues.push('Cash chậm');
      }
      if (ch.profitRoas < MDP_THRESHOLDS.MIN_PROFIT_ROAS) {
        ch.issues.push('Profit ROAS thấp');
      }

      // Determine recommendation
      if (ch.contributionMarginPercent >= MDP_THRESHOLDS.MIN_CM_PERCENT && ch.isCashPositive) {
        ch.recommendation = 'scale';
      } else if (ch.contributionMarginPercent >= 0 && ch.cashConversionRate >= 0.5) {
        ch.recommendation = 'maintain';
      } else if (ch.contributionMarginPercent >= -5) {
        ch.recommendation = 'reduce';
      } else {
        ch.recommendation = 'stop';
      }

      return ch;
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [marketingPerformance, profitAttribution, cashImpact]);

  // Summary stats
  const summary = useMemo(() => {
    const scaleCount = channelAnalysis.filter(c => c.recommendation === 'scale').length;
    const stopCount = channelAnalysis.filter(c => c.recommendation === 'stop').length;
    let totalMargin = 0;
    let totalSpend = 0;
    let cashConvSum = 0;
    for (const c of channelAnalysis) {
      totalMargin += c.contributionMargin;
      totalSpend += c.adSpend;
      cashConvSum += c.cashConversionRate;
    }
    const avgCashConversion = channelAnalysis.length > 0 ? cashConvSum / channelAnalysis.length : 0;

    return { scaleCount, stopCount, totalMargin, totalSpend, avgCashConversion };
  }, [channelAnalysis]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const getChannelIcon = (channel: string) => {
    const lower = channel.toLowerCase();
    if (lower.includes('shopee')) return '🛒';
    if (lower.includes('lazada')) return '🔶';
    if (lower.includes('tiktok')) return '🎵';
    if (lower.includes('meta') || lower.includes('facebook')) return '📘';
    if (lower.includes('google')) return '🔍';
    if (lower.includes('sendo')) return '🔴';
    return '📊';
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>
            Không thể tải dữ liệu kênh. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Phân tích Kênh Marketing"
        subtitle="So sánh hiệu quả tài chính thực giữa các kênh - Margin, Cash, Profit ROAS"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Kênh Scale được</div>
                <div className="text-3xl font-bold text-green-500">{summary.scaleCount}</div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Margin tốt + Cash nhanh</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Kênh cần Dừng</div>
                <div className="text-3xl font-bold text-red-500">{summary.stopCount}</div>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Đốt tiền, không sinh lời</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          summary.totalMargin >= 0 
            ? "bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
            : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20"
        )}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Tổng Contribution</div>
                <div className={cn(
                  "text-2xl font-bold",
                  summary.totalMargin >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {summary.totalMargin >= 0 ? '+' : ''}{formatCurrency(summary.totalMargin)}đ
                </div>
              </div>
              <DollarSign className={cn(
                "h-8 w-8",
                summary.totalMargin >= 0 ? "text-emerald-500/50" : "text-red-500/50"
              )} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Sau khi trừ tất cả chi phí</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Avg Cash Conversion</div>
                <div className="text-2xl font-bold text-blue-500">
                  {(summary.avgCashConversion * 100).toFixed(0)}%
                </div>
              </div>
              <Wallet className="h-8 w-8 text-blue-500/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Target: ≥{MDP_THRESHOLDS.MIN_CASH_CONVERSION * 100}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Health Matrix */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">Ma trận Kênh</TabsTrigger>
          <TabsTrigger value="comparison">So sánh Chi tiết</TabsTrigger>
          <TabsTrigger value="actions">Hành động</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Channel Health Matrix
              </CardTitle>
              <CardDescription>
                Đánh giá kênh theo 2 trục: Margin Score (lợi nhuận) và Cash Score (dòng tiền)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Matrix Grid */}
              <div className="relative w-full aspect-square max-w-2xl mx-auto">
                {/* Quadrant Labels */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-tl-lg p-3">
                    <span className="text-xs font-medium text-yellow-600">
                      Margin thấp + Cash tốt
                    </span>
                    <p className="text-xs text-muted-foreground">Cải thiện margin</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-tr-lg p-3">
                    <span className="text-xs font-medium text-green-600">
                      ⭐ SCALE
                    </span>
                    <p className="text-xs text-muted-foreground">Margin tốt + Cash tốt</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-bl-lg p-3">
                    <span className="text-xs font-medium text-red-600">
                      ⛔ STOP
                    </span>
                    <p className="text-xs text-muted-foreground">Margin thấp + Cash chậm</p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-br-lg p-3">
                    <span className="text-xs font-medium text-orange-600">
                      Margin tốt + Cash chậm
                    </span>
                    <p className="text-xs text-muted-foreground">Tối ưu cash flow</p>
                  </div>
                </div>

                {/* Channel Points */}
                {channelAnalysis.map((channel) => {
                  // Normalize scores to 0-100 range for positioning
                  const x = Math.min(100, Math.max(0, (channel.marginScore + 100) / 2));
                  const y = Math.min(100, Math.max(0, 100 - (channel.cashScore + 100) / 2));
                  
                  const config = RECOMMENDATION_CONFIG[channel.recommendation];
                  
                  return (
                    <div
                      key={channel.channel}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110 hover:z-10"
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => navigate(`/channel/${encodeURIComponent(channel.channel)}`)}
                    >
                      <div className={cn(
                        "p-2 rounded-full border-2 shadow-lg",
                        config.bg,
                        config.color.replace('text-', 'border-')
                      )}>
                        <span className="text-xl">{getChannelIcon(channel.channel)}</span>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap">
                        <Badge variant="secondary" className="text-xs">
                          {channel.channel}
                        </Badge>
                      </div>
                    </div>
                  );
                })}

                {/* Axis Labels */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 text-xs text-muted-foreground font-medium">
                  Margin Score →
                </div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 text-xs text-muted-foreground font-medium rotate-[-90deg]">
                  Cash Score →
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-8 pt-4 border-t">
                {Object.entries(RECOMMENDATION_CONFIG).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", config.bg, `border ${config.color.replace('text-', 'border-')}`)} />
                    <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>So sánh Chi tiết Kênh</CardTitle>
              <CardDescription>
                Metrics tài chính thực - Không phải vanity metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channelAnalysis.map((channel) => {
                  const config = RECOMMENDATION_CONFIG[channel.recommendation];
                  const Icon = config.icon;

                  return (
                    <div 
                      key={channel.channel}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/30 transition-all cursor-pointer"
                      onClick={() => navigate(`/channel/${encodeURIComponent(channel.channel)}`)}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getChannelIcon(channel.channel)}</span>
                          <div>
                            <h4 className="font-semibold">{channel.channel}</h4>
                            <p className="text-xs text-muted-foreground">
                              {channel.activeCampaigns}/{channel.campaigns} campaigns
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("gap-1", config.bg, config.color)}>
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                          {channel.issues.length > 0 && (
                            <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {channel.issues.length} vấn đề
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Ad Spend</div>
                          <div className="font-bold">{formatCurrency(channel.adSpend)}đ</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                          <div className="font-bold text-blue-500">{formatCurrency(channel.revenue)}đ</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Contribution</div>
                          <div className={cn(
                            "font-bold",
                            channel.contributionMargin >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {channel.contributionMargin >= 0 ? '+' : ''}{formatCurrency(channel.contributionMargin)}đ
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ({channel.contributionMarginPercent.toFixed(1)}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Profit ROAS</div>
                          <div className={cn(
                            "font-bold",
                            channel.profitRoas >= MDP_THRESHOLDS.MIN_PROFIT_ROAS 
                              ? "text-green-500" 
                              : "text-orange-500"
                          )}>
                            {channel.profitRoas.toFixed(2)}x
                          </div>
                          <div className="text-xs text-muted-foreground">
                            (Target: ≥{MDP_THRESHOLDS.MIN_PROFIT_ROAS}x)
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Cash Conversion</div>
                          <div className={cn(
                            "font-bold",
                            channel.isCashPositive ? "text-green-500" : "text-orange-500"
                          )}>
                            {(channel.cashConversionRate * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Pending: {formatCurrency(channel.cashPending)}đ
                          </div>
                        </div>
                      </div>

                      {/* Issues */}
                      {channel.issues.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          <span className="text-xs text-orange-500">
                            {channel.issues.join(' • ')}
                          </span>
                        </div>
                      )}

                      {/* View Details */}
                      <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/channel/${encodeURIComponent(channel.channel)}`); }}>
                        Xem P&L chi tiết kênh
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          {/* Action Cards by Recommendation */}
          {(['scale', 'reduce', 'stop'] as const).map(type => {
            const channels = channelAnalysis.filter(c => c.recommendation === type);
            if (channels.length === 0) return null;
            
            const config = RECOMMENDATION_CONFIG[type];
            const Icon = config.icon;

            return (
              <Card key={type} className={cn("border-2", config.bg.replace('/10', '/20'))}>
                <CardHeader>
                  <CardTitle className={cn("flex items-center gap-2", config.color)}>
                    <Icon className="h-5 w-5" />
                    {type === 'scale' && 'Đề xuất tăng ngân sách'}
                    {type === 'reduce' && 'Đề xuất xem xét giảm ngân sách'}
                    {type === 'stop' && 'Đề xuất tạm dừng để đánh giá'}
                  </CardTitle>
                  <CardDescription>
                    {type === 'scale' && 'Margin tốt + Cash nhanh - Cân nhắc tăng ngân sách để tối đa hóa lợi nhuận'}
                    {type === 'reduce' && 'Phát hiện vấn đề về margin hoặc cash - Nên xem xét lại chiến lược'}
                    {type === 'stop' && 'Chi phí đang vượt doanh thu - Nên xem xét tạm dừng để đánh giá'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {channels.map(channel => (
                      <div 
                        key={channel.channel}
                        className="flex items-center justify-between p-3 rounded-lg bg-background border"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getChannelIcon(channel.channel)}</span>
                          <div>
                            <div className="font-medium">{channel.channel}</div>
                            <div className="text-xs text-muted-foreground">
                              {channel.issues.length > 0 
                                ? channel.issues.join(' • ')
                                : 'Hoạt động tốt'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={cn(
                              "font-bold",
                              channel.contributionMargin >= 0 ? "text-green-500" : "text-red-500"
                            )}>
                              {channel.contributionMargin >= 0 ? '+' : ''}{formatCurrency(channel.contributionMargin)}đ
                            </div>
                            <div className="text-xs text-muted-foreground">Contribution</div>
                          </div>
                          <Button 
                            size="sm"
                            variant={type === 'stop' ? 'destructive' : type === 'scale' ? 'default' : 'outline'}
                            onClick={() => navigate(`/channel/${encodeURIComponent(channel.channel)}`)}
                          >
                            {type === 'scale' && 'Xem chi tiết'}
                            {type === 'reduce' && 'Xem chi tiết'}
                            {type === 'stop' && 'Xem chi tiết'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {channelAnalysis.filter(c => c.recommendation === 'maintain').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-500">
                  <Minus className="h-5 w-5" />
                  Kênh DUY TRÌ hiện tại
                </CardTitle>
                <CardDescription>
                  Hoạt động ổn định - Tiếp tục theo dõi và tối ưu dần
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {channelAnalysis
                    .filter(c => c.recommendation === 'maintain')
                    .map(channel => (
                      <div 
                        key={channel.channel}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                        onClick={() => navigate(`/channel-pl?channel=${encodeURIComponent(channel.channel)}`)}
                      >
                        <div className="flex items-center gap-2">
                          <span>{getChannelIcon(channel.channel)}</span>
                          <span className="font-medium">{channel.channel}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className={cn(
                            channel.contributionMargin >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {formatCurrency(channel.contributionMargin)}đ
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
