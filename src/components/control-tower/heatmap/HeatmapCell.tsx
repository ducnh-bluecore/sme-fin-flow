import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface HeatmapCellData {
  module: string;
  dimension: string;
  intensity: number; // 0-100
  label: string;
  detail: string;
  alertCount?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface HeatmapCellProps {
  data: HeatmapCellData;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

function getIntensityColor(intensity: number): string {
  if (intensity <= 20) return 'bg-emerald-500';
  if (intensity <= 50) return 'bg-yellow-500';
  if (intensity <= 80) return 'bg-orange-500';
  return 'bg-red-500';
}

function getIntensityOpacity(intensity: number): number {
  return Math.max(0.3, intensity / 100);
}

const sizeConfig = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export function HeatmapCell({ data, onClick, size = 'md' }: HeatmapCellProps) {
  const baseColor = getIntensityColor(data.intensity);
  const opacity = getIntensityOpacity(data.intensity);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
            className={cn(
              'relative rounded-lg border border-border/50',
              'flex flex-col items-center justify-center gap-1',
              'transition-all cursor-pointer',
              'hover:ring-2 hover:ring-primary/50',
              sizeConfig[size]
            )}
            style={{ opacity }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Background color */}
            <div 
              className={cn(
                'absolute inset-0 rounded-lg',
                baseColor
              )}
              style={{ opacity: opacity * 0.8 }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
              <span className={cn(
                'font-bold text-lg',
                data.intensity > 60 ? 'text-white' : 'text-foreground'
              )}>
                {data.intensity}
              </span>
              {data.alertCount !== undefined && data.alertCount > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  'bg-destructive text-destructive-foreground'
                )}>
                  {data.alertCount}
                </span>
              )}
            </div>

            {/* Pulse effect for high intensity */}
            {data.intensity > 70 && (
              <motion.div
                className={cn(
                  'absolute inset-0 rounded-lg',
                  baseColor
                )}
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity 
                }}
              />
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{data.label}</p>
            <p className="text-xs text-muted-foreground">{data.detail}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className={cn(
                'text-xs font-medium',
                data.intensity <= 20 && 'text-emerald-500',
                data.intensity > 20 && data.intensity <= 50 && 'text-yellow-500',
                data.intensity > 50 && data.intensity <= 80 && 'text-orange-500',
                data.intensity > 80 && 'text-red-500'
              )}>
                Risk Score: {data.intensity}/100
              </span>
              {data.trend && (
                <span className={cn(
                  'text-xs',
                  data.trend === 'up' && 'text-destructive',
                  data.trend === 'down' && 'text-success',
                  data.trend === 'stable' && 'text-muted-foreground'
                )}>
                  ({data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→'})
                </span>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
