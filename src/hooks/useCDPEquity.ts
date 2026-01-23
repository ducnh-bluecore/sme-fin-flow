import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTenant } from './useTenant';

// Types for Equity views
export interface EquityOverview {
  tenant_id: string;
  total_equity_12m: number;
  total_equity_24m: number;
  at_risk_value: number;
  at_risk_percent: number;
  equity_change: number;
  change_direction: 'up' | 'down' | 'stable';
  last_updated: string;
}

export interface EquityDistribution {
  tenant_id: string;
  segment_id: string;
  segment_name: string;
  segment_type: string;
  equity: number;
  share_percent: number;
  customer_count: number;
  avg_ltv: number;
  display_status: 'normal' | 'at_risk' | 'inactive';
}

export interface EquityDriver {
  tenant_id: string;
  driver_id: string;
  factor: string;
  description: string;
  impact: number;
  direction: 'up' | 'down';
  severity: 'high' | 'medium' | 'low';
  trend: string;
  related_insight_id: string | null;
}

export interface EquitySnapshot {
  tenant_id: string;
  total_equity_12m: number;
  total_equity_24m: number;
  at_risk_value: number;
  at_risk_percent: number;
  equity_change: number;
  change_direction: 'up' | 'down' | 'stable';
  top_drivers: Array<{
    label: string;
    impact: number;
    direction: 'positive' | 'negative';
  }>;
  last_updated: string;
}

// Hook: Fetch Equity Overview KPIs
export function useCDPEquityOverview() {
  const { data: activeTenant, isLoading: isTenantLoading } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-equity-overview', tenantId],
    queryFn: async (): Promise<EquityOverview | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('v_cdp_equity_overview')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        console.error('Error fetching equity overview:', error);
        throw error;
      }

      return data as EquityOverview;
    },
    enabled: !!tenantId && !isTenantLoading,
  });
}

// Hook: Fetch Equity Distribution by segments
export function useCDPEquityDistribution() {
  const { data: activeTenant, isLoading: isTenantLoading } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-equity-distribution', tenantId],
    queryFn: async (): Promise<EquityDistribution[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_cdp_equity_distribution')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching equity distribution:', error);
        throw error;
      }

      return (data || []) as EquityDistribution[];
    },
    enabled: !!tenantId && !isTenantLoading,
  });
}

// Hook: Fetch Equity Drivers
export function useCDPEquityDrivers() {
  const { data: activeTenant, isLoading: isTenantLoading } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-equity-drivers', tenantId],
    queryFn: async (): Promise<EquityDriver[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('v_cdp_equity_drivers')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching equity drivers:', error);
        throw error;
      }

      return (data || []) as EquityDriver[];
    },
    enabled: !!tenantId && !isTenantLoading,
  });
}

// Hook: Fetch Equity Snapshot (for overview cards)
export function useCDPEquitySnapshot() {
  const { data: activeTenant, isLoading: isTenantLoading } = useActiveTenant();
  const tenantId = activeTenant?.id;

  return useQuery({
    queryKey: ['cdp-equity-snapshot', tenantId],
    queryFn: async (): Promise<EquitySnapshot | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('v_cdp_equity_snapshot')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        console.error('Error fetching equity snapshot:', error);
        throw error;
      }

      // Parse top_drivers from JSONB
      const topDrivers = Array.isArray(data?.top_drivers) 
        ? data.top_drivers as EquitySnapshot['top_drivers']
        : [];

      return {
        ...data,
        change_direction: data?.change_direction as 'up' | 'down' | 'stable',
        top_drivers: topDrivers,
      } as EquitySnapshot;
    },
    enabled: !!tenantId && !isTenantLoading,
  });
}
