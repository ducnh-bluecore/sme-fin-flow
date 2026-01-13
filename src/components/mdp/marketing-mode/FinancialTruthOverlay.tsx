import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { CMOModeSummary, MarketingModeSummary } from '@/hooks/useMDPData';
import { cn } from '@/lib/utils';

interface FinancialTruthOverlayProps {
  cmoSummary: CMOModeSummary;
  marketingSummary: MarketingModeSummary;
}

export function FinancialTruthOverlay({ cmoSummary, marketingSummary }: FinancialTruthOverlayProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // Compare ROAS vs Profit ROAS
  const roasDifference = marketingSummary.overall_roas - cmoSummary.overall_profit_roas;
  const isROASMisleading = roasDifference > 0.5; // ROAS inflated by more than 0.5x

  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">💰 Financial Truth</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-1">MDP Manifesto</p>
                <p className="text-xs text-muted-foreground">
                  Profit before Performance. Cash before Clicks. 
                  Đây là số thật sau khi trừ toàn bộ chi phí - không phải ROAS truyền thống.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {isROASMisleading && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
              <AlertTriangle className="h-3 w-3" />
              ROAS đang misleading
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* ROAS vs Profit ROAS */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">ROAS thường</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Revenue / Ad Spend (chưa trừ chi phí)</TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xl font-bold text-blue-400">
              {marketingSummary.overall_roas.toFixed(2)}x
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Profit ROAS</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Contribution Margin / Ad Spend (sau chi phí)</TooltipContent>
              </Tooltip>
            </div>
            <p className={cn(
              "text-xl font-bold",
              cmoSummary.overall_profit_roas >= 0.3 ? "text-green-400" : 
              cmoSummary.overall_profit_roas >= 0 ? "text-yellow-400" : "text-red-400"
            )}>
              {cmoSummary.overall_profit_roas.toFixed(2)}x
            </p>
          </div>
          
          {/* Real Profit */}
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Lợi nhuận thật (CM)</span>
            <div className="flex items-center gap-2">
              <p className={cn(
                "text-xl font-bold",
                cmoSummary.total_contribution_margin >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {cmoSummary.total_contribution_margin >= 0 ? '+' : ''}{formatCurrency(cmoSummary.total_contribution_margin)}đ
              </p>
              {cmoSummary.total_contribution_margin >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
            </div>
          </div>
          
          {/* Campaign Status */}
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Campaign status</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {cmoSummary.profitable_campaigns} lãi
              </Badge>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                {cmoSummary.loss_campaigns} lỗ
              </Badge>
            </div>
          </div>
        </div>

        {/* Warning if ROAS is misleading */}
        {isROASMisleading && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
              <div className="text-xs">
                <span className="text-yellow-400 font-medium">Cảnh báo: </span>
                <span className="text-muted-foreground">
                  ROAS {marketingSummary.overall_roas.toFixed(2)}x nhưng Profit ROAS chỉ {cmoSummary.overall_profit_roas.toFixed(2)}x. 
                  Sau khi trừ COGS, phí platform, logistics, return... lợi nhuận thật thấp hơn nhiều.
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
