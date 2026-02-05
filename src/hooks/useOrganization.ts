/**
 * Organization Hooks - Manage Organizations within Tenant
 * 
 * Part of Architecture v1.4.1 - Organization Layer
 * 
 * Organizations represent Brands/Divisions within a Tenant.
 * Each tenant can have multiple organizations.
 * 
 * Hierarchy: Tenant → Organization → User
 * 
 * @architecture Schema-per-Tenant Ready
 * Uses useTenantQueryBuilder for all queries.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantSession } from './useTenantSession';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { useCallback, useState, useEffect } from 'react';

// =====================================================
// Types
// =====================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'analyst' | 'viewer';
  granted_by: string | null;
  granted_at: string;
}

export interface OrganizationWithMembership extends Organization {
  role: UserRole['role'];
  member_id: string;
}

// =====================================================
// Hooks
// =====================================================

/**
 * Fetch user's organizations within current tenant
 */
export function useUserOrganizations() {
  const { isSessionReady, sessionInfo } = useTenantSession();
  const { buildSelectQuery, client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['organizations', tenantId],
    queryFn: async () => {
      if (!isReady || !sessionInfo?.isProvisioned) {
        return [];
      }

      // Query organizations via useTenantQueryBuilder
      const { data, error } = await buildSelectQuery('organizations', '*')
        .eq('is_active', true);

      if (error) {
        console.error('[useOrganization] Failed to fetch organizations:', error);
        throw error;
      }

      // Get current user
      const { data: userData } = await client.auth.getUser();
      const userId = userData?.user?.id;

      // Transform to OrganizationWithMembership - simplified without joins
      return ((data as unknown) as Organization[] || []).map((org) => ({
        ...org,
        role: 'viewer' as const, // Default role, will be updated by separate query if needed
        member_id: '',
      })) as OrganizationWithMembership[];
    },
    enabled: isSessionReady && isReady && !!sessionInfo?.isProvisioned,
    staleTime: 30000,
  });
}

/**
 * Get organization by ID
 */
export function useOrganization(orgId?: string) {
  const { isSessionReady, sessionInfo } = useTenantSession();
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['organization', orgId, tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('organizations', '*')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      return (data as unknown) as Organization;
    },
    enabled: isSessionReady && isReady && sessionInfo?.isProvisioned && !!orgId,
  });
}

/**
 * Create a new organization
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const { sessionInfo } = useTenantSession();
  const { buildInsertQuery, client, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: { name: string; slug: string; logo_url?: string }) => {
      const { data, error } = await buildInsertQuery('organizations', {
        name: input.name,
        slug: input.slug,
        logo_url: input.logo_url,
        is_active: true,
      })
        .select()
        .single();

      if (error) throw error;

      const orgData = (data as unknown) as Organization;

      // Also add current user as owner
      const { data: userData } = await client.auth.getUser();
      if (userData?.user?.id && orgData?.id) {
        await buildInsertQuery('organization_members', {
          organization_id: orgData.id,
          user_id: userData.user.id,
          is_active: true,
        });

        await buildInsertQuery('user_roles', {
          organization_id: orgData.id,
          user_id: userData.user.id,
          role: 'owner',
          granted_by: userData.user.id,
        });
      }

      return orgData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', tenantId] });
    },
  });
}

/**
 * Update an organization
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { sessionInfo } = useTenantSession();
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
      const { data, error } = await buildUpdateQuery('organizations', {
        ...updates,
        updated_at: new Date().toISOString(),
      })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as Organization;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organizations', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['organization', data.id, tenantId] });
    },
  });
}

/**
 * Invite user to organization
 */
export function useInviteToOrganization() {
  const queryClient = useQueryClient();
  const { buildInsertQuery, client, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (input: { 
      organization_id: string; 
      user_id: string; 
      role: UserRole['role'];
    }) => {
      // Add member
      const { error: memberError } = await buildInsertQuery('organization_members', {
        organization_id: input.organization_id,
        user_id: input.user_id,
        is_active: true,
      });

      if (memberError) throw memberError;

      // Set role
      const { data: userData } = await client.auth.getUser();
      const { error: roleError } = await buildInsertQuery('user_roles', {
        organization_id: input.organization_id,
        user_id: input.user_id,
        role: input.role,
        granted_by: userData?.user?.id,
      });

      if (roleError) throw roleError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
  });
}

/**
 * Get organization members
 */
export function useOrganizationMembers(orgId?: string) {
  const { isSessionReady, sessionInfo } = useTenantSession();
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['organization-members', orgId, tenantId],
    queryFn: async () => {
      const { data, error } = await buildSelectQuery('organization_members', '*')
        .eq('organization_id', orgId)
        .eq('is_active', true);

      if (error) throw error;

      return ((data as unknown) as OrganizationMember[] || []).map((m) => ({
        ...m,
        role: 'viewer' as const, // Default, could be fetched separately
      }));
    },
    enabled: isSessionReady && isReady && sessionInfo?.isProvisioned && !!orgId,
  });
}

// =====================================================
// Main Organization Context Hook
// =====================================================

/**
 * Main hook to manage organization selection and switching
 */
export function useOrganizationContext() {
  const { data: organizations = [], isLoading } = useUserOrganizations();
  const { setCurrentOrg, currentOrgId, isSessionReady, sessionInfo } = useTenantSession();
  const { isReady } = useTenantQueryBuilder();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  // Find active organization
  const activeOrg = organizations.find(o => o.id === activeOrgId) ?? null;
  const currentRole = activeOrg?.role ?? null;

  // Auto-select first organization if none selected
  useEffect(() => {
    if (organizations.length > 0 && !activeOrgId) {
      const firstOrg = organizations[0];
      setActiveOrgId(firstOrg.id);
      setCurrentOrg(firstOrg.id).catch(console.error);
    }
  }, [organizations, activeOrgId, setCurrentOrg]);

  // Switch organization
  const switchOrg = useCallback(async (orgId: string) => {
    if (!organizations.find(o => o.id === orgId)) {
      console.warn('[useOrganizationContext] Organization not found:', orgId);
      return;
    }

    try {
      await setCurrentOrg(orgId);
      setActiveOrgId(orgId);
    } catch (err) {
      console.error('[useOrganizationContext] Failed to switch org:', err);
    }
  }, [organizations, setCurrentOrg]);

  // Permission helpers
  const isOrgOwner = currentRole === 'owner';
  const isOrgAdmin = currentRole === 'owner' || currentRole === 'admin';
  const canManageOrg = isOrgAdmin;
  const canViewData = true; // All roles can view

  return {
    organizations,
    activeOrg,
    activeOrgId,
    isLoading: isLoading || !isSessionReady || !isReady,
    isProvisioned: sessionInfo?.isProvisioned ?? false,
    switchOrg,
    currentRole,
    isOrgOwner,
    isOrgAdmin,
    canManageOrg,
    canViewData,
  };
}
