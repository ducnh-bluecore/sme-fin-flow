import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useActiveTenantId } from './useActiveTenantId';

export interface Scenario {
  id: string;
  name: string;
  description: string | null;
  base_revenue: number | null;
  base_costs: number | null;
  revenue_change: number | null;
  cost_change: number | null;
  calculated_ebitda: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_primary: boolean | null;
}

// Fetch all scenarios
export function useScenarios() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['scenarios', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Scenario[];
    },
    enabled: !!tenantId,
  });
}

// Create scenario
export function useCreateScenario() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (scenario: Omit<Scenario, 'id' | 'created_at' | 'updated_at'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('scenarios')
        .insert({ ...scenario, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Tạo kịch bản thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    }
  });
}

// Update scenario
export function useUpdateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Scenario> }) => {
      const { error } = await supabase
        .from('scenarios')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Cập nhật kịch bản thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    }
  });
}

// Delete scenario
export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Xóa kịch bản thành công');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    }
  });
}

// Set primary scenario
export function useSetPrimaryScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scenarios')
        .update({ is_primary: true })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      toast.success('Đã đặt làm kịch bản chính');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    }
  });
}

// Unset primary scenario
export function useUnsetPrimaryScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scenarios')
        .update({ is_primary: false })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['primary-scenario'] });
      toast.success('Đã bỏ chọn kịch bản chính');
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    }
  });
}

// Get primary scenario
export function usePrimaryScenario() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['primary-scenario', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) throw error;
      return data as Scenario | null;
    },
    enabled: !!tenantId,
  });
}
