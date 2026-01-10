import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface PushSubscription {
  id: string;
  tenant_id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  is_active: boolean;
  device_info: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function usePushNotificationSupport() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  return { isSupported, permission };
}

export function usePushSubscriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['push-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      return data as PushSubscription[];
    },
    enabled: !!user?.id,
  });
}

export function useSubscribePush() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications not supported');
      }

      if (!tenantId || !user?.id) {
        throw new Error('Missing tenant or user');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
      if (vapidError || !vapidData?.publicKey) {
        throw new Error('Failed to get VAPID key');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidData.publicKey,
      });

      const subscriptionJson = subscription.toJSON();
      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Invalid subscription');
      }

      const insertData = {
        tenant_id: tenantId,
        user_id: user.id,
        endpoint: subscriptionJson.endpoint,
        p256dh_key: subscriptionJson.keys.p256dh,
        auth_key: subscriptionJson.keys.auth,
        is_active: true,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(insertData as never, { onConflict: 'user_id,endpoint' });

      if (error) throw error;
      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
      toast.success('Đã bật thông báo đẩy');
    },
    onError: (error: Error) => {
      toast.error('Không thể bật thông báo đẩy', { description: error.message });
    },
  });
}

export function useUnsubscribePush() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (subscriptionId?: string) => {
      if (subscriptionId) {
        const { error } = await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', subscriptionId)
          .eq('user_id', user?.id);
        if (error) throw error;
        return;
      }

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          const { error } = await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('user_id', user?.id)
            .eq('endpoint', subscription.endpoint);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscriptions'] });
      toast.success('Đã tắt thông báo đẩy');
    },
    onError: (error: Error) => {
      toast.error('Không thể tắt thông báo đẩy', { description: error.message });
    },
  });
}
