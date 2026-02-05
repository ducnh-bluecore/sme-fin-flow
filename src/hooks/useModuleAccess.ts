/**
 * useModuleAccess - Hook for Module Access Control
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useActiveTenant } from '@/hooks/useTenant';

// Core module that is always available (base infrastructure)
const CORE_MODULE = 'data_warehouse';

export interface ModuleAccessResult {
  isLoading: boolean;
  enabledModules: string[];
  hasModule: (moduleCode: string) => boolean;
  hasAnyModule: (moduleCodes: string[]) => boolean;
  hasAllModules: (moduleCodes: string[]) => boolean;
}

/**
 * Hook to check which modules the current tenant has access to.
 * Used for feature gating in the UI.
 */
export function useModuleAccess(): ModuleAccessResult {
  const { data: tenant, isLoading: tenantLoading } = useActiveTenant();
  const { buildSelectQuery, isReady } = useTenantQueryBuilder();

  const { data: enabledModules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['module-access', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [CORE_MODULE];

      const { data, error } = await buildSelectQuery('tenant_modules', `
        is_enabled,
        module:platform_modules (
          code,
          is_core
        )
      `)
        .eq('is_enabled', true);

      if (error) {
        console.error('Error fetching tenant modules:', error);
        return [CORE_MODULE];
      }

      // Extract module codes
      const codes = ((data || []) as unknown as Array<{ is_enabled: boolean; module: { code: string; is_core: boolean } | null }>)
        .filter(tm => tm.is_enabled && tm.module)
        .map(tm => tm.module!.code);

      // Always include core module (data_warehouse)
      if (!codes.includes(CORE_MODULE)) {
        codes.push(CORE_MODULE);
      }

      return codes;
    },
    enabled: !!tenant?.id && isReady,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = tenantLoading || modulesLoading;

  const hasModule = (moduleCode: string): boolean => {
    if (moduleCode === CORE_MODULE) return true;
    return enabledModules.includes(moduleCode);
  };

  const hasAnyModule = (moduleCodes: string[]): boolean => {
    return moduleCodes.some(code => hasModule(code));
  };

  const hasAllModules = (moduleCodes: string[]): boolean => {
    return moduleCodes.every(code => hasModule(code));
  };

  return {
    isLoading,
    enabledModules,
    hasModule,
    hasAnyModule,
    hasAllModules,
  };
}

/**
 * Helper component to gate features based on module access
 */
export function ModuleGate({
  module,
  children,
  fallback = null,
}: {
  module: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactElement | null {
  const { hasModule, hasAnyModule, isLoading } = useModuleAccess();

  if (isLoading) return null;

  const hasAccess = Array.isArray(module) 
    ? hasAnyModule(module) 
    : hasModule(module);

  if (hasAccess) {
    return React.createElement(React.Fragment, null, children);
  }
  return React.createElement(React.Fragment, null, fallback);
}
