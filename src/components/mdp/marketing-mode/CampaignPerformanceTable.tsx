import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Megaphone, 
  ArrowUpDown,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  Play,
  Pause,
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
  Target,
  AlertTriangle,
  DollarSign,
  Eye,
} from 'lucide-react';
import { MarketingPerformance } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CampaignPerformanceTableProps {
  campaigns: MarketingPerformance[];
  onPauseCampaign?: (campaignId: string) => void;
  onResumeCampaign?: (campaignId: string) => void;
  onViewDetails?: (campaignId: string) => void;
}

type SortField = 'spend' | 'orders' | 'revenue' | 'cpa' | 'roas' | 'profit_roas' | 'contribution_margin';

// ⚠️ ESTIMATED contribution margin from campaign data
// Per MDP Manifesto: These values are estimates, not real cost data
const estimateContributionMargin = (campaign: MarketingPerformance) => {
  // CM = Revenue - COGS - Channel Fees - Ad Spend
  // ⚠️ ESTIMATED: COGS at 40% of revenue, channel fees at 15%
  // Real data would come from order_items.unit_cogs and channel_fees
  const estimatedCOGS = campaign.revenue * 0.40;
  const estimatedChannelFees = campaign.revenue * 0.15;
  const cm = campaign.revenue - estimatedCOGS - estimatedChannelFees - campaign.spend;
  return cm;
};

// Profit ROAS = CM / Ad Spend
const calculateProfitROAS = (campaign: MarketingPerformance) => {
  const cm = estimateContributionMargin(campaign);
  return campaign.spend > 0 ? cm / campaign.spend : 0;
};

// Campaign health score for prioritization
const getCampaignHealth = (campaign: MarketingPerformance) => {
  const profitROAS = calculateProfitROAS(campaign);
  const cm = estimateContributionMargin(campaign);
  
  if (cm < 0 && campaign.spend > 5000000) return 'critical'; // Losing money, high spend
  if (profitROAS < 0) return 'danger';
  if (profitROAS < 0.5) return 'warning';
  if (profitROAS >= 1) return 'healthy';
  return 'neutral';
};

