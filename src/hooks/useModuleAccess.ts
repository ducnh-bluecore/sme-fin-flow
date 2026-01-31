import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

  const { data: enabledModules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['module-access', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [CORE_MODULE];

      const { data, error } = await supabase
        .from('tenant_modules')
        .select(`
          is_enabled,
          module:platform_modules (
            code,
            is_core
          )
        `)
        .eq('tenant_id', tenant.id)
        .eq('is_enabled', true);

      if (error) {
        console.error('Error fetching tenant modules:', error);
        // Fallback: return core module on error
        return [CORE_MODULE];
      }

      // Extract module codes
      const codes = (data || [])
        .filter(tm => tm.is_enabled && tm.module)
        .map(tm => (tm.module as any).code as string);

      // Always include core module (data_warehouse)
      if (!codes.includes(CORE_MODULE)) {
        codes.push(CORE_MODULE);
      }

      return codes;
    },
    enabled: !!tenant?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isLoading = tenantLoading || modulesLoading;

  const hasModule = (moduleCode: string): boolean => {
    // Core module is always available
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

import React from 'react';

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
