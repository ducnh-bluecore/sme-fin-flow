/**
 * useTenantSchemaStatus - Hook for Schema Provisioning Status
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * NOTE: Uses PLATFORM-LEVEL RPC that checks tenant provisioning status.
 * This is a Control Plane operation - uses direct supabase client because:
 * 1. RPCs like is_tenant_schema_provisioned are platform-level
 * 2. provision-tenant-schema Edge Function manages schema creation
 * 3. No tenant context needed - this determines the context itself
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SchemaStatus = 'provisioned' | 'pending' | 'error';

export interface TenantSchemaInfo {
  tenantId: string;
  isProvisioned: boolean;
  status: SchemaStatus;
}

/**
 * Check schema provisioning status for a single tenant
 * Note: This is a platform-level RPC
 */
export function useTenantSchemaStatus(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant-schema-status', tenantId],
    queryFn: async (): Promise<TenantSchemaInfo | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase.rpc('is_tenant_schema_provisioned', {
        p_tenant_id: tenantId
      });

      if (error) {
        console.error('[useTenantSchemaStatus] Error:', error);
        return {
          tenantId,
          isProvisioned: false,
          status: 'error',
        };
      }

      return {
        tenantId,
        isProvisioned: !!data,
        status: data ? 'provisioned' : 'pending',
      };
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Batch check schema status for multiple tenants
 */
export function useBatchTenantSchemaStatus(tenantIds: string[]) {
  return useQuery({
    queryKey: ['tenant-schema-status-batch', tenantIds],
    queryFn: async (): Promise<Map<string, TenantSchemaInfo>> => {
      const statusMap = new Map<string, TenantSchemaInfo>();

      if (!tenantIds.length) return statusMap;

      const results = await Promise.all(
        tenantIds.map(async (tenantId) => {
          try {
            const { data, error } = await supabase.rpc('is_tenant_schema_provisioned', {
              p_tenant_id: tenantId
            });

            if (error) {
              return { tenantId, isProvisioned: false, status: 'error' as SchemaStatus };
            }

            return {
              tenantId,
              isProvisioned: !!data,
              status: (data ? 'provisioned' : 'pending') as SchemaStatus,
            };
          } catch {
            return { tenantId, isProvisioned: false, status: 'error' as SchemaStatus };
          }
        })
      );

      results.forEach((info) => {
        statusMap.set(info.tenantId, info);
      });

      return statusMap;
    },
    enabled: tenantIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Provision a tenant schema via Edge Function
 */
export function useProvisionTenantSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, slug }: { tenantId: string; slug: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Bạn cần đăng nhập để thực hiện thao tác này');
      }

      const response = await supabase.functions.invoke('provision-tenant-schema', {
        body: { tenantId, slug }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Lỗi khi khởi tạo schema');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-schema-status', variables.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-schema-status-batch'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });

      toast.success('Khởi tạo schema thành công!', {
        description: `Schema ${data?.schema_name} đã được tạo với ${data?.tables_created} bảng.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi khởi tạo schema', {
        description: error.message,
      });
    },
  });
}
