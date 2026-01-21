import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

/**
 * EXECUTION STREAM - COO Execution Grouping
 * 
 * Grouped by Strategic Decision
 * Shows: SLA risk, Blockers, Overdue
 * NO task cards, NO kanban, NO red backgrounds
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
    label: 'On track',
    color: 'text-[hsl(160,40%,45%)]',
  },
  friction: {
    label: 'Friction detected',
    color: 'text-[hsl(40,60%,55%)]',
  },
  blocked: {
    label: 'Blocked',
    color: 'text-[hsl(0,60%,55%)]',
  },
};

export function ExecutionStream({ stream, onClick }: ExecutionStreamProps) {
  const config = healthConfig[stream.healthStatus];
  const progress = stream.totalActions > 0 
    ? (stream.completedActions / stream.totalActions) * 100 
    : 0;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left py-4 px-4 transition-all duration-200',
        'hover:bg-secondary/50 border-b border-border/20'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Decision + Health */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate mb-1">
            {stream.decisionTitle}
          </h4>
          <div className="flex items-center gap-3 text-xs">
            <span className={config.color}>{config.label}</span>
            {stream.blockedCount > 0 && (
              <span className="text-muted-foreground">
                {stream.blockedCount} blocked
              </span>
            )}
          </div>
        </div>
        
        {/* Right: Progress + Arrow */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <span className="text-sm font-medium text-foreground">
              {stream.completedActions}/{stream.totalActions}
            </span>
            <div className="w-16 h-1 bg-muted rounded-full mt-1">
              <div 
                className={cn(
                  'h-full rounded-full transition-all',
                  stream.healthStatus === 'blocked' 
                    ? 'bg-[hsl(0,60%,55%)]' 
                    : 'bg-[hsl(160,40%,45%)]'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
}
