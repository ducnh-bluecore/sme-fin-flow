import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface CapexProject {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string;
  budget: number;
  spent: number;
  status: string;
  expected_roi: number | null;
  actual_roi: number | null;
  payback_months: number | null;
  start_date: string | null;
  end_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CapexProjectInsert = Omit<CapexProject, 'id' | 'created_at' | 'updated_at'>;
export type CapexProjectUpdate = Partial<CapexProjectInsert>;

export function useCapexProjects() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['capex-projects', tenantId],
    queryFn: async (): Promise<CapexProject[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('capex_projects')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
}

export function useCapexProjectMutations() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  const createProject = useMutation({
    mutationFn: async (project: Omit<CapexProjectInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data, error } = await supabase
        .from('capex_projects')
        .insert({ ...project, tenant_id: tenantId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] });
      toast.success('Đã tạo dự án CAPEX');
    },
    onError: (error) => {
      toast.error('Lỗi tạo dự án: ' + error.message);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: CapexProjectUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('capex_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] });
      toast.success('Đã cập nhật dự án');
    },
    onError: (error) => {
      toast.error('Lỗi cập nhật: ' + error.message);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('capex_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capex-projects'] });
      toast.success('Đã xóa dự án');
    },
    onError: (error) => {
      toast.error('Lỗi xóa dự án: ' + error.message);
    },
  });

  return { createProject, updateProject, deleteProject };
}
