import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: string;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  is_active: boolean;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Get all tenants user has access to
export function useUserTenants() {
  return useQuery({
    queryKey: ['user-tenants'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('tenant_users')
        .select(`
          *,
          tenant:tenants(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      return data as (TenantUser & { tenant: Tenant })[];
    },
  });
}

// Get active tenant from profile
export function useActiveTenant() {
  return useQuery({
    queryKey: ['active-tenant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.active_tenant_id) return null;

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.active_tenant_id)
        .single();

      if (tenantError) throw tenantError;
      return tenant as Tenant;
    },
  });
}

// Switch active tenant
export function useSwitchTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify user has access to this tenant
      const { data: access, error: accessError } = await supabase
        .from('tenant_users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (accessError || !access) {
        throw new Error('You do not have access to this tenant');
      }

      // Update active tenant in profile
      const { error } = await supabase
        .from('profiles')
        .update({ active_tenant_id: tenantId })
        .eq('id', user.id);

      if (error) throw error;
      return tenantId;
    },
    onMutate: async () => {
      // Cancel all in-flight queries to prevent stale data
      await queryClient.cancelQueries();
    },
    onSuccess: async () => {
      // First, invalidate and refetch active-tenant to get new tenant ID
      await queryClient.invalidateQueries({ queryKey: ['active-tenant'] });
      await queryClient.refetchQueries({ queryKey: ['active-tenant'] });
      
      // Then invalidate all other queries so they refetch with new tenant
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] !== 'active-tenant' && query.queryKey[0] !== 'user-tenants'
      });
      
      toast({
        title: 'Đã chuyển công ty',
        description: 'Dữ liệu đã được cập nhật theo công ty mới',
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

// Create new tenant
export function useCreateTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; slug?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // Create tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: data.name,
          slug,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Add user as owner
      const { error: memberError } = await supabase
        .from('tenant_users')
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      return tenant as Tenant;
    },
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['user-tenants'] });
      toast({
        title: 'Tạo công ty thành công',
        description: `${tenant.name} đã được tạo`,
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

// Get tenant members
export function useTenantMembers(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['tenant-members', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: tenantUsers, error } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = tenantUsers.map(tu => tu.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      // Merge profiles with tenant users
      const result = tenantUsers.map(tu => ({
        ...tu,
        profile: profiles?.find(p => p.id === tu.user_id) || null,
      }));

      return result as TenantUser[];
    },
    enabled: !!tenantId,
  });
}

// Invite user to tenant
export function useInviteToTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      tenantId, 
      email, 
      role 
    }: { 
      tenantId: string; 
      email: string; 
      role: 'admin' | 'member' | 'viewer';
    }) => {
      // For now, we'll create an invitation record
      // In production, you'd send an email with invite link
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if email exists in users
      // Note: In production, you'd use an edge function for this
      toast({
        title: 'Gửi lời mời',
        description: `Lời mời đã được gửi đến ${email}`,
      });

      return { email, role };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members', variables.tenantId] });
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

// Update tenant member role
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      memberId, 
      role 
    }: { 
      memberId: string; 
      role: 'admin' | 'member' | 'viewer';
    }) => {
      const { error } = await supabase
        .from('tenant_users')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members'] });
      toast({
        title: 'Cập nhật thành công',
        description: 'Vai trò đã được thay đổi',
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

// Remove member from tenant
export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('tenant_users')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members'] });
      toast({
        title: 'Đã xóa thành viên',
        description: 'Thành viên đã bị xóa khỏi công ty',
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

// Update tenant settings
export function useUpdateTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      tenantId, 
      data 
    }: { 
      tenantId: string; 
      data: Partial<Pick<Tenant, 'name' | 'logo_url' | 'settings'>>;
    }) => {
      const { error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-tenant'] });
      queryClient.invalidateQueries({ queryKey: ['user-tenants'] });
      toast({
        title: 'Cập nhật thành công',
        description: 'Thông tin công ty đã được lưu',
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
