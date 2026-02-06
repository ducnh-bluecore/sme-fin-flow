/**
 * useStressTest - Hook for Risk Stress Testing
 * 
 * @architecture Schema-per-Tenant v1.4.1
 * Uses Edge Function for stress test simulation.
 * NOTE: Uses direct supabase client for auth.getSession() only.
 * The Edge Function handles tenant context via JWT claims.
 * Auth headers are automatically injected from the session.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/risk-stress-test`;

interface SimulatedRule {
  metricCode: string;
  originalThreshold: number;
  simulatedThreshold: number;
  operator: string;
}

interface ImpactResult {
  metricCode: string;
  metricLabel: string;
  currentValue: number;
  originalThreshold: number;
  simulatedThreshold: number;
  wasBreached: boolean;
  wouldBreach: boolean;
  impactType: 'no_change' | 'new_breach' | 'resolved' | 'still_breached';
}

interface ImpactSummary {
  autoReconciliationRate: { current: number; simulated: number; delta: number };
  approvalsRequired: { current: number; simulated: number; delta: number };
  riskExposure: { current: number; simulated: number; delta: number };
  breachChanges: { newBreaches: number; resolved: number; unchanged: number };
}

interface SimulationResult {
  testId?: string;
  impactSummary: ImpactSummary;
  detailedImpacts: ImpactResult[];
  simulatedAt: string;
}

interface StressTest {
  id: string;
  tenant_id: string;
  test_name: string;
  description: string | null;
  base_risk_appetite_id: string;
  simulated_risk_appetite: SimulatedRule[];
  impact_summary: ImpactSummary;
  detailed_impacts: ImpactResult[];
  simulated_at: string;
  created_by: string;
  created_at: string;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  };
}

export function useRunStressTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      simulatedChanges: SimulatedRule[];
      testName?: string;
      description?: string;
    }): Promise<SimulationResult> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run stress test');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stress-tests'] });
    },
  });
}

export function usePreviewStressTest() {
  return useMutation({
    mutationFn: async (simulatedChanges: SimulatedRule[]) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/preview`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ simulatedChanges }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to preview');
      }

      return response.json();
    },
  });
}

export function useStressTestHistory(limit = 20) {
  return useQuery({
    queryKey: ['stress-tests', 'history', limit],
    queryFn: async (): Promise<{ tests: StressTest[] }> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/history?limit=${limit}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch history');
      }

      return response.json();
    },
  });
}

export function useStressTest(id: string) {
  return useQuery({
    queryKey: ['stress-tests', id],
    queryFn: async (): Promise<StressTest> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${FUNCTION_URL}/${id}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch test');
      }

      return response.json();
    },
    enabled: !!id,
  });
}

export function getImpactTypeColor(impactType: ImpactResult['impactType']): string {
  switch (impactType) {
    case 'new_breach': return 'text-red-600 bg-red-50';
    case 'resolved': return 'text-green-600 bg-green-50';
    case 'still_breached': return 'text-amber-600 bg-amber-50';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getImpactTypeLabel(impactType: ImpactResult['impactType']): string {
  switch (impactType) {
    case 'new_breach': return 'New Breach';
    case 'resolved': return 'Resolved';
    case 'still_breached': return 'Still Breached';
    default: return 'No Change';
  }
}

export function formatDelta(delta: number, unit: string = ''): string {
  const sign = delta >= 0 ? '+' : '';
  if (unit === '%') {
    return `${sign}${delta.toFixed(1)}%`;
  }
  if (Math.abs(delta) >= 1000000) {
    return `${sign}${(delta / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(delta) >= 1000) {
    return `${sign}${(delta / 1000).toFixed(0)}K`;
  }
  return `${sign}${delta.toFixed(0)}`;
}
