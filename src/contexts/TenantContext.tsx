import React, { createContext, useContext, useEffect, useState } from 'react';
import { useActiveTenant, useUserTenants, useSwitchTenant, Tenant, TenantUser } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';

interface TenantContextType {
  activeTenant: Tenant | null;
  userTenants: (TenantUser & { tenant: Tenant })[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => void;
  isSwitching: boolean;
  currentRole: 'owner' | 'admin' | 'member' | 'viewer' | null;
  isOwner: boolean;
  isAdmin: boolean;
  canManage: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: activeTenant, isLoading: isLoadingActive } = useActiveTenant();
  const { data: userTenants = [], isLoading: isLoadingTenants } = useUserTenants();
  const switchTenantMutation = useSwitchTenant();

  // Auto-fix invalid active tenant (e.g. profile points to a tenant the user no longer has access to)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (isLoadingActive || isLoadingTenants || switchTenantMutation.isPending) return;
    if (userTenants.length === 0) return;

    const allowedTenantIds = new Set(userTenants.map((tu) => tu.tenant_id));
    const currentTenantId = activeTenant?.id ?? null;

    if (!currentTenantId || !allowedTenantIds.has(currentTenantId)) {
      const fallbackTenantId = userTenants[0].tenant_id;
      if (fallbackTenantId && fallbackTenantId !== currentTenantId) {
        switchTenantMutation.mutate(fallbackTenantId);
      }
    }
  }, [
    isAuthenticated,
    isLoadingActive,
    isLoadingTenants,
    userTenants,
    activeTenant?.id,
    switchTenantMutation.isPending,
    switchTenantMutation.mutate,
  ]);

  const currentMembership = userTenants.find((tu) => tu.tenant_id === activeTenant?.id);

  const currentRole = currentMembership?.role || null;
  const isOwner = currentRole === 'owner';
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  const canManage = isAdmin;

  // Consider switching state as part of loading to prevent stale data display
  const isSwitching = switchTenantMutation.isPending;
  
  const value: TenantContextType = {
    activeTenant: activeTenant || null,
    userTenants,
    isLoading: isLoadingActive || isLoadingTenants || isSwitching,
    switchTenant: (tenantId: string) => switchTenantMutation.mutate(tenantId),
    isSwitching,
    currentRole,
    isOwner,
    isAdmin,
    canManage,
  };

  // If not authenticated, provide empty context
  if (!isAuthenticated) {
    return (
      <TenantContext.Provider value={{
        activeTenant: null,
        userTenants: [],
        isLoading: false,
        switchTenant: () => {},
        isSwitching: false,
        currentRole: null,
        isOwner: false,
        isAdmin: false,
        canManage: false,
      }}>
        {children}
      </TenantContext.Provider>
    );
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
}
