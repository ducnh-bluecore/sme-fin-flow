/**
 * useReconciliationKPIs - Reconciliation KPIs hook
 * 
 * Phase 3: Migrated to useTenantSupabaseCompat for Schema-per-Tenant support
 */

import { useQuery } from "@tanstack/react-query";
import { useTenantSupabaseCompat } from '@/hooks/useTenantSupabase';

export interface ReconciliationKPIs {
  period: string;
  periodStart: string;
  periodEnd: string;
  
  // Core counts
  autoConfirmedCount: number;
  manualConfirmedCount: number;
  totalSuggestions: number;
  falseAutoCount: number;
  rejectedCount: number;
  
  // Rates
  autoReconciliationRate: number;
  safeAutomationRate: number;
  falseAutomationRate: number;
  avgConfidence: number;
  
  // Savings
  estimatedMinutesSaved: number;
  estimatedHoursSaved: number;
  estimatedCostSaved: number;
  
  // Cash impact
  cashAccelerationAmount: number;
  cashAccelerationDays: number;
  
  // Trust metrics
  guardrailBlocks: number;
  manualOverrides: number;
  exceptionsResolvedByAuto: number;
  
  // Trend
  trendDelta: number;
  trendDirection: 'up' | 'down' | 'stable';
}

export function useReconciliationKPIs(period: '7d' | '30d' | '90d' = '30d') {
  const { client, tenantId, isReady } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['reconciliation-kpis', tenantId, period],
    queryFn: async (): Promise<ReconciliationKPIs> => {
      if (!tenantId) {
        throw new Error('No active tenant');
      }

      const session = await client.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconciliation-kpis?period=${period}`,
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
        throw new Error('Failed to fetch KPIs');
      }

      return response.json();
    },
    enabled: !!tenantId && isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function formatCurrency(amount: number, currency = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) {
    return `${hours} giờ`;
  }
  return `${hours} giờ ${mins} phút`;
}
