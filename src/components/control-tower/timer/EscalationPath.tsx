import { motion } from 'framer-motion';
import { User, ArrowDown, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EscalationStep {
  role: string;
  timeRemaining: number; // minutes, -1 means already escalated
}

interface EscalationPathProps {
  path: EscalationStep[];
  currentOwner: string;
  onEscalate?: () => void;
  className?: string;
}

export function EscalationPath({
  path,
  currentOwner,
  onEscalate,
  className,
}: EscalationPathProps) {
  // Find current step index
  const currentIndex = path.findIndex(step => step.role === currentOwner);
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Escalation Path
        </span>
        {onEscalate && currentIndex < path.length - 1 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onEscalate}
          >
            <ArrowDown className="h-3 w-3 mr-1" />
            Escalate Now
          </Button>
        )}
      </div>

      <div className="relative">
        {/* Vertical line connecting steps */}
        <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border" />

        {/* Steps */}
        <div className="space-y-1">
          {path.map((step, index) => {
            const isPast = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;
            
            return (
              <motion.div
                key={step.role}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'relative flex items-center gap-3 p-2 rounded-lg',
                  isCurrent && 'bg-primary/10 border border-primary/30',
                  isPast && 'opacity-60'
                )}
              >
                {/* Status icon */}
                <div className={cn(
                  'relative z-10 w-8 h-8 rounded-full flex items-center justify-center',
                  isPast && 'bg-muted text-muted-foreground',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isFuture && 'bg-muted border-2 border-dashed border-muted-foreground/30'
                )}>
                  {isPast && <CheckCircle2 className="h-4 w-4" />}
                  {isCurrent && <User className="h-4 w-4" />}
                  {isFuture && <Clock className="h-4 w-4 text-muted-foreground" />}
                </div>

                {/* Role info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-medium text-sm',
                      isCurrent && 'text-primary'
                    )}>
                      {step.role}
                    </span>
                    {isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        Current
                      </span>
                    )}
                    {isPast && (
                      <span className="text-xs text-muted-foreground">
                        (Completed)
                      </span>
                    )}
                  </div>
                  
                  {isFuture && step.timeRemaining > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        Auto-escalate in {Math.floor(step.timeRemaining / 60)}h {step.timeRemaining % 60}m
                      </span>
                    </div>
                  )}
                </div>

                {/* Warning indicator for imminent escalation */}
                {isFuture && step.timeRemaining > 0 && step.timeRemaining <= 60 && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
