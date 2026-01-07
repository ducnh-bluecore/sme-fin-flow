import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from './useActiveTenantId';
import { toast } from 'sonner';

export interface DecisionAnalysis {
  id: string;
  tenant_id: string;
  created_by: string | null;
  analysis_type: string;
  title: string;
  description: string | null;
  parameters: Record<string, any>;
  results: Record<string, any>;
  recommendation: string | null;
  ai_insights: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useDecisionAnalyses(analysisType?: string) {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['decision-analyses', tenantId, analysisType],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('decision_analyses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (analysisType) {
        query = query.eq('analysis_type', analysisType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DecisionAnalysis[];
    },
    enabled: !!tenantId,
  });
}

export function useSaveDecisionAnalysis() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async (analysis: Omit<DecisionAnalysis, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('decision_analyses')
        .insert({
          tenant_id: tenantId,
          created_by: user?.id,
          ...analysis,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-analyses', tenantId] });
      toast.success('Đã lưu phân tích');
    },
    onError: (error) => {
      console.error('Error saving analysis:', error);
      toast.error('Không thể lưu phân tích');
    },
  });
}

export function useUpdateDecisionAnalysis() {
  const queryClient = useQueryClient();
  const { data: tenantId } = useActiveTenantId();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DecisionAnalysis> & { id: string }) => {
      const { data, error } = await supabase
        .from('decision_analyses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decision-analyses', tenantId] });
      toast.success('Đã cập nhật phân tích');
    },
  });
}
