/**
 * useRetailHealthScore - Compute retail health score from snapshot + inventory data
 * 
 * Health Score: GOOD / WARNING / CRITICAL
 * Based on: margin, cash runway, inventory aging, sell-through, CAC
 */

import { useMemo } from 'react';
import { useFinanceTruthSnapshot } from './useFinanceTruthSnapshot';
import { useInventoryAging } from './useInventoryAging';
import { useCashRunway } from './useCashRunway';

export type HealthStatus = 'GOOD' | 'WARNING' | 'CRITICAL';

export interface RetailHealthMetric {
  label: string;
  value: number | string;
  unit: string;
  status: HealthStatus;
}

export interface RetailHealthScore {
  overall: HealthStatus;
  metrics: {
    netMargin: RetailHealthMetric;
    cashRunway: RetailHealthMetric;
    inventoryDays: RetailHealthMetric;
    sellThrough: RetailHealthMetric;
    cacPayback: RetailHealthMetric;
  };
  deadStockPercent: number;
}

export function useRetailHealthScore() {
  const { data: snapshot, isLoading: snapshotLoading } = useFinanceTruthSnapshot();
  const { summary, isLoading: inventoryLoading } = useInventoryAging();
  const { data: cashRunway, isLoading: runwayLoading } = useCashRunway();

  const score = useMemo((): RetailHealthScore | null => {
    if (!snapshot) return null;

    const margin = snapshot.contributionMarginPercent;
    const runway = cashRunway?.runwayMonths ?? snapshot.cashRunwayMonths;
    const dio = snapshot.dio;
    const totalOrders = snapshot.totalOrders;
    const totalItems = summary?.totalItems || 0;
    const sellThrough = totalItems > 0 ? (totalOrders / totalItems) * 100 : 0;
    const cacPayback = snapshot.cac > 0 && snapshot.avgOrderValue > 0
      ? snapshot.cac / snapshot.avgOrderValue
      : 0;
    const deadStockPercent = summary?.totalValue > 0
      ? ((summary?.slowMovingValue || 0) / summary.totalValue) * 100
      : 0;

    const marginStatus: HealthStatus = margin < 5 ? 'CRITICAL' : margin < 15 ? 'WARNING' : 'GOOD';
    const runwayStatus: HealthStatus = 
      runway === null || runway === Infinity ? 'GOOD' :
      runway < 3 ? 'CRITICAL' : runway < 6 ? 'WARNING' : 'GOOD';
    // DIO status: if COGS coverage is low (gross_margin% > 95%), DIO is provisional → cap at WARNING
    const cogsIsLow = snapshot.grossMarginPercent > 95 && snapshot.grossProfit > 0;
    const dioStatus: HealthStatus = cogsIsLow
      ? (dio > 60 ? 'WARNING' : 'GOOD')  // Cap at WARNING when COGS data is incomplete
      : (dio > 120 ? 'CRITICAL' : dio > 60 ? 'WARNING' : 'GOOD');
    const sellThroughStatus: HealthStatus = sellThrough < 10 ? 'CRITICAL' : sellThrough < 30 ? 'WARNING' : 'GOOD';
    const cacStatus: HealthStatus = cacPayback > 6 ? 'CRITICAL' : cacPayback > 3 ? 'WARNING' : 'GOOD';

    const statuses = [marginStatus, runwayStatus, dioStatus, sellThroughStatus, cacStatus];
    const overall: HealthStatus = 
      statuses.includes('CRITICAL') ? 'CRITICAL' :
      statuses.includes('WARNING') ? 'WARNING' : 'GOOD';

    // Also factor in dead stock
    const deadStockOverride: HealthStatus = deadStockPercent > 30 ? 'CRITICAL' : deadStockPercent > 20 ? 'WARNING' : 'GOOD';
    const finalOverall: HealthStatus = 
      overall === 'CRITICAL' || deadStockOverride === 'CRITICAL' ? 'CRITICAL' :
      overall === 'WARNING' || deadStockOverride === 'WARNING' ? 'WARNING' : 'GOOD';

    return {
      overall: finalOverall,
      metrics: {
        netMargin: {
          label: 'Net Margin',
          value: margin,
          unit: '%',
          status: marginStatus,
        },
        cashRunway: {
          label: 'Cash Runway',
          value: runway === Infinity ? '∞' : runway?.toFixed(1) ?? 'N/A',
          unit: 'tháng',
          status: runwayStatus,
        },
        inventoryDays: {
          label: 'Inventory Days',
          value: dio,
          unit: 'ngày',
          status: dioStatus,
        },
        sellThrough: {
          label: 'Sell-through',
          value: sellThrough,
          unit: '%',
          status: sellThroughStatus,
        },
        cacPayback: {
          label: 'CAC Payback',
          value: cacPayback,
          unit: 'tháng',
          status: cacStatus,
        },
      },
      deadStockPercent,
    };
  }, [snapshot, summary, cashRunway]);

  return {
    data: score,
    isLoading: snapshotLoading || inventoryLoading || runwayLoading,
  };
}
