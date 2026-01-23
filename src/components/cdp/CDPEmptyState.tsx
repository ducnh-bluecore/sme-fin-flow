/**
 * CDPEmptyState - Component for showing when CDP has insufficient data
 * 
 * CDP Manifesto: Empty state is acceptable if data insufficient.
 * Show reason for missing data, not fake numbers.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Upload, 
  AlertTriangle, 
  Users, 
  ShoppingCart,
  ArrowRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CDPDataQuality, CDP_MINIMUM_THRESHOLDS } from '@/types/cdp-ssot';

interface CDPEmptyStateProps {
  reason: string;
  dataQuality: CDPDataQuality;
  onImportClick?: () => void;
  className?: string;
}

export function CDPEmptyState({ 
  reason, 
  dataQuality, 
  onImportClick,
  className 
}: CDPEmptyStateProps) {
  const customerProgress = Math.min(100, (dataQuality.actual_customers / dataQuality.minimum_customers_required) * 100);
  const orderProgress = Math.min(100, (dataQuality.actual_orders / dataQuality.minimum_orders_required) * 100);
  
  return (
    <Card className={cn("border-dashed border-2", className)}>
      <CardHeader className="text-center pb-2">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Database className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">Chưa đủ dữ liệu</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">{reason}</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress towards minimum requirements */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Khách hàng</span>
              </div>
              <span className="font-medium">
                {dataQuality.actual_customers} / {dataQuality.minimum_customers_required}
              </span>
            </div>
            <Progress value={customerProgress} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span>Đơn hàng</span>
              </div>
              <span className="font-medium">
                {dataQuality.actual_orders} / {dataQuality.minimum_orders_required}
              </span>
            </div>
            <Progress value={orderProgress} className="h-2" />
          </div>
        </div>
        
        {/* Issues */}
        {dataQuality.issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Các vấn đề cần giải quyết:</p>
            <div className="space-y-2">
              {dataQuality.issues.slice(0, 3).map(issue => (
                <div 
                  key={issue.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-md text-sm",
                    issue.severity === 'critical' && "bg-destructive/10",
                    issue.severity === 'warning' && "bg-warning/10",
                    issue.severity === 'info' && "bg-muted",
                  )}
                >
                  <AlertTriangle className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    issue.severity === 'critical' && "text-destructive",
                    issue.severity === 'warning' && "text-warning-foreground",
                    issue.severity === 'info' && "text-muted-foreground",
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{issue.label}</p>
                    {issue.action && (
                      <p className="text-xs text-muted-foreground">{issue.action}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Action */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <Button onClick={onImportClick} className="gap-2">
            <Upload className="h-4 w-4" />
            Import dữ liệu
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Import đơn hàng từ các kênh bán để CDP có thể phân tích
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ DATA STATUS BADGE ============

interface CDPDataStatusBadgeProps {
  status: 'available' | 'insufficient' | 'unavailable' | 'scheduled' | 'estimated';
  reason?: string;
  className?: string;
}

export function CDPDataStatusBadge({ status, reason, className }: CDPDataStatusBadgeProps) {
  const configs = {
    available: { label: 'Dữ liệu thực', variant: 'default' as const, bg: 'bg-green-500/10 text-green-500 border-green-500/30' },
    insufficient: { label: 'Chưa đủ dữ liệu', variant: 'outline' as const, bg: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
    unavailable: { label: 'Không có dữ liệu', variant: 'outline' as const, bg: 'bg-red-500/10 text-red-500 border-red-500/30' },
    scheduled: { label: 'Đang xử lý', variant: 'outline' as const, bg: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
    estimated: { label: 'Ước tính', variant: 'outline' as const, bg: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  };
  
  const config = configs[status];
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(config.bg, className)}
      title={reason}
    >
      {config.label}
    </Badge>
  );
}

// ============ METRIC VALUE DISPLAY ============

interface CDPMetricDisplayProps {
  value: number;
  status: 'available' | 'insufficient' | 'unavailable' | 'scheduled' | 'estimated';
  reason?: string;
  formatter?: (value: number) => string;
  showBadge?: boolean;
  className?: string;
}

export function CDPMetricDisplay({ 
  value, 
  status, 
  reason,
  formatter = (v) => v.toLocaleString(),
  showBadge = true,
  className 
}: CDPMetricDisplayProps) {
  const isUnavailable = status === 'unavailable' || status === 'insufficient';
  
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <span className={cn(
          "font-bold",
          isUnavailable && "text-muted-foreground"
        )}>
          {isUnavailable ? '—' : formatter(value)}
        </span>
        {showBadge && status !== 'available' && (
          <CDPDataStatusBadge status={status} reason={reason} />
        )}
      </div>
      {reason && status !== 'available' && (
        <p className="text-xs text-muted-foreground">{reason}</p>
      )}
    </div>
  );
}

// ============ MANIFESTO NOTICE ============

interface CDPManifestoNoticeProps {
  className?: string;
}

export function CDPManifestoNotice({ className }: CDPManifestoNoticeProps) {
  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-lg bg-muted/50 border",
      className
    )}>
      <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">CDP Manifesto</p>
        <p>
          CDP không bao giờ mô phỏng giá trị khách hàng. Nếu dữ liệu chưa đủ, 
          CDP sẽ hiển thị trạng thái trống thay vì số giả.
        </p>
      </div>
    </div>
  );
}
