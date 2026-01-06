import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDateRangeFromFilter, formatDateForQuery } from '@/lib/dateUtils';

// Extended type to support more filter values
export type DateRangeValue = string;

interface DateRangeState {
  dateRange: DateRangeValue;
  customStartDate?: Date;
  customEndDate?: Date;
}

interface DateRangeContextType {
  dateRange: DateRangeValue;
  customStartDate?: Date;
  customEndDate?: Date;
  setDateRange: (range: DateRangeValue) => void;
  setCustomRange: (start: Date, end: Date) => void;
  refreshAllData: () => void;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

// Query keys that should be invalidated when date range changes
const DATE_SENSITIVE_QUERY_KEYS = [
  'dashboard-kpis',
  'cash-forecasts',
  'pl-data',
  'revenues',
  'revenues-data',
  'expenses',
  'expenses-analytics',
  'expenses-prev',
  'invoices',
  'invoices-list',
  'bank-transactions',
  'external-orders',
  'channel-settlements',
  'ar-aging',
  'overdue-invoices',
  'alerts-all',
  'scenarios',
  'channel-analytics',
  'financial-analysis',
  'cash-runway',
  'bills-data',
  'credit-notes',
  'debit-notes',
  'analytics-data',
  'kpi-data',
];

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<DateRangeState>({
    dateRange: 'all_time', // Default to all time to show all available data
  });

  const invalidateAllDateSensitiveQueries = useCallback(() => {
    DATE_SENSITIVE_QUERY_KEYS.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }, [queryClient]);

  const setDateRange = useCallback((range: DateRangeValue) => {
    setState(prev => ({ ...prev, dateRange: range, customStartDate: undefined, customEndDate: undefined }));
    // Automatically invalidate all date-sensitive queries
    invalidateAllDateSensitiveQueries();
  }, [invalidateAllDateSensitiveQueries]);

  const setCustomRange = useCallback((start: Date, end: Date) => {
    setState({
      dateRange: 'custom',
      customStartDate: start,
      customEndDate: end,
    });
    invalidateAllDateSensitiveQueries();
  }, [invalidateAllDateSensitiveQueries]);

  const refreshAllData = useCallback(() => {
    invalidateAllDateSensitiveQueries();
  }, [invalidateAllDateSensitiveQueries]);

  const value: DateRangeContextType = {
    dateRange: state.dateRange,
    customStartDate: state.customStartDate,
    customEndDate: state.customEndDate,
    setDateRange,
    setCustomRange,
    refreshAllData,
  };

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}

// Helper hook to get formatted date range for queries
export function useDateRangeForQuery() {
  const { dateRange, customStartDate, customEndDate } = useDateRange();
  
  const getStartDate = useCallback((): Date => {
    if (dateRange === 'custom' && customStartDate) {
      return customStartDate;
    }
    const { startDate } = getDateRangeFromFilter(dateRange);
    return startDate;
  }, [dateRange, customStartDate]);

  const getEndDate = useCallback((): Date => {
    if (dateRange === 'custom' && customEndDate) {
      return customEndDate;
    }
    const { endDate } = getDateRangeFromFilter(dateRange);
    return endDate;
  }, [dateRange, customEndDate]);

  const startDate = getStartDate();
  const endDate = getEndDate();

  return {
    startDate,
    endDate,
    startDateStr: formatDateForQuery(startDate),
    endDateStr: formatDateForQuery(endDate),
    dateRange,
  };
}
