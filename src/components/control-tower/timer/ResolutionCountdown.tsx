import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, User, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimeProgressBar } from './TimeProgressBar';
import { EscalationPath } from './EscalationPath';

interface ResolutionCountdownProps {
  cardId: string;
  title: string;
  createdAt: Date;
  deadlineAt: Date;
  currentOwner: string;
  escalationPath: Array<{
    role: string;
    timeRemaining: number; // minutes
  }>;
  onEscalate?: () => void;
  className?: string;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function ResolutionCountdown({
  cardId,
  title,
  createdAt,
  deadlineAt,
  currentOwner,
  escalationPath,
  onEscalate,
  className,
}: ResolutionCountdownProps) {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalDuration = deadlineAt.getTime() - createdAt.getTime();
  const elapsed = now.getTime() - createdAt.getTime();
  const remaining = deadlineAt.getTime() - now.getTime();
  const progress = Math.min(100, (elapsed / totalDuration) * 100);
  const isOverdue = remaining <= 0;
  const isCritical = remaining > 0 && remaining < 2 * 60 * 60 * 1000; // < 2 hours

  // Find next escalation
  const nextEscalation = escalationPath.find(e => e.timeRemaining > 0);

  return (
    <Card className={cn(
      'overflow-hidden',
      isOverdue && 'border-destructive bg-destructive/5',
      isCritical && !isOverdue && 'border-warning bg-warning/5',
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base line-clamp-1">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">ID: {cardId.slice(0, 8)}</p>
          </div>
          <Badge variant={isOverdue ? 'destructive' : isCritical ? 'outline' : 'secondary'}>
            <User className="h-3 w-3 mr-1" />
            {currentOwner}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main countdown display */}
        <div className={cn(
          'text-center py-4 rounded-lg',
          isOverdue ? 'bg-destructive/10' : isCritical ? 'bg-warning/10' : 'bg-muted/50'
        )}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className={cn(
              'h-5 w-5',
              isOverdue && 'text-destructive animate-pulse',
              isCritical && !isOverdue && 'text-warning'
            )} />
            <span className="text-sm text-muted-foreground">
              {isOverdue ? 'QUÁ HẠN' : 'CÒN LẠI'}
            </span>
          </div>
          
          <motion.div
            className={cn(
              'text-4xl font-mono font-bold',
              isOverdue && 'text-destructive',
              isCritical && !isOverdue && 'text-warning'
            )}
            animate={isOverdue ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {formatTimeRemaining(Math.abs(remaining))}
          </motion.div>
        </div>

        {/* Progress bar */}
        <TimeProgressBar 
          progress={progress} 
          isOverdue={isOverdue}
          isCritical={isCritical}
        />

        {/* Auto-escalation warning */}
        {nextEscalation && !isOverdue && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg',
              'bg-warning/10 border border-warning/30'
            )}
          >
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
            <div className="flex-1 text-sm">
              <span className="text-muted-foreground">Auto-escalate to </span>
              <span className="font-medium">{nextEscalation.role}</span>
              <span className="text-muted-foreground"> in </span>
              <span className="font-medium">
                {Math.floor(nextEscalation.timeRemaining / 60)}h {nextEscalation.timeRemaining % 60}m
              </span>
            </div>
            <ArrowUp className="h-4 w-4 text-warning" />
          </motion.div>
        )}

        {/* Escalation path visualization */}
        <EscalationPath
          path={escalationPath}
          currentOwner={currentOwner}
          onEscalate={onEscalate}
        />
      </CardContent>
    </Card>
  );
}
