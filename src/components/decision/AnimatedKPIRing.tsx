import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatVNDCompact, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface AnimatedKPIRingProps {
  value: number;
  maxValue?: number;
  label: string;
  format?: 'percent' | 'currency' | 'number' | 'custom';
  formatValue?: (value: number) => string;
  color?: string;
  trend?: number;
  benchmark?: number | { value: number; label: string };
  benchmarkLabel?: string;
  thresholds?: {
    good: number;
    warning: number;
  };
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  className?: string;
}

export function AnimatedKPIRing({
  value,
  maxValue = 100,
  label,
  format = 'percent',
  formatValue: customFormatValue,
  color,
  trend,
  benchmark,
  benchmarkLabel = 'Industry Avg',
  thresholds = { good: 20, warning: 10 },
  size = 'md',
  subtitle,
  className,
}: AnimatedKPIRingProps) {
  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  
  // Get benchmark value and label
  const benchmarkValue = typeof benchmark === 'object' ? benchmark.value : benchmark;
  const actualBenchmarkLabel = typeof benchmark === 'object' ? benchmark.label : benchmarkLabel;

  // Determine color based on value and thresholds or use custom color
  const getColor = () => {
    if (color) return color;
    if (format === 'percent') {
      if (value >= thresholds.good) return 'hsl(142 76% 36%)';
      if (value >= thresholds.warning) return 'hsl(45 93% 47%)';
      return 'hsl(var(--destructive))';
    }
    return 'hsl(var(--primary))';
  };

  const ringColor = getColor();
  
  const sizeConfig = {
    sm: { width: 80, stroke: 6, fontSize: 'text-sm', labelSize: 'text-[10px]' },
    md: { width: 100, stroke: 8, fontSize: 'text-lg', labelSize: 'text-xs' },
    lg: { width: 120, stroke: 10, fontSize: 'text-2xl', labelSize: 'text-sm' },
  };

  const config = sizeConfig[size];
  const radius = (config.width - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Benchmark position on the ring
  const benchmarkPercentage = benchmarkValue ? Math.min((benchmarkValue / maxValue) * 100, 100) : 0;
  const benchmarkAngle = (benchmarkPercentage / 100) * 360 - 90;
  const benchmarkX = config.width / 2 + radius * Math.cos((benchmarkAngle * Math.PI) / 180);
  const benchmarkY = config.width / 2 + radius * Math.sin((benchmarkAngle * Math.PI) / 180);

  const formatDisplayValue = () => {
    if (customFormatValue) return customFormatValue(value);
    if (format === 'percent') return formatPercent(value);
    if (format === 'currency') return formatVNDCompact(value);
    return value.toLocaleString();
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex flex-col items-center gap-1 p-3 rounded-lg bg-card border', className)}>
            <div className="relative" style={{ width: config.width, height: config.width }}>
              <svg
                width={config.width}
                height={config.width}
                viewBox={`0 0 ${config.width} ${config.width}`}
                className="-rotate-90"
              >
                {/* Background ring */}
                <circle
                  cx={config.width / 2}
                  cy={config.width / 2}
                  r={radius}
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth={config.stroke}
                />
                
                {/* Progress ring */}
                <motion.circle
                  cx={config.width / 2}
                  cy={config.width / 2}
                  r={radius}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={config.stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />

                {/* Benchmark marker */}
                {benchmarkValue && benchmarkValue > 0 && (
                  <motion.circle
                    cx={benchmarkX}
                    cy={benchmarkY}
                    r={4}
                    fill="hsl(var(--muted-foreground))"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="rotate-90 origin-center"
                    style={{ 
                      transformOrigin: `${config.width / 2}px ${config.width / 2}px`,
                      transform: 'rotate(90deg)'
                    }}
                  />
                )}
              </svg>

              {/* Center value */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                  className={cn('font-bold', config.fontSize)}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  {formatDisplayValue()}
                </motion.span>
              </div>
            </div>

            {/* Label */}
            <span className={cn('text-muted-foreground font-medium text-center', config.labelSize)}>
              {label}
            </span>

            {/* Subtitle */}
            {subtitle && (
              <span className="text-[10px] text-muted-foreground/70">{subtitle}</span>
            )}

            {/* Trend indicator */}
            {trend !== undefined && (
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={cn(
                  'text-xs font-medium',
                  trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground'
                )}>
                  {trend > 0 ? '+' : ''}{formatPercent(trend)}
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-1 text-xs">
            <p><strong>{label}:</strong> {formatDisplayValue()}</p>
            {benchmarkValue && (
              <p className="text-muted-foreground">
                {actualBenchmarkLabel}: {format === 'percent' ? formatPercent(benchmarkValue) : formatVNDCompact(benchmarkValue)}
              </p>
            )}
            {trend !== undefined && (
              <p className={trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : ''}>
                Trend: {trend > 0 ? '+' : ''}{formatPercent(trend)} so với kỳ trước
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface KPIRingGridProps {
  items: Array<Omit<AnimatedKPIRingProps, 'size'>>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function KPIRingGrid({ items, size = 'md', className }: KPIRingGridProps) {
  return (
    <div className={cn('flex flex-wrap justify-center gap-6', className)}>
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <AnimatedKPIRing {...item} size={size} />
        </motion.div>
      ))}
    </div>
  );
}
