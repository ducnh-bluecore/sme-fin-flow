import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Target, 
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { ProfitAttribution, CMOModeSummary } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';
import { MetricExplainer } from '@/components/mdp/MDPMetricExplainer';

interface ProfitAttributionPanelProps {
  profitData: ProfitAttribution[];
  summary: CMOModeSummary;
}

type SortField = 'contribution_margin' | 'contribution_margin_percent' | 'profit_roas' | 'ad_spend';

export function ProfitAttributionPanel({ profitData, summary }: ProfitAttributionPanelProps) {
  const [sortField, setSortField] = useState<SortField>('contribution_margin');
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const sortedData = useMemo(() => {
    return [...profitData].sort((a, b) => {
      const multiplier = sortAsc ? 1 : -1;
      return (a[sortField] - b[sortField]) * multiplier;
    });
  }, [profitData, sortField, sortAsc]);

  const displayedData = showAll ? sortedData : sortedData.slice(0, 8);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const getStatusBadge = (status: ProfitAttribution['status']) => {
    const config = {
      profitable: { label: 'Lãi', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      marginal: { label: 'Biên thấp', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      loss: { label: 'Lỗ', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      critical: { label: 'Nguy hiểm', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };
    return config[status];
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-lg">Profit Attribution</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">Contribution Margin (CMO)</p>
                <p className="text-xs text-muted-foreground">
                  CM = Net Revenue - COGS - Platform Fees - Logistics - Payment Fees - Return Cost - Ad Spend
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
              {summary.profitable_campaigns} lãi
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
              {summary.loss_campaigns} lỗ
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Tổng Spend</p>
            <p className="text-lg font-bold">{formatCurrency(summary.total_marketing_spend)}đ</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">Net Revenue</p>
            <p className="text-lg font-bold">{formatCurrency(summary.total_net_revenue)}đ</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              CM %
              <Tooltip>
                <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                <TooltipContent>Contribution Margin / Net Revenue</TooltipContent>
              </Tooltip>
            </p>
            <p className={cn(
              "text-lg font-bold",
              summary.contribution_margin_percent >= 10 ? "text-green-400" : 
              summary.contribution_margin_percent >= 0 ? "text-yellow-400" : "text-red-400"
            )}>
              {summary.contribution_margin_percent.toFixed(1)}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Profit ROAS
              <Tooltip>
                <TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger>
                <TooltipContent>CM / Ad Spend</TooltipContent>
              </Tooltip>
            </p>
            <p className={cn(
              "text-lg font-bold",
              summary.overall_profit_roas >= 0.3 ? "text-green-400" : 
              summary.overall_profit_roas >= 0 ? "text-yellow-400" : "text-red-400"
            )}>
              {summary.overall_profit_roas.toFixed(2)}x
            </p>
          </div>
        </div>

        {/* Total CM */}
        <div className={cn(
          "p-4 rounded-lg border",
          summary.total_contribution_margin >= 0 
            ? "bg-green-500/10 border-green-500/30" 
            : "bg-red-500/10 border-red-500/30"
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tổng Contribution Margin (sau toàn bộ chi phí)</p>
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
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('ad_spend')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Ad Spend <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-xs text-right">Net Rev</TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('contribution_margin')}
                >
                  <div className="flex items-center justify-end gap-1">
                    CM <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('contribution_margin_percent')}
                >
                  <div className="flex items-center justify-end gap-1">
                    CM% <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-xs text-right cursor-pointer hover:text-foreground" 
                  onClick={() => handleSort('profit_roas')}
                >
                  <div className="flex items-center justify-end gap-1">
                    P-ROAS <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Chưa có dữ liệu campaign
                  </TableCell>
                </TableRow>
              ) : (
                displayedData.map((item) => {
                  const statusConfig = getStatusBadge(item.status);
                  return (
                    <TableRow key={item.campaign_id} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-sm max-w-[160px] truncate">
                        {item.campaign_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.channel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(item.ad_spend)}đ
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(item.net_revenue)}đ
                      </TableCell>
                      <TableCell className={cn(
                        "text-right text-sm font-medium",
                        item.contribution_margin >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {item.contribution_margin >= 0 ? '+' : ''}{formatCurrency(item.contribution_margin)}đ
                      </TableCell>
                      <TableCell className={cn(
                        "text-right text-sm font-medium",
                        item.contribution_margin_percent >= 10 ? "text-green-400" : 
                        item.contribution_margin_percent >= 0 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {item.contribution_margin_percent.toFixed(1)}%
                      </TableCell>
                      <TableCell className={cn(
                        "text-right text-sm font-medium",
                        item.profit_roas >= 0.3 ? "text-green-400" : 
                        item.profit_roas >= 0 ? "text-yellow-400" : "text-red-400"
                      )}>
                        {item.profit_roas.toFixed(2)}x
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

        {sortedData.length > 8 && (
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>Thu gọn <ChevronUp className="ml-1 h-4 w-4" /></>
            ) : (
              <>Xem tất cả {sortedData.length} campaigns <ChevronDown className="ml-1 h-4 w-4" /></>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
