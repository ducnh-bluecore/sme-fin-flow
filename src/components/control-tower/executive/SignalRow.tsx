import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SIGNAL ROW - Compressed, Serious Signals
 * 
 * BLUECORE DNA:
 * - Dark, not bright alert panels
 * - Emphasis on impact & exposure
 * - Red ONLY for irreversible risk
 */

export type SignalSeverity = 'critical' | 'warning' | 'info';

export interface SignalData {
  id: string;
  title: string;
  summary: string;
  severity: SignalSeverity;
  timestamp: string;
  exposure?: string;
  timeToAction?: string;
  details?: string;
  acknowledged?: boolean;
}

interface SignalRowProps {
  signal: SignalData;
  onAcknowledge?: () => void;
  onOpenInWorkspace?: () => void;
}

const severityConfig = {
  critical: {
    dot: 'bg-[hsl(0,55%,50%)]',
    text: 'text-[hsl(0,55%,50%)]',
    bg: 'bg-[hsl(0,55%,50%)]/5',
    border: 'border-l-[hsl(0,55%,50%)]',
  },
  warning: {
    dot: 'bg-[hsl(38,60%,50%)]',
    text: 'text-[hsl(38,60%,50%)]',
    bg: 'bg-[hsl(38,60%,50%)]/5',
    border: 'border-l-[hsl(38,60%,50%)]',
  },
  info: {
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
    bg: 'bg-transparent',
    border: 'border-l-muted',
  },
};

export function SignalRow({ signal, onAcknowledge, onOpenInWorkspace }: SignalRowProps) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[signal.severity];
  
  return (
    <div className={cn(
      'border-b border-border/30 border-l-2',
      config.border,
      config.bg,
      signal.acknowledged && 'opacity-50'
    )}>
      {/* Summary Row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 py-4 px-5 hover:bg-[hsl(var(--surface-raised))/50] transition-colors"
      >
        {/* Severity Indicator */}
        <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', config.dot)} />
        
        {/* Content */}
        <div className="flex-1 text-left min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate">
            {signal.title}
          </h4>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {signal.summary}
          </p>
        </div>
        
        {/* Exposure Badge */}
        {signal.exposure && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-[hsl(var(--surface-raised))] border border-border/50">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className={cn('text-xs font-medium', config.text)}>{signal.exposure}</span>
          </div>
        )}
        
        {/* Time to Action */}
        {signal.timeToAction && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{signal.timeToAction}</span>
          </div>
        )}
        
        {/* Timestamp */}
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {signal.timestamp}
        </span>
        
        {/* Expand Icon */}
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="px-12 pb-4 space-y-3">
          {signal.details && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {signal.details}
            </p>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {!signal.acknowledged && onAcknowledge && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge();
                }}
                className="h-8 text-xs border-border/60 bg-[hsl(var(--surface-raised))] hover:bg-[hsl(var(--surface-overlay))]"
              >
                Acknowledge Signal
              </Button>
            )}
            {onOpenInWorkspace && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInWorkspace();
                }}
                className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
              >
                Open in Decision Workspace
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
