import { subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, subYears, endOfYear } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Standard date filter preset values used across the application
export const DATE_FILTER_PRESETS = {
  TODAY: 'today',
  DAYS_7: '7',
  DAYS_14: '14',
  DAYS_30: '30',
  DAYS_60: '60',
  DAYS_90: '90',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_QUARTER: 'this_quarter',
  THIS_YEAR: 'this_year',
  LAST_YEAR: 'last_year',
  YTD: 'ytd',
  ALL: 'all',
  YEAR_2024: '2024',
  YEAR_2025: '2025',
  YEAR_2026: '2026',
} as const;

// Default filter for most pages - year to date
export const DEFAULT_DATE_FILTER = DATE_FILTER_PRESETS.THIS_YEAR;

export function getDateRangeFromFilter(filter: string): DateRange {
  const now = new Date();
  const currentYear = now.getFullYear();
  const endDate = now;
  let startDate: Date;

  switch (filter) {
    case '1':
    case 'today':
      startDate = now;
      break;
    case '7':
    case '7days':
      startDate = subDays(now, 7);
      break;
    case '14':
    case '14days':
      startDate = subDays(now, 14);
      break;
    case '30':
    case '30days':
      startDate = subDays(now, 30);
      break;
    case '60':
    case '60days':
      startDate = subDays(now, 60);
      break;
    case '90':
    case '90days':
      startDate = subDays(now, 90);
      break;
    case 'this_month':
      startDate = startOfMonth(now);
      break;
    case 'last_month':
      startDate = startOfMonth(subMonths(now, 1));
      return { startDate, endDate: endOfMonth(subMonths(now, 1)) };
    case 'this_quarter':
      startDate = startOfQuarter(now);
      break;
    case 'this_year':
    case 'ytd':
      startDate = startOfYear(now);
      break;
    case 'last_year':
      startDate = startOfYear(subYears(now, 1));
      return { startDate, endDate: endOfYear(subYears(now, 1)) };
    case 'q1':
      startDate = new Date(currentYear, 0, 1);
      return { startDate, endDate: new Date(currentYear, 2, 31) };
    case 'q2':
      startDate = new Date(currentYear, 3, 1);
      return { startDate, endDate: new Date(currentYear, 5, 30) };
    case 'q3':
      startDate = new Date(currentYear, 6, 1);
      return { startDate, endDate: new Date(currentYear, 8, 30) };
    case 'q4':
      startDate = new Date(currentYear, 9, 1);
      return { startDate, endDate: new Date(currentYear, 11, 31) };
    case 'monthly':
      startDate = subMonths(now, 12);
      break;
    case 'q1_last':
      startDate = new Date(currentYear - 1, 0, 1);
      return { startDate, endDate: new Date(currentYear - 1, 2, 31) };
    case 'q2_last':
      startDate = new Date(currentYear - 1, 3, 1);
      return { startDate, endDate: new Date(currentYear - 1, 5, 30) };
    case 'q3_last':
      startDate = new Date(currentYear - 1, 6, 1);
      return { startDate, endDate: new Date(currentYear - 1, 8, 30) };
    case 'q4_last':
      startDate = new Date(currentYear - 1, 9, 1);
      return { startDate, endDate: new Date(currentYear - 1, 11, 31) };
    case 'all':
    case 'all_time':
      startDate = new Date(2020, 0, 1);
      break;
    case '2024':
      startDate = new Date(2024, 0, 1);
      return { startDate, endDate: new Date(2024, 11, 31) };
    case '2025':
      startDate = new Date(2025, 0, 1);
      return { startDate, endDate: new Date(2025, 11, 31) };
    case '2026':
      startDate = new Date(2026, 0, 1);
      return { startDate, endDate: new Date(2026, 11, 31) };
    default:
      // Try parsing as number of days
      const days = parseInt(filter);
      if (!isNaN(days) && days > 0) {
        startDate = subDays(now, days);
      } else {
        // Fallback to year to date
        startDate = startOfYear(now);
      }
  }

  return { startDate, endDate };
}

export function formatDateForQuery(date: Date): string {
  return date.toISOString().split('T')[0];
}
