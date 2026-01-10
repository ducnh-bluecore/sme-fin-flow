// Chart color palette following design system
export const CHART_COLORS = {
  primary: 'hsl(var(--chart-1))',
  success: 'hsl(var(--chart-2))',
  warning: 'hsl(var(--chart-3))',
  danger: 'hsl(var(--chart-4))',
  purple: 'hsl(var(--chart-5))',
  muted: 'hsl(var(--muted-foreground))',
};

// Extended palette for multi-series charts
export const CHART_PALETTE = [
  'hsl(221 83% 53%)',   // Primary blue
  'hsl(142 76% 36%)',   // Success green
  'hsl(38 92% 50%)',    // Warning orange
  'hsl(0 84% 60%)',     // Danger red
  'hsl(280 65% 60%)',   // Purple
  'hsl(199 89% 48%)',   // Info blue
  'hsl(340 75% 55%)',   // Pink
  'hsl(160 60% 45%)',   // Teal
];

// Gradient definitions for area charts
export const CHART_GRADIENTS = {
  primary: {
    start: 'hsl(221 83% 53% / 0.3)',
    end: 'hsl(221 83% 53% / 0.05)',
  },
  success: {
    start: 'hsl(142 76% 36% / 0.3)',
    end: 'hsl(142 76% 36% / 0.05)',
  },
  warning: {
    start: 'hsl(38 92% 50% / 0.3)',
    end: 'hsl(38 92% 50% / 0.05)',
  },
};

// Common chart configuration
export const CHART_CONFIG = {
  // Axis styling
  axis: {
    stroke: 'hsl(var(--border))',
    tick: {
      fill: 'hsl(var(--muted-foreground))',
      fontSize: 12,
    },
  },
  
  // Grid styling
  grid: {
    stroke: 'hsl(var(--border))',
    strokeDasharray: '3 3',
    opacity: 0.5,
  },
  
  // Animation
  animation: {
    duration: 500,
    easing: 'ease-out',
  },
  
  // Margins
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
};

// Format helpers for charts - delegates to centralized formatters
// Import from @/lib/formatters for consistency
import { formatVNDCompact, formatPercent, formatDate, formatDateShort, formatMonthYear } from '@/lib/formatters';

export const chartFormatters = {
  // Vietnamese currency compact format
  vnd: (value: number) => formatVNDCompact(value),
  
  // Percentage
  percent: (value: number) => formatPercent(value),
  
  // Number with comma
  number: (value: number) => new Intl.NumberFormat('vi-VN').format(value),
  
  // Date formatting for charts
  date: (value: string) => formatDateShort(value),
  
  // Month formatting for charts
  month: (value: string) => formatMonthYear(value),
  
  // Millions format for Y-axis
  millions: (value: number) => `${(value / 1_000_000).toFixed(0)}M`,
};
