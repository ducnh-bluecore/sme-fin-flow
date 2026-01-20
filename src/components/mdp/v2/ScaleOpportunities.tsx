import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
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
 * Shows campaigns safe to scale:
 * - CM% >= 15%
 * - Cash Conversion >= 70%
 * - Profit ROAS > 0.5
 */
export function ScaleOpportunities({ opportunities, onScale }: ScaleOpportunitiesProps) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Scale Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4">
            No campaigns currently meet scaling criteria
          </p>
          <p className="text-xs text-muted-foreground">
            Requirements: CM% ≥15%, Cash Conversion ≥70%, Profit ROAS ≥0.5
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Scale Opportunities</CardTitle>
          <span className="text-xs text-muted-foreground">
            {opportunities.length} eligible
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.map((opp) => (
          <div 
            key={opp.campaign_id}
            className="flex items-center justify-between gap-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-emerald-600 font-medium uppercase">Eligible</span>
              </div>
              
              <p className="font-medium truncate">{opp.campaign_name}</p>
              
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>CM: <span className="text-emerald-600 font-medium">{opp.contribution_margin_percent.toFixed(1)}%</span></span>
                <span>ROAS: <span className="text-emerald-600 font-medium">{opp.profit_roas.toFixed(2)}x</span></span>
                <span>Cash: <span className="text-emerald-600 font-medium">{(opp.cashConversion * 100).toFixed(0)}%</span></span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Current CM</p>
              <p className="text-lg font-medium text-emerald-600 tabular-nums">
                +{formatVND(opp.contribution_margin)}
              </p>
              <Button 
                size="sm"
                variant="outline"
                className="mt-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => onScale(opp)}
              >
                Scale +30%
              </Button>
            </div>
          </div>
        ))}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          All campaigns meet: CM% ≥15% + Cash Conversion ≥70% + Profit ROAS ≥0.5
        </p>
      </CardContent>
    </Card>
  );
}
