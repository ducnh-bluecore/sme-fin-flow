import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface CapacitorPushState {
  isNative: boolean;
  isRegistered: boolean;
  token: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
}

export function useCapacitorPushNotifications() {
  const { user } = useAuth();
  const { data: tenantId } = useActiveTenantId();
  const [state, setState] = useState<CapacitorPushState>({
    isNative: false,
    isRegistered: false,
    token: null,
    permissionStatus: 'unknown',
  });

  // Check if running on native platform
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    setState(prev => ({ ...prev, isNative }));
    
    if (!isNative) return;

    // Check current permission status
    checkPermissions();

    // Set up listeners
    const setupListeners = async () => {
      // On registration success
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        setState(prev => ({ ...prev, token: token.value, isRegistered: true }));
        
        // Save token to database
        if (user?.id && tenantId) {
          await saveTokenToDatabase(token.value);
        }
      });

      // On registration error
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error:', error);
        toast.error('Không thể đăng ký push notification');
      });

      // On push notification received (foreground)
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        toast.info(notification.title || 'Thông báo mới', {
          description: notification.body,
        });
      });

      // On push notification action performed (user tapped)
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        const data = action.notification.data;
        if (data?.url) {
          window.location.href = data.url;
        }
      });
    };

    setupListeners();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isNative, user?.id, tenantId]);

  const checkPermissions = async () => {
    if (!isNative) return;
    
    try {
      const result = await PushNotifications.checkPermissions();
      setState(prev => ({ 
        ...prev, 
        permissionStatus: result.receive as CapacitorPushState['permissionStatus']
      }));
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const saveTokenToDatabase = async (token: string) => {
    if (!user?.id || !tenantId) return;

    try {
      const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
      
      const insertData = {
        tenant_id: tenantId,
        user_id: user.id,
        endpoint: `fcm://${token}`, // Use FCM-style endpoint
        p256dh_key: platform, // Store platform info
        auth_key: 'capacitor', // Identifier for Capacitor push
        is_active: true,
        device_info: {
          platform,
          capacitor: true,
          userAgent: navigator.userAgent,
        },
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(insertData as never, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.error('Error saving push token:', error);
        throw error;
      }

      console.log('Push token saved successfully');
    } catch (error) {
      console.error('Error saving token to database:', error);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!isNative) {
      toast.error('Push notifications chỉ khả dụng trên ứng dụng di động');
      return false;
    }

    try {
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive === 'granted') {
        // Register with Apple / Google
        await PushNotifications.register();
        setState(prev => ({ ...prev, permissionStatus: 'granted' }));
        toast.success('Đã bật thông báo đẩy');
        return true;
      } else {
        setState(prev => ({ ...prev, permissionStatus: 'denied' }));
        toast.error('Quyền thông báo bị từ chối');
        return false;
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      toast.error('Không thể bật thông báo đẩy');
      return false;
    }
  }, [isNative]);

  const unregister = useCallback(async () => {
    if (!isNative || !state.token || !user?.id) return;

    try {
      // Deactivate in database
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('endpoint', `fcm://${state.token}`);

      if (error) throw error;

      setState(prev => ({ ...prev, isRegistered: false, token: null }));
      toast.success('Đã tắt thông báo đẩy');
    } catch (error) {
      console.error('Error unregistering push:', error);
      toast.error('Không thể tắt thông báo đẩy');
    }
  }, [isNative, state.token, user?.id]);

  return {
    ...state,
    requestPermission,
    unregister,
    checkPermissions,
  };
}
