/**
 * useDataAssessment - CRUD operations for data assessments
 * 
 * Architecture v1.4.1: Uses useTenantQueryBuilder for tenant-aware queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';
import { toast } from 'sonner';
import type { ModuleKey } from '@/lib/dataRequirementsMap';

export interface SurveyResponses {
  data_sources: string[];
  sub_sources: string[];
  additional_data_types: string[];
}

export interface ImportPlanItem {
  requirementId: string;
  dataType: string;
  displayName: string;
  action: 'connect' | 'import' | 'skip' | 'existing';
  connectorType?: string;
  templateId?: string;
  priority: 'critical' | 'important' | 'optional';
}

export interface ImportPlan {
  connect: ImportPlanItem[];
  import: ImportPlanItem[];
  skip: ImportPlanItem[];
  existing: ImportPlanItem[];
}

export interface DataAssessment {
  id: string;
  user_id: string;
  tenant_id: string;
  module_key: string;
  survey_responses: SurveyResponses;
  import_plan: ImportPlan;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at: string | null;
  skipped_at: string | null;
  created_at: string;
  updated_at: string;
}

const defaultSurveyResponses: SurveyResponses = {
  data_sources: [],
  sub_sources: [],
  additional_data_types: [],
};

const defaultImportPlan: ImportPlan = {
  connect: [],
  import: [],
  skip: [],
  existing: [],
};

export function useDataAssessment(moduleKey: ModuleKey) {
  const { buildSelectQuery, buildDeleteQuery, client, tenantId, isReady } = useTenantQueryBuilder();
  const queryClient = useQueryClient();

  // Query to get assessment for current module
  const assessmentQuery = useQuery({
    queryKey: ['data-assessment', tenantId, moduleKey],
    queryFn: async (): Promise<DataAssessment | null> => {
      if (!tenantId) return null;

      const { data: user } = await client.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await buildSelectQuery('user_data_assessments', '*')
        .eq('module_key', moduleKey)
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        id: (data as any).id,
        user_id: (data as any).user_id,
        tenant_id: (data as any).tenant_id,
        module_key: (data as any).module_key,
        survey_responses: ((data as any).survey_responses as unknown as SurveyResponses) || defaultSurveyResponses,
        import_plan: ((data as any).import_plan as unknown as ImportPlan) || defaultImportPlan,
        status: ((data as any).status as DataAssessment['status']) || 'pending',
        completed_at: (data as any).completed_at,
        skipped_at: (data as any).skipped_at,
        created_at: (data as any).created_at,
        updated_at: (data as any).updated_at,
      };
    },
    enabled: !!tenantId && isReady,
  });

  // Query to get all assessments for current tenant
  const allAssessmentsQuery = useQuery({
    queryKey: ['data-assessments-all', tenantId],
    queryFn: async (): Promise<DataAssessment[]> => {
      if (!tenantId) return [];

      const { data: user } = await client.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await buildSelectQuery('user_data_assessments', '*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return ((data || []) as any[]).map(row => ({
        id: row.id,
        user_id: row.user_id,
        tenant_id: row.tenant_id,
        module_key: row.module_key,
        survey_responses: (row.survey_responses as unknown as SurveyResponses) || defaultSurveyResponses,
        import_plan: (row.import_plan as unknown as ImportPlan) || defaultImportPlan,
        status: (row.status as DataAssessment['status']) || 'pending',
        completed_at: row.completed_at,
        skipped_at: row.skipped_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
    enabled: !!tenantId && isReady,
  });

  // Create or update assessment
  const upsertAssessment = useMutation({
    mutationFn: async ({
      surveyResponses,
      importPlan,
      status = 'in_progress',
    }: {
      surveyResponses?: SurveyResponses;
      importPlan?: ImportPlan;
      status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
    }): Promise<DataAssessment> => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: user } = await client.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const now = new Date().toISOString();
      const completedAt = status === 'completed' ? now : null;
      const skippedAt = status === 'skipped' ? now : null;

      const { data, error } = await (client
        .from('user_data_assessments') as any)
        .upsert(
          {
            user_id: user.user.id,
            tenant_id: tenantId,
            module_key: moduleKey,
            survey_responses: surveyResponses || defaultSurveyResponses,
            import_plan: importPlan || defaultImportPlan,
            status,
            completed_at: completedAt,
            skipped_at: skippedAt,
            updated_at: now,
          },
          {
            onConflict: 'user_id,tenant_id,module_key',
          }
        )
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        user_id: data.user_id,
        tenant_id: data.tenant_id,
        module_key: data.module_key,
        survey_responses: (data.survey_responses as unknown as SurveyResponses) || defaultSurveyResponses,
        import_plan: (data.import_plan as unknown as ImportPlan) || defaultImportPlan,
        status: (data.status as DataAssessment['status']) || 'pending',
        completed_at: data.completed_at,
        skipped_at: data.skipped_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-assessment', tenantId, moduleKey] });
      queryClient.invalidateQueries({ queryKey: ['data-assessments-all', tenantId] });
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi lưu khảo sát: ' + error.message);
    },
  });

  // Complete assessment
  const completeAssessment = useMutation({
    mutationFn: async (importPlan: ImportPlan): Promise<DataAssessment> => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: user } = await client.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const now = new Date().toISOString();

      const { data, error } = await (client
        .from('user_data_assessments') as any)
        .upsert(
          {
            user_id: user.user.id,
            tenant_id: tenantId,
            module_key: moduleKey,
            import_plan: importPlan,
            status: 'completed',
            completed_at: now,
            updated_at: now,
          },
          {
            onConflict: 'user_id,tenant_id,module_key',
          }
        )
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        user_id: data.user_id,
        tenant_id: data.tenant_id,
        module_key: data.module_key,
        survey_responses: (data.survey_responses as unknown as SurveyResponses) || defaultSurveyResponses,
        import_plan: (data.import_plan as unknown as ImportPlan) || defaultImportPlan,
        status: (data.status as DataAssessment['status']) || 'pending',
        completed_at: data.completed_at,
        skipped_at: data.skipped_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-assessment', tenantId, moduleKey] });
      queryClient.invalidateQueries({ queryKey: ['data-assessments-all', tenantId] });
      toast.success('Đã hoàn thành khảo sát dữ liệu');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi hoàn thành khảo sát: ' + error.message);
    },
  });

  // Skip assessment
  const skipAssessment = useMutation({
    mutationFn: async (): Promise<DataAssessment> => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: user } = await client.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const now = new Date().toISOString();

      const { data, error } = await (client
        .from('user_data_assessments') as any)
        .upsert(
          {
            user_id: user.user.id,
            tenant_id: tenantId,
            module_key: moduleKey,
            status: 'skipped',
            skipped_at: now,
            updated_at: now,
          },
          {
            onConflict: 'user_id,tenant_id,module_key',
          }
        )
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        user_id: data.user_id,
        tenant_id: data.tenant_id,
        module_key: data.module_key,
        survey_responses: (data.survey_responses as unknown as SurveyResponses) || defaultSurveyResponses,
        import_plan: (data.import_plan as unknown as ImportPlan) || defaultImportPlan,
        status: (data.status as DataAssessment['status']) || 'pending',
        completed_at: data.completed_at,
        skipped_at: data.skipped_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-assessment', tenantId, moduleKey] });
      queryClient.invalidateQueries({ queryKey: ['data-assessments-all', tenantId] });
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi bỏ qua khảo sát: ' + error.message);
    },
  });

  // Reset assessment
  const resetAssessment = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: user } = await client.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await buildDeleteQuery('user_data_assessments')
        .eq('user_id', user.user.id)
        .eq('module_key', moduleKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-assessment', tenantId, moduleKey] });
      queryClient.invalidateQueries({ queryKey: ['data-assessments-all', tenantId] });
      toast.success('Đã reset khảo sát');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi reset: ' + error.message);
    },
  });

  return {
    assessment: assessmentQuery.data,
    isLoading: assessmentQuery.isLoading,
    error: assessmentQuery.error,
    allAssessments: allAssessmentsQuery.data || [],
    isCompleted: assessmentQuery.data?.status === 'completed',
    isSkipped: assessmentQuery.data?.status === 'skipped',
    needsAssessment: !assessmentQuery.data || 
      (assessmentQuery.data.status !== 'completed' && assessmentQuery.data.status !== 'skipped'),
    upsertAssessment,
    completeAssessment,
    skipAssessment,
    resetAssessment,
    refetch: assessmentQuery.refetch,
  };
}
