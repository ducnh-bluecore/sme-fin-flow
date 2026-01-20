import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Rocket, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfitAttribution } from '@/hooks/useMDPData';
import { formatVND } from '@/types/mdp-v2';

interface ScaleOpportunityItem extends ProfitAttribution {
  cashPositive: boolean;
  cashConversion: number;
}

interface ScaleOpportunitiesProps {
  opportunities: ScaleOpportunityItem[];
  onScale: (campaign: ScaleOpportunityItem) => void;
}

/**
 * SCALE OPPORTUNITIES
 * 
 * Shows campaigns that are:
 * - CM% >= 15%
 * - Cash Conversion >= 70%
 * - Profit ROAS > 0.5
 * 
 * These are SAFE to scale
 */
export function ScaleOpportunities({ opportunities, onScale }: ScaleOpportunitiesProps) {
  if (opportunities.length === 0) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-5 w-5 text-muted-foreground" />
            Scale Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Chưa có campaign đủ điều kiện scale</p>
            <p className="text-xs mt-1">Cần: CM% ≥15%, Cash Convert ≥70%, Profit ROAS ≥0.5</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-emerald-400" />
          Scale Opportunities
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">
            {opportunities.length} campaigns
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.map((opp) => (
          <div 
            key={opp.campaign_id}
            className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    SCALE SAFE
                  </Badge>
                  <Badge variant="outline" className="text-xs">{opp.channel}</Badge>
                </div>
                
                <p className="font-bold">{opp.campaign_name}</p>
                
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">CM%</p>
                    <p className="font-bold text-emerald-400">{opp.contribution_margin_percent.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profit ROAS</p>
                    <p className="font-bold text-emerald-400">{opp.profit_roas.toFixed(2)}x</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cash Convert</p>
                    <p className="font-bold text-emerald-400">{(opp.cashConversion * 100).toFixed(0)}%</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wallet className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Cash+:</span>
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Current CM</p>
                <p className="text-xl font-bold text-emerald-400">
                  +{formatVND(opp.contribution_margin)}
                </p>
                <Button 
                  size="sm"
                  className="mt-2 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => onScale(opp)}
                >
                  SCALE 30%
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
          ✓ Tất cả campaigns trên đều đáp ứng: CM% ≥15% + Cash Convert ≥70% + Profit ROAS ≥0.5
        </div>
      </CardContent>
    </Card>
  );
}
