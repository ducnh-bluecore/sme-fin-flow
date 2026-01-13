import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  AlertTriangle,
  Info,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CampaignProfit, MDPSummary } from '@/hooks/useMarketingProfitability';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MarketingProfitPanelProps {
  campaigns: CampaignProfit[];
  summary: MDPSummary;
}

type SortField = 'contribution_margin' | 'roas' | 'profit_roas' | 'actual_cost';

export function MarketingProfitPanel({ campaigns, summary }: MarketingProfitPanelProps) {
  const [sortField, setSortField] = useState<SortField>('contribution_margin');
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      const multiplier = sortAsc ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    });
  }, [campaigns, sortField, sortAsc]);

  const displayedCampaigns = showAll ? sortedCampaigns : sortedCampaigns.slice(0, 5);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getStatusBadge = (status: CampaignProfit['status']) => {
    const config = {
      profitable: { label: 'Lãi', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      marginal: { label: 'Biên thấp', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      loss: { label: 'Lỗ', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      critical: { label: 'Nguy hiểm', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };
    return config[status];
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Marketing Profit Attribution</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Profit Attribution (MDP)</p>
                <p className="text-xs text-muted-foreground">
                  Đo lường GIÁ TRỊ TÀI CHÍNH thật của marketing, không phải clicks.
                  CM = Revenue - COGS - Fees - Ad Spend
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2 text-sm">
            <Badge variant="outline" className="bg-green-500/10 text-green-400">
              {summary.profitable_campaigns} lãi
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-400">
              {summary.loss_campaigns} lỗ
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Tổng chi Marketing</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(summary.total_marketing_spend)}đ
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Revenue từ Marketing</p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(summary.total_revenue_from_marketing)}đ
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Overall ROAS
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>Revenue / Ad Spend</TooltipContent>
              </Tooltip>
            </p>
            <p className={cn(
              "text-lg font-bold",
              summary.overall_roas >= 2 ? "text-green-400" : summary.overall_roas >= 1 ? "text-yellow-400" : "text-red-400"
            )}>
              {summary.overall_roas.toFixed(2)}x
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Profit ROAS
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>Contribution Margin / Ad Spend</TooltipContent>
              </Tooltip>
            </p>
            <p className={cn(
              "text-lg font-bold",
              summary.overall_profit_roas >= 0.5 ? "text-green-400" : summary.overall_profit_roas >= 0 ? "text-yellow-400" : "text-red-400"
            )}>
              {summary.overall_profit_roas.toFixed(2)}x
            </p>
          </div>
        </div>

        {/* Total Contribution Margin */}
        <div className={cn(
          "p-4 rounded-lg border",
          summary.total_contribution_margin >= 0 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-red-500/10 border-red-500/30"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tổng Contribution Margin từ Marketing</p>
              <p className={cn(
                "text-2xl font-bold",
                summary.total_contribution_margin >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {summary.total_contribution_margin >= 0 ? '+' : ''}{formatCurrency(summary.total_contribution_margin)}đ
              </p>
            </div>
            {summary.total_contribution_margin >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-400" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-400" />
            )}
          </div>
        </div>

        {/* Campaign Table */}
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Channel</TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => handleSort('actual_cost')}>
                  <div className="flex items-center justify-end gap-1">
                    Chi phí
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-xs text-right">Revenue</TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => handleSort('contribution_margin')}>
                  <div className="flex items-center justify-end gap-1">
                    CM
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-xs text-right cursor-pointer" onClick={() => handleSort('roas')}>
                  <div className="flex items-center justify-end gap-1">
                    ROAS
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chưa có dữ liệu campaign trong khoảng thời gian này
                  </TableCell>
                </TableRow>
              ) : (
                displayedCampaigns.map((campaign) => {
                  const statusConfig = getStatusBadge(campaign.status);
                  return (
                    <TableRow key={campaign.campaign_id} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">
                        {campaign.campaign_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {campaign.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(campaign.actual_cost)}đ
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(campaign.total_revenue)}đ
                      </TableCell>
                      <TableCell className={cn(
                        "text-right text-sm font-medium",
                        campaign.contribution_margin >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {campaign.contribution_margin >= 0 ? '+' : ''}{formatCurrency(campaign.contribution_margin)}đ
                        <span className="text-xs text-muted-foreground ml-1">
                          ({campaign.contribution_margin_percent.toFixed(1)}%)
                        </span>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right text-sm font-medium",
                        campaign.roas >= 2 ? "text-green-400" : campaign.roas >= 1 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {campaign.roas.toFixed(2)}x
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-xs", statusConfig.className)}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {campaigns.length > 5 && (
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>Thu gọn <ChevronUp className="ml-1 h-4 w-4" /></>
            ) : (
              <>Xem tất cả {campaigns.length} campaigns <ChevronDown className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
