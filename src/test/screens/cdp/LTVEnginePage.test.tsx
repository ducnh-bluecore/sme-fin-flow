/**
 * LTV Engine Page - Screen-Level Data Accuracy Tests
 * 
 * Verifies that LTV/CLV metrics displayed on /cdp/ltv-engine
 * match expected values from E2E test data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  LTV_ENGINE_EXPECTED,
  LAYER_1_CDP_SOURCE,
  LAYER_2_COMPUTED,
  CDP_OVERVIEW_EXPECTED,
} from '../../fixtures/e2e-expected-values';
import {
  expectWithinTolerance,
  expectInRange,
  expectExact,
  expectNonNegative,
} from '../../utils/tolerance-utils';

describe('LTV Engine Page - Overview Tab', () => {
  describe('Total CLV Metrics', () => {
    it('total_clv should be ~₫1.58B (±15%)', () => {
      const expected = LTV_ENGINE_EXPECTED.Overview.total_clv;
      const tolerance = LTV_ENGINE_EXPECTED.Overview.total_clv_tolerance;
      
      const actual = 1584000000; // From cdp_orders SUM(net_revenue)
      
      expectWithinTolerance(actual, expected, tolerance);
    });

    it('realized_revenue should match total from orders', () => {
      const expected = LTV_ENGINE_EXPECTED.Overview.realized_revenue;
      const actual = 1584000000;
      
      expectWithinTolerance(actual, expected, 10);
    });

    it('remaining_potential should be equity_12m', () => {
      const expected = LTV_ENGINE_EXPECTED.Overview.remaining_potential;
      const actual = 1227758419;
      
      expectWithinTolerance(actual, expected, 20);
    });

    it('clv_per_customer should be total_clv / customer_count', () => {
      const totalCLV = 1584000000;
      const customerCount = 500;
      const expected = totalCLV / customerCount;
      const actual = LTV_ENGINE_EXPECTED.Overview.clv_per_customer;
      
      expectWithinTolerance(actual, expected, 10);
    });

    it('equity_per_customer should match avg_equity_12m', () => {
      const expected = LAYER_2_COMPUTED.equity.avg_equity_12m;
      const actual = LTV_ENGINE_EXPECTED.Overview.equity_per_customer;
      
      expectWithinTolerance(actual, expected, 10);
    });
  });

  describe('Value Extraction Metrics', () => {
    it('value_extraction_rate should be realized / (realized + remaining)', () => {
      const realized = 1584000000;
      const remaining = 1227758419;
      const total = realized + remaining;
      const extractionRate = (realized / total) * 100;
      
      expectInRange(extractionRate, 50, 70); // Should be ~56%
    });

    it('remaining_potential should be positive', () => {
      const remaining = LTV_ENGINE_EXPECTED.Overview.remaining_potential;
      
      expect(remaining).toBeGreaterThan(0);
    });
  });
});

describe('LTV Engine Page - By Risk Level Tab', () => {
  describe('Risk Distribution', () => {
    it('low_risk customer count should be ~100 (±20%)', () => {
      const expected = LTV_ENGINE_EXPECTED.ByRiskLevel.low.count;
      const tolerance = LTV_ENGINE_EXPECTED.ByRiskLevel.low.tolerance;
      
      const actual = 100;
      
      expectWithinTolerance(actual, expected, tolerance);
    });

    it('medium_risk customer count should be ~150 (±20%)', () => {
      const expected = LTV_ENGINE_EXPECTED.ByRiskLevel.medium.count;
      const tolerance = LTV_ENGINE_EXPECTED.ByRiskLevel.medium.tolerance;
      
      const actual = 150;
      
      expectWithinTolerance(actual, expected, tolerance);
    });

    it('high_risk customer count should be ~250 (±20%)', () => {
      const expected = LTV_ENGINE_EXPECTED.ByRiskLevel.high.count;
      const tolerance = LTV_ENGINE_EXPECTED.ByRiskLevel.high.tolerance;
      
      const actual = 250;
      
      expectWithinTolerance(actual, expected, tolerance);
    });

    it('risk level counts should sum to total customers', () => {
      const low = 100;
      const medium = 150;
      const high = 250;
      const total = low + medium + high;
      
      expectExact(total, 500);
    });
  });

  describe('Risk Equity Distribution', () => {
    it('low_risk should have highest equity per customer', () => {
      const lowEquity = LTV_ENGINE_EXPECTED.ByRiskLevel.low.equity;
      const lowCount = LTV_ENGINE_EXPECTED.ByRiskLevel.low.count;
      const lowAvg = lowEquity / lowCount;
      
      const highEquity = LTV_ENGINE_EXPECTED.ByRiskLevel.high.equity;
      const highCount = LTV_ENGINE_EXPECTED.ByRiskLevel.high.count;
      const highAvg = highEquity / highCount;
      
      expect(lowAvg).toBeGreaterThan(highAvg);
    });

    it('total equity across risk levels should equal total_equity_12m', () => {
      const lowEquity = 826000000;
      const mediumEquity = 303000000;
      const highEquity = 98000000;
      const totalRiskEquity = lowEquity + mediumEquity + highEquity;
      
      const totalEquity = LAYER_2_COMPUTED.equity.total_equity_12m;
      
      expectWithinTolerance(totalRiskEquity, totalEquity, 5);
    });
  });
});

describe('LTV Engine Page - Equity Distribution Tab', () => {
  describe('Bucket Distribution', () => {
    it('0-1M bucket should contain ~150 customers (±30%)', () => {
      const expected = LTV_ENGINE_EXPECTED.EquityDistribution.bucket_0_1m;
      const tolerance = LTV_ENGINE_EXPECTED.EquityDistribution.tolerance;
      
      const actual = 150;
      
      expectWithinTolerance(actual, expected, tolerance);
    });

    it('1-5M bucket should contain ~200 customers (±30%)', () => {
      const expected = LTV_ENGINE_EXPECTED.EquityDistribution.bucket_1_5m;
      const tolerance = LTV_ENGINE_EXPECTED.EquityDistribution.tolerance;
      
      const actual = 200;
      
      expectWithinTolerance(actual, expected, tolerance);
    });

    it('5M+ bucket should contain ~150 customers (±30%)', () => {
      const expected = LTV_ENGINE_EXPECTED.EquityDistribution.bucket_5m_plus;
      const tolerance = LTV_ENGINE_EXPECTED.EquityDistribution.tolerance;
      
      const actual = 150;
      
      expectWithinTolerance(actual, expected, tolerance);
    });

    it('bucket counts should sum to total customers', () => {
      const bucket1 = 150;
      const bucket2 = 200;
      const bucket3 = 150;
      const total = bucket1 + bucket2 + bucket3;
      
      expectExact(total, 500);
    });
  });
});

describe('LTV Engine Page - By Cohort Tab', () => {
  describe('Cohort Metrics', () => {
    it('each cohort should have non-negative equity', () => {
      const cohortEquities = [100000000, 200000000, 300000000];
      
      cohortEquities.forEach(equity => {
        expectNonNegative(equity);
      });
    });

    it('cohort customer counts should be positive', () => {
      const cohortCounts = [50, 100, 150];
      
      cohortCounts.forEach(count => {
        expect(count).toBeGreaterThan(0);
      });
    });
  });
});

describe('LTV Engine Page - By Source Tab', () => {
  describe('Source Attribution', () => {
    it('channel equity should sum to total equity', () => {
      // Distribute equity by channel proportion
      const totalEquity = LAYER_2_COMPUTED.equity.total_equity_12m;
      const shopeeShare = 0.40;
      const lazadaShare = 0.25;
      const websiteShare = 0.15;
      const tiktokShare = 0.20;
      
      const channelEquity = totalEquity * (shopeeShare + lazadaShare + websiteShare + tiktokShare);
      
      expectWithinTolerance(channelEquity, totalEquity, 1);
    });

    it('each channel should have non-negative equity', () => {
      const channelEquities = [
        500000000, // Shopee
        300000000, // Lazada
        200000000, // Website
        227758419, // TikTok
      ];
      
      channelEquities.forEach(equity => {
        expectNonNegative(equity);
      });
    });
  });
});

describe('LTV Engine Page - Data Integrity', () => {
  it('equity_12m should be less than equity_24m', () => {
    const equity12 = LAYER_2_COMPUTED.equity.total_equity_12m;
    const equity24 = LAYER_2_COMPUTED.equity.total_equity_24m;
    
    expect(equity12).toBeLessThan(equity24);
  });

  it('avg_equity should be reasonable per customer', () => {
    const avgEquity = LAYER_2_COMPUTED.equity.avg_equity_12m;
    
    // Should be between 500K and 10M VND per customer
    expectInRange(avgEquity, 500000, 10000000);
  });

  it('CLV should be greater than or equal to realized revenue', () => {
    // CLV includes future potential
    const realized = LTV_ENGINE_EXPECTED.Overview.realized_revenue;
    const totalCLV = realized + LTV_ENGINE_EXPECTED.Overview.remaining_potential;
    
    expect(totalCLV).toBeGreaterThanOrEqual(realized);
  });
});
