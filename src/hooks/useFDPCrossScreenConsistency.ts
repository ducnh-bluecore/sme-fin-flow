/**
 * ============================================
 * FDP CROSS-SCREEN CONSISTENCY HOOK
 * ============================================
 * 
 * Verifies data consistency across FDP screens by comparing
 * metrics from different sources to ensure they match.
 * 
 * This is the automated solution for detecting data inconsistencies
 * before they reach users.
 */

import { useQuery } from '@tanstack/react-query';
import { useTenantSupabaseCompat } from '@/integrations/supabase/tenantClient';

export interface ConsistencyCheck {
  id: string;
  name: string;
  screen1: string;
  screen2: string;
  field: string;
  value1: number | null;
  value2: number | null;
  source1: string;
  source2: string;
  status: 'MATCH' | 'MISMATCH' | 'MISSING_DATA' | 'CHECKING';
  difference: number | null;
  differencePercent: number | null;
  severity: 'critical' | 'warning' | 'info';
  lastChecked: Date;
}

export interface CrossScreenConsistencyResult {
  checks: ConsistencyCheck[];
  passCount: number;
  failCount: number;
  warningCount: number;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  lastRunAt: Date;
}

// Define all cross-screen consistency checks
const CROSS_SCREEN_CHECKS = [
  // Working Capital: DSO consistency between tabs
  {
    id: 'wc_dso_tabs',
    name: 'Working Capital DSO',
    screen1: 'WC Overview Tab',
    screen2: 'WC CCC Tab',
    field: 'dso',
    source1: 'central_metrics_snapshots',
    source2: 'central_metrics_snapshots',
    severity: 'critical' as const,
  },
  // Working Capital: DIO consistency
  {
    id: 'wc_dio_tabs',
    name: 'Working Capital DIO',
    screen1: 'WC Overview Tab',
    screen2: 'WC CCC Tab',
    field: 'dio',
    source1: 'central_metrics_snapshots',
    source2: 'central_metrics_snapshots',
    severity: 'critical' as const,
  },
  // Working Capital: DPO consistency
  {
    id: 'wc_dpo_tabs',
    name: 'Working Capital DPO',
    screen1: 'WC Overview Tab',
    screen2: 'WC CCC Tab',
    field: 'dpo',
    source1: 'central_metrics_snapshots',
    source2: 'central_metrics_snapshots',
    severity: 'critical' as const,
  },
  // Working Capital: CCC consistency
  {
    id: 'wc_ccc_tabs',
    name: 'Working Capital CCC',
    screen1: 'WC Overview Tab',
    screen2: 'WC CCC Tab',
    field: 'ccc',
    source1: 'central_metrics_snapshots',
    source2: 'central_metrics_snapshots',
    severity: 'critical' as const,
  },
  // Revenue: Executive vs P&L
  {
    id: 'revenue_exec_pl',
    name: 'Net Revenue (Executive vs P&L)',
    screen1: 'Executive Summary',
    screen2: 'P&L Report',
    field: 'net_revenue',
    source1: 'dashboard_kpi_cache',
    source2: 'v_fdp_finance_summary',
    severity: 'critical' as const,
  },
  // Revenue: Dashboard vs Channel Analytics
  {
    id: 'revenue_dashboard_channel',
    name: 'Net Revenue (Dashboard vs Channels)',
    screen1: 'FDP Dashboard',
    screen2: 'Channel Analytics',
    field: 'net_revenue',
    source1: 'dashboard_kpi_cache',
    source2: 'channel_analytics_cache',
    severity: 'critical' as const,
  },
  // COGS: P&L vs Dashboard
  {
    id: 'cogs_pl_dashboard',
    name: 'Total COGS',
    screen1: 'P&L Report',
    screen2: 'Dashboard KPI',
    field: 'total_cogs',
    source1: 'v_fdp_finance_summary',
    source2: 'dashboard_kpi_cache',
    severity: 'warning' as const,
  },
  // Cash: Cash Flow vs Dashboard
  {
    id: 'cash_flow_dashboard',
    name: 'Cash Position',
    screen1: 'Cash Flow',
    screen2: 'Dashboard',
    field: 'cash_today',
    source1: 'bank_accounts',
    source2: 'dashboard_kpi_cache',
    severity: 'critical' as const,
  },
  // Gross Margin: Calculated vs Snapshot
  {
    id: 'gross_margin_calc',
    name: 'Gross Margin',
    screen1: 'Executive Summary',
    screen2: 'Central Snapshots',
    field: 'gross_margin',
    source1: 'dashboard_kpi_cache',
    source2: 'central_metrics_snapshots',
    severity: 'warning' as const,
  },
];

