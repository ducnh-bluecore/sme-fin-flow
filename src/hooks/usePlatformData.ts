/**
 * Platform Data Hook - Access Control Plane (platform schema)
 * 
 * Part of Architecture v1.4.1 - Control Plane Split (RISK #3)
 * 
 * This hook provides access to shared platform data:
 * - AI metric definitions
 * - KPI templates
 * - Alert rule templates
 * - Decision taxonomy
 * - Global source platforms
 * 
 * Platform data is READ-ONLY for all tenants (cross-tenant learning).
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { metrics, kpiTemplates, isLoading } = usePlatformData();
 *   
 *   // Use shared metrics/templates
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// Types
// =====================================================

export interface AIMetricDefinition {
  id: string;
  code: string;
  name: string;
  formula: string;
  category: string;
  description: string | null;
  unit: string | null;
  is_system: boolean;
}

export interface KPIDefinitionTemplate {
  id: string;
  code: string;
  name: string;
  formula: string;
  category: string;
  thresholds: Record<string, number>;
  industry_benchmarks: Record<string, number> | null;
  description: string | null;
}

export interface AlertRuleTemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  condition_template: string;
  severity_default: 'info' | 'warning' | 'critical';
  decision_framing: {
    question: string;
    options: string[];
  } | null;
  suggested_actions: string[] | null;
}

export interface DecisionTaxonomy {
  id: string;
  category: string;
  subcategory: string | null;
  action_templates: string[] | null;
  owner_role_default: string | null;
  urgency_level: 'immediate' | 'today' | 'this_week' | 'this_month' | null;
}

export interface GlobalSourcePlatform {
  code: string;
  display_name: string;
  category: 'ecommerce' | 'ads' | 'erp' | 'data_warehouse' | 'payment' | 'logistics';
  logo_url: string | null;
  is_active: boolean;
  auth_type: string | null;
}

export interface SemanticModel {
  id: string;
  entity_type: string;
  schema_version: string;
  columns: Record<string, any>;
  relationships: Record<string, any> | null;
}

export interface AIQueryTemplate {
  id: string;
  intent_pattern: string;
  category: string;
  sql_template: string;
  parameters: Record<string, any> | null;
  required_tables: string[] | null;
  success_count: number;
}

// =====================================================
// Hooks
// =====================================================

/**
 * Fetch AI metric definitions from platform schema
 */
export function useAIMetricDefinitions() {
  return useQuery({
    queryKey: ['platform', 'ai-metric-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_metric_definitions' as any)
        .select('*')
        .order('category', { ascending: true });

      if (error) {
        console.error('[usePlatformData] Failed to fetch metrics:', error);
        throw error;
      }

      return (data as unknown) as AIMetricDefinition[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (platform data changes rarely)
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch KPI definition templates from platform schema
 */
export function useKPITemplates() {
  return useQuery({
    queryKey: ['platform', 'kpi-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_definition_templates' as any)
        .select('*')
        .order('category', { ascending: true });

      if (error) {
        console.error('[usePlatformData] Failed to fetch KPI templates:', error);
        throw error;
      }

      return (data as unknown) as KPIDefinitionTemplate[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch alert rule templates from platform schema
 */
export function useAlertRuleTemplates() {
  return useQuery({
    queryKey: ['platform', 'alert-rule-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_rule_templates' as any)
        .select('*')
        .order('category', { ascending: true });

      if (error) {
        console.error('[usePlatformData] Failed to fetch alert templates:', error);
        throw error;
      }

      return (data as unknown) as AlertRuleTemplate[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch decision taxonomy from platform schema
 */
export function useDecisionTaxonomy() {
  return useQuery({
    queryKey: ['platform', 'decision-taxonomy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decision_taxonomy' as any)
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) {
        console.error('[usePlatformData] Failed to fetch taxonomy:', error);
        throw error;
      }

      return (data as unknown) as DecisionTaxonomy[];
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Fetch global source platforms
 */
export function useGlobalSourcePlatforms() {
  return useQuery({
    queryKey: ['platform', 'source-platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_source_platforms' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_name', { ascending: true });

      if (error) {
        console.error('[usePlatformData] Failed to fetch platforms:', error);
        throw error;
      }

      return (data as unknown) as GlobalSourcePlatform[];
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes (rarely changes)
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Fetch semantic models for AI query understanding
 */
export function useSemanticModels() {
  return useQuery({
    queryKey: ['platform', 'semantic-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_semantic_models' as any)
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('[usePlatformData] Failed to fetch semantic models:', error);
        throw error;
      }

      return (data as unknown) as SemanticModel[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Fetch AI query templates
 */
export function useAIQueryTemplates(category?: string) {
  return useQuery({
    queryKey: ['platform', 'ai-query-templates', category],
    queryFn: async () => {
      let query = supabase
        .from('ai_query_templates' as any)
        .select('*')
        .eq('is_active', true)
        .order('success_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[usePlatformData] Failed to fetch query templates:', error);
        throw error;
      }

      return (data as unknown) as AIQueryTemplate[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// =====================================================
// Convenience Hook - All Platform Data
// =====================================================

/**
 * Convenience hook to fetch commonly used platform data
 */
export function usePlatformData() {
  const metrics = useAIMetricDefinitions();
  const kpiTemplates = useKPITemplates();
  const alertTemplates = useAlertRuleTemplates();
  const sourcePlatforms = useGlobalSourcePlatforms();

  return {
    metrics: metrics.data ?? [],
    kpiTemplates: kpiTemplates.data ?? [],
    alertTemplates: alertTemplates.data ?? [],
    sourcePlatforms: sourcePlatforms.data ?? [],
    isLoading: metrics.isLoading || kpiTemplates.isLoading || alertTemplates.isLoading || sourcePlatforms.isLoading,
    error: metrics.error || kpiTemplates.error || alertTemplates.error || sourcePlatforms.error,
  };
}

// =====================================================
// Helpers
// =====================================================

/**
 * Get metric by code
 */
export function useMetricByCode(code: string) {
  const { data: metrics } = useAIMetricDefinitions();
  return metrics?.find(m => m.code === code) ?? null;
}

/**
 * Get KPI template by code
 */
export function useKPITemplateByCode(code: string) {
  const { data: templates } = useKPITemplates();
  return templates?.find(t => t.code === code) ?? null;
}

/**
 * Get platforms by category
 */
export function usePlatformsByCategory(category: GlobalSourcePlatform['category']) {
  const { data: platforms } = useGlobalSourcePlatforms();
  return platforms?.filter(p => p.category === category) ?? [];
}
