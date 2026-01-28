import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CascadeConnection {
  from: { module: string; dimension: string };
  to: { module: string; dimension: string };
  label: string;
  severity?: 'low' | 'medium' | 'high';
}

interface CascadeLinesProps {
  cascades: CascadeConnection[];
  className?: string;
}

const severityColors = {
  low: 'stroke-yellow-500',
  medium: 'stroke-orange-500',
  high: 'stroke-red-500',
};

export function CascadeLines({ cascades, className }: CascadeLinesProps) {
  if (cascades.length === 0) return null;

  return (
    <div className={cn('mt-6 p-4 bg-muted/30 rounded-lg', className)}>
      <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
        Cascade Effects Detected
      </h4>
      
      <div className="space-y-2">
        {cascades.map((cascade, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg',
              'bg-background border',
              cascade.severity === 'high' && 'border-red-500/30 bg-red-500/5',
              cascade.severity === 'medium' && 'border-orange-500/30 bg-orange-500/5',
              (!cascade.severity || cascade.severity === 'low') && 'border-yellow-500/30 bg-yellow-500/5'
            )}
          >
            {/* From */}
            <div className="flex items-center gap-1">
              <span className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                'bg-primary/10 text-primary'
              )}>
                {cascade.from.module}
              </span>
              <span className="text-xs text-muted-foreground">
                {cascade.from.dimension}
              </span>
            </div>

            {/* Arrow */}
            <div className="flex-1 flex items-center justify-center">
              <svg 
                className="w-full h-4 max-w-[100px]" 
                viewBox="0 0 100 16"
              >
                <defs>
                  <marker
                    id={`arrowhead-${index}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      className={cn(
                        'fill-current',
                        cascade.severity === 'high' && 'text-red-500',
                        cascade.severity === 'medium' && 'text-orange-500',
                        (!cascade.severity || cascade.severity === 'low') && 'text-yellow-500'
                      )}
                    />
                  </marker>
                </defs>
                <motion.line
                  x1="0"
                  y1="8"
                  x2="90"
                  y2="8"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  markerEnd={`url(#arrowhead-${index})`}
                  className={cn(
                    severityColors[cascade.severity || 'low']
                  )}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </svg>
            </div>

            {/* To */}
            <div className="flex items-center gap-1">
              <span className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                'bg-destructive/10 text-destructive'
              )}>
                {cascade.to.module}
              </span>
              <span className="text-xs text-muted-foreground">
                {cascade.to.dimension}
              </span>
            </div>

            {/* Label */}
            <span className={cn(
              'text-xs px-2 py-1 rounded-full ml-2',
              cascade.severity === 'high' && 'bg-red-500/10 text-red-600',
              cascade.severity === 'medium' && 'bg-orange-500/10 text-orange-600',
              (!cascade.severity || cascade.severity === 'low') && 'bg-yellow-500/10 text-yellow-600'
            )}>
              {cascade.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
