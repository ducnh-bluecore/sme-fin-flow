/**
 * useCashRunway - REFACTORED to use canonical hooks only
 * 
 * ⚠️ NOW USES PRECOMPUTED DATA - NO RAW QUERIES
 * 
 * Uses:
 * - useFinanceTruthSnapshot for cash and runway metrics
 * - useFinanceMonthlySummary for burn rate calculation
 */

import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';
import { useFinanceMonthlySummary } from './useFinanceMonthlySummary';
import { useMemo } from 'react';

interface CashRunwayData {
  currentCash: number;
  avgMonthlyBurn: number;
  runwayMonths: number | null;
  runwayDays: number | null;
  hasEnoughData: boolean;
  dataMonths: number;
  burnBreakdown: {
    bills: number;
    expenses: number;
    total: number;
  };
}

/**
 * Cash Runway Hook - REFACTORED
 * 
 * Now uses precomputed data from canonical hooks.
 * NO raw queries to bills/expenses tables.
 */
export function useCashRunway() {
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { data: monthlySummary, isLoading: monthlyLoading } = useFinanceMonthlySummary({ months: 6 });

  const data = useMemo((): CashRunwayData => {
    // Default empty state
    if (!snapshot) {
      return {
        currentCash: 0,
        avgMonthlyBurn: 0,
        runwayMonths: null,
        runwayDays: null,
        hasEnoughData: false,
        dataMonths: 0,
        burnBreakdown: { bills: 0, expenses: 0, total: 0 }
      };
    }

    // Get current cash from snapshot (precomputed)
    const currentCash = snapshot.cashToday;
    
    // Calculate average monthly burn from precomputed monthly summary
    const dataMonths = monthlySummary?.length || 0;
    const hasEnoughData = dataMonths >= 1;
    
    // Sum up outflows from precomputed monthly data
    let totalCogs = 0;
    let totalOpex = 0;
    
    if (monthlySummary && monthlySummary.length > 0) {
      monthlySummary.forEach(m => {
        totalCogs += m.cogs;
        totalOpex += m.operatingExpenses;
      });
    }
    
    const totalBurn = totalCogs + totalOpex;
    const avgMonthlyBurn = dataMonths > 0 ? totalBurn / dataMonths : 0;
    
    // Calculate runway
    let runwayMonths: number | null = null;
    let runwayDays: number | null = null;
    
    if (hasEnoughData && avgMonthlyBurn > 0) {
      runwayMonths = currentCash / avgMonthlyBurn;
      runwayDays = Math.round(runwayMonths * 30);
    } else if (currentCash > 0 && avgMonthlyBurn === 0) {
      // No burn rate but has cash = infinite runway
      runwayMonths = Infinity;
      runwayDays = Infinity;
    }
    
    // Use precomputed cashRunwayMonths if available
    if (snapshot.cashRunwayMonths > 0) {
      runwayMonths = snapshot.cashRunwayMonths;
      runwayDays = Math.round(runwayMonths * 30);
    }
    
    return {
      currentCash,
      avgMonthlyBurn,
      runwayMonths,
      runwayDays,
      hasEnoughData,
      dataMonths,
      burnBreakdown: {
        bills: totalCogs / Math.max(dataMonths, 1),
        expenses: totalOpex / Math.max(dataMonths, 1),
        total: avgMonthlyBurn
      }
    };
  }, [snapshot, monthlySummary]);

  return {
    data,
    isLoading: snapshotLoading || monthlyLoading,
    error: null,
  };
}
