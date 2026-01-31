import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlatformPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  max_users: number | null;
  is_active: boolean;
  sort_order: number;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface PlanWithModules extends PlatformPlan {
  modules: {
    module_id: string;
    module_code: string;
    module_name: string;
    is_included: boolean;
  }[];
}

// Get all platform plans
export function usePlatformPlans() {
  return useQuery({
    queryKey: ['platform-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
      })) as PlatformPlan[];
    },
  });
}

// Get plans with their included modules
export function usePlatformPlansWithModules() {
  return useQuery({
    queryKey: ['platform-plans-with-modules'],
    queryFn: async () => {
      // Fetch plans
      const { data: plans, error: plansError } = await supabase
        .from('platform_plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (plansError) throw plansError;

      // Fetch plan_modules with module info
      const { data: planModules, error: pmError } = await supabase
        .from('plan_modules')
        .select(`
          plan_id,
          module_id,
          is_included,
          platform_modules (
            code,
            name
          )
        `);

      if (pmError) throw pmError;

      // Merge data
      const result: PlanWithModules[] = (plans || []).map(plan => {
        const modules = (planModules || [])
          .filter(pm => pm.plan_id === plan.id)
          .map(pm => ({
            module_id: pm.module_id,
            module_code: (pm.platform_modules as any)?.code || '',
            module_name: (pm.platform_modules as any)?.name || '',
            is_included: pm.is_included,
          }));

        // Ensure features is a string array
        const features = Array.isArray(plan.features) 
          ? plan.features.map(f => String(f))
          : [];

        return {
          ...plan,
          features,
          modules,
        } as PlanWithModules;
      });

      return result;
    },
  });
}

// Create a new plan
export function useCreatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<PlatformPlan>) => {
      const { data: result, error } = await supabase
        .from('platform_plans')
        .insert({
          code: data.code!,
          name: data.name!,
          description: data.description,
          price_monthly: data.price_monthly || 0,
          price_yearly: data.price_yearly || 0,
          max_users: data.max_users,
          is_active: data.is_active ?? true,
          sort_order: data.sort_order || 0,
          features: data.features || [],
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      queryClient.invalidateQueries({ queryKey: ['platform-plans-with-modules'] });
      toast({
        title: 'Tạo gói thành công',
        description: 'Gói dịch vụ mới đã được tạo',
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

// Update a plan
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PlatformPlan> }) => {
      const { error } = await supabase
        .from('platform_plans')
        .update({
          name: data.name,
          description: data.description,
          price_monthly: data.price_monthly,
          price_yearly: data.price_yearly,
          max_users: data.max_users,
          is_active: data.is_active,
          sort_order: data.sort_order,
          features: data.features,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      queryClient.invalidateQueries({ queryKey: ['platform-plans-with-modules'] });
      toast({
        title: 'Cập nhật thành công',
        description: 'Gói dịch vụ đã được cập nhật',
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

// Update plan modules
export function useUpdatePlanModules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      planId, 
      moduleIds 
    }: { 
      planId: string; 
      moduleIds: string[];
    }) => {
      // Delete existing plan_modules for this plan
      const { error: deleteError } = await supabase
        .from('plan_modules')
        .delete()
        .eq('plan_id', planId);

      if (deleteError) throw deleteError;

      // Insert new plan_modules
      if (moduleIds.length > 0) {
        const { error: insertError } = await supabase
          .from('plan_modules')
          .insert(
            moduleIds.map(moduleId => ({
              plan_id: planId,
              module_id: moduleId,
              is_included: true,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans-with-modules'] });
      toast({
        title: 'Cập nhật thành công',
        description: 'Modules của gói đã được cập nhật',
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