export function CampaignPerformanceTable({ 
  campaigns, 
  onPauseCampaign,
  onResumeCampaign,
  onViewDetails 
}: CampaignPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('contribution_margin');
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');

  const channels = useMemo(() => {
    const unique = [...new Set(campaigns.map(c => c.channel))];
    return unique.sort();
  }, [campaigns]);

  // Enhanced campaigns with calculated metrics
  const enhancedCampaigns = useMemo(() => {
    return campaigns.map(c => ({
      ...c,
      contribution_margin: estimateContributionMargin(c),
      profit_roas: calculateProfitROAS(c),
      health: getCampaignHealth(c),
    }));
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    return enhancedCampaigns.filter(c => {
      const matchesSearch = c.campaign_name.toLowerCase().includes(search.toLowerCase());
      const matchesChannel = channelFilter === 'all' || c.channel === channelFilter;
      const matchesHealth = healthFilter === 'all' || c.health === healthFilter;
      return matchesSearch && matchesChannel && matchesHealth;
    });
  }, [enhancedCampaigns, search, channelFilter, healthFilter]);

  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      const multiplier = sortAsc ? 1 : -1;
      const aVal = a[sortField as keyof typeof a] as number;
      const bVal = b[sortField as keyof typeof b] as number;
      return (aVal - bVal) * multiplier;
    });
  }, [filteredCampaigns, sortField, sortAsc]);

  const displayedCampaigns = showAll ? sortedCampaigns : sortedCampaigns.slice(0, 10);

  // Summary stats
  const stats = useMemo(() => {
    let critical = 0, danger = 0, totalCM = 0;
    for (const c of enhancedCampaigns) {
      if (c.health === 'critical') critical++;
      if (c.health === 'danger') danger++;
      totalCM += c.contribution_margin;
    }
    return { critical, danger, totalCM };
  }, [enhancedCampaigns]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absValue >= 1000000) return `${sign}${(absValue / 1000000).toFixed(1)}M`;
    if (absValue >= 1000) return `${sign}${(absValue / 1000).toFixed(0)}K`;
    return `${sign}${absValue.toLocaleString()}`;
  };

  const getStatusBadge = (status: MarketingPerformance['status']) => {
    const config = {
      active: { label: 'Active', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      paused: { label: 'Paused', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      ended: { label: 'Ended', className: 'bg-muted text-muted-foreground border-border' },
    };
    return config[status];
  };

  const getHealthIndicator = (health: string) => {
    const config: Record<string, { icon: typeof AlertTriangle; color: string; label: string }> = {
      critical: { icon: AlertTriangle, color: 'text-red-500', label: 'Cần dừng ngay' },
      danger: { icon: TrendingDown, color: 'text-red-400', label: 'Đang lỗ' },
      warning: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Cần review' },
      healthy: { icon: TrendingUp, color: 'text-green-400', label: 'Healthy' },
      neutral: { icon: Target, color: 'text-muted-foreground', label: 'Neutral' },
    };
    return config[health] || config.neutral;
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-lg">Campaign Performance</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filteredCampaigns.length} campaigns
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm campaign..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-40"
                />
              </div>
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="h-9 w-28">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {channels.map(channel => (
                    <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="h-9 w-28">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Health" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="danger">🟠 Danger</SelectItem>
                  <SelectItem value="warning">🟡 Warning</SelectItem>
                  <SelectItem value="healthy">🟢 Healthy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex items-center gap-4 text-sm">
            {stats.critical > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{stats.critical} critical</span>
              </div>
            )}
            {stats.danger > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-500/10 text-orange-400">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>{stats.danger} đang lỗ</span>
              </div>
            )}
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded",
              stats.totalCM >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            )}>
              <DollarSign className="h-3.5 w-3.5" />
              <span>Tổng CM: {formatCurrency(stats.totalCM)}đ</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs w-8"></TableHead>
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Channel</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Spend <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Revenue <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('contribution_margin')}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-semibold text-primary">CM</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Contribution Margin = Revenue - COGS - Fees - Ad Spend</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('profit_roas')}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-semibold text-primary">Profit ROAS</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Profit ROAS = CM / Ad Spend (thay vì Vanity ROAS)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground opacity-60" 
                  onClick={() => handleSort('roas')}
                >
                  <div className="flex items-center justify-end gap-1">
                    ROAS <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-xs text-center w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy campaign nào
                  </TableCell>
                </TableRow>
              ) : (
                displayedCampaigns.map((campaign) => {
                  const statusConfig = getStatusBadge(campaign.status);
                  const healthConfig = getHealthIndicator(campaign.health);
                  const HealthIcon = healthConfig.icon;
                  
                  return (
                    <TableRow 
                      key={campaign.campaign_id} 
                      className={cn(
                        "hover:bg-muted/20",
                        campaign.health === 'critical' && "bg-red-500/5",
                        campaign.health === 'danger' && "bg-orange-500/5"
                      )}
                    >
                      <TableCell className="w-8">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HealthIcon className={cn("h-4 w-4", healthConfig.color)} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{healthConfig.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[160px] truncate">
                        {campaign.campaign_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {campaign.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-xs", statusConfig.className)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(campaign.spend)}đ
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(campaign.revenue)}đ
                      </TableCell>
                      <TableCell className={cn(
                        "text-right text-sm font-semibold",
                        campaign.contribution_margin >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {formatCurrency(campaign.contribution_margin)}đ
                      </TableCell>
                      <TableCell className={cn(
                        "text-right text-sm font-semibold",
                        campaign.profit_roas >= 1 ? "text-green-400" : 
                        campaign.profit_roas >= 0 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {campaign.profit_roas.toFixed(2)}x
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {campaign.roas.toFixed(2)}x
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onViewDetails?.(campaign.campaign_id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Xem chi tiết P&L
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {campaign.status === 'active' ? (
                                <DropdownMenuItem 
                                  onClick={() => onPauseCampaign?.(campaign.campaign_id)}
                                  className={campaign.health === 'critical' ? "text-red-400" : "text-yellow-400"}
                                >
                                  <Pause className="h-4 w-4 mr-2" />
                                  {campaign.health === 'critical' ? 'DỪNG NGAY' : 'Tạm dừng'}
                                </DropdownMenuItem>
                              ) : campaign.status === 'paused' ? (
                                <DropdownMenuItem 
                                  onClick={() => onResumeCampaign?.(campaign.campaign_id)}
                                  className="text-green-400"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Tiếp tục
                                </DropdownMenuItem>
                              ) : null}
                              {campaign.contribution_margin < 0 && (
                                <DropdownMenuItem className="text-red-400 font-medium">
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Đang lỗ {formatCurrency(Math.abs(campaign.contribution_margin))}đ
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {sortedCampaigns.length > 10 && (
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>Thu gọn <ChevronUp className="ml-1 h-4 w-4" /></>
            ) : (
              <>Xem tất cả {sortedCampaigns.length} campaigns <ChevronDown className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <span className="font-medium">Chú thích:</span>
          <span><span className="text-primary font-medium">CM</span> = Contribution Margin (lãi gộp sau chi phí)</span>
          <span><span className="text-primary font-medium">Profit ROAS</span> = CM / Ad Spend</span>
          <span className="text-muted-foreground/60">ROAS = Revenue / Ad Spend (vanity)</span>
        </div>
      </CardContent>
    </Card>
  );
}
