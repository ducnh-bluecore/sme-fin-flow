/**
 * UpcomingPaymentAlerts - Displays upcoming payment deadlines
 * 
 * Shows fixed costs with payment due dates in the next 7 days
 * with color-coded alert levels based on urgency
 */

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertCircle, Calendar, Clock, AlertTriangle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useUpcomingPaymentAlerts, AlertLevel } from '@/hooks/useUpcomingPaymentAlerts';
import { baselineCategoryLabels } from '@/hooks/useExpenseBaselines';

// =============================================================
// ALERT LEVEL CONFIG
// =============================================================

const alertLevelConfig: Record<AlertLevel, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  critical: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    label: 'Khẩn cấp',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    borderColor: 'border-orange-300 dark:border-orange-700',
    label: 'Cảnh báo',
  },
  info: {
    icon: <Bell className="h-4 w-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
    label: 'Thông tin',
  },
};

// =============================================================
// MAIN COMPONENT
// =============================================================

export function UpcomingPaymentAlerts() {
  const { data: alerts, isLoading, error } = useUpcomingPaymentAlerts();

  // Don't render if no alerts
  if (!isLoading && (!alerts || alerts.length === 0)) {
    return null;
  }

  // Calculate total
  const totalAmount = alerts?.reduce((sum, a) => sum + a.monthlyAmount, 0) || 0;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Chi phí sắp đến hạn thanh toán
          {alerts && alerts.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {alerts.length} khoản
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">
            Không thể tải thông tin thanh toán
          </div>
        ) : (
          <>
            {alerts?.map((alert) => {
              const config = alertLevelConfig[alert.alertLevel];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-0.5', config.color)}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="font-medium">{alert.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Hạn: {format(new Date(alert.nextPaymentDate), 'dd/MM/yyyy', { locale: vi })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {baselineCategoryLabels[alert.category]}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(alert.monthlyAmount)}</div>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs', config.color)}
                    >
                      Còn {alert.daysUntilDue} ngày
                    </Badge>
                  </div>
                </div>
              );
            })}

            {alerts && alerts.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Tổng cần chi trả trong 7 ngày tới:
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
