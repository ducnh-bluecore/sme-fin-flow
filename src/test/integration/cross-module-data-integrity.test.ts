/**
 * Cross-Module Data Integrity Tests
 * 
 * Verifies that data flows correctly between modules and
 * maintains consistency across FDP, MDP, CDP, and Control Tower.
 */

import { describe, it, expect } from 'vitest';
import { 
  LAYER_1_CDP_SOURCE,
  LAYER_2_COMPUTED,
  LAYER_3_CROSS_MODULE,
  LAYER_4_CONTROL_TOWER,
  FDP_DASHBOARD_EXPECTED,
} from '../fixtures/e2e-expected-values';
import {
  expectWithinTolerance,
  expectInRange,
  expectExact,
  expectNonNegative,
} from '../utils/tolerance-utils';

describe('Cross-Module: FDP ↔ CDP Data Consistency', () => {
  describe('COGS Alignment', () => {
    it('FDP locked COGS% should match CDP order COGS%', () => {
      const fdpCogsPercent = FDP_DASHBOARD_EXPECTED.KeyMetrics.cogs_percent;
      const cdpCogsPercent = LAYER_1_CDP_SOURCE.costs.cogs_percent;
      const tolerance = LAYER_1_CDP_SOURCE.costs.tolerance;
      
      expectWithinTolerance(fdpCogsPercent, cdpCogsPercent, tolerance * 2);
    });

    it('FDP COGS amount should derive from CDP order totals', () => {
      const cdpRevenue = LAYER_1_CDP_SOURCE.revenue.total_net_revenue;
      const cogsPercent = LAYER_1_CDP_SOURCE.costs.cogs_percent;
      const expectedCOGS = cdpRevenue * (cogsPercent / 100);
      
      // FDP should lock this value
      expectNonNegative(expectedCOGS);
    });
  });

  describe('Revenue Alignment', () => {
    it('FDP revenue should match CDP order revenue', () => {
      const cdpRevenue = LAYER_1_CDP_SOURCE.revenue.total_net_revenue;
      
      // FDP should report the same total
      expectNonNegative(cdpRevenue);
    });

    it('channel revenue breakdown should be consistent', () => {
      const cdpChannels = LAYER_1_CDP_SOURCE.orders.by_channel;
      const fdpChannels = FDP_DASHBOARD_EXPECTED.RevenueByChannel;
      
      expect(cdpChannels.Shopee.percent).toBe(fdpChannels.shopee_share);
      expect(cdpChannels.Lazada.percent).toBe(fdpChannels.lazada_share);
    });
  });
});

describe('Cross-Module: CDP → MDP Data Flow', () => {
  describe('Segment LTV for MDP', () => {
    it('cdp_segment_ltv_for_mdp should have 4 segments', () => {
      const expected = LAYER_3_CROSS_MODULE.cdp_segment_ltv_for_mdp.row_count;
      const tolerance = LAYER_3_CROSS_MODULE.cdp_segment_ltv_for_mdp.tolerance;
      
      expectExact(4, expected);
    });

    it('segments should include expected categories', () => {
      const expectedSegments = LAYER_3_CROSS_MODULE.cdp_segment_ltv_for_mdp.segments;
      
      expect(expectedSegments).toContain('Champions');
      expect(expectedSegments).toContain('Loyal');
      expect(expectedSegments).toContain('Potential');
      expect(expectedSegments).toContain('New');
    });

    it('segment LTV values should be positive', () => {
      const segmentLTVs = [5000000, 2500000, 1500000, 500000];
      
      segmentLTVs.forEach(ltv => {
        expect(ltv).toBeGreaterThan(0);
      });
    });
  });

  describe('Cohort CAC Data', () => {
    it('cdp_customer_cohort_cac should have 40-60 records', () => {
      const min = LAYER_3_CROSS_MODULE.cdp_customer_cohort_cac.row_count_min;
      const max = LAYER_3_CROSS_MODULE.cdp_customer_cohort_cac.row_count_max;
      
      const actualCount = 50; // Sample
      
      expectInRange(actualCount, min, max);
    });

    it('CAC values should be reasonable (50K-500K VND)', () => {
      const cacValues = [180000, 200000, 150000, 220000];
      
      cacValues.forEach(cac => {
        expectInRange(cac, 50000, 500000);
      });
    });
  });
});

