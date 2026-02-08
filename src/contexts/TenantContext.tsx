import React, { createContext, useContext, useEffect, useState } from 'react';
import { useActiveTenant, useUserTenants, useSwitchTenant, Tenant, TenantUser } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { useTenantSession, TenantSessionInfo, TenantTier } from '@/hooks/useTenantSession';

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
  // New v1.4.1 session-based properties
  isSessionReady: boolean;
  sessionInfo: TenantSessionInfo | null;
  tenantTier: TenantTier;
  isSchemaProvisioned: boolean;
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
  
  // v1.4.1: Session-based tenant context
  // Pass tenant info as params to avoid circular dependency
  const { 
    isSessionReady, 
    isInitializing: isSessionInitializing,
    sessionInfo, 
    sessionError,
    initSession 
  } = useTenantSession({
    activeTenantId: activeTenant?.id ?? null,
    tenantLoading: isLoadingActive || isLoadingTenants,
  });

  // Auto-fix: select tenant when none is active OR active tenant is invalid
  const [hasAttemptedFix, setHasAttemptedFix] = useState(false);
  
  useEffect(() => {
    if (!isAuthenticated) return;
    if (isLoadingActive || isLoadingTenants || switchTenantMutation.isPending) return;
    if (userTenants.length === 0) return;
    if (hasAttemptedFix) return;

    const allowedTenantIds = new Set(userTenants.map((tu) => tu.tenant_id));
    const currentTenantId = activeTenant?.id ?? null;

    // Auto-select if: no active tenant OR active tenant is invalid
    const needsSwitch = !currentTenantId || !allowedTenantIds.has(currentTenantId);
    
    if (needsSwitch) {
      const fallbackTenantId = userTenants[0].tenant_id;
      if (fallbackTenantId) {
        setHasAttemptedFix(true);
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
    hasAttemptedFix,
  ]);

  const currentMembership = userTenants.find((tu) => tu.tenant_id === activeTenant?.id);

  const currentRole = currentMembership?.role || null;
  const isOwner = currentRole === 'owner';
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  const canManage = isAdmin;

  // Consider switching state as part of loading to prevent stale data display
  const isSwitching = switchTenantMutation.isPending;
  
  // v1.4.1: Derive schema provisioning status from session
  const isSchemaProvisioned = sessionInfo?.isProvisioned ?? false;
  const tenantTier: TenantTier = sessionInfo?.tier ?? 'midmarket';
  
  const value: TenantContextType = {
    activeTenant: activeTenant || null,
    userTenants,
    isLoading: isLoadingActive || isLoadingTenants || isSwitching || isSessionInitializing,
    switchTenant: (tenantId: string) => switchTenantMutation.mutate(tenantId),
    isSwitching,
    currentRole,
    isOwner,
    isAdmin,
    canManage,
    // v1.4.1 session-based properties
    isSessionReady,
    sessionInfo,
    tenantTier,
    isSchemaProvisioned,
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
        // v1.4.1 session-based properties
        isSessionReady: false,
        sessionInfo: null,
        tenantTier: 'midmarket',
        isSchemaProvisioned: false,
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
