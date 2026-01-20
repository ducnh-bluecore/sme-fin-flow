import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Scale, 
  AlertTriangle, 
  TrendingDown,
  Wallet,
  Target,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MDP_V2_THRESHOLDS, formatVND } from '@/types/mdp-v2';

interface DecisionContextRailProps {
  totalCashAtRisk: number;
  totalLockedCash: number;
  worstCaseLoss: number;
  activeRulesCount: number;
  pendingDecisionsCount: number;
}

/**
 * DECISION CONTEXT RAIL
 * 
 * Right-side contextual panel for CEO view.
 * Contains:
 * - Decision rules currently applied
 * - Risk appetite thresholds
 * - Today's total exposure
 * 
 * Design: Quiet, static, low-interaction
 */
export function DecisionContextRail({
  totalCashAtRisk,
  totalLockedCash,
  worstCaseLoss,
  activeRulesCount,
  pendingDecisionsCount,
}: DecisionContextRailProps) {
  return (
    <div className="space-y-4">
      {/* Today's Exposure Summary */}
      <Card className="bg-muted/30 border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Today's Exposure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ExposureItem 
            label="Cash at Risk" 
            value={formatVND(totalCashAtRisk)}
            severity={totalCashAtRisk > 100000000 ? 'warning' : 'neutral'}
          />
          <ExposureItem 
            label="Locked Cash" 
            value={formatVND(totalLockedCash)}
            severity={totalLockedCash > 200000000 ? 'warning' : 'neutral'}
          />
          <Separator className="my-2" />
          <ExposureItem 
            label="Worst-case Loss" 
            value={formatVND(worstCaseLoss)}
            severity={worstCaseLoss > 50000000 ? 'critical' : 'warning'}
            isBold
          />
        </CardContent>
      </Card>

      {/* Active Decision Rules */}
      <Card className="bg-muted/30 border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Scale className="h-4 w-4" />
            Decision Rules Active
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <RuleItem 
            label="KILL if Profit ROAS" 
            condition={`< ${MDP_V2_THRESHOLDS.KILL_PROFIT_ROAS}`}
            description="3+ days"
          />
          <RuleItem 
            label="KILL if CM%" 
            condition={`< ${(MDP_V2_THRESHOLDS.KILL_WORST_CASE_CM * 100).toFixed(0)}%`}
            description="Worst case"
          />
          <RuleItem 
            label="PAUSE if Cash Conv." 
            condition={`< ${(MDP_V2_THRESHOLDS.PAUSE_CASH_CONVERSION_D14 * 100).toFixed(0)}%`}
            description="at D+14"
          />
          <RuleItem 
            label="SCALE if CM%" 
            condition={`≥ ${(MDP_V2_THRESHOLDS.SCALE_MIN_CM_PERCENT * 100).toFixed(0)}%`}
            description="+ 70% cash conv."
            isPositive
          />
        </CardContent>
      </Card>

      {/* Decision Queue Status */}
      <Card className="bg-muted/30 border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            Queue Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Pending Decisions</span>
            <Badge variant={pendingDecisionsCount > 0 ? "secondary" : "outline"} className="font-mono">
              {pendingDecisionsCount}
            </Badge>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Active Rules</span>
            <Badge variant="outline" className="font-mono">
              {activeRulesCount}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Info Footer */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <p>
          Thresholds are system-defined. Changes require CFO approval.
        </p>
      </div>
    </div>
  );
}

// === Sub-components ===

function ExposureItem({ 
  label, 
  value, 
  severity = 'neutral',
  isBold = false,
}: { 
  label: string; 
  value: string; 
  severity?: 'neutral' | 'warning' | 'critical';
  isBold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn(
        "text-sm",
        isBold ? "font-medium text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
      <span className={cn(
        "text-sm font-mono tabular-nums",
        severity === 'critical' && "text-destructive",
        severity === 'warning' && "text-amber-600 dark:text-amber-500",
        severity === 'neutral' && "text-foreground",
        isBold && "font-medium"
      )}>
        {value}
      </span>
    </div>
  );
}

function RuleItem({ 
  label, 
  condition, 
  description,
  isPositive = false,
}: { 
  label: string; 
  condition: string; 
  description: string;
  isPositive?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn(
          "text-sm font-mono",
          isPositive ? "text-emerald-600 dark:text-emerald-500" : "text-foreground"
        )}>
          {condition}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
        {description}
      </span>
    </div>
  );
}
