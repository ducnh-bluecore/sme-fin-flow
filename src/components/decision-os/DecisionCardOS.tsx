import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfidenceBadge, ConfidenceLevel } from './ConfidenceBadge';
import { cn } from '@/lib/utils';
import { ArrowRight, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DecisionCardAction {
  id: string;
  action_type: string;
  label: string;
  is_recommended: boolean;
}

interface DecisionCardOSProps {
  id: string;
  title: string;
  context?: string;
  impactAmount: number;
  impactCurrency?: string;
  impactWindowDays: number;
  riskDescription?: string;
  priority: 'P1' | 'P2' | 'P3';
  confidence: ConfidenceLevel;
  ownerRole: string;
  deadlineAt: string;
  actions?: DecisionCardAction[];
  sourceModules?: string[];
  onClick?: () => void;
}

// Format VND currency
function formatVND(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(1)}B VND`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(0)}M VND`;
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(0)}K VND`;
  return `${sign}${absValue.toFixed(0)} VND`;
}

const priorityConfig = {
  P1: { label: 'P1', className: 'bg-destructive text-destructive-foreground' },
  P2: { label: 'P2', className: 'bg-amber-500 text-white' },
  P3: { label: 'P3', className: 'bg-muted text-muted-foreground' },
};

export function DecisionCardOS({
  id,
  title,
  context,
  impactAmount,
  impactCurrency = 'VND',
  impactWindowDays,
  riskDescription,
  priority,
  confidence,
  ownerRole,
  deadlineAt,
  actions = [],
  sourceModules = [],
  onClick,
}: DecisionCardOSProps) {
  const navigate = useNavigate();
  const priorityCfg = priorityConfig[priority];
  
  const recommendedAction = actions.find(a => a.is_recommended);
  const alternativeAction = actions.find(a => !a.is_recommended);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/decision-os/review/${id}`);
    }
  };

  // Calculate time remaining
  const deadline = new Date(deadlineAt);
  const timeRemaining = formatDistanceToNow(deadline, { addSuffix: false, locale: vi });
  const isOverdue = deadline < new Date();

  // Build context string from source modules
  const contextString = context || (sourceModules.length > 0 
    ? `Detected across ${sourceModules.join(' × ')}`
    : 'Cross-module signal');

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 bg-card"
      style={{ 
        borderLeftColor: priority === 'P1' 
          ? 'hsl(var(--destructive))' 
          : priority === 'P2' 
            ? 'hsl(38, 92%, 50%)' 
            : 'hsl(var(--border))'
      }}
      onClick={handleClick}
    >
      <CardContent className="p-6">
        {/* Header: Priority + Confidence */}
        <div className="flex items-center justify-between mb-3">
          <Badge className={cn("text-xs font-semibold", priorityCfg.className)}>
            {priorityCfg.label}
          </Badge>
          <ConfidenceBadge level={confidence} />
        </div>

        {/* Decision Title */}
        <h3 className="text-lg font-semibold text-foreground mb-1 leading-tight">
          {title}
        </h3>

        {/* Context */}
        <p className="text-sm text-muted-foreground mb-4">
          {contextString}
        </p>

        {/* Separator */}
        <div className="border-t border-border my-4" />

        {/* IMPACT Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Impact
          </h4>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              Financial: <span className={impactAmount < 0 ? 'text-destructive' : 'text-emerald-600'}>
                {formatVND(impactAmount)}
              </span>
              <span className="text-muted-foreground font-normal"> over {impactWindowDays} days</span>
            </p>
            {riskDescription && (
              <p className="text-sm text-muted-foreground">
                Risk if delayed: <span className="font-medium text-foreground">{riskDescription}</span>
              </p>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border my-4" />

        {/* RECOMMENDED ACTION Section */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Recommended Action
          </h4>
          <div className="space-y-1">
            {recommendedAction ? (
              <p className="text-sm font-medium text-foreground">
                Primary: {recommendedAction.label}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No recommended action</p>
            )}
            {alternativeAction && (
              <p className="text-sm text-muted-foreground">
                Alternative: {alternativeAction.label}
              </p>
            )}
          </div>
        </div>

        {/* Footer: Owner & Resolution */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Owner: <span className="font-medium text-foreground">{ownerRole}</span>
            </span>
            <span className={cn(
              "flex items-center gap-1.5",
              isOverdue && "text-destructive"
            )}>
              <Clock className="h-3.5 w-3.5" />
              Resolution: <span className={cn("font-medium", isOverdue ? "text-destructive" : "text-foreground")}>
                {isOverdue ? 'Overdue' : timeRemaining}
              </span>
            </span>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            Review <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
