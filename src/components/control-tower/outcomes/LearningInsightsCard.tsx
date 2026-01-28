import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { LearningInsight } from '@/hooks/control-tower';
import { cn } from '@/lib/utils';

interface LearningInsightsCardProps {
  insights: LearningInsight[];
  isLoading?: boolean;
}

export function LearningInsightsCard({ insights, isLoading }: LearningInsightsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Cần thêm dữ liệu để tạo insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Learning Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                'flex items-start gap-2 p-3 rounded-lg border',
                insight.type === 'positive' && 'border-emerald-500/30 bg-emerald-500/5',
                insight.type === 'warning' && 'border-amber-500/30 bg-amber-500/5',
                insight.type === 'info' && 'border-primary/30 bg-primary/5'
              )}
            >
              <span className="text-lg">{insight.icon}</span>
              <p className="text-sm">{insight.message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
