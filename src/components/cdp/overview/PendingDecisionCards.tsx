import React, { forwardRef } from 'react';
import { Clock, User, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DecisionCard {
  id: string;
  title: string;
  insightSource: string;
  severity: 'critical' | 'high' | 'medium';
  status: 'new' | 'reviewing' | 'decided' | 'archived';
  assignedTo: string;
  daysOpen: number;
  riskIfIgnored: number;
}

interface PendingDecisionCardsProps {
  decisions: DecisionCard[];
}

const DecisionCardItem = forwardRef<HTMLDivElement, { decision: DecisionCard }>(
  ({ decision }, ref) => {
    const navigate = useNavigate();

    const severityStyles = {
      critical: 'bg-destructive/10 text-destructive border-destructive/20',
      high: 'bg-warning/10 text-warning-foreground border-warning/20',
      medium: 'bg-muted text-muted-foreground border-border'
    };

    const formatCurrency = (value: number) => {
      if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(1)}B`;
      }
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(0)}M`;
      }
      return `${(value / 1_000).toFixed(0)}K`;
    };

    return (
      <div 
        ref={ref}
        className="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => navigate('/cdp/decisions')}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm line-clamp-1">{decision.title}</h4>
          <Badge variant="outline" className={`text-xs shrink-0 ${severityStyles[decision.severity]}`}>
            {decision.severity === 'critical' ? 'Nghiêm trọng' : decision.severity === 'high' ? 'Cao' : 'TB'}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {decision.daysOpen} ngày
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {decision.assignedTo}
          </span>
          <span className="text-destructive font-medium">
            Rủi ro tiềm ẩn: ₫{formatCurrency(decision.riskIfIgnored)}
          </span>
        </div>
      </div>
    );
  }
);

DecisionCardItem.displayName = 'DecisionCardItem';

export const PendingDecisionCards = forwardRef<HTMLDivElement, PendingDecisionCardsProps>(
  ({ decisions }, ref) => {
    const navigate = useNavigate();
    const pendingDecisions = decisions.filter(d => d.status === 'new' || d.status === 'reviewing');

    return (
      <Card ref={ref}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              Thẻ Quyết định
              {pendingDecisions.length > 0 && (
                <Badge className="bg-warning text-warning-foreground">
                  {pendingDecisions.length} cần xem xét
                </Badge>
              )}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground"
              onClick={() => navigate('/cdp/decisions')}
            >
              Xem tất cả <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingDecisions.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Hiện không có vấn đề nào cần xem xét ở cấp điều hành
            </div>
          ) : (
            <div className="space-y-2">
              {pendingDecisions.slice(0, 3).map((decision) => (
                <DecisionCardItem key={decision.id} decision={decision} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

PendingDecisionCards.displayName = 'PendingDecisionCards';

export default PendingDecisionCards;
