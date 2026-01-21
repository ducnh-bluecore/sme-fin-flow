import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * SIGNAL ROW - Collapsed by default
 * 
 * Shows summary only, expands on demand
 * Actions: Acknowledge, Open in Decision Workspace
 * NO: Create task, Resolve buttons
 */

export type SignalSeverity = 'critical' | 'warning' | 'info';

export interface SignalData {
  id: string;
  title: string;
  summary: string;
  severity: SignalSeverity;
  timestamp: string;
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
    dot: 'bg-[hsl(0,60%,55%)]',
    text: 'text-[hsl(0,60%,55%)]',
  },
  warning: {
    dot: 'bg-[hsl(40,60%,55%)]',
    text: 'text-[hsl(40,60%,55%)]',
  },
  info: {
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
  },
};

export function SignalRow({ signal, onAcknowledge, onOpenInWorkspace }: SignalRowProps) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[signal.severity];
  
  return (
    <div className={cn(
      'border-b border-border/20 last:border-0',
      signal.acknowledged && 'opacity-60'
    )}>
      {/* Summary Row - Always Visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 py-4 px-4 hover:bg-secondary/30 transition-colors"
      >
        {/* Severity Dot */}
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dot)} />
        
        {/* Content */}
        <div className="flex-1 text-left min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate">
            {signal.title}
          </h4>
          <p className="text-xs text-muted-foreground truncate">
            {signal.summary}
          </p>
        </div>
        
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
        <div className="px-10 pb-4 space-y-3">
          {signal.details && (
            <p className="text-sm text-muted-foreground">
              {signal.details}
            </p>
          )}
          
          {/* Actions - Only Acknowledge + Open in Workspace */}
          <div className="flex items-center gap-2">
            {!signal.acknowledged && onAcknowledge && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge();
                }}
                className="h-7 text-xs border-border/50 text-muted-foreground hover:text-foreground"
              >
                Acknowledge
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
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
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
