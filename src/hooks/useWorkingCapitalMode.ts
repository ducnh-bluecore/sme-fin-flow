/**
 * useWorkingCapitalMode - Hook for managing Working Capital analysis time periods
 * 
 * Provides three analysis modes:
 * - trailing_90d: Rolling 90-day window (default)
 * - last_quarter: Last completed calendar quarter
 * - ytd: Year-to-date from Jan 1
 */

import { useState, useMemo } from 'react';
import { format, subDays, startOfQuarter, subQuarters, endOfQuarter } from 'date-fns';

export type WorkingCapitalMode = 'trailing_90d' | 'last_quarter' | 'ytd';

export interface WorkingCapitalPeriod {
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
  label: string;  // Human-readable label
  days: number;   // Number of days in period
}

export interface WorkingCapitalModeResult {
  mode: WorkingCapitalMode;
  setMode: (mode: WorkingCapitalMode) => void;
  period: WorkingCapitalPeriod;
  modes: Array<{ value: WorkingCapitalMode; label: string; description: string }>;
}

/**
 * Get the last completed quarter's date range
 */
function getLastCompletedQuarter(now: Date): { start: Date; end: Date } {
  const currentQuarterStart = startOfQuarter(now);
  const lastQuarterEnd = subDays(currentQuarterStart, 1);
  const lastQuarterStart = startOfQuarter(lastQuarterEnd);
  
  return {
    start: lastQuarterStart,
    end: endOfQuarter(lastQuarterStart),
  };
}

/**
 * Calculate days between two dates
 */
function daysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function useWorkingCapitalMode(): WorkingCapitalModeResult {
  const [mode, setMode] = useState<WorkingCapitalMode>('trailing_90d');
  
  const period = useMemo<WorkingCapitalPeriod>(() => {
    const now = new Date();
    
    switch (mode) {
      case 'last_quarter': {
        const { start, end } = getLastCompletedQuarter(now);
        const quarterNum = Math.floor(start.getMonth() / 3) + 1;
        const year = start.getFullYear();
        return {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
          label: `Q${quarterNum}/${year}`,
          days: daysBetween(start, end),
        };
      }
      
      case 'ytd': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return {
          start: format(yearStart, 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd'),
          label: `YTD ${now.getFullYear()}`,
          days: daysBetween(yearStart, now),
        };
      }
      
      case 'trailing_90d':
      default: {
        const start = subDays(now, 89); // 90 days including today
        return {
          start: format(start, 'yyyy-MM-dd'),
          end: format(now, 'yyyy-MM-dd'),
          label: 'Trailing 90 ngày',
          days: 90,
        };
      }
    }
  }, [mode]);
  
  const modes: Array<{ value: WorkingCapitalMode; label: string; description: string }> = [
    { 
      value: 'trailing_90d', 
      label: 'Trailing 90 ngày',
      description: '90 ngày gần nhất (cuốn chiếu)'
    },
    { 
      value: 'last_quarter', 
      label: 'Quý trước',
      description: 'Quý lịch đã hoàn thành gần nhất'
    },
    { 
      value: 'ytd', 
      label: 'YTD',
      description: 'Từ đầu năm đến nay'
    },
  ];
  
  return {
    mode,
    setMode,
    period,
    modes,
  };
}
