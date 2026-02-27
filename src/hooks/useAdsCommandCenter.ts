/**
 * Ads Command Center hooks - SSOT for all ads management data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenantContext } from '@/contexts/TenantContext';

// ============ Platform Connections ============
export function useAdsConnections() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ads-connections', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('ads_platform_connections', '*');
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        // Never expose credentials to client - just show presence
        has_credentials: !!row.credentials && Object.keys(row.credentials).length > 0,
        credentials: undefined,
      }));
    },
    enabled: !!tenantId && isReady,
  });
}

export function useSaveAdsConnection() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, platform, account_id, account_name, credentials }: {
      id?: string;
      platform: string;
      account_id: string;
      account_name?: string;
      credentials: Record<string, string>;
    }) => {
      if (!tenantId) throw new Error('No tenant');

      if (id) {
        const { error } = await buildUpdateQuery('ads_platform_connections', {
          account_id,
          account_name,
          credentials,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await buildInsertQuery('ads_platform_connections', {
          tenant_id: tenantId,
          platform,
          account_id,
          account_name,
          credentials,
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-connections'] });
      toast.success('Đã lưu kết nối');
    },
    onError: (e) => toast.error(`Lỗi: ${e.message}`),
  });
}

// ============ Rules ============
export function useAdsRules() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ads-rules', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('ads_rules', '*');
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useSaveAdsRule() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (rule: {
      id?: string;
      rule_name: string;
      platform: string;
      rule_type: string;
      conditions: any[];
      actions: any;
      is_active?: boolean;
      priority?: number;
    }) => {
      if (!tenantId) throw new Error('No tenant');

      if (rule.id) {
        const { error } = await buildUpdateQuery('ads_rules', {
          rule_name: rule.rule_name,
          platform: rule.platform,
          rule_type: rule.rule_type,
          conditions: rule.conditions,
          actions: rule.actions,
          is_active: rule.is_active ?? true,
          priority: rule.priority ?? 0,
        }).eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await buildInsertQuery('ads_rules', {
          tenant_id: tenantId,
          rule_name: rule.rule_name,
          platform: rule.platform,
          rule_type: rule.rule_type,
          conditions: rule.conditions,
          actions: rule.actions,
          is_active: rule.is_active ?? true,
          priority: rule.priority ?? 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-rules'] });
      toast.success('Đã lưu rule');
    },
    onError: (e) => toast.error(`Lỗi: ${e.message}`),
  });
}

export function useDeleteAdsRule() {
  const queryClient = useQueryClient();
  const { buildDeleteQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildDeleteQuery('ads_rules').eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-rules'] });
      toast.success('Đã xóa rule');
    },
  });
}

// ============ Recommendations ============
export function useAdsRecommendations(status?: string) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ads-recommendations', tenantId, status],
    queryFn: async () => {
      let query = buildSelectQuery('ads_recommendations', '*');
      if (status) query = query.eq('status', status);
      const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useApproveRecommendation() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await buildUpdateQuery('ads_recommendations', {
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;

      // Auto-execute after approval
      const { error: execError } = await supabase.functions.invoke('ads-execute-action', {
        body: { recommendation_id: id },
      });
      if (execError) {
        console.error('Execute error:', execError);
        toast.error('Đã duyệt nhưng thực thi gặp lỗi');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-recommendations'] });
      toast.success('Đã duyệt và đang thực thi');
    },
    onError: (e) => toast.error(`Lỗi: ${e.message}`),
  });
}

export function useRejectRecommendation() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await buildUpdateQuery('ads_recommendations', {
        status: 'rejected',
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-recommendations'] });
      toast.success('Đã từ chối');
    },
  });
}

// ============ Content ============
export function useAdsContent(status?: string) {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ads-content', tenantId, status],
    queryFn: async () => {
      let query = buildSelectQuery('ads_content', '*');
      if (status) query = query.eq('status', status);
      const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useGenerateAdsContent() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenantContext();

  return useMutation({
    mutationFn: async ({ product_id, platform, content_type }: {
      product_id?: string;
      platform: string;
      content_type: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('ads-content-generator', {
        body: {
          tenant_id: activeTenant?.id,
          product_id,
          platform,
          content_type,
          user_id: user?.id,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-content'] });
      toast.success('Đã tạo nội dung');
    },
    onError: (e) => toast.error(`Lỗi: ${e.message}`),
  });
}

export function useUpdateAdsContentStatus() {
  const queryClient = useQueryClient();
  const { buildUpdateQuery } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, status, review_comment }: {
      id: string;
      status: string;
      review_comment?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await buildUpdateQuery('ads_content', {
        status,
        review_comment,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-content'] });
      toast.success('Đã cập nhật');
    },
  });
}

// ============ Sync & Optimize ============
export function useSyncCampaigns() {
  const { activeTenant } = useTenantContext();

  return useMutation({
    mutationFn: async (platform?: string) => {
      const { data, error } = await supabase.functions.invoke('ads-sync-campaigns', {
        body: { tenant_id: activeTenant?.id, platform },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Đồng bộ thành công: ${data?.synced || 0} nền tảng`);
    },
    onError: (e) => toast.error(`Lỗi sync: ${e.message}`),
  });
}

export function useRunOptimizer() {
  const queryClient = useQueryClient();
  const { activeTenant } = useTenantContext();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ads-optimizer-engine', {
        body: { tenant_id: activeTenant?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ads-recommendations'] });
      toast.success(`Phân tích xong: ${data?.recommendations || 0} đề xuất mới`);
    },
    onError: (e) => toast.error(`Lỗi: ${e.message}`),
  });
}

// ============ Execution Log ============
export function useAdsExecutionLog() {
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ads-execution-log', tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('ads_execution_log', '*');
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId && isReady,
  });
}
