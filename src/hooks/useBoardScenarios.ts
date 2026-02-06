/**
 * useBoardScenarios - Board scenario planning hooks
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * @domain Planning/Scenarios
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQueryBuilder } from './useTenantQueryBuilder';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/board-scenarios`;

interface ScenarioAssumptions {
  revenueChange?: number;
  arDelayDays?: number;
  costInflation?: number;
  automationPaused?: boolean;
  customFactors?: Record<string, number>;
}

interface ProjectedOutcome {
  metric: string;
  baseline: number;
  projected: number;
  delta: number;
  deltaPercent: number;
  unit: string;
}

interface RiskBreach {
  metricCode: string;
  metricLabel: string;
  threshold: number;
  projectedValue: number;
  severity: string;
}

interface ControlImpact {
  automationAffected: boolean;
  approvalVolumeChange: string;
  manualReviewRequired: boolean;
}

interface Scenario {
  id: string;
  tenant_id: string;
  scenario_name: string;
  scenario_type: string;
  description: string | null;
  assumptions: ScenarioAssumptions;
  projected_outcomes: ProjectedOutcome[];
  risk_breaches: RiskBreach[];
  control_impacts: ControlImpact;
  baseline_snapshot: Record<string, number>;
  is_archived: boolean;
  created_by: string;
  created_at: string;
}

interface ScenarioTemplate {
  type: string;
  name: string;
  description: string;
  defaultAssumptions: ScenarioAssumptions;
}

interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  scenarioType: string;
  baseline: Record<string, number>;
  projectedOutcomes: ProjectedOutcome[];
  riskBreaches: RiskBreach[];
  controlImpacts: ControlImpact;
  simulatedAt: string;
}

export function useBoardScenarioAuth() {
  const { client, tenantId } = useTenantQueryBuilder();
  
  const getAuthHeaders = async () => {
    const { data: { session } } = await client.auth.getSession();
    return {
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId || '',
    };
  };
  
  return { getAuthHeaders, tenantId };
}

export function useScenarioTemplates() {
  const { getAuthHeaders, tenantId } = useBoardScenarioAuth();
  
  return useQuery({
    queryKey: ['board-scenarios', 'templates', tenantId],
    queryFn: async (): Promise<{ templates: ScenarioTemplate[] }> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/templates`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch templates');
      }

      return response.json();
    },
    enabled: !!tenantId,
  });
}

export function useScenarioList(includeArchived = false) {
  const { getAuthHeaders, tenantId } = useBoardScenarioAuth();
  
  return useQuery({
    queryKey: ['board-scenarios', 'list', tenantId, includeArchived],
    queryFn: async (): Promise<{ scenarios: Scenario[] }> => {
      const headers = await getAuthHeaders();
      const url = includeArchived 
        ? `${FUNCTION_URL}/list?archived=true` 
        : `${FUNCTION_URL}/list`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch scenarios');
      }

      return response.json();
    },
    enabled: !!tenantId,
  });
}

export function useScenario(id: string) {
  const { getAuthHeaders, tenantId } = useBoardScenarioAuth();
  
  return useQuery({
    queryKey: ['board-scenarios', tenantId, id],
    queryFn: async (): Promise<Scenario> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/${id}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch scenario');
      }

      return response.json();
    },
    enabled: !!id && !!tenantId,
  });
}

export function useRunScenario() {
  const queryClient = useQueryClient();
  const { getAuthHeaders, tenantId } = useBoardScenarioAuth();

  return useMutation({
    mutationFn: async (data: {
      scenarioName: string;
      scenarioType: string;
      description?: string;
      assumptions: ScenarioAssumptions;
    }): Promise<SimulationResult> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, tenantId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run scenario');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-scenarios'] });
    },
  });
}

export function useCompareScenarios(scenarioIds: string[]) {
  const { getAuthHeaders, tenantId } = useBoardScenarioAuth();
  
  return useQuery({
    queryKey: ['board-scenarios', 'compare', tenantId, scenarioIds],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${FUNCTION_URL}/compare?ids=${scenarioIds.join(',')}`,
        { method: 'GET', headers }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to compare scenarios');
      }

      return response.json();
    },
    enabled: scenarioIds.length >= 2 && !!tenantId,
  });
}

export function useArchiveScenario() {
  const queryClient = useQueryClient();
  const { getAuthHeaders, tenantId } = useBoardScenarioAuth();

  return useMutation({
    mutationFn: async (scenarioId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/archive`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ scenarioId, tenantId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive scenario');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-scenarios'] });
    },
  });
}

export function getScenarioTypeLabel(type: string): string {
  switch (type) {
    case 'REVENUE_SHOCK': return 'Revenue Decline';
    case 'AR_DELAY': return 'Collection Slowdown';
    case 'COST_INFLATION': return 'Cost Increase';
    case 'AUTOMATION_PAUSE': return 'Automation Disabled';
    case 'CUSTOM': return 'Custom Scenario';
    default: return type;
  }
}

export function getScenarioTypeIcon(type: string): string {
  switch (type) {
    case 'REVENUE_SHOCK': return '📉';
    case 'AR_DELAY': return '⏳';
    case 'COST_INFLATION': return '💸';
    case 'AUTOMATION_PAUSE': return '⏸️';
    case 'CUSTOM': return '🔧';
    default: return '📊';
  }
}

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-muted-foreground bg-muted';
  }
}
