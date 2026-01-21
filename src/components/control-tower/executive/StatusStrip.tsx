import { cn } from '@/lib/utils';
import { Activity, AlertTriangle, Shield } from 'lucide-react';

/**
 * STATUS STRIP - Executive System Posture
 * 
 * BLUECORE DNA: Dark, serious, financial command room feel
 * Visually present but not screaming
 * Communicates gravity calmly
 */

export type SystemPosture = 'stable' | 'watch' | 'intervention';

interface StatusStripProps {
  posture: SystemPosture;
  decisionsAtRisk: number;
  totalExposure?: string;
  timeToImpact?: string;
}

const postureConfig = {
  stable: {
    label: 'System Stable',
    description: 'Operations within expected parameters',
    icon: Shield,
    bgClass: 'bg-[hsl(158,45%,42%)/0.08]',
    borderClass: 'border-[hsl(158,45%,42%)/0.25]',
    textClass: 'text-[hsl(158,45%,42%)]',
    dotClass: 'bg-[hsl(158,45%,42%)]',
  },
  watch: {
    label: 'Watch Mode',
    description: 'Attention recommended',
    icon: Activity,
    bgClass: 'bg-[hsl(38,55%,50%)/0.08]',
    borderClass: 'border-[hsl(38,55%,50%)/0.25]',
    textClass: 'text-[hsl(38,55%,50%)]',
    dotClass: 'bg-[hsl(38,55%,50%)]',
  },
  intervention: {
    label: 'Intervention Required',
    description: 'Executive action needed',
    icon: AlertTriangle,
    bgClass: 'bg-[hsl(0,55%,50%)/0.08]',
    borderClass: 'border-[hsl(0,55%,50%)/0.25]',
    textClass: 'text-[hsl(0,55%,50%)]',
    dotClass: 'bg-[hsl(0,55%,50%)]',
  },
};

export function StatusStrip({ posture, decisionsAtRisk, totalExposure, timeToImpact }: StatusStripProps) {
  const config = postureConfig[posture];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'flex items-center justify-between py-4 px-6',
      'border-b border-border/50',
      config.bgClass
    )}>
      {/* System Posture - Left */}
      <div className="flex items-center gap-4">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          'bg-[hsl(var(--surface-raised))]',
          'border',
          config.borderClass
        )}>
          <Icon className={cn('h-5 w-5', config.textClass)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full animate-pulse', config.dotClass)} />
            <span className={cn('text-sm font-semibold', config.textClass)}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {config.description}
          </p>
        </div>
      </div>
      
      {/* Key Metrics - Right */}
      <div className="flex items-center gap-8">
        {decisionsAtRisk > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Decisions at Risk</p>
            <p className={cn('text-xl font-bold', config.textClass)}>{decisionsAtRisk}</p>
          </div>
        )}
        
        {totalExposure && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Exposure</p>
            <p className="text-xl font-bold text-foreground">{totalExposure}</p>
          </div>
        )}
        
        {timeToImpact && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Time to Impact</p>
            <p className={cn(
              'text-xl font-bold',
              timeToImpact === 'Overdue' ? 'text-[hsl(0,55%,50%)]' : 'text-foreground'
            )}>{timeToImpact}</p>
          </div>
        )}
      </div>
    </div>
  );
}
