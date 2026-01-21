import { cn } from '@/lib/utils';
import { ChevronRight, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

/**
 * EXECUTION STREAM - COO Execution Grouping
 * 
 * BLUECORE DNA:
 * - Dense but readable
 * - Dark surfaces with subtle depth
 * - Operational, calm under pressure
 */

export interface ExecutionStreamData {
  id: string;
  decisionTitle: string;
  healthStatus: 'on_track' | 'friction' | 'blocked';
  blockedCount: number;
  totalActions: number;
  completedActions: number;
}

interface ExecutionStreamProps {
  stream: ExecutionStreamData;
  onClick?: () => void;
}

const healthConfig = {
  on_track: {
    label: 'On Track',
    icon: CheckCircle,
    textClass: 'text-[hsl(158,45%,42%)]',
    barClass: 'bg-[hsl(158,45%,42%)]',
    bgClass: 'bg-[hsl(158,45%,42%)/0.05]',
  },
  friction: {
    label: 'Friction',
    icon: Activity,
    textClass: 'text-[hsl(38,55%,50%)]',
    barClass: 'bg-[hsl(38,55%,50%)]',
    bgClass: 'bg-[hsl(38,55%,50%)/0.05]',
  },
  blocked: {
    label: 'Blocked',
    icon: AlertTriangle,
    textClass: 'text-[hsl(0,55%,50%)]',
    barClass: 'bg-[hsl(0,55%,50%)]',
    bgClass: 'bg-[hsl(0,55%,50%)/0.05]',
  },
};

export function ExecutionStream({ stream, onClick }: ExecutionStreamProps) {
  const config = healthConfig[stream.healthStatus];
  const Icon = config.icon;
  const progress = stream.totalActions > 0 
    ? (stream.completedActions / stream.totalActions) * 100 
    : 0;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left py-4 px-5 transition-all duration-200',
        'border-b border-border/30',
        'hover:bg-[hsl(var(--surface-raised))]',
        config.bgClass
      )}
    >
      <div className="flex items-center gap-4">
        {/* Status Icon */}
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center',
          'bg-[hsl(var(--surface-raised))] border border-border/50'
        )}>
          <Icon className={cn('h-4 w-4', config.textClass)} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate mb-1">
            {stream.decisionTitle}
          </h4>
          <div className="flex items-center gap-3 text-xs">
            <span className={config.textClass}>{config.label}</span>
            {stream.blockedCount > 0 && (
              <span className="text-muted-foreground">
                • {stream.blockedCount} blocked
              </span>
            )}
          </div>
        </div>
        
        {/* Progress */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-sm font-semibold text-foreground">
              {stream.completedActions}/{stream.totalActions}
            </span>
            <div className="w-20 h-1.5 bg-muted/30 rounded-full mt-1.5 overflow-hidden">
              <div 
                className={cn('h-full rounded-full transition-all', config.barClass)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}
