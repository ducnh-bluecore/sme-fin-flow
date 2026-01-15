import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowRight,
  DollarSign,
  MousePointerClick,
  ShoppingCart,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketingPerformance } from '@/hooks/useMDPData';

interface ChannelBreakdownPanelProps {
  campaigns: MarketingPerformance[];
  onViewChannelDetails?: (channel: string) => void;
}

interface ChannelData {
  channel: string;
  campaigns: number;
  activeCampaigns: number;
  spend: number;
  revenue: number;
  orders: number;
  clicks: number;
  impressions: number;
  roas: number;
  cpa: number;
  ctr: number;
  cvr: number;
  spendShare: number;
  revenueShare: number;
}

export function ChannelBreakdownPanel({ campaigns, onViewChannelDetails }: ChannelBreakdownPanelProps) {
  // Normalize channel name for consistent grouping
  const normalizeChannel = (channel: string): string => {
    const lower = channel?.toLowerCase() || 'unknown';
    if (lower.includes('facebook') || lower.includes('fb') || lower.includes('meta')) return 'facebook';
    if (lower.includes('google') || lower.includes('gg')) return 'google';
    if (lower.includes('shopee')) return 'shopee';
    if (lower.includes('lazada')) return 'lazada';
    if (lower.includes('tiktok') || lower.includes('tik')) return 'tiktok';
    if (lower.includes('sendo')) return 'sendo';
    if (lower === 'all' || lower.includes('multi')) return 'multi-channel';
    return lower;
  };

  // Display name mapping for channels
  const getChannelDisplayName = (channel: string): string => {
    const names: Record<string, string> = {
      'facebook': 'Facebook',
      'google': 'Google',
      'shopee': 'Shopee',
      'lazada': 'Lazada',
      'tiktok': 'TikTok',
      'sendo': 'Sendo',
      'multi-channel': 'Đa kênh',
    };
    return names[channel] || channel.charAt(0).toUpperCase() + channel.slice(1);
  };

  // Aggregate by channel
  const channelMap = new Map<string, ChannelData>();
  
  let totalSpend = 0;
  let totalRevenue = 0;

  campaigns.forEach(c => {
    totalSpend += c.spend;
    totalRevenue += c.revenue;
  });

  campaigns.forEach(campaign => {
    const normalizedChannel = normalizeChannel(campaign.channel);
    const existing = channelMap.get(normalizedChannel);
    if (existing) {
      existing.campaigns += 1;
      existing.activeCampaigns += campaign.status === 'active' ? 1 : 0;
      existing.spend += campaign.spend;
      existing.revenue += campaign.revenue;
      existing.orders += campaign.orders;
      existing.clicks += campaign.clicks;
      existing.impressions += campaign.impressions;
    } else {
      channelMap.set(normalizedChannel, {
        channel: normalizedChannel,
        campaigns: 1,
        activeCampaigns: campaign.status === 'active' ? 1 : 0,
        spend: campaign.spend,
        revenue: campaign.revenue,
        orders: campaign.orders,
        clicks: campaign.clicks,
        impressions: campaign.impressions,
        roas: 0,
        cpa: 0,
        ctr: 0,
        cvr: 0,
        spendShare: 0,
        revenueShare: 0,
      });
    }
  });

  // Calculate derived metrics
  const channelData = Array.from(channelMap.values()).map(ch => ({
    ...ch,
    roas: ch.spend > 0 ? ch.revenue / ch.spend : 0,
    cpa: ch.orders > 0 ? ch.spend / ch.orders : 0,
    ctr: ch.impressions > 0 ? (ch.clicks / ch.impressions) * 100 : 0,
    cvr: ch.clicks > 0 ? (ch.orders / ch.clicks) * 100 : 0,
    spendShare: totalSpend > 0 ? (ch.spend / totalSpend) * 100 : 0,
    revenueShare: totalRevenue > 0 ? (ch.revenue / totalRevenue) * 100 : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const getROASStatus = (roas: number) => {
    if (roas >= 3) return { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Tốt' };
    if (roas >= 2) return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Trung bình' };
    if (roas >= 1) return { color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Thấp' };
    return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Lỗ' };
  };

  const getChannelIcon = (channel: string) => {
    const lower = channel.toLowerCase();
    if (lower.includes('shopee')) return '🛒';
    if (lower.includes('lazada')) return '🔶';
    if (lower.includes('tiktok')) return '🎵';
    if (lower.includes('meta') || lower.includes('facebook')) return '📘';
    if (lower.includes('google')) return '🔍';
    if (lower.includes('sendo')) return '🔴';
    if (lower.includes('multi') || lower === 'all') return '🌐';
    return '📊';
  };

  if (channelData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chưa có dữ liệu kênh marketing
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Chi tiết theo Kênh
          <Badge variant="secondary" className="ml-2">{channelData.length} kênh</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {channelData.map((channel) => {
          const roasStatus = getROASStatus(channel.roas);
          const isEfficient = channel.revenueShare > channel.spendShare;

          return (
            <div 
              key={channel.channel}
              className="p-4 rounded-lg border bg-card hover:bg-accent/30 transition-all"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getChannelIcon(channel.channel)}</span>
                  <div>
                    <h4 className="font-semibold">{getChannelDisplayName(channel.channel)}</h4>
                    <p className="text-xs text-muted-foreground">
                      {channel.activeCampaigns}/{channel.campaigns} campaigns đang chạy
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", roasStatus.bg, roasStatus.color)}>
                    ROAS {channel.roas.toFixed(2)}x
                  </Badge>
                  {isEfficient ? (
                    <Badge className="bg-green-500/10 text-green-500 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Hiệu quả
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500/10 text-orange-500 text-xs">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Cần tối ưu
                    </Badge>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Chi tiêu
                  </div>
                  <div className="font-bold">{formatCurrency(channel.spend)}đ</div>
                  <div className="text-xs text-muted-foreground">
                    {channel.spendShare.toFixed(1)}% tổng
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    Doanh thu
                  </div>
                  <div className="font-bold text-green-500">{formatCurrency(channel.revenue)}đ</div>
                  <div className="text-xs text-muted-foreground">
                    {channel.revenueShare.toFixed(1)}% tổng
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MousePointerClick className="h-3 w-3" />
                    CPA
                  </div>
                  <div className="font-bold">{formatCurrency(channel.cpa)}đ</div>
                  <div className="text-xs text-muted-foreground">
                    {channel.orders.toLocaleString()} đơn
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    CTR / CVR
                  </div>
                  <div className="font-bold">{channel.ctr.toFixed(2)}% / {channel.cvr.toFixed(2)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(channel.clicks)} clicks
                  </div>
                </div>
              </div>

              {/* Spend vs Revenue Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Hiệu suất chi tiêu</span>
                  <span className={cn(
                    "font-medium",
                    isEfficient ? "text-green-500" : "text-orange-500"
                  )}>
                    {isEfficient ? '+' : ''}{(channel.revenueShare - channel.spendShare).toFixed(1)}% so với tỷ trọng
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-red-500/50 rounded-l-full"
                    style={{ width: `${Math.min(channel.spendShare, 100)}%` }}
                  />
                  <div 
                    className="absolute left-0 top-0 h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min(channel.revenueShare, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" /> Spend share
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" /> Revenue share
                  </span>
                </div>
              </div>

              {/* Action */}
              {onViewChannelDetails && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3 text-xs"
                  onClick={() => onViewChannelDetails(channel.channel)}
                >
                  Xem chi tiết kênh
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
