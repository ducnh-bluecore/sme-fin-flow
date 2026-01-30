/**
 * useControlTowerPriorityQueue
 * 
 * Hook to manage the Control Tower priority queue.
 * Aggregates signals from FDP, MDP, and CDP.
 * 
 * Refactored to Schema-per-Tenant architecture.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';
import { SourceModule } from '@/types/cross-module';
import { toast } from 'sonner';

interface PrioritySignal {
  id: string;
  signalType: 'variance' | 'alert' | 'decision' | 'risk';
  sourceModule: SourceModule;
  sourceId?: string;
  priorityScore: number;
  impactAmount: number;
  urgencyHours: number;
  title: string;
  description?: string;
  recommendedAction?: string;
  actionUrl?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  assignedTo?: string;
  createdAt: string;
}

interface QueueRow {
  id: string;
  tenant_id: string;
  signal_type: string;
  source_module: string;
  source_id: string | null;
  priority_score: number | null;
  impact_amount: number | null;
  urgency_hours: number | null;
  title: string;
  description: string | null;
  recommended_action: string | null;
  action_url: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToSignal(row: QueueRow): PrioritySignal {
  return {
    id: row.id,
    signalType: row.signal_type as PrioritySignal['signalType'],
    sourceModule: row.source_module as SourceModule,
    sourceId: row.source_id ?? undefined,
    priorityScore: row.priority_score ?? 50,
    impactAmount: row.impact_amount ?? 0,
    urgencyHours: row.urgency_hours ?? 24,
    title: row.title,
    description: row.description ?? undefined,
    recommendedAction: row.recommended_action ?? undefined,
    actionUrl: row.action_url ?? undefined,
    status: row.status as PrioritySignal['status'],
    assignedTo: row.assigned_to ?? undefined,
    createdAt: row.created_at,
  };
}

interface UseQueueOptions {
  status?: 'pending' | 'in_progress' | 'resolved' | 'dismissed' | 'all';
  sourceModule?: SourceModule;
  limit?: number;
}

export function useControlTowerPriorityQueue(options: UseQueueOptions = {}) {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();
  const { status = 'pending', sourceModule, limit = 20 } = options;

  return useQuery<PrioritySignal[]>({
    queryKey: ['control-tower-queue', tenantId, status, sourceModule, limit],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('control_tower_priority_queue' as any)
        .select('*')
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (sourceModule) {
        query = query.eq('source_module', sourceModule);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching priority queue:', error);
        return [];
      }

      return ((data ?? []) as unknown as QueueRow[]).map(mapRowToSignal);
    },
    enabled: !!tenantId && isReady,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Get queue statistics
 */
export function useControlTowerQueueStats() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['control-tower-queue-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      let query = client
        .from('control_tower_priority_queue' as any)
        .select('status, source_module, priority_score, impact_amount');

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching queue stats:', error);
        return null;
      }

      const rows = (data ?? []) as unknown as Array<{
        status: string;
        source_module: string;
        priority_score: number | null;
        impact_amount: number | null;
      }>;

      const pending = rows.filter((r) => r.status === 'pending');
      const byModule = {
        FDP: pending.filter((r) => r.source_module === 'FDP').length,
        MDP: pending.filter((r) => r.source_module === 'MDP').length,
        CDP: pending.filter((r) => r.source_module === 'CDP').length,
      };

      return {
        totalPending: pending.length,
        byModule,
        totalImpact: pending.reduce((sum, r) => sum + (r.impact_amount ?? 0), 0),
        criticalCount: pending.filter((r) => (r.priority_score ?? 0) >= 80).length,
      };
    },
    enabled: !!tenantId && isReady,
  });
}

/**
 * Refresh the priority queue by aggregating signals from all modules
 */
export function useRefreshPriorityQueue() {
  const { client, tenantId } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await client.rpc('control_tower_aggregate_signals' as any, {
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-queue'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-queue-stats'] });
      if (count > 0) {
        toast.success(`Đã thêm ${count} tín hiệu mới vào hàng đợi`);
      }
    },
    onError: (error) => {
      console.error('Failed to refresh queue:', error);
      toast.error('Lỗi khi cập nhật hàng đợi');
    },
  });
}

/**
 * Update signal status
 */
export function useUpdateSignalStatus() {
  const { client } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      signalId,
      status,
    }: {
      signalId: string;
      status: PrioritySignal['status'];
    }) => {
      const { error } = await client
        .from('control_tower_priority_queue' as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', signalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-queue'] });
      queryClient.invalidateQueries({ queryKey: ['control-tower-queue-stats'] });
    },
  });
}

/**
 * Assign signal to user
 */
export function useAssignSignal() {
  const { client } = useTenantSupabaseCompat();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      signalId,
      userId,
    }: {
      signalId: string;
      userId: string;
    }) => {
      const { error } = await client
        .from('control_tower_priority_queue' as any)
        .update({
          assigned_to: userId,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', signalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-tower-queue'] });
      toast.success('Đã phân công xử lý');
    },
  });
}