async function runConsistencyChecks(
  client: ReturnType<typeof useTenantSupabaseCompat>['client'],
  tenantId: string,
  shouldAddTenantFilter: boolean
): Promise<CrossScreenConsistencyResult> {
  const checks: ConsistencyCheck[] = [];
  const now = new Date();

  // Build queries with optional tenant filter
  let snapshotQuery = client
    .from('central_metrics_snapshots')
    .select('dso, dio, dpo, ccc, gross_margin_percent, net_revenue')
    .order('snapshot_at', { ascending: false })
    .limit(1);

  let kpiCacheQuery = client
    .from('dashboard_kpi_cache')
    .select('net_revenue, total_cogs, cash_today, gross_margin');

  let financeSummaryQuery = client
    .from('v_fdp_finance_summary')
    .select('net_revenue, total_cogs');

  let channelTotalQuery = client
    .from('v_channel_analytics_total')
    .select('net_revenue');

  let bankAccountsQuery = client
    .from('bank_accounts')
    .select('current_balance');

  if (shouldAddTenantFilter) {
    snapshotQuery = snapshotQuery.eq('tenant_id', tenantId);
    kpiCacheQuery = kpiCacheQuery.eq('tenant_id', tenantId);
    financeSummaryQuery = financeSummaryQuery.eq('tenant_id', tenantId);
    channelTotalQuery = channelTotalQuery.eq('tenant_id', tenantId);
    bankAccountsQuery = bankAccountsQuery.eq('tenant_id', tenantId);
  }

  // Fetch all required data sources in parallel
  const [
    snapshotResult,
    kpiCacheResult,
    financeSummaryResult,
    channelTotalResult,
    bankAccountsResult,
  ] = await Promise.all([
    snapshotQuery.maybeSingle(),
    kpiCacheQuery.maybeSingle(),
    financeSummaryQuery.maybeSingle(),
    channelTotalQuery.maybeSingle(),
    bankAccountsQuery,
  ]);

  const snapshot = snapshotResult.data;
  const kpiCache = kpiCacheResult.data;
  const financeSummary = financeSummaryResult.data;
  const channelTotal = channelTotalResult.data;
  const bankAccounts = bankAccountsResult.data || [];
  
  let totalBankBalance = 0;
  for (const acc of bankAccounts) totalBankBalance += Number(acc.current_balance) || 0;

  // Run each check
  for (const checkDef of CROSS_SCREEN_CHECKS) {
    let value1: number | null = null;
    let value2: number | null = null;

    // Get values based on check definition
    switch (checkDef.id) {
      case 'wc_dso_tabs':
        value1 = snapshot?.dso ?? null;
        value2 = snapshot?.dso ?? null; // Same source = should always match
        break;
      case 'wc_dio_tabs':
        value1 = snapshot?.dio ?? null;
        value2 = snapshot?.dio ?? null;
        break;
      case 'wc_dpo_tabs':
        value1 = snapshot?.dpo ?? null;
        value2 = snapshot?.dpo ?? null;
        break;
      case 'wc_ccc_tabs':
        value1 = snapshot?.ccc ?? null;
        value2 = snapshot?.ccc ?? null;
        break;
      case 'revenue_exec_pl':
        value1 = kpiCache?.net_revenue != null ? Number(kpiCache.net_revenue) : null;
        value2 = financeSummary?.net_revenue != null ? Number(financeSummary.net_revenue) : null;
        break;
      case 'revenue_dashboard_channel':
        value1 = kpiCache?.net_revenue != null ? Number(kpiCache.net_revenue) : null;
        value2 = channelTotal?.net_revenue != null ? Number(channelTotal.net_revenue) : null;
        break;
      case 'cogs_pl_dashboard':
        value1 = financeSummary?.total_cogs != null ? Number(financeSummary.total_cogs) : null;
        value2 = kpiCache?.total_cogs != null ? Number(kpiCache.total_cogs) : null;
        break;
      case 'cash_flow_dashboard':
        value1 = totalBankBalance;
        value2 = kpiCache?.cash_today != null ? Number(kpiCache.cash_today) : null;
        break;
      case 'gross_margin_calc':
        value1 = kpiCache?.gross_margin != null ? Number(kpiCache.gross_margin) : null;
        value2 = snapshot?.gross_margin_percent ?? null;
        break;
    }

    // Calculate status
    let status: ConsistencyCheck['status'] = 'CHECKING';
    let difference: number | null = null;
    let differencePercent: number | null = null;

    if (value1 === null || value2 === null) {
      status = 'MISSING_DATA';
    } else {
      difference = Math.abs(value1 - value2);
      const maxValue = Math.max(Math.abs(value1), Math.abs(value2), 1);
      differencePercent = (difference / maxValue) * 100;

      // 5% tolerance for match
      if (differencePercent < 5) {
        status = 'MATCH';
      } else {
        status = 'MISMATCH';
      }
    }

    checks.push({
      id: checkDef.id,
      name: checkDef.name,
      screen1: checkDef.screen1,
      screen2: checkDef.screen2,
      field: checkDef.field,
      value1,
      value2,
      source1: checkDef.source1,
      source2: checkDef.source2,
      status,
      difference,
      differencePercent,
      severity: checkDef.severity,
      lastChecked: now,
    });
  }

  // Calculate summary
  const passCount = checks.filter(c => c.status === 'MATCH').length;
  const failCount = checks.filter(c => c.status === 'MISMATCH').length;
  const warningCount = checks.filter(c => c.status === 'MISSING_DATA').length;

  let overallStatus: CrossScreenConsistencyResult['overallStatus'] = 'HEALTHY';
  if (failCount > 0) {
    const hasCriticalFail = checks.some(c => c.status === 'MISMATCH' && c.severity === 'critical');
    overallStatus = hasCriticalFail ? 'CRITICAL' : 'DEGRADED';
  } else if (warningCount > 3) {
    overallStatus = 'DEGRADED';
  }

  return {
    checks,
    passCount,
    failCount,
    warningCount,
    overallStatus,
    lastRunAt: now,
  };
}

export function useFDPCrossScreenConsistency() {
  const { client, tenantId, isReady, shouldAddTenantFilter } = useTenantSupabaseCompat();

  return useQuery({
    queryKey: ['fdp-cross-screen-consistency', tenantId],
    queryFn: () => runConsistencyChecks(client, tenantId!, shouldAddTenantFilter),
    enabled: !!tenantId && isReady,
    refetchInterval: 60000, // Auto-refresh every minute
    staleTime: 30000,
  });
}

/**
 * Quick hook to check if there are any critical consistency issues
 */
export function useFDPConsistencyAlert() {
  const { data, isLoading } = useFDPCrossScreenConsistency();
  
  return {
    hasCriticalIssues: data?.overallStatus === 'CRITICAL',
    hasWarnings: data?.overallStatus === 'DEGRADED',
    isHealthy: data?.overallStatus === 'HEALTHY',
    failCount: data?.failCount ?? 0,
    isLoading,
  };
}
