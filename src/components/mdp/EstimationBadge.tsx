/**
 * EstimationBadge - Visual indicator for estimated vs observed metrics
 * 
 * MDP Manifesto: Estimated metrics must be visually marked.
 * This component shows users when data is estimated vs real.
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  MDPMetricValue, 
  ConfidenceLevel,
  getConfidenceColor,
  getConfidenceBgColor,
} from '@/types/mdp-ssot';

interface EstimationBadgeProps {
  metric: MDPMetricValue<unknown>;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EstimationBadge({ 
  metric, 
  showDetails = false, 
  size = 'sm',
  className 
}: EstimationBadgeProps) {
  const { estimation } = metric;
  
  if (!estimation.is_estimated) {
    // Observed/Real data - show green indicator
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 bg-green-500/10 text-green-500 border-green-500/30",
              size === 'sm' && "text-xs px-1.5 py-0.5",
              size === 'md' && "text-sm px-2 py-1",
              size === 'lg' && "text-base px-3 py-1.5",
              className
            )}
          >
            <CheckCircle2 className={cn(
              size === 'sm' && "h-3 w-3",
              size === 'md' && "h-4 w-4",
              size === 'lg' && "h-5 w-5"
            )} />
            {showDetails && "Thực tế"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-green-400">✓ Dữ liệu thực</p>
            <p className="text-xs text-muted-foreground">
              Nguồn: {estimation.data_source || metric.source_ref}
            </p>
            {estimation.sample_size && (
              <p className="text-xs text-muted-foreground">
                Số mẫu: {estimation.sample_size.toLocaleString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  // Estimated data - show warning indicator with confidence level
  const Icon = getConfidenceIcon(estimation.confidence_level);
  const colorClass = getConfidenceColor(estimation.confidence_level);
  const bgClass = getConfidenceBgColor(estimation.confidence_level);
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1 border",
            bgClass,
            colorClass,
            estimation.confidence_level === 'very_low' && "border-red-500/30",
            estimation.confidence_level === 'low' && "border-orange-500/30",
            estimation.confidence_level === 'medium' && "border-yellow-500/30",
            estimation.confidence_level === 'high' && "border-green-500/30",
            size === 'sm' && "text-xs px-1.5 py-0.5",
            size === 'md' && "text-sm px-2 py-1",
            size === 'lg' && "text-base px-3 py-1.5",
            className
          )}
        >
          <Icon className={cn(
            size === 'sm' && "h-3 w-3",
            size === 'md' && "h-4 w-4",
            size === 'lg' && "h-5 w-5"
          )} />
          {showDetails && getConfidenceLabel(estimation.confidence_level)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <p className="font-medium">Số liệu ước tính</p>
          </div>
          
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phương pháp:</span>
              <span>{getMethodLabel(estimation.estimation_method)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Độ tin cậy:</span>
              <span className={colorClass}>{estimation.confidence_score}%</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground border-t border-border pt-2">
            {estimation.reason}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============ HELPER COMPONENTS ============

interface EstimationIndicatorProps {
  isEstimated: boolean;
  confidenceLevel?: ConfidenceLevel;
  className?: string;
}

export function EstimationIndicator({ 
  isEstimated, 
  confidenceLevel = 'medium',
  className 
}: EstimationIndicatorProps) {
  if (!isEstimated) {
    return (
      <span className={cn("inline-block w-2 h-2 rounded-full bg-green-500", className)} 
        title="Dữ liệu thực" 
      />
    );
  }
  
  const bgColor = 
    confidenceLevel === 'high' ? 'bg-green-500' :
    confidenceLevel === 'medium' ? 'bg-yellow-500' :
    confidenceLevel === 'low' ? 'bg-orange-500' : 'bg-red-500';
  
  return (
    <span 
      className={cn("inline-block w-2 h-2 rounded-full animate-pulse", bgColor, className)}
      title={`Ước tính (${confidenceLevel})`}
    />
  );
}

// ============ DATA QUALITY BANNER ============

interface DataQualityBannerProps {
  estimatedPercent: number;
  missingData: string[];
  className?: string;
}

export function DataQualityBanner({ 
  estimatedPercent, 
  missingData,
  className 
}: DataQualityBannerProps) {
  if (estimatedPercent === 0 && missingData.length === 0) return null;
  
  const severity = 
    estimatedPercent > 50 ? 'critical' :
    estimatedPercent > 25 ? 'warning' : 'info';
  
  const bgClass = 
    severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
    severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
    'bg-blue-500/10 border-blue-500/30';
  
  const textClass = 
    severity === 'critical' ? 'text-red-400' :
    severity === 'warning' ? 'text-yellow-400' :
    'text-blue-400';
  
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      bgClass,
      className
    )}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", textClass)} />
        <div className="space-y-1">
          <p className={cn("text-sm font-medium", textClass)}>
            {estimatedPercent.toFixed(0)}% dữ liệu là ước tính
          </p>
          {missingData.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Thiếu: {missingData.join(', ')}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Import thêm dữ liệu để có số liệu chính xác hơn
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ HELPER FUNCTIONS ============

function getConfidenceIcon(level: ConfidenceLevel) {
  switch (level) {
    case 'high': return CheckCircle2;
    case 'medium': return HelpCircle;
    case 'low': return AlertTriangle;
    case 'very_low': return XCircle;
    default: return HelpCircle;
  }
}

function getConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return 'Ước tính cao';
    case 'medium': return 'Ước tính';
    case 'low': return 'Ước tính thấp';
    case 'very_low': return 'Rất không chắc';
    default: return 'Ước tính';
  }
}

function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    'actual_data': 'Dữ liệu thực',
    'historical_average': 'Trung bình lịch sử',
    'industry_benchmark': 'Chuẩn ngành',
    'rule_of_thumb': 'Ước lượng đơn giản',
    'machine_learning': 'Dự đoán ML',
    'manual_input': 'Nhập thủ công',
    'not_available': 'Không có dữ liệu',
  };
  return labels[method] || method;
}
