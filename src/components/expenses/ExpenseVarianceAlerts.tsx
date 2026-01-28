/**
 * ExpenseVarianceAlerts - Displays variance warnings between estimated and actual expenses
 */
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { useExpenseVarianceIssues } from '@/hooks/useExpenseVarianceAlerts';
import { cn } from '@/lib/utils';

const categoryLabels: Record<string, string> = {
  salary: 'Lương nhân viên',
  rent: 'Thuê mặt bằng',
  utilities: 'Điện nước',
  marketing: 'Marketing',
  logistics: 'Vận chuyển',
  depreciation: 'Khấu hao',
  insurance: 'Bảo hiểm',
  supplies: 'Vật tư',
  maintenance: 'Bảo trì',
  professional: 'Dịch vụ chuyên nghiệp',
  other: 'Chi phí khác',
};

interface ExpenseVarianceAlertsProps {
  showOnTrack?: boolean;
  maxItems?: number;
  compact?: boolean;
}

export function ExpenseVarianceAlerts({
  showOnTrack = false,
  maxItems = 5,
  compact = false,
}: ExpenseVarianceAlertsProps) {
  const { data: issues, hasIssues, underestimates, isLoading } = useExpenseVarianceIssues();

  if (isLoading) {
    return (
      <Card className={cn(compact && 'border-0 shadow-none')}>
        <CardHeader className={cn(compact && 'px-0 pb-2')}>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className={cn(compact && 'px-0')}>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasIssues && !showOnTrack) {
    return (
      <Card className={cn('border-success/30 bg-success/5', compact && 'border-0 shadow-none')}>
        <CardContent className={cn('pt-4', compact && 'px-0')}>
          <div className="flex items-center gap-3 text-success">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Chi phí đang đúng kế hoạch</p>
              <p className="text-sm text-muted-foreground">
                Tất cả các khoản chi nằm trong ngưỡng cho phép (±10%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alertsToShow = issues.slice(0, maxItems);
  const hasUnderestimates = underestimates.length > 0;

  return (
    <Card className={cn(
      hasUnderestimates && 'border-destructive/30 bg-destructive/5',
      compact && 'border-0 shadow-none'
    )}>
      <CardHeader className={cn(compact && 'px-0 pb-2')}>
        <CardTitle className="flex items-center gap-2 text-base">
          {hasUnderestimates ? (
            <>
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span>Cảnh báo chi phí vượt kế hoạch</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4 text-amber-500" />
              <span>Chi phí chưa sử dụng hết</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(compact && 'px-0')}>
        <div className="space-y-3">
          {alertsToShow.map((alert, index) => (
            <motion.div
              key={`${alert.category}-${alert.name}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                alert.alert_status === 'underestimate' 
                  ? 'bg-destructive/10' 
                  : 'bg-amber-500/10'
              )}
            >
              <div className="flex items-center gap-3">
                {alert.alert_status === 'underestimate' ? (
                  <TrendingUp className="w-4 h-4 text-destructive" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-amber-500" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {alert.name || categoryLabels[alert.category] || alert.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tạm tính: {formatCurrency(alert.estimated)} → Thực tế: {formatCurrency(alert.actual)}
                  </p>
                </div>
              </div>
              <Badge
                variant={alert.alert_status === 'underestimate' ? 'destructive' : 'outline'}
                className={cn(
                  'text-xs',
                  alert.alert_status === 'overestimate' && 'border-amber-500 text-amber-600'
                )}
              >
                {alert.variance >= 0 ? '+' : ''}{formatCurrency(alert.variance)}
                <span className="ml-1">({alert.variance_percent.toFixed(1)}%)</span>
              </Badge>
            </motion.div>
          ))}

          {issues.length > maxItems && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{issues.length - maxItems} cảnh báo khác
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
