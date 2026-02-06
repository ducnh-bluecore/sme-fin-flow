/**
 * useSourceProgress - Hook to fetch source-level progress for a backfill job
 * 
 * @architecture Layer 10 Integration UI
 * Provides granular visibility into which data sources are being synced.
 * Uses direct Supabase client (not tenant-scoped) since backfill_source_progress
 * is an admin-level table.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SourceProgressRecord {
  id: string;
  job_id: string;
  source_name: string;
  dataset: string;
  table_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  total_records: number;
  processed_records: number;
  last_offset: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useSourceProgress(jobId: string | null) {
  return useQuery({
    queryKey: ['backfill-source-progress', jobId],
    queryFn: async (): Promise<SourceProgressRecord[]> => {
      if (!jobId) return [];

      const { data, error } = await supabase
        .from('backfill_source_progress')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching source progress:', error);
        throw error;
      }

      return (data || []) as SourceProgressRecord[];
    },
    enabled: !!jobId,
    refetchInterval: 3000, // Poll every 3 seconds when job is active
    staleTime: 1000,
  });
}

// Helper to get status badge info
export function getSourceStatusInfo(status: SourceProgressRecord['status']) {
  switch (status) {
    case 'completed':
      return { label: 'Completed', variant: 'default' as const, icon: '✓' };
    case 'running':
      return { label: 'Running', variant: 'secondary' as const, icon: '⏳' };
    case 'failed':
      return { label: 'Failed', variant: 'destructive' as const, icon: '✗' };
    case 'pending':
      return { label: 'Pending', variant: 'outline' as const, icon: '⏸' };
    case 'skipped':
      return { label: 'Skipped', variant: 'outline' as const, icon: '⏭' };
    default:
      return { label: status, variant: 'outline' as const, icon: '?' };
  }
}
