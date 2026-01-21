import { cn } from '@/lib/utils';

/**
 * STATUS STRIP - Executive System Posture
 * 
 * Single horizontal bar showing system state
 * Minimal, text-based, no red blocks
 * 
 * States:
 * - Stable: Normal operation
 * - Watch: Attention recommended  
 * - Intervention: Action required
 */

export type SystemPosture = 'stable' | 'watch' | 'intervention';

interface StatusStripProps {
  posture: SystemPosture;
  decisionsAtRisk: number;
  timeToImpact?: string;
}

const postureConfig = {
  stable: {
    label: 'Stable',
    description: 'Operating normally',
    textColor: 'text-[hsl(160,40%,45%)]',
    dotColor: 'bg-[hsl(160,40%,45%)]',
  },
  watch: {
    label: 'Watch',
    description: 'Attention recommended',
    textColor: 'text-[hsl(40,60%,55%)]',
    dotColor: 'bg-[hsl(40,60%,55%)]',
  },
  intervention: {
    label: 'Intervention',
    description: 'Action required',
    textColor: 'text-[hsl(0,60%,55%)]',
    dotColor: 'bg-[hsl(0,60%,55%)]',
  },
};

export function StatusStrip({ posture, decisionsAtRisk, timeToImpact }: StatusStripProps) {
  const config = postureConfig[posture];
  
  return (
    <div className="flex items-center justify-between py-4 px-6 border-b border-border/30">
      {/* System Posture */}
      <div className="flex items-center gap-3">
        <div className={cn('w-2 h-2 rounded-full', config.dotColor)} />
        <div>
          <span className={cn('text-sm font-medium', config.textColor)}>
            {config.label}
          </span>
          <span className="text-muted-foreground text-sm ml-2">
            — {config.description}
          </span>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="flex items-center gap-8 text-sm">
        {decisionsAtRisk > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Decisions at risk</span>
            <span className={cn('font-medium', config.textColor)}>{decisionsAtRisk}</span>
          </div>
        )}
        
        {timeToImpact && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Time to impact</span>
            <span className="font-medium text-foreground">{timeToImpact}</span>
          </div>
        )}
      </div>
    </div>
  );
}
