/**
 * useDailySyncRuns - Hook for daily sync run history
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const E2E_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

export interface DailySyncRun {
  id: string;
  tenant_id: string;
  run_type: string;
  status: string;
  date_from: string | null;
  total_duration_ms: number | null;
  total_models: number;
  succeeded_count: number;
  failed_count: number;
  total_records_processed: number;
  results: Record<string, { success: boolean; duration_ms: number; error?: string; processed?: number }>;
  error_summary: string | null;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export function useDailySyncRuns(limit = 20) {
  return useQuery({
    queryKey: ['daily-sync-runs', limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('daily_sync_runs')
        .select('*')
        .eq('tenant_id', E2E_TENANT_ID)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as DailySyncRun[];
    },
    refetchInterval: 15000,
  });
}

export function useTriggerDailySync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lookbackDays?: number) => {
      const days = lookbackDays ?? 2;
      const { data, error } = await supabase.functions.invoke('daily-bigquery-sync', {
        body: {
          triggered_by: 'manual',
          lookback_days: days,
        },
      });

      if (error) throw new Error(error.message || 'Failed to trigger daily sync');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-sync-runs'] });
      queryClient.invalidateQueries({ queryKey: ['backfill-jobs-all'] });
    },
  });
}
