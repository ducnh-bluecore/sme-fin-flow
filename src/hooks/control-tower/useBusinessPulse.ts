import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenantId } from '@/hooks/useActiveTenantId';
import { useEffect, useState } from 'react';

export type ModuleStatus = 'healthy' | 'warning' | 'critical' | 'offline';

export interface ModuleHealth {
  module_code: 'FDP' | 'MDP' | 'CDP' | 'CONTROL_TOWER';
  status: ModuleStatus;
  health_score: number;
  active_alerts_count: number;
  pending_decisions_count: number;
  last_sync_at: string | null;
  error_message: string | null;
}

export interface BusinessPulse {
  overall_status: ModuleStatus;
  overall_health_score: number;
  total_active_alerts: number;
  total_pending_decisions: number;
  critical_alerts_count: number;
  modules: ModuleHealth[];
  pulse_rate: 'stable' | 'elevated' | 'critical'; // For animation
  last_updated: string;
}

function calculatePulseRate(overallScore: number, criticalCount: number): 'stable' | 'elevated' | 'critical' {
  if (criticalCount > 0 || overallScore < 50) return 'critical';
  if (overallScore < 75) return 'elevated';
  return 'stable';
}

function calculateOverallStatus(modules: ModuleHealth[]): ModuleStatus {
  if (modules.some(m => m.status === 'critical')) return 'critical';
  if (modules.some(m => m.status === 'warning')) return 'warning';
  if (modules.some(m => m.status === 'offline')) return 'offline';
  return 'healthy';
}

export function useBusinessPulse() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['business-pulse', tenantId],
    queryFn: async (): Promise<BusinessPulse> => {
      if (!tenantId) throw new Error('No tenant');

      // Fetch module health status
      const { data: healthData, error: healthError } = await supabase
        .from('module_health_status')
        .select('*')
        .eq('tenant_id', tenantId);

      if (healthError) throw healthError;

      // Fetch active alerts count by severity
      const { data: alertsData } = await supabase
        .from('alert_instances')
        .select('severity')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      // Fetch pending decisions count
      const { data: decisionsData } = await supabase
        .from('decision_cards')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'in_progress']);

      const criticalAlertsCount = alertsData?.filter(a => a.severity === 'critical').length || 0;
      const totalAlerts = alertsData?.length || 0;
      const totalDecisions = decisionsData?.length || 0;

      // If no health data, create default modules
      const modules: ModuleHealth[] = healthData && healthData.length > 0 
        ? healthData.map(h => ({
            module_code: h.module_code as 'FDP' | 'MDP' | 'CDP' | 'CONTROL_TOWER',
            status: h.status as ModuleStatus,
            health_score: h.health_score || 100,
            active_alerts_count: h.active_alerts_count || 0,
            pending_decisions_count: h.pending_decisions_count || 0,
            last_sync_at: h.last_sync_at,
            error_message: h.error_message,
          }))
        : [
            { module_code: 'FDP' as const, status: 'healthy' as const, health_score: 100, active_alerts_count: 0, pending_decisions_count: 0, last_sync_at: null, error_message: null },
            { module_code: 'MDP' as const, status: 'healthy' as const, health_score: 100, active_alerts_count: 0, pending_decisions_count: 0, last_sync_at: null, error_message: null },
            { module_code: 'CDP' as const, status: 'healthy' as const, health_score: 100, active_alerts_count: 0, pending_decisions_count: 0, last_sync_at: null, error_message: null },
          ];

      const overallScore = modules.length > 0 
        ? Math.round(modules.reduce((sum, m) => sum + m.health_score, 0) / modules.length)
        : 100;

      return {
        overall_status: calculateOverallStatus(modules),
        overall_health_score: overallScore,
        total_active_alerts: totalAlerts,
        total_pending_decisions: totalDecisions,
        critical_alerts_count: criticalAlertsCount,
        modules,
        pulse_rate: calculatePulseRate(overallScore, criticalAlertsCount),
        last_updated: new Date().toISOString(),
      };
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds for "live" feel
  });
}

// Real-time subscription hook
export function useRealtimePulse(onUpdate: () => void) {
  const { data: tenantId } = useActiveTenantId();

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('pulse-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alert_instances',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => onUpdate()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'module_health_status',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, onUpdate]);
}
