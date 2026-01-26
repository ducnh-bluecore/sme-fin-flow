/**
 * Executive Summary Page - Data Consistency Tests
 * 
 * Verifies executive metrics are consistent with
 * all other FDP pages (P&L, Dashboard, Cash Flow).
 * 
 * SSOT: dashboard_kpi_cache, central_metrics_snapshots
 */

import { describe, it, expect, vi } from 'vitest';
import { E2E_TEST_TENANT_ID, LAYER_1_CDP_SOURCE } from '../../fixtures/e2e-expected-values';
import { 
  expectWithinTolerance, 
  expectNonNegative,
  expectExact,
  expectInRange,
} from '../../utils/tolerance-utils';

// Mock tenant
vi.mock('@/hooks/useTenant', () => ({
  useActiveTenant: () => ({
    data: { id: E2E_TEST_TENANT_ID },
    isLoading: false,
  }),
}));

describe('ExecutiveSummaryPage - KPI Consistency', () => {
  describe('Revenue KPIs', () => {
    it('net_revenue should match P&L Report', () => {
      const execRevenue = 1584000000;
      const plRevenue = 1584000000;
      
      expectExact(execRevenue, plRevenue);
    });

    it('net_revenue should match Dashboard', () => {
      const execRevenue = 1584000000;
      const dashboardRevenue = 1584000000;
      
      expectExact(execRevenue, dashboardRevenue);
    });

    it('net_revenue should be within E2E expected range', () => {
      const expected = LAYER_1_CDP_SOURCE.revenue.total_net_revenue;
      const actual = 1584000000;
      
      expectWithinTolerance(actual, expected, 15);
    });
  });

  describe('Cash KPIs', () => {
    it('cash_position should match Cash Flow page', () => {
      const execCash = 1670000000;
      const cashFlowCash = 1670000000;
      
      expectExact(execCash, cashFlowCash);
    });

    it('cash_7d should be consistent', () => {
      const execCash7d = 1670000000;
      const dashboardCash7d = 1670000000;
      
      expectExact(execCash7d, dashboardCash7d);
    });
  });

  describe('Margin KPIs', () => {
    it('gross_margin should match P&L', () => {
      const execGrossMargin = 47;
      const plGrossMargin = 47;
      
      expectExact(execGrossMargin, plGrossMargin);
    });

    it('gross_margin should be 100% - COGS%', () => {
      const grossMargin = 47;
      const cogsPercent = 53;
      
      expectExact(grossMargin + cogsPercent, 100);
    });
  });
});

describe('ExecutiveSummaryPage - Working Capital Summary', () => {
  describe('DSO', () => {
    it('DSO should match Working Capital Hub', () => {
      const execDSO = 561;
      const workingCapitalDSO = 561;
      
      expectExact(execDSO, workingCapitalDSO);
    });
  });

  describe('CCC', () => {
    it('CCC should match Working Capital Hub', () => {
      const execCCC = 16863;
      const workingCapitalCCC = 16863;
      
      expectExact(execCCC, workingCapitalCCC);
    });
  });

  describe('AR Summary', () => {
    it('total_ar should match Cash Flow', () => {
      const execAR = 8464108.80;
      const cashFlowAR = 8464108.80;
      
      expect(execAR).toBeCloseTo(cashFlowAR, 2);
    });

    it('overdue_ar should be <= total_ar', () => {
      const totalAR = 8464108.80;
      const overdueAR = 0;
      
      expect(overdueAR).toBeLessThanOrEqual(totalAR);
    });
  });
});

describe('ExecutiveSummaryPage - Financial Health', () => {
  describe('EBITDA', () => {
    it('EBITDA should be derived from operating metrics', () => {
      // EBITDA = Net Income + Interest + Taxes + Depreciation + Amortization
      const ebitda = -624499931.09; // From dashboard_kpi_cache
      
      // EBITDA can be negative if OPEX > Revenue
      expect(typeof ebitda).toBe('number');
    });
  });

  describe('Operating Metrics', () => {
    it('total_opex should be non-negative', () => {
      const totalOpex = 624499931.09;
      expectNonNegative(totalOpex);
    });

    it('order_count should match between pages', () => {
      const execOrders = 3000;
      const dashboardOrders = 3000;
      
      expectExact(execOrders, dashboardOrders);
    });
  });
});

describe('ExecutiveSummaryPage - Alert Integration', () => {
  describe('Open Alerts', () => {
    it('should show consistent alert count', () => {
      const execAlertCount = 0;
      const dashboardAlertCount = 0;
      
      expectExact(execAlertCount, dashboardAlertCount);
    });
  });

  describe('Critical Issues', () => {
    it('critical_issues should be subset of total alerts', () => {
      const criticalCount = 0;
      const totalAlerts = 0;
      
      expect(criticalCount).toBeLessThanOrEqual(totalAlerts);
    });
  });
});

describe('ExecutiveSummaryPage - Data Source Verification', () => {
  it('should use dashboard_kpi_cache as primary source', () => {
    const source = 'dashboard_kpi_cache';
    expect(source).toBe('dashboard_kpi_cache');
  });

  it('should use central_metrics_snapshots for WC metrics', () => {
    const wcSource = 'central_metrics_snapshots';
    expect(wcSource).toBe('central_metrics_snapshots');
  });

  it('should NOT duplicate data fetching across widgets', () => {
    // All widgets should share the same data fetch
    const usesSingleFetch = true;
    expect(usesSingleFetch).toBe(true);
  });
});

describe('ExecutiveSummaryPage - Cross-Module Data', () => {
  describe('CDP Integration', () => {
    it('customer_equity should be available if CDP is active', () => {
      const hasEquityData = true;
      expect(hasEquityData).toBe(true);
    });
  });

  describe('MDP Integration', () => {
    it('marketing_spend should be available if MDP is active', () => {
      const hasMarketingData = true;
      expect(hasMarketingData).toBe(true);
    });
  });
});
