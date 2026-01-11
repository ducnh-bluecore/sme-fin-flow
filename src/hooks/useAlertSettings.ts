import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';

// Chuẩn hóa severity: critical, warning, info (thay thế high, medium, low)
export interface AlertTypeConfig {
  enabled: boolean;
  threshold?: number;
  severity: 'critical' | 'warning' | 'info';
}

export interface AlertConfigs {
  cash_critical: AlertTypeConfig;
  ar_overdue: AlertTypeConfig;
  data_quality: AlertTypeConfig;
  reconciliation: AlertTypeConfig;
  risk: AlertTypeConfig;
}

export interface AlertSettings {
  id: string;
  tenant_id: string;
  alert_configs: AlertConfigs;
  notification_email: boolean;
  notification_slack: boolean;
  notification_push: boolean;
  email_address: string | null;
  slack_webhook: string | null;
  notify_immediately: boolean;
  notify_daily_summary: boolean;
  notify_weekly_summary: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertSettingsInput {
  alert_configs: AlertConfigs;
  notification_email: boolean;
  notification_slack: boolean;
  notification_push: boolean;
  email_address?: string;
  slack_webhook?: string;
  notify_immediately: boolean;
  notify_daily_summary: boolean;
  notify_weekly_summary: boolean;
}

const defaultAlertConfigs: AlertConfigs = {
  cash_critical: { enabled: true, threshold: 100000000, severity: 'critical' },
  ar_overdue: { enabled: true, threshold: 30, severity: 'critical' },
  data_quality: { enabled: true, severity: 'warning' },
  reconciliation: { enabled: true, threshold: 7, severity: 'warning' },
  risk: { enabled: true, severity: 'critical' },
};

const defaultSettings: AlertSettingsInput = {
  alert_configs: defaultAlertConfigs,
  notification_email: true,
  notification_slack: false,
  notification_push: false,
  notify_immediately: true,
  notify_daily_summary: false,
  notify_weekly_summary: false,
};

export function useAlertSettings() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['alert-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      
      // Return data with proper typing, or null if no settings exist
      if (data) {
        return {
          ...data,
          alert_configs: data.alert_configs as unknown as AlertConfigs,
        } as AlertSettings;
      }
      
      return null;
    },
    enabled: !!tenantId,
  });
}

export function useSaveAlertSettings() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (settings: AlertSettingsInput) => {
      if (!tenantId) throw new Error('No tenant selected');

      // Check if settings exist
      const { data: existing } = await supabase
        .from('alert_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('alert_settings')
          .update({
            alert_configs: JSON.parse(JSON.stringify(settings.alert_configs)),
            notification_email: settings.notification_email,
            notification_slack: settings.notification_slack,
            notification_push: settings.notification_push,
            email_address: settings.email_address || null,
            slack_webhook: settings.slack_webhook || null,
            notify_immediately: settings.notify_immediately,
            notify_daily_summary: settings.notify_daily_summary,
            notify_weekly_summary: settings.notify_weekly_summary,
          })
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new - use upsert pattern
        const insertData = {
          tenant_id: tenantId,
          alert_configs: JSON.parse(JSON.stringify(settings.alert_configs)),
          notification_email: settings.notification_email,
          notification_slack: settings.notification_slack,
          notification_push: settings.notification_push,
          email_address: settings.email_address || null,
          slack_webhook: settings.slack_webhook || null,
          notify_immediately: settings.notify_immediately,
          notify_daily_summary: settings.notify_daily_summary,
          notify_weekly_summary: settings.notify_weekly_summary,
        };

        const { data, error } = await supabase
          .from('alert_settings')
          .upsert(insertData as never, { onConflict: 'tenant_id' })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });
      toast.success('Đã lưu cấu hình cảnh báo');
    },
    onError: (error) => {
      console.error('Error saving alert settings:', error);
      toast.error('Lỗi khi lưu cấu hình: ' + error.message);
    },
  });
}

export { defaultAlertConfigs, defaultSettings };
