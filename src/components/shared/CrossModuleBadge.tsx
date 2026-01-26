/**
 * CrossModuleBadge
 * 
 * Visual indicator for cross-module data confidence level.
 * Shows the origin and reliability of data flowing between modules.
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lock, Database, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  ConfidenceLevel, 
  SourceModule, 
  getConfidenceLabel 
} from '@/types/cross-module';

interface CrossModuleBadgeProps {
  confidenceLevel: ConfidenceLevel;
  dataSource?: string;
  fromModule?: SourceModule;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const moduleLabels: Record<SourceModule, string> = {
  FDP: 'FDP',
  MDP: 'MDP',
  CDP: 'CDP',
  CONTROL_TOWER: 'Control Tower',
};

export function CrossModuleBadge({
  confidenceLevel,
  dataSource,
  fromModule,
  showTooltip = true,
  size = 'sm',
  className,
}: CrossModuleBadgeProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const getVariant = () => {
    switch (confidenceLevel) {
      case 'LOCKED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'OBSERVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'ESTIMATED':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getIcon = () => {
    switch (confidenceLevel) {
      case 'LOCKED':
        return <Lock className={iconSize} />;
      case 'OBSERVED':
        return <Database className={iconSize} />;
      case 'ESTIMATED':
        return <AlertTriangle className={iconSize} />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    if (fromModule && confidenceLevel === 'LOCKED') {
      return `Từ ${moduleLabels[fromModule]} ✓`;
    }
    return getConfidenceLabel(confidenceLevel);
  };

  const getTooltipContent = () => {
    switch (confidenceLevel) {
      case 'LOCKED':
        return (
          <div className="space-y-1">
            <p className="font-medium">Dữ liệu đã xác thực</p>
            <p className="text-muted-foreground">
              {fromModule 
                ? `Dữ liệu được chốt từ ${moduleLabels[fromModule]}, độ tin cậy cao nhất.`
                : 'Dữ liệu đã được xác thực và chốt.'}
            </p>
            {dataSource && (
              <p className="text-muted-foreground text-xs">
                Nguồn: {dataSource}
              </p>
            )}
          </div>
        );
      case 'OBSERVED':
        return (
          <div className="space-y-1">
            <p className="font-medium">Từ dữ liệu thực</p>
            <p className="text-muted-foreground">
              Dữ liệu được tính từ các giao dịch thực tế trong hệ thống.
            </p>
            {dataSource && (
              <p className="text-muted-foreground text-xs">
                Nguồn: {dataSource}
              </p>
            )}
          </div>
        );
      case 'ESTIMATED':
        return (
          <div className="space-y-1">
            <p className="font-medium">Ước tính ⚠</p>
            <p className="text-muted-foreground">
              Đang sử dụng giá trị ước tính theo benchmark ngành.
              Chốt dữ liệu thực để tăng độ chính xác.
            </p>
            {dataSource && (
              <p className="text-muted-foreground text-xs">
                Nguồn: {dataSource}
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal border',
        getVariant(),
        textSize,
        className
      )}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * CrossModuleFlow
 * 
 * Visual indicator showing data flow between two modules.
 */
interface CrossModuleFlowProps {
  from: SourceModule;
  to: SourceModule;
  confidenceLevel: ConfidenceLevel;
  className?: string;
}

export function CrossModuleFlow({
  from,
  to,
  confidenceLevel,
  className,
}: CrossModuleFlowProps) {
  const getFlowColor = () => {
    switch (confidenceLevel) {
      case 'LOCKED':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'OBSERVED':
        return 'text-blue-600 dark:text-blue-400';
      case 'ESTIMATED':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      <span className="font-medium">{moduleLabels[from]}</span>
      <ArrowRight className={cn('h-3 w-3', getFlowColor())} />
      <span className="font-medium">{moduleLabels[to]}</span>
      <CrossModuleBadge
        confidenceLevel={confidenceLevel}
        showTooltip={false}
        size="sm"
      />
    </div>
  );
}
