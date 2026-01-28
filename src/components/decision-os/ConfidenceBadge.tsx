import { cn } from '@/lib/utils';
import { Check, Eye, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  className?: string;
}

const confidenceConfig = {
  HIGH: {
    label: 'Locked',
    icon: Check,
    tooltip: 'Cross-module verified actuals',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconClass: 'text-emerald-600',
  },
  MEDIUM: {
    label: 'Observed',
    icon: Eye,
    tooltip: 'Transactional data',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    iconClass: 'text-sky-600',
  },
  LOW: {
    label: 'Estimated',
    icon: AlertTriangle,
    tooltip: 'Model-based assumption',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    iconClass: 'text-amber-600',
  },
};

export function ConfidenceBadge({ level, className }: ConfidenceBadgeProps) {
  const config = confidenceConfig[level];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border cursor-help",
            config.className,
            className
          )}
        >
          <Icon className={cn("h-3 w-3", config.iconClass)} />
          {config.label}
          {level === 'LOW' && <span>⚠</span>}
          {level === 'HIGH' && <span>✓</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {config.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
