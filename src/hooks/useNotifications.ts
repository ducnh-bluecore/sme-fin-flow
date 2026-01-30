import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';
import { useAuth } from './useAuth';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: 'info' | 'warning' | 'error' | 'success';
  category: string | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  alert_instance_id: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface CreateNotificationInput {
  title: string;
  message?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  category?: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
  alert_instance_id?: string;
  expires_at?: string;
}

// Fetch user's notifications
export function useNotifications(limit = 50) {
  const { user } = useAuth();
  const { client, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['notifications', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id && isReady,
  });
}

// Fetch unread count
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const { client, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id && isReady,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await client
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async () => {
      const { error } = await client
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('Đã đánh dấu tất cả là đã đọc');
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await client
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

// Clear all notifications
export function useClearAllNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { client } = useTenantSupabaseCompat();

  return useMutation({
    mutationFn: async () => {
      const { error } = await client
        .from('notifications')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('Đã xóa tất cả thông báo');
    },
  });
}

// Realtime subscription hook
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { client, isReady } = useTenantSupabaseCompat();

  useEffect(() => {
    if (!user?.id || !isReady) return;

    const channel = client
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          
          // Show toast for new notification
          const toastType = notification.type === 'error' ? 'error' 
            : notification.type === 'warning' ? 'warning'
            : notification.type === 'success' ? 'success' 
            : 'info';
          
          if (toastType === 'error') {
            toast.error(notification.title, { description: notification.message || undefined });
          } else if (toastType === 'warning') {
            toast.warning(notification.title, { description: notification.message || undefined });
          } else if (toastType === 'success') {
            toast.success(notification.title, { description: notification.message || undefined });
          } else {
            toast.info(notification.title, { description: notification.message || undefined });
          }

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user?.id, queryClient, client, isReady]);
}
