/**
 * useTenantModules - Hook for Tenant Modules Management
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Note: tenant_modules is a platform-level table, uses supabase directly
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TenantModule {
  id: string;
  tenant_id: string;
  module_id: string;
  is_enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  module?: {
    code: string;
    name: string;
    icon: string | null;
    color: string | null;
    is_core: boolean;
  };
}

/**
 * Get modules for a specific tenant
 * Note: This is a platform-level query (admin access)
 */
export function useTenantModules(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant-modules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('tenant_modules')
        .select(`
          *,
          module:platform_modules (
            code,
            name,
            icon,
            color,
            is_core
          )
        `)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return data as TenantModule[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Update tenant modules (bulk operation)
 * Note: This is an admin-only operation
 */
export function useUpdateTenantModules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      tenantId, 
      modules 
    }: { 
      tenantId: string; 
      modules: { moduleId: string; isEnabled: boolean }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get existing tenant_modules
      const { data: existing, error: fetchError } = await supabase
        .from('tenant_modules')
        .select('id, module_id')
        .eq('tenant_id', tenantId);

      if (fetchError) throw fetchError;

      const existingMap = new Map((existing || []).map(e => [e.module_id, e.id]));

      // Prepare upserts and updates
      const toUpsert: any[] = [];
      const toUpdate: { id: string; is_enabled: boolean }[] = [];

      for (const mod of modules) {
        const existingId = existingMap.get(mod.moduleId);
        
        if (existingId) {
          toUpdate.push({ id: existingId, is_enabled: mod.isEnabled });
        } else {
          toUpsert.push({
            tenant_id: tenantId,
            module_id: mod.moduleId,
            is_enabled: mod.isEnabled,
            enabled_at: mod.isEnabled ? new Date().toISOString() : null,
            enabled_by: mod.isEnabled ? user?.id : null,
          });
        }
      }

      // Insert new records
      if (toUpsert.length > 0) {
        const { error: insertError } = await supabase
          .from('tenant_modules')
          .insert(toUpsert);
        if (insertError) throw insertError;
      }

      // Update existing records
      for (const item of toUpdate) {
        const { error: updateError } = await supabase
          .from('tenant_modules')
          .update({ 
            is_enabled: item.is_enabled,
            enabled_at: item.is_enabled ? new Date().toISOString() : null,
            enabled_by: item.is_enabled ? user?.id : null,
          })
          .eq('id', item.id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules', variables.tenantId] });
      toast({
        title: 'Cập nhật thành công',
        description: 'Modules của tenant đã được cập nhật',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Initialize tenant modules from plan defaults
 * Note: This is an admin-only operation
 */
export function useInitializeTenantModules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      tenantId, 
      planCode 
    }: { 
      tenantId: string; 
      planCode: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get plan with its modules
      const { data: plan, error: planError } = await supabase
        .from('platform_plans')
        .select('id')
        .eq('code', planCode)
        .single();

      if (planError) throw planError;

      // Get modules included in the plan
      const { data: planModules, error: pmError } = await supabase
        .from('plan_modules')
        .select('module_id')
        .eq('plan_id', plan.id)
        .eq('is_included', true);

      if (pmError) throw pmError;

      // Also get core modules (always enabled)
      const { data: coreModules, error: coreError } = await supabase
        .from('platform_modules')
        .select('id')
        .eq('is_core', true);

      if (coreError) throw coreError;

      // Combine unique module IDs
      const moduleIds = new Set([
        ...(planModules || []).map(pm => pm.module_id),
        ...(coreModules || []).map(cm => cm.id),
      ]);

      // Delete existing tenant_modules (if reinitializing)
      await supabase
        .from('tenant_modules')
        .delete()
        .eq('tenant_id', tenantId);

      // Insert new tenant_modules
      if (moduleIds.size > 0) {
        const { error: insertError } = await supabase
          .from('tenant_modules')
          .insert(
            Array.from(moduleIds).map(moduleId => ({
              tenant_id: tenantId,
              module_id: moduleId,
              is_enabled: true,
              enabled_at: new Date().toISOString(),
              enabled_by: user?.id,
            }))
          );
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules', variables.tenantId] });
      toast({
        title: 'Khởi tạo thành công',
        description: 'Modules đã được gán theo gói dịch vụ',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
