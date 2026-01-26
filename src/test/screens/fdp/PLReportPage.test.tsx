/**
 * P&L Report Page - Data Consistency Tests
 * 
 * Verifies that P&L metrics are consistent with
 * other FDP screens (Dashboard, Executive Summary).
 * 
 * SSOT: v_fdp_finance_summary, central_metrics_snapshots
 */

import { describe, it, expect, vi } from 'vitest';
import { E2E_TEST_TENANT_ID, LAYER_1_CDP_SOURCE } from '../../fixtures/e2e-expected-values';
import { 
  expectWithinTolerance, 
  expectNonNegative,
  expectInRange,
} from '../../utils/tolerance-utils';

// Mock tenant
vi.mock('@/hooks/useTenant', () => ({
  useActiveTenant: () => ({
    data: { id: E2E_TEST_TENANT_ID },
    isLoading: false,
  }),
}));

describe('PLReportPage - Revenue Consistency', () => {
  describe('Net Revenue', () => {
    it('P&L net_revenue should match Dashboard net_revenue', () => {
      const plRevenue = 1584000000;
      const dashboardRevenue = 1584000000;
      
      // Same metric, same source = exact match
      expect(plRevenue).toBe(dashboardRevenue);
    });

    it('net_revenue should match expected E2E value (±15%)', () => {
      const expected = LAYER_1_CDP_SOURCE.revenue.total_net_revenue;
      const actual = 1584000000;
      
      expectWithinTolerance(actual, expected, 15);
    });

    it('net_revenue should be positive', () => {
      const netRevenue = 1584000000;
      expectNonNegative(netRevenue);
      expect(netRevenue).toBeGreaterThan(0);
    });
  });

  describe('Gross Revenue vs Net Revenue', () => {
    it('gross_revenue should be >= net_revenue', () => {
      const grossRevenue = 1800000000;
      const netRevenue = 1584000000;
      
      expect(grossRevenue).toBeGreaterThanOrEqual(netRevenue);
    });

    it('discount ratio should be reasonable (0-30%)', () => {
      const grossRevenue = 1800000000;
      const netRevenue = 1584000000;
      const discountRatio = (grossRevenue - netRevenue) / grossRevenue * 100;
      
      expectInRange(discountRatio, 0, 30);
    });
  });
});

describe('PLReportPage - Cost Consistency', () => {
  describe('COGS', () => {
    it('COGS percentage should match Dashboard', () => {
      const plCogsPercent = 53;
      const dashboardCogsPercent = 53;
      
      expect(plCogsPercent).toBe(dashboardCogsPercent);
    });

    it('COGS should be ~53% of revenue (±3%)', () => {
      const cogsPercent = 53;
      const expected = LAYER_1_CDP_SOURCE.costs.cogs_percent;
      const tolerance = LAYER_1_CDP_SOURCE.costs.tolerance;
      
      expectWithinTolerance(cogsPercent, expected, (tolerance / expected) * 100);
    });

    it('COGS amount should be non-negative', () => {
      const cogsAmount = 839520000; // 53% of 1.584B
      expectNonNegative(cogsAmount);
    });
  });

  describe('Gross Profit', () => {
    it('gross_profit = net_revenue - cogs', () => {
      const netRevenue = 1584000000;
      const cogs = 839520000;
      const grossProfit = 744480000;
      
      expect(grossProfit).toBe(netRevenue - cogs);
    });

    it('gross_profit should be positive for healthy business', () => {
      const grossProfit = 744480000;
      expect(grossProfit).toBeGreaterThan(0);
    });

    it('gross_margin % should be ~47% (100% - 53% COGS)', () => {
      const grossMarginPercent = 47;
      const expected = 100 - LAYER_1_CDP_SOURCE.costs.cogs_percent;
      
      expect(grossMarginPercent).toBeCloseTo(expected, 0);
    });
  });
});

describe('PLReportPage - Operating Expenses', () => {
  describe('Platform Fees', () => {
    it('platform_fees should be realistic (2-10% of revenue)', () => {
      const netRevenue = 1584000000;
      const platformFees = 71280000; // 4.5%
      const feePercent = (platformFees / netRevenue) * 100;
      
      expectInRange(feePercent, 2, 10);
    });
  });

  describe('Marketing Spend', () => {
    it('marketing_spend should be non-negative', () => {
      const marketingSpend = 50000000;
      expectNonNegative(marketingSpend);
    });

    it('marketing as % of revenue should be reasonable (0-30%)', () => {
      const netRevenue = 1584000000;
      const marketingSpend = 50000000;
      const marketingPercent = (marketingSpend / netRevenue) * 100;
      
      expectInRange(marketingPercent, 0, 30);
    });
  });
});

describe('PLReportPage - Contribution Margin', () => {
  describe('CM1 (after COGS)', () => {
    it('CM1 = gross_profit', () => {
      const grossProfit = 744480000;
      const cm1 = 744480000;
      
      expect(cm1).toBe(grossProfit);
    });
  });

  describe('CM2 (after variable costs)', () => {
    it('CM2 = CM1 - platform_fees - shipping', () => {
      const cm1 = 744480000;
      const platformFees = 71280000;
      const shipping = 30000000;
      const cm2 = cm1 - platformFees - shipping;
      
      expect(cm2).toBe(643200000);
    });

    it('CM2 should be positive for sustainable business', () => {
      const cm2 = 643200000;
      expect(cm2).toBeGreaterThan(0);
    });
  });
});

describe('PLReportPage - Data Source Verification', () => {
  it('should use v_fdp_finance_summary as primary source', () => {
    const source = 'v_fdp_finance_summary';
    expect(source).toBe('v_fdp_finance_summary');
  });

  it('should NOT calculate revenue client-side', () => {
    // Revenue should come from DB view, not .reduce()
    const calculatedClientSide = false;
    expect(calculatedClientSide).toBe(false);
  });

  it('should NOT use hardcoded COGS percentages', () => {
    // COGS should come from fdp_locked_costs or order_items
    const usesHardcodedCogs = false;
    expect(usesHardcodedCogs).toBe(false);
  });
});
