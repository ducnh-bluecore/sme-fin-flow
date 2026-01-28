/**
 * DataQualityBadge - Phase 8.3
 * Shows data quality warnings for FDP metrics
 * Transparency about data sources and potential issues
 */
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, Info, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataQualityFlags } from '@/hooks/useFinanceTruthSnapshot';

interface DataQualityBadgeProps {
  dataQuality: DataQualityFlags;
  showDetails?: boolean;
  size?: 'sm' | 'md';
}

export function DataQualityBadge({ 
  dataQuality, 
  showDetails = true,
  size = 'sm' 
}: DataQualityBadgeProps) {
  const hasWarning = dataQuality.hasContributionMarginWarning;
  const completeness = dataQuality.dataCompletenessPercent;
  
  // Determine overall status
  const status: 'good' | 'warning' | 'critical' = 
    hasWarning ? 'critical' :
    completeness >= 80 ? 'good' : 'warning';
  
  const statusConfig = {
    good: {
      icon: CheckCircle,
      label: 'Dữ liệu tốt',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    warning: {
      icon: Info,
      label: 'Dữ liệu chưa đầy đủ',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    critical: {
      icon: AlertTriangle,
      label: 'Cần xem xét',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  if (!showDetails) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          config.className,
          size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
        )}
      >
        <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        {config.label}
      </Badge>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              config.className,
              'cursor-help',
              size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
            )}
          >
            <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4" />
              Chất lượng dữ liệu: {completeness}%
            </div>
            
            {dataQuality.hasContributionMarginWarning && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded">
                <strong>⚠️ Cảnh báo CM%:</strong>{' '}
                {dataQuality.contributionMarginWarningReason}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              <strong>Nguồn ROAS:</strong>{' '}
              {dataQuality.roasDataSource === 'promotion_campaigns' 
                ? 'Chiến dịch quảng cáo (chính xác)'
                : dataQuality.roasDataSource === 'expenses'
                ? 'Bảng chi phí (ước tính)'
                : 'Chưa có dữ liệu'}
            </div>
            
            <div className="text-[10px] text-muted-foreground border-t pt-1">
              Cập nhật: {new Date(dataQuality.lastComputedAt).toLocaleString('vi-VN')}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * CMWarningBadge - Specific warning for Contribution Margin issues
 */
interface CMWarningBadgeProps {
  contributionMarginPercent: number;
  hasWarning: boolean;
  warningReason: string | null;
}

export function CMWarningBadge({ 
  contributionMarginPercent, 
  hasWarning,
  warningReason 
}: CMWarningBadgeProps) {
  if (!hasWarning) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] px-1.5 py-0 cursor-help ml-1"
          >
            <AlertTriangle className="h-3 w-3 mr-0.5" />
            Xem xét
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <div className="space-y-2">
            <div className="font-medium text-rose-700">
              CM% = {contributionMarginPercent.toFixed(1)}% (âm)
            </div>
            <p className="text-xs text-muted-foreground">
              {warningReason || 
                'Chi phí biến đổi cao bất thường. Kiểm tra lại nguồn dữ liệu chi phí.'}
            </p>
            <div className="text-[10px] text-muted-foreground border-t pt-1">
              💡 Đây có thể không phải lỗi - hãy xác nhận với kế toán rằng chi phí 
              đã được phân bổ đúng kỳ.
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
