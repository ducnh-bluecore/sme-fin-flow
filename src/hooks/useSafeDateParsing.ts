import { useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Safely parses a date string or Date object
 * Returns null if the date is invalid
 */
export function safeParseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Safely formats a date to a specific format
 * Returns fallback if date is invalid
 */
export function safeFormatDate(
  date: string | Date | null | undefined,
  formatStr: string = 'dd/MM/yyyy',
  fallback: string = '-'
): string {
  const parsed = safeParseDate(date);
  if (!parsed) return fallback;
  try {
    return format(parsed, formatStr, { locale: vi });
  } catch {
    return fallback;
  }
}

/**
 * Safely gets the month key (yyyy-MM) from a date
 * Returns null if date is invalid
 */
export function safeGetMonthKey(date: string | Date | null | undefined): string | null {
  const parsed = safeParseDate(date);
  if (!parsed) return null;
  try {
    return format(parsed, 'yyyy-MM');
  } catch {
    return null;
  }
}

interface MonthlyAggregate {
  month: string;
  displayMonth: string;
  amount: number;
}

/**
 * Hook to aggregate data by month with safe date handling
 * @param data Array of data items
 * @param dateField The field name containing the date
 * @param amountField The field name containing the amount to sum
 * @returns Sorted array of monthly aggregates
 */
export function useMonthlyAggregate<T extends Record<string, any>>(
  data: T[] | undefined,
  dateField: keyof T,
  amountField: keyof T
): MonthlyAggregate[] {
  return useMemo(() => {
    if (!data || data.length === 0) return [];

    const monthlyData: Record<string, number> = {};

    data.forEach((item) => {
      const monthKey = safeGetMonthKey(item[dateField] as string | Date);
      if (monthKey) {
        const amount = Number(item[amountField]) || 0;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        displayMonth: safeFormatDate(`${month}-01`, 'MMM yyyy', month),
        amount,
      }));
  }, [data, dateField, amountField]);
}

/**
 * Hook to aggregate data by category/field with totals
 */
export function useCategoryAggregate<T extends Record<string, any>>(
  data: T[] | undefined,
  categoryField: keyof T,
  amountField: keyof T
): Record<string, number> {
  return useMemo(() => {
    if (!data || data.length === 0) return {};

    return data.reduce((acc, item) => {
      const category = String(item[categoryField] || 'other');
      const amount = Number(item[amountField]) || 0;
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
  }, [data, categoryField, amountField]);
}
