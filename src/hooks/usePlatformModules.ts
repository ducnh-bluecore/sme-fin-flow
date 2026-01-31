import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlatformModule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_core: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Get all platform modules
export function usePlatformModules() {
  return useQuery({
    queryKey: ['platform-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_modules')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PlatformModule[];
    },
  });
}

// Get active modules only
export function useActiveModules() {
  return useQuery({
    queryKey: ['platform-modules', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PlatformModule[];
    },
  });
}

// Update a module
export function useUpdateModule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PlatformModule> }) => {
      const { error } = await supabase
        .from('platform_modules')
        .update({
          name: data.name,
          description: data.description,
          icon: data.icon,
          color: data.color,
          is_core: data.is_core,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-modules'] });
      toast({
        title: 'Cập nhật thành công',
        description: 'Module đã được cập nhật',
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

// Create a new module
export function useCreateModule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<PlatformModule>) => {
      const { data: result, error } = await supabase
        .from('platform_modules')
        .insert({
          code: data.code!,
          name: data.name!,
          description: data.description,
          icon: data.icon,
          color: data.color,
          is_core: data.is_core ?? false,
          is_active: data.is_active ?? true,
          sort_order: data.sort_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-modules'] });
      toast({
        title: 'Tạo module thành công',
        description: 'Module mới đã được tạo',
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
