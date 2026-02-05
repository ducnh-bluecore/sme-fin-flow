/**
 * Notification Recipients Hook
 * 
 * CRUD operations for notification recipients.
 * 
 * @architecture Schema-per-Tenant v1.4.1
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { toast } from 'sonner';

export interface NotificationRecipient {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  slack_user_id: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecipientInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  slack_user_id?: string | null;
  role: string;
  is_active?: boolean;
}

export function useNotificationRecipients() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['notification-recipients', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await buildSelectQuery('notification_recipients', '*')
        .order('role', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as unknown as NotificationRecipient[]) || [];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useSaveNotificationRecipient() {
  const queryClient = useQueryClient();
  const { client, tenantId, shouldAddTenantFilter } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (recipient: NotificationRecipientInput & { id?: string }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const dataToSave = {
        tenant_id: tenantId,
        name: recipient.name,
        email: recipient.email || null,
        phone: recipient.phone || null,
        slack_user_id: recipient.slack_user_id || null,
        role: recipient.role,
        is_active: recipient.is_active ?? true,
      };

      if (recipient.id) {
        const { data, error } = await client
          .from('notification_recipients')
          .update(dataToSave)
          .eq('id', recipient.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await client
          .from('notification_recipients')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-recipients'] });
      toast.success('Đã lưu thông tin người nhận');
    },
    onError: (error) => {
      console.error('Error saving recipient:', error);
      toast.error('Lỗi khi lưu: ' + error.message);
    },
  });
}

export function useDeleteNotificationRecipient() {
  const queryClient = useQueryClient();
  const { client } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client
        .from('notification_recipients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-recipients'] });
      toast.success('Đã xóa người nhận');
    },
    onError: (error) => {
      console.error('Error deleting recipient:', error);
      toast.error('Lỗi khi xóa: ' + error.message);
    },
  });
}
