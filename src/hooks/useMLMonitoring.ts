/**
 * useMLMonitoring - ML Monitoring hooks
 * 
 * Architecture v1.4.1: Uses useTenantQueryBuilder for tenant context
 * Note: These hooks primarily use Edge Functions, so only client.auth is needed
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantQueryBuilder } from '@/hooks/useTenantQueryBuilder';
import { useToast } from "@/hooks/use-toast";

export interface DriftSignal {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  delta: number | null;
  detectedAt: string;
  acknowledged: boolean;
  autoActionTaken: string | null;
}

export interface MLMonitoringSummary {
  modelVersion: string;
  mlStatus: 'ACTIVE' | 'LIMITED' | 'DISABLED';
  mlEnabled: boolean;
  lastFallbackReason: string | null;
  lastFallbackAt: string | null;
  
  // Model health
  accuracy: number | null;
  calibrationError: number;
  sampleSize: number;
  
  // Automation safety
  falseAutoRate: number;
  guardrailBlockRate: number;
  autoConfirmedCount: number;
  
  // Drift signals
  driftSignals: DriftSignal[];
  activeDriftCount: number;
}

export interface DriftEvent {
  id: string;
  tenant_id: string;
  model_version: string;
  drift_type: string;
  severity: string;
  metric: string;
  baseline_value: number | null;
  current_value: number | null;
  delta: number | null;
  detected_at: string;
  details: Record<string, unknown>;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  auto_action_taken: string | null;
}

export function useMLMonitoringSummary() {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ml-monitoring-summary', tenantId],
    queryFn: async (): Promise<MLMonitoringSummary> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ml-monitoring/summary`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch ML monitoring summary');
      }

      return response.json();
    },
    enabled: !!tenantId && isReady,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useDriftEvents(limit = 50) {
  const { client, tenantId, isReady } = useTenantQueryBuilder();

  return useQuery({
    queryKey: ['ml-drift-events', tenantId, limit],
    queryFn: async (): Promise<{ events: DriftEvent[]; total: number }> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ml-monitoring/drift-events?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch drift events');
      }

      return response.json();
    },
    enabled: !!tenantId && isReady,
  });
}

export function useRunDriftDetection() {
  const { client, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ml-monitoring/detect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to run drift detection');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ml-monitoring-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ml-drift-events'] });
      queryClient.invalidateQueries({ queryKey: ['ml-settings'] });
      
      if (data.signals?.length > 0) {
        const criticalCount = data.signals.filter((s: DriftSignal) => s.severity === 'critical').length;
        const highCount = data.signals.filter((s: DriftSignal) => s.severity === 'high').length;
        
        if (criticalCount > 0) {
          toast({
            title: "Critical Drift Detected",
            description: `${criticalCount} critical signal(s). ML has been disabled.`,
            variant: "destructive",
          });
        } else if (highCount > 0) {
          toast({
            title: "High Severity Drift Detected",
            description: `${highCount} high severity signal(s). ML is now limited.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Drift Signals Detected",
            description: `${data.signals.length} drift signal(s) detected.`,
          });
        }
      } else {
        toast({
          title: "No Drift Detected",
          description: "Model performance is within acceptable bounds.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Drift Detection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAcknowledgeDrift() {
  const { client, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (signalId: string) => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ml-monitoring/acknowledge`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ signalId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to acknowledge drift signal');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-monitoring-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ml-drift-events'] });
      toast({
        title: "Signal Acknowledged",
        description: "Drift signal has been acknowledged.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Acknowledge",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useResetMLStatus() {
  const { client, tenantId } = useTenantQueryBuilder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (status: 'ACTIVE' | 'LIMITED') => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ml-monitoring/reset-status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.data.session?.access_token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reset ML status');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ml-monitoring-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ml-settings'] });
      toast({
        title: "ML Status Reset",
        description: `ML status has been set to ${data.mlStatus}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Reset Status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Helper functions
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    case 'low': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    case 'LIMITED': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    case 'DISABLED': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getDriftTypeLabel(type: string): string {
  switch (type) {
    case 'FEATURE_DISTRIBUTION': return 'Feature Drift';
    case 'CONFIDENCE_CALIBRATION': return 'Calibration Drift';
    case 'OUTCOME_SHIFT': return 'Outcome Shift';
    case 'AUTOMATION_RISK': return 'Automation Risk';
    default: return type;
  }
}
