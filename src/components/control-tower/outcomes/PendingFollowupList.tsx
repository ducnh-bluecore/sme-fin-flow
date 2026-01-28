import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { PendingFollowup } from '@/hooks/control-tower';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PendingFollowupListProps {
  data: PendingFollowup[];
  isLoading?: boolean;
  onMeasure?: (followup: PendingFollowup) => void;
}

const formatCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

export function PendingFollowupList({ data, isLoading, onMeasure }: PendingFollowupListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Follow-up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Follow-up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Không có decisions cần theo dõi
          </p>
        </CardContent>
      </Card>
    );
  }

  const overdueCount = data.filter(d => d.urgency_status === 'overdue').length;

  return (
    <Card className={cn(overdueCount > 0 && 'border-amber-500/50')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Follow-up
          </CardTitle>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {overdueCount} overdue
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((followup) => (
            <div
              key={followup.id}
              className={cn(
                'flex items-center justify-between gap-4 p-3 rounded-lg border',
                followup.urgency_status === 'overdue' && 'border-destructive/50 bg-destructive/5',
                followup.urgency_status === 'due_soon' && 'border-amber-500/50 bg-amber-500/5'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {followup.decision_type}
                  </Badge>
                  <Badge
                    variant={
                      followup.urgency_status === 'overdue'
                        ? 'destructive'
                        : followup.urgency_status === 'due_soon'
                          ? 'default'
                          : 'outline'
                    }
                    className={cn(
                      'text-xs',
                      followup.urgency_status === 'due_soon' && 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                    )}
                  >
                    {followup.urgency_status === 'overdue' && 'Quá hạn'}
                    {followup.urgency_status === 'due_soon' && `Còn ${followup.days_until_due} ngày`}
                    {followup.urgency_status === 'upcoming' && `Còn ${followup.days_until_due} ngày`}
                  </Badge>
                </div>
                <p className="font-medium truncate">{followup.decision_title}</p>
                <p className="text-xs text-muted-foreground">
                  {followup.predicted_impact_amount && `Predicted: ${formatCurrency(followup.predicted_impact_amount)}`}
                  {' • '}
                  Due: {format(new Date(followup.followup_due_date), 'dd/MM/yyyy', { locale: vi })}
                </p>
              </div>

              <Button
                size="sm"
                variant={followup.urgency_status === 'overdue' ? 'destructive' : 'outline'}
                onClick={() => onMeasure?.(followup)}
                className="shrink-0"
              >
                Đo lường
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
