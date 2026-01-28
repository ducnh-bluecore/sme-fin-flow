import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EffectivenessByModule } from '@/hooks/control-tower';
import { cn } from '@/lib/utils';

interface ModuleEffectivenessTableProps {
  data: EffectivenessByModule[];
  isLoading?: boolean;
}

const formatCurrency = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000_000) return `₫${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `₫${(amount / 1_000_000).toFixed(0)}M`;
  return `₫${amount.toLocaleString('vi-VN')}`;
};

export function ModuleEffectivenessTable({ data, isLoading }: ModuleEffectivenessTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Effectiveness by Module</CardTitle>
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
          <CardTitle className="text-base">Effectiveness by Module</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Chưa có dữ liệu module
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Effectiveness by Module</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Header */}
        <div className="grid grid-cols-5 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
          <div>Module</div>
          <div className="text-center">Decisions</div>
          <div className="text-center">Success</div>
          <div className="text-center">Accuracy</div>
          <div className="text-right">Total Value</div>
        </div>

        {/* Rows */}
        <div className="space-y-1 mt-1">
          {data.map((module) => (
            <div
              key={module.decision_type}
              className={cn(
                'grid grid-cols-5 gap-4 px-3 py-3 rounded-lg transition-colors',
                module.success_rate >= 80 
                  ? 'bg-emerald-500/5' 
                  : module.success_rate >= 60 
                    ? 'bg-amber-500/5' 
                    : 'bg-destructive/5'
              )}
            >
              <div>
                <Badge variant="outline" className="font-semibold">
                  {module.decision_type}
                </Badge>
              </div>
              <div className="text-center font-medium">
                {module.total_decisions}
              </div>
              <div className="text-center">
                <span className={cn(
                  'font-semibold',
                  module.success_rate >= 80 
                    ? 'text-emerald-600' 
                    : module.success_rate >= 60 
                      ? 'text-amber-600' 
                      : 'text-destructive'
                )}>
                  {module.success_rate.toFixed(0)}%
                </span>
              </div>
              <div className="text-center">
                <span className={cn(
                  'font-semibold',
                  module.avg_accuracy >= 85 
                    ? 'text-emerald-600' 
                    : module.avg_accuracy >= 70 
                      ? 'text-amber-600' 
                      : 'text-foreground'
                )}>
                  {module.avg_accuracy.toFixed(0)}%
                </span>
              </div>
              <div className="text-right font-mono">
                <span className={cn(
                  module.total_actual_value > 0 ? 'text-emerald-600' : 'text-muted-foreground'
                )}>
                  {formatCurrency(module.total_actual_value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
