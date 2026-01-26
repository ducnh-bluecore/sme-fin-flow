/**
 * useAlertEscalation - Alert escalation rules management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface EscalationRule {
  id: string;
  tenant_id: string;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  escalate_after_minutes: number;
  escalate_to_role: string;
  notify_channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DigestConfig {
  id: string;
  tenant_id: string;
  daily_enabled: boolean;
  daily_time: string;
  weekly_enabled: boolean;
  weekly_day: number;
  weekly_time: string;
  include_resolved: boolean;
  include_summary: boolean;
  created_at: string;
  updated_at: string;
}

export function useEscalationRules() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  const { data: rules, isLoading, error } = useQuery({
    queryKey: ['escalation-rules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('alert_escalation_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('severity', { ascending: true })
        .order('escalate_after_minutes', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(rule => ({
        ...rule,
        notify_channels: Array.isArray(rule.notify_channels) 
          ? rule.notify_channels 
          : JSON.parse(rule.notify_channels as string || '[]'),
      })) as EscalationRule[];
    },
    enabled: !!tenantId,
  });

  const createRule = useMutation({
    mutationFn: async (rule: Omit<EscalationRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data, error } = await supabase
        .from('alert_escalation_rules')
        .insert({
          tenant_id: tenantId,
          name: rule.name,
          severity: rule.severity,
          escalate_after_minutes: rule.escalate_after_minutes,
          escalate_to_role: rule.escalate_to_role,
          notify_channels: rule.notify_channels,
          is_active: rule.is_active,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules', tenantId] });
      toast.success('Đã tạo quy tắc leo thang');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EscalationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('alert_escalation_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules', tenantId] });
      toast.success('Đã cập nhật quy tắc');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alert_escalation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules', tenantId] });
      toast.success('Đã xóa quy tắc');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('alert_escalation_rules')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules', tenantId] });
      toast.success(is_active ? 'Đã bật quy tắc' : 'Đã tắt quy tắc');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  return {
    rules: rules || [],
    isLoading,
    error,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
  };
}

export function useDigestConfig() {
  const { data: tenantId } = useActiveTenantId();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['digest-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('alert_digest_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return {
          daily_enabled: true,
          daily_time: '08:00',
          weekly_enabled: true,
          weekly_day: 1,
          weekly_time: '09:00',
          include_resolved: true,
          include_summary: true,
        } as Partial<DigestConfig>;
      }
      
      return data as DigestConfig;
    },
    enabled: !!tenantId,
  });

  const saveConfig = useMutation({
    mutationFn: async (newConfig: Omit<DigestConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('No tenant selected');
      
      const { data, error } = await supabase
        .from('alert_digest_configs')
        .upsert({
          tenant_id: tenantId,
          daily_enabled: newConfig.daily_enabled,
          daily_time: newConfig.daily_time,
          weekly_enabled: newConfig.weekly_enabled,
          weekly_day: newConfig.weekly_day,
          weekly_time: newConfig.weekly_time,
          include_resolved: newConfig.include_resolved,
          include_summary: newConfig.include_summary,
        }, {
          onConflict: 'tenant_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digest-config', tenantId] });
      toast.success('Đã lưu cài đặt tổng hợp');
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  return {
    config,
    isLoading,
    saveConfig,
  };
}
