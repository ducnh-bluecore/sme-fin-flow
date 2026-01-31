/**
 * useSalesProjection - Hook for revenue/sales forecasting
 * 
 * Provides projected daily revenue with configurable growth rates
 * and eCommerce settlement delay (T+14) for cashflow forecasting.
 * 
 * Architecture: DB-First - Uses precomputed snapshot + formula_settings
 */

import { useMemo } from 'react';
import { useFinanceTruthSnapshot } from '@/hooks/useFinanceTruthSnapshot';
import { useFormulaSettings } from '@/hooks/useFormulaSettings';

export interface SalesProjection {
  // Base metrics (from 90-day snapshot)
  dailyBaseRevenue: number;           // Historical daily average
  projectedDailyRevenue: number;      // With growth factor applied
  
  // Growth configuration
  growthRate: number;                 // Monthly growth % being applied
  growthSource: 'historical' | 'manual' | 'scenario';
  
  // Confidence
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceDescription: string;
  
  // Settlement delay
  settlementDelay: number;            // Days until revenue becomes cash (T+14)
  
  // Net after fees
  netRevenueRate: number;             // % of revenue after platform fees (typically 80%)
  dailyNetCashInflow: number;         // Projected daily cash after fees & delay
  
  // Metadata
  snapshotPeriodDays: number;
  dataSource: string;
}

// Default settlement configuration for eCommerce
const ECOMMERCE_SETTLEMENT_DELAY = 14;  // T+14 days
const DEFAULT_PLATFORM_FEE_RATE = 0.20; // 20% platform fees

export function useSalesProjection() {
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { settings, isLoading: settingsLoading } = useFormulaSettings();

  const projection = useMemo<SalesProjection>(() => {
    // Calculate 90-day daily average from snapshot
    const snapshotPeriodDays = 90; // Standard period
    const totalRevenue = snapshot?.netRevenue ?? 0;
    const dailyBaseRevenue = totalRevenue / snapshotPeriodDays;

    // Get growth rate from settings
    const growthRate = settings?.forecastDefaultGrowthRate ?? 5.0;
    
    // Calculate projected daily revenue with monthly growth
    // Convert monthly growth to daily: (1 + monthlyRate)^(1/30) - 1
    const dailyGrowthFactor = Math.pow(1 + growthRate / 100, 1 / 30);
    const projectedDailyRevenue = dailyBaseRevenue * dailyGrowthFactor;

    // Determine confidence based on data availability
    let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
    let confidenceDescription = 'Dựa trên dữ liệu 90 ngày với tỷ lệ tăng trưởng mặc định';
    
    if (totalRevenue === 0) {
      confidenceLevel = 'low';
      confidenceDescription = 'Không có dữ liệu doanh thu trong 90 ngày qua';
    } else if (dailyBaseRevenue > 0 && settings.source === 'db') {
      confidenceLevel = 'high';
      confidenceDescription = 'Dựa trên dữ liệu thực tế với tỷ lệ tăng trưởng tùy chỉnh';
    }

    // Net revenue after platform fees
    const netRevenueRate = 1 - DEFAULT_PLATFORM_FEE_RATE;
    const dailyNetCashInflow = projectedDailyRevenue * netRevenueRate;

    // Determine growth source
    const growthSource: 'historical' | 'manual' | 'scenario' = 
      settings.source === 'db' ? 'manual' : 'historical';

    return {
      dailyBaseRevenue,
      projectedDailyRevenue,
      growthRate,
      growthSource,
      confidenceLevel,
      confidenceDescription,
      settlementDelay: ECOMMERCE_SETTLEMENT_DELAY,
      netRevenueRate: netRevenueRate * 100, // Convert to percentage
      dailyNetCashInflow,
      snapshotPeriodDays,
      dataSource: snapshot ? 'central_metrics_snapshots' : 'default',
    };
  }, [snapshot, settings]);

  return {
    projection,
    isLoading: snapshotLoading || settingsLoading,
    hasData: (snapshot?.netRevenue ?? 0) > 0,
  };
}

/**
 * Helper to integrate sales projection into cashflow forecast
 * Returns expected cash inflows per day accounting for settlement delay
 */
/**
 * Helper to integrate sales projection into cashflow forecast
 * Returns expected cash inflows per day accounting for settlement delay
 * 
 * UPDATED: Now includes ramp-up for days 0-13 to simulate historical order settlements
 */
export function calculateSalesInflowForDay(
  projection: SalesProjection,
  dayIndex: number
): number {
  // Days 0-13: Gradual settlement of past orders (ramp up)
  // Orders placed before today are settling during these days
  if (dayIndex < projection.settlementDelay) {
    // Linear ramp from 0% to 100% over settlement delay period
    // This represents historical orders completing their settlement cycle
    const rampFactor = dayIndex / projection.settlementDelay;
    return projection.dailyNetCashInflow * rampFactor;
  }
  
  // After delay, full daily net cash inflow from new + historical orders
  return projection.dailyNetCashInflow;
}
