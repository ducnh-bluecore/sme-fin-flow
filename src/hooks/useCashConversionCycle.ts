/**
 * useCashConversionCycle - REFACTORED to use canonical hooks only
 * 
 * ⚠️ NOW USES PRECOMPUTED DATA - NO RAW QUERIES
 * 
 * Uses:
 * - useFinanceTruthSnapshot for core DSO/DPO/DIO/CCC metrics
 * - useWorkingCapitalDaily for trend data
 */

import { useMemo } from 'react';
import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';
import { useWorkingCapitalDaily } from './useWorkingCapitalDaily';
import { 
  calculateTurnoverFromDays,
  INDUSTRY_BENCHMARKS 
} from '@/lib/financial-constants';

/**
 * Cash Conversion Cycle Hook - REFACTORED
 * 
 * Now uses precomputed data from canonical hooks.
 * NO raw queries to invoices/bills/orders tables.
 * NO client-side DSO/DPO/DIO/CCC calculations.
 */

export interface CashConversionCycleData {
  // Core Metrics (from precomputed snapshot)
  dso: number;
  dio: number;  
  dpo: number;
  ccc: number;

  // Turnover Ratios (simple formula from days: 365/days)
  arTurnover: number;
  inventoryTurnover: number;
  apTurnover: number;

  // Details (from snapshot)
  avgAR: number;
  avgInventory: number;
  avgAP: number;
  dailySales: number;
  dailyCogs: number;
  dailyPurchases: number;

  // Trends (from precomputed working_capital_daily)
  trends: CCCTrend[];
  
  // Benchmarks
  industryBenchmark: {
    dso: number;
    dio: number;
    dpo: number;
    ccc: number;
  };

  // Working Capital Impact
  workingCapitalTied: number;
  potentialSavings: number;

  // Raw data for formula display
  rawData: {
    totalSales: number;
    totalCogs: number;
    totalPurchases: number;
    daysInPeriod: number;
  };
}

export interface CCCTrend {
  month: string;
  dso: number;
  dio: number;
  dpo: number;
  ccc: number;
}

export function useCashConversionCycle() {
  // Use canonical precomputed hooks
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { data: wcDaily, isLoading: wcLoading } = useWorkingCapitalDaily({ days: 180 });

  const data = useMemo((): CashConversionCycleData => {
    if (!snapshot) {
      return getEmptyData();
    }

    // Core metrics from precomputed snapshot - NO CALCULATIONS
    const dso = snapshot.dso;
    const dio = snapshot.dio;
    const dpo = snapshot.dpo;
    const ccc = snapshot.ccc;

    // Turnover ratios - simple formula from precomputed days
    const arTurnover = calculateTurnoverFromDays(dso);
    const inventoryTurnover = calculateTurnoverFromDays(dio);
    const apTurnover = calculateTurnoverFromDays(dpo);

    // Details from snapshot
    const avgAR = snapshot.totalAR;
    const avgInventory = snapshot.totalInventoryValue;
    const avgAP = snapshot.totalAP;
    
    // Daily rates derived from snapshot metrics
    const dailySales = dso > 0 ? avgAR / dso : 0;
    const dailyCogs = dio > 0 ? avgInventory / dio : 0;
    const dailyPurchases = dpo > 0 ? avgAP / dpo : 0;

    // Build trends from precomputed working_capital_daily - NO CALCULATIONS
    const trends: CCCTrend[] = [];
    if (wcDaily && wcDaily.length > 0) {
      // Group by month from daily data
      const monthlyMap: Record<string, { dso: number; dio: number; dpo: number; ccc: number; count: number }> = {};
      
      wcDaily.forEach(d => {
        const month = d.day.substring(0, 7); // YYYY-MM
        if (!monthlyMap[month]) {
          monthlyMap[month] = { dso: 0, dio: 0, dpo: 0, ccc: 0, count: 0 };
        }
        monthlyMap[month].dso += d.dso;
        monthlyMap[month].dio += d.dio;
        monthlyMap[month].dpo += d.dpo;
        monthlyMap[month].ccc += d.ccc;
        monthlyMap[month].count++;
      });
      
      // Calculate averages per month
      Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, data]) => {
          trends.push({
            month: month.replace('-', '/'),
            dso: Math.round(data.dso / data.count),
            dio: Math.round(data.dio / data.count),
            dpo: Math.round(data.dpo / data.count),
            ccc: Math.round(data.ccc / data.count),
          });
        });
    }

    // Working capital impact from precomputed values
    const workingCapitalTied = avgAR + avgInventory - avgAP;
    const currentDailyWC = dailySales * ccc;
    const benchmarkDailyWC = dailySales * INDUSTRY_BENCHMARKS.ccc;
    const potentialSavings = Math.max(0, currentDailyWC - benchmarkDailyWC);

    return {
      dso,
      dio,
      dpo,
      ccc,
      arTurnover,
      inventoryTurnover,
      apTurnover,
      avgAR,
      avgInventory,
      avgAP,
      dailySales,
      dailyCogs,
      dailyPurchases,
      trends,
      industryBenchmark: INDUSTRY_BENCHMARKS,
      workingCapitalTied,
      potentialSavings,
      rawData: {
        totalSales: snapshot.netRevenue,
        totalCogs: snapshot.netRevenue - snapshot.grossProfit,
        totalPurchases: dailyPurchases * 30,
        daysInPeriod: 30
      }
    };
  }, [snapshot, wcDaily]);

  return {
    data,
    isLoading: snapshotLoading || wcLoading,
    error: null,
  };
}

function getEmptyData(): CashConversionCycleData {
  return {
    dso: 0,
    dio: 0,
    dpo: 0,
    ccc: 0,
    arTurnover: 0,
    inventoryTurnover: 0,
    apTurnover: 0,
    avgAR: 0,
    avgInventory: 0,
    avgAP: 0,
    dailySales: 0,
    dailyCogs: 0,
    dailyPurchases: 0,
    trends: [],
    industryBenchmark: INDUSTRY_BENCHMARKS,
    workingCapitalTied: 0,
    potentialSavings: 0,
    rawData: {
      totalSales: 0,
      totalCogs: 0,
      totalPurchases: 0,
      daysInPeriod: 0
    }
  };
}
