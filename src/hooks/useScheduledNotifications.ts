/**
 * useScheduledNotifications - Scheduled notifications management
 * 
 * @architecture Schema-per-Tenant
 * @domain Notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ScheduledNotification {
  id: string;
  tenant_id: string;
  title: string;
  message: string | null;
  type: string;
  target_users: string[];
  schedule_type: 'once' | 'daily' | 'weekly' | 'monthly';
  schedule_time: string;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  next_run_at: string | null;
  last_run_at: string | null;
  is_active: boolean;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledNotificationInput {
  title: string;
  message?: string;
  type?: string;
  target_users?: string[];
  schedule_type: 'once' | 'daily' | 'weekly' | 'monthly';
  schedule_time: string;
  schedule_day_of_week?: number;
  schedule_day_of_month?: number;
  is_active?: boolean;
  metadata?: Json;
}

// Fetch scheduled notifications
export function useScheduledNotifications() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['scheduled-notifications', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = client
        .from('scheduled_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (shouldAddTenantFilter) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ScheduledNotification[];
    },
    enabled: !!tenantId && isReady,
  });
}

// Create scheduled notification
export function useCreateScheduledNotification() {
  const queryClient = useQueryClient();
  const { client, tenantId } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (input: ScheduledNotificationInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      const nextRunAt = calculateNextRun(input);

      const { data, error } = await client
        .from('scheduled_notifications')
        .insert(
          {
            tenant_id: tenantId,
            title: input.title,
            message: input.message,
            type: input.type || 'reminder',
            target_users: input.target_users || [],
            schedule_type: input.schedule_type,
            schedule_time: input.schedule_time,
            schedule_day_of_week: input.schedule_day_of_week,
            schedule_day_of_month: input.schedule_day_of_month,
            next_run_at: nextRunAt,
            is_active: input.is_active ?? true,
            metadata: input.metadata,
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
      toast.success('Đã tạo thông báo định kỳ');
    },
    onError: (error: Error) => {
      toast.error('Không thể tạo thông báo', { description: error.message });
    },
  });
}

// Update scheduled notification
export function useUpdateScheduledNotification() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ id, ...input }: ScheduledNotificationInput & { id: string }) => {
      const nextRunAt = calculateNextRun(input);

      const { data, error } = await client
        .from('scheduled_notifications')
        .update({
          title: input.title,
          message: input.message,
          type: input.type,
          target_users: input.target_users,
          schedule_type: input.schedule_type,
          schedule_time: input.schedule_time,
          schedule_day_of_week: input.schedule_day_of_week,
          schedule_day_of_month: input.schedule_day_of_month,
          next_run_at: nextRunAt,
          is_active: input.is_active,
          metadata: input.metadata,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
      toast.success('Đã cập nhật thông báo');
    },
    onError: (error: Error) => {
      toast.error('Không thể cập nhật thông báo', { description: error.message });
    },
  });
}

// Delete scheduled notification
export function useDeleteScheduledNotification() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('scheduled_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
      toast.success('Đã xóa thông báo');
    },
    onError: (error: Error) => {
      toast.error('Không thể xóa thông báo', { description: error.message });
    },
  });
}

// Toggle active status
export function useToggleScheduledNotification() {
  const queryClient = useQueryClient();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await client
        .from('scheduled_notifications')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-notifications'] });
    },
  });
}

function calculateNextRun(input: ScheduledNotificationInput): string {
  const now = new Date();
  const [hours, minutes] = input.schedule_time.split(':').map(Number);
  
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun <= now) {
    switch (input.schedule_type) {
      case 'once':
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        const targetDay = input.schedule_day_of_week ?? 0;
        const daysUntilTarget = (targetDay - now.getDay() + 7) % 7 || 7;
        nextRun.setDate(now.getDate() + daysUntilTarget);
        break;
      case 'monthly':
        const targetDate = input.schedule_day_of_month ?? 1;
        nextRun = new Date(now.getFullYear(), now.getMonth() + 1, targetDate, hours, minutes);
        break;
    }
  }

  return nextRun.toISOString();
}
