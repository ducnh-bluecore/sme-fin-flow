/**
 * useDecisionAnalyses - Decision analysis management
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses useTenantQueryBuilder for tenant-aware queries.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
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
  const { buildSelectQuery, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['decision-analyses', tenantId, analysisType],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = buildSelectQuery('decision_analyses', '*')
        .order('created_at', { ascending: false });

      if (analysisType) {
        query = query.eq('analysis_type', analysisType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DecisionAnalysis[];
    },
    enabled: !!tenantId && isReady,
  });
}

export function useSaveDecisionAnalysis() {
  const queryClient = useQueryClient();
  const { client, buildInsertQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async (analysis: Omit<DecisionAnalysis, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: { user } } = await client.auth.getUser();

      const { data, error } = await buildInsertQuery('decision_analyses', {
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
  const { buildUpdateQuery, tenantId } = useTenantQueryBuilder();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DecisionAnalysis> & { id: string }) => {
      const { data, error } = await buildUpdateQuery('decision_analyses', updates)
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
