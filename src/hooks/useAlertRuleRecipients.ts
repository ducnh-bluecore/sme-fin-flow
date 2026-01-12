import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface AlertRuleRecipient {
  id: string;
  tenant_id: string;
  rule_id: string;
  recipient_id: string;
  notify_on_critical: boolean;
  notify_on_warning: boolean;
  notify_on_info: boolean;
  created_at: string;
  recipient?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  };
}

export function useAlertRuleRecipients(ruleId?: string) {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  // Fetch recipients for a specific rule
  const recipientsQuery = useQuery({
    queryKey: ['alert-rule-recipients', ruleId, tenantId],
    queryFn: async () => {
      if (!tenantId || !ruleId) return [];

      const { data, error } = await supabase
        .from('alert_rule_recipients')
        .select(`
          *,
          recipient:notification_recipients(id, name, email, phone, role)
        `)
        .eq('tenant_id', tenantId)
        .eq('rule_id', ruleId);

      if (error) throw error;
      return (data || []) as AlertRuleRecipient[];
    },
    enabled: !!tenantId && !!ruleId,
  });

  // Add recipient to rule
  const addRecipient = useMutation({
    mutationFn: async ({ 
      ruleId, 
      recipientId, 
      notifyOnCritical = true, 
      notifyOnWarning = true, 
      notifyOnInfo = false 
    }: {
      ruleId: string;
      recipientId: string;
      notifyOnCritical?: boolean;
      notifyOnWarning?: boolean;
      notifyOnInfo?: boolean;
    }) => {
      if (!tenantId) throw new Error('No tenant');

      const { error } = await supabase
        .from('alert_rule_recipients')
        .insert({
          tenant_id: tenantId,
          rule_id: ruleId,
          recipient_id: recipientId,
          notify_on_critical: notifyOnCritical,
          notify_on_warning: notifyOnWarning,
          notify_on_info: notifyOnInfo,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rule-recipients'] });
      toast.success('Đã thêm người nhận');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Người nhận đã được thêm vào rule này');
      } else {
        toast.error('Không thể thêm người nhận');
      }
    },
  });

  // Remove recipient from rule
  const removeRecipient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alert_rule_recipients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rule-recipients'] });
      toast.success('Đã xóa người nhận');
    },
    onError: () => {
      toast.error('Không thể xóa người nhận');
    },
  });

  // Update recipient settings
  const updateRecipientSettings = useMutation({
    mutationFn: async ({ 
      id, 
      notifyOnCritical, 
      notifyOnWarning, 
      notifyOnInfo 
    }: {
      id: string;
      notifyOnCritical?: boolean;
      notifyOnWarning?: boolean;
      notifyOnInfo?: boolean;
    }) => {
      const updates: any = {};
      if (notifyOnCritical !== undefined) updates.notify_on_critical = notifyOnCritical;
      if (notifyOnWarning !== undefined) updates.notify_on_warning = notifyOnWarning;
      if (notifyOnInfo !== undefined) updates.notify_on_info = notifyOnInfo;

      const { error } = await supabase
        .from('alert_rule_recipients')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rule-recipients'] });
    },
    onError: () => {
      toast.error('Không thể cập nhật');
    },
  });

  return {
    recipients: recipientsQuery.data || [],
    isLoading: recipientsQuery.isLoading,
    addRecipient,
    removeRecipient,
    updateRecipientSettings,
    refetch: recipientsQuery.refetch,
  };
}

// Hook to get all available recipients for adding
export function useAvailableRecipients() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['notification-recipients', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('notification_recipients')
        .select('id, name, email, phone, role, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
}
