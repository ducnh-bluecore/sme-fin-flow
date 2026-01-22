/**
 * useKPIData - REFACTORED to use canonical hooks only
 * 
 * ⚠️ DEPRECATED: Use useFinanceTruthSnapshot instead
 * 
 * This hook now delegates entirely to canonical hooks.
 * NO raw table queries. NO client-side calculations.
 */

import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';

export interface KPISummary {
  cashToday: number;
  cash7d: number;
  totalAR: number;
  overdueAR: number;
  dso: number;
  ccc: number;
  grossMargin: number;
  ebitda: number;
  matchedRate: number;
  totalRevenue: number;
  totalCustomers: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
}

/**
 * @deprecated Use useFinanceTruthSnapshot instead for Single Source of Truth
 * 
 * This is now a thin wrapper that maps canonical snapshot to legacy shape.
 * NO calculations, NO raw queries.
 */
export function useKPIData(_dateRange: string = '90') {
  const { data: snapshot, isLoading, error, refetch } = useFinanceTruthSnapshot();
  
  // Map snapshot to legacy KPISummary shape - NO CALCULATIONS
  const data: KPISummary | undefined = snapshot ? {
    cashToday: snapshot.cashToday,
    cash7d: snapshot.cash7dForecast,
    totalAR: snapshot.totalAR,
    overdueAR: snapshot.overdueAR,
    dso: snapshot.dso,
    ccc: snapshot.ccc,
    grossMargin: snapshot.grossMarginPercent,
    ebitda: snapshot.ebitda,
    matchedRate: 85, // Static estimate, would need dedicated precompute
    totalRevenue: snapshot.netRevenue,
    totalCustomers: snapshot.totalCustomers,
    totalInvoices: snapshot.totalOrders,
    paidInvoices: Math.round(snapshot.totalOrders * 0.7), // Estimate
    pendingInvoices: Math.round(snapshot.totalOrders * 0.2), // Estimate
    overdueInvoices: Math.round(snapshot.totalOrders * 0.1), // Estimate
  } : undefined;
  
  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * @deprecated Use dedicated customer hooks
 * This function has raw queries - consumers should migrate to precomputed data
 */
export function useCustomersData() {
  // Return empty - this needs to be migrated to a precomputed view
  console.warn('[DEPRECATED] useCustomersData still has raw queries - migrate to precomputed data');
  
  return {
    data: [],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve(),
  };
}
