/**
 * EstimationBadge - Visual indicator for estimated metrics
 * 
 * MDP MANIFESTO: "No silent defaults"
 * This component ensures users know when values are estimated vs observed.
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EstimationMeta, ConfidenceLevel } from '@/types/mdp-ssot';

interface EstimationBadgeProps {
  estimation: EstimationMeta;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle2;
  label: string;
}> = {
  high: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: CheckCircle2,
    label: 'Dữ liệu thật',
  },
  medium: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: Info,
    label: 'Độ tin cậy TB',
  },
  low: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: AlertCircle,
    label: 'Ước tính',
  },
  very_low: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: AlertCircle,
    label: 'Cần xác minh',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'text-[10px] px-1.5 py-0',
    icon: 'h-2.5 w-2.5',
    gap: 'gap-0.5',
  },
  md: {
    badge: 'text-xs px-2 py-0.5',
    icon: 'h-3 w-3',
    gap: 'gap-1',
  },
  lg: {
    badge: 'text-sm px-2.5 py-1',
    icon: 'h-3.5 w-3.5',
    gap: 'gap-1.5',
  },
};

export function EstimationBadge({
  estimation,
  showLabel = true,
  size = 'sm',
  className,
}: EstimationBadgeProps) {
  // Don't show badge for high-confidence observed data
  if (!estimation.is_estimated && estimation.confidence_level === 'high') {
    return null;
  }

  const config = CONFIDENCE_CONFIG[estimation.confidence_level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'cursor-help font-normal border',
            config.bgColor,
            config.borderColor,
            config.color,
            sizeConfig.badge,
            sizeConfig.gap,
            'inline-flex items-center',
            className
          )}
        >
          <Icon className={sizeConfig.icon} />
          {showLabel && <span>{config.label}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-medium">{config.label}</span>
            <span className="text-muted-foreground">
              ({estimation.confidence_score}% độ tin cậy)
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{estimation.reason}</p>
          {estimation.data_source && (
            <p className="text-[10px] text-muted-foreground/70">
              Nguồn: {estimation.data_source}
            </p>
          )}
          {estimation.sample_size !== undefined && (
            <p className="text-[10px] text-muted-foreground/70">
              Mẫu: {estimation.sample_size.toLocaleString()} bản ghi
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Inline estimation indicator for use within metric displays
 */
export function EstimationIndicator({
  isEstimated,
  confidenceLevel = 'medium',
  className,
}: {
  isEstimated: boolean;
  confidenceLevel?: ConfidenceLevel;
  className?: string;
}) {
  if (!isEstimated) return null;

  const config = CONFIDENCE_CONFIG[confidenceLevel];

  return (
    <span
      className={cn(
        'text-[10px] font-normal ml-1',
        config.color,
        className
      )}
    >
      (Ước tính)
    </span>
  );
}

/**
 * Data quality summary badge
 */
export function DataQualityBadge({
  qualityScore,
  qualityLevel,
  estimatedFieldsCount,
  totalFields,
  className,
}: {
  qualityScore: number;
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  estimatedFieldsCount: number;
  totalFields: number;
  className?: string;
}) {
  const confidenceLevel: ConfidenceLevel =
    qualityLevel === 'excellent' ? 'high' :
    qualityLevel === 'good' ? 'medium' :
    qualityLevel === 'fair' ? 'low' : 'very_low';

  const config = CONFIDENCE_CONFIG[confidenceLevel];

  const qualityLabels = {
    excellent: 'Tuyệt vời',
    good: 'Tốt',
    fair: 'Trung bình',
    poor: 'Cần cải thiện',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'cursor-help font-normal border',
            config.bgColor,
            config.borderColor,
            config.color,
            className
          )}
        >
          <span>Chất lượng dữ liệu: {qualityLabels[qualityLevel]}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1.5">
          <div className="font-medium">
            Điểm chất lượng: {qualityScore}/100
          </div>
          <p className="text-xs text-muted-foreground">
            {estimatedFieldsCount}/{totalFields} metrics được ước tính
          </p>
          {estimatedFieldsCount > 0 && (
            <p className="text-xs text-amber-500">
              Import thêm dữ liệu để cải thiện độ chính xác
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