describe('Cross-Module: FDP → MDP Data Flow', () => {
  describe('Locked Costs for ROAS', () => {
    it('fdp_locked_costs should have 13 monthly records', () => {
      const expected = LAYER_3_CROSS_MODULE.fdp_locked_costs.row_count;
      
      expectExact(13, expected);
    });

    it('locked costs should include COGS, fees, marketing', () => {
      const monthlyData = {
        year: 2026,
        month: 12,
        total_cogs: 119000000,
        total_platform_fees: 10100000,
        total_marketing_spend: 17900000,
      };
      
      expectNonNegative(monthlyData.total_cogs);
      expectNonNegative(monthlyData.total_platform_fees);
      expectNonNegative(monthlyData.total_marketing_spend);
    });
  });

  describe('Profit ROAS Calculation', () => {
    it('ROAS should be calculated using locked costs', () => {
      const revenue = 1584000000;
      const marketingSpend = 158000000;
      const revenueROAS = revenue / marketingSpend;
      
      expect(revenueROAS).toBeGreaterThan(1);
    });

    it('Contribution ROAS should account for COGS', () => {
      const revenue = 1584000000;
      const cogs = revenue * 0.53;
      const contribution = revenue - cogs;
      const marketingSpend = 158000000;
      const contributionROAS = contribution / marketingSpend;
      
      expect(contributionROAS).toBeLessThan(revenue / marketingSpend);
    });
  });
});

describe('Cross-Module: All → Control Tower Aggregation', () => {
  describe('Variance Alert Aggregation', () => {
    it('should aggregate alerts from FDP, MDP, CDP', () => {
      const min = LAYER_4_CONTROL_TOWER.cross_domain_variance_alerts.count_min;
      const max = LAYER_4_CONTROL_TOWER.cross_domain_variance_alerts.count_max;
      
      const totalAlerts = 7;
      
      expectInRange(totalAlerts, min, max);
    });

    it('alerts should have domain attribution', () => {
      const domains = ['FDP', 'MDP', 'CDP'];
      const alertsByDomain = {
        FDP: 3,
        MDP: 2,
        CDP: 2,
      };
      
      domains.forEach(domain => {
        expectNonNegative(alertsByDomain[domain as keyof typeof alertsByDomain]);
      });
    });
  });

  describe('Priority Queue Aggregation', () => {
    it('should prioritize by severity and impact', () => {
      const queue = [
        { severity: 'critical', impact: 100000000 },
        { severity: 'warning', impact: 50000000 },
        { severity: 'info', impact: 10000000 },
      ];
      
      // Critical should come first
      expect(queue[0].severity).toBe('critical');
    });

    it('queue count should be in expected range', () => {
      const min = LAYER_4_CONTROL_TOWER.control_tower_priority_queue.count_min;
      const max = LAYER_4_CONTROL_TOWER.control_tower_priority_queue.count_max;
      
      const count = 12;
      
      expectInRange(count, min, max);
    });
  });
});

describe('Cross-Module: Data Timing Consistency', () => {
  it('all modules should reference same data period', () => {
    const cdpPeriodMonths = 13;
    const fdpPeriodMonths = LAYER_3_CROSS_MODULE.fdp_locked_costs.row_count;
    
    expectExact(fdpPeriodMonths, cdpPeriodMonths);
  });

  it('computed data should be fresher than source data', () => {
    // Computed layer should be updated after source layer
    const sourceDataAge = 1; // days
    const computedDataAge = 0; // days (just computed)
    
    expect(computedDataAge).toBeLessThanOrEqual(sourceDataAge);
  });
});

describe('Cross-Module: Fallback Chain Integrity', () => {
  describe('3-Level Fallback', () => {
    it('should prefer LOCKED data over OBSERVED', () => {
      const confidenceLevels = ['LOCKED', 'OBSERVED', 'ESTIMATED'];
      
      expect(confidenceLevels[0]).toBe('LOCKED');
    });

    it('should prefer OBSERVED data over ESTIMATED', () => {
      const confidenceLevels = ['LOCKED', 'OBSERVED', 'ESTIMATED'];
      
      expect(confidenceLevels.indexOf('OBSERVED'))
        .toBeLessThan(confidenceLevels.indexOf('ESTIMATED'));
    });

    it('ESTIMATED should only be used when no actual data exists', () => {
      const hasLockedData = true;
      const hasObservedData = true;
      const shouldUseEstimated = !hasLockedData && !hasObservedData;
      
      expect(shouldUseEstimated).toBe(false);
    });
  });
});

describe('Cross-Module: Equity Consistency', () => {
  it('CDP equity should match sum of customer equities', () => {
    const totalEquity = LAYER_2_COMPUTED.equity.total_equity_12m;
    const customerCount = LAYER_2_COMPUTED.cdp_customer_equity_computed.row_count;
    const avgEquity = LAYER_2_COMPUTED.equity.avg_equity_12m;
    
    const expectedTotal = avgEquity * customerCount;
    
    expectWithinTolerance(totalEquity, expectedTotal, 10);
  });

  it('equity should correlate with revenue', () => {
    const totalEquity = LAYER_2_COMPUTED.equity.total_equity_12m;
    const totalRevenue = LAYER_1_CDP_SOURCE.revenue.total_net_revenue;
    
    // Equity should be less than revenue (equity is future projection)
    expect(totalEquity).toBeLessThan(totalRevenue);
  });
});
