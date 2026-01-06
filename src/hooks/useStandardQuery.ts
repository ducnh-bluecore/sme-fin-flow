import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useActiveTenantId } from './useActiveTenantId';
import { useDateRangeForQuery } from '@/contexts/DateRangeContext';

export interface StandardQueryConfig<TData> {
  queryKey: string[];
  queryFn: (params: {
    tenantId: string;
    startDateStr: string;
    endDateStr: string;
    dateRange: string;
  }) => Promise<TData>;
  
  // Data to return when tenantId is not available
  emptyData: TData;
  
  // Whether this query depends on date range (default: true)
  dateDependent?: boolean;
  
  // Additional query options
  staleTime?: number;
  retry?: number | boolean;
  refetchOnWindowFocus?: boolean;
}

export interface StandardQueryResult<TData> {
  data: TData;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  hasData: boolean;
  refetch: () => void;
  isFetching: boolean;
}

/**
 * Standardized query hook that handles:
 * - Tenant ID resolution
 * - Date range filtering
 * - Empty state management
 * - Error handling with graceful fallback
 * - Consistent loading states
 */
export function useStandardQuery<TData>(
  config: StandardQueryConfig<TData>
): StandardQueryResult<TData> {
  const { data: tenantId, isLoading: tenantLoading } = useActiveTenantId();
  const { startDateStr, endDateStr, dateRange } = useDateRangeForQuery();

  const {
    queryKey,
    queryFn,
    emptyData,
    dateDependent = true,
    staleTime = 60000,
    retry = 2,
    refetchOnWindowFocus = false,
  } = config;

  // Build the full query key including tenantId + concrete date bounds when applicable
  // (Important: for `custom` ranges we must include start/end, otherwise React Query will not refetch.)
  const fullQueryKey = dateDependent
    ? [...queryKey, tenantId, dateRange, startDateStr, endDateStr]
    : [...queryKey, tenantId];

  const query = useQuery({
    queryKey: fullQueryKey,
    queryFn: async () => {
      if (!tenantId) {
        return emptyData;
      }
      
      try {
        return await queryFn({
          tenantId,
          startDateStr,
          endDateStr,
          dateRange,
        });
      } catch (error) {
        console.error(`Query error for ${queryKey.join('/')}:`, error);
        throw error;
      }
    },
    staleTime,
    retry,
    refetchOnWindowFocus,
    enabled: !tenantLoading,
  });

  // Determine if data is empty
  const isEmpty = checkIfEmpty(query.data, emptyData);
  const hasData = !isEmpty && !query.isLoading && !query.isError;

  return {
    data: query.data ?? emptyData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty,
    hasData,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Check if data matches the empty state
 */
function checkIfEmpty<T>(data: T | undefined, emptyData: T): boolean {
  if (data === undefined || data === null) return true;
  
  // Array check
  if (Array.isArray(data)) {
    return data.length === 0;
  }
  
  // Object with numeric values (like KPIs)
  if (typeof data === 'object') {
    const values = Object.values(data as Record<string, unknown>);
    // Check if all numeric values are 0
    const numericValues = values.filter(v => typeof v === 'number') as number[];
    if (numericValues.length > 0 && numericValues.every(v => v === 0)) {
      return true;
    }
    
    // Check if all array values are empty
    const arrayValues = values.filter(v => Array.isArray(v)) as unknown[][];
    if (arrayValues.length > 0 && arrayValues.every(arr => arr.length === 0)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Hook for queries that don't depend on tenant (public data)
 */
export function usePublicQuery<TData>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: Partial<UseQueryOptions<TData, Error>>
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: 300000, // 5 minutes for public data
    retry: 2,
    ...options,
  });
}
