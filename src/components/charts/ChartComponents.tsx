import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number, name: string) => string;
  className?: string;
}

export const EnhancedChartTooltip = memo(function EnhancedChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  className,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const formatValue = (value: number, name: string) => {
    if (valueFormatter) return valueFormatter(value, name);
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const formatLabel = (l: string) => {
    if (labelFormatter) return labelFormatter(l);
    return l;
  };

  return (
    <div
      className={cn(
        'bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl p-3',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}
    >
      {label && (
        <p className="text-sm font-semibold text-foreground mb-2 pb-2 border-b border-border">
          {formatLabel(label)}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {formatValue(entry.value, entry.name)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// Chart Legend component
interface ChartLegendItemProps {
  color: string;
  label: string;
  value?: string | number;
  className?: string;
}

export function ChartLegendItem({ color, label, value, className }: ChartLegendItemProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span 
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
      {value !== undefined && (
        <span className="text-sm font-semibold text-foreground ml-auto tabular-nums">
          {typeof value === 'number' 
            ? new Intl.NumberFormat('vi-VN').format(value)
            : value
          }
        </span>
      )}
    </div>
  );
}

interface ChartLegendProps {
  items: Array<{
    color: string;
    label: string;
    value?: string | number;
  }>;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function ChartLegend({ items, direction = 'horizontal', className }: ChartLegendProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-4',
        direction === 'vertical' && 'flex-col gap-2',
        className
      )}
    >
      {items.map((item, index) => (
        <ChartLegendItem key={index} {...item} />
      ))}
    </div>
  );
}

// No data overlay for charts
interface ChartNoDataProps {
  message?: string;
  className?: string;
}

export function ChartNoData({ 
  message = 'Chưa có dữ liệu để hiển thị',
  className 
}: ChartNoDataProps) {
  return (
    <div className={cn(
      'absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm',
      className
    )}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <svg 
            className="w-6 h-6 text-muted-foreground" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
            />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Chart wrapper with consistent styling
interface ChartWrapperProps {
  title?: string;
  description?: string;
  legend?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  loading?: boolean;
}

export function ChartWrapper({
  title,
  description,
  legend,
  actions,
  children,
  className,
  loading,
}: ChartWrapperProps) {
  return (
    <div className={cn('data-card', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      
      <div className="relative">
        {children}
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {legend && (
        <div className="mt-4 pt-4 border-t border-border">
          {legend}
        </div>
      )}
    </div>
  );
}
