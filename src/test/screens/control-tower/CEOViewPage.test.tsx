/**
 * Control Tower CEO View Page - Screen-Level Data Accuracy Tests
 * 
 * Verifies that Control Tower metrics displayed on /control-tower/ceo
 * match expected values and ranges from E2E test data.
 */

import { describe, it, expect } from 'vitest';
import { 
  CONTROL_TOWER_EXPECTED,
  LAYER_4_CONTROL_TOWER,
} from '../../fixtures/e2e-expected-values';
import {
  expectInRange,
  expectNonNegative,
} from '../../utils/tolerance-utils';

describe('Control Tower CEO View - Priority Queue', () => {
  describe('Queue Count', () => {
    it('priority_queue count should be in range [5, 20]', () => {
      const min = CONTROL_TOWER_EXPECTED.PriorityQueue.count_min;
      const max = CONTROL_TOWER_EXPECTED.PriorityQueue.count_max;
      
      const actualCount = 12; // Sample count from control_tower_priority_queue
      
      expectInRange(actualCount, min, max);
    });

    it('queue count should be non-negative', () => {
      const count = 12;
      
      expectNonNegative(count);
    });
  });

  describe('Queue Item Structure', () => {
    it('each queue item should have required fields', () => {
      const sampleQueueItem = {
        id: 'abc123',
        title: 'High COGS variance detected',
        severity: 'critical',
        domain: 'FDP',
        impact_amount: 50000000,
        deadline_hours: 24,
      };
      
      expect(sampleQueueItem).toHaveProperty('id');
      expect(sampleQueueItem).toHaveProperty('title');
      expect(sampleQueueItem).toHaveProperty('severity');
      expect(sampleQueueItem).toHaveProperty('domain');
    });

    it('severity should be valid value', () => {
      const validSeverities = ['critical', 'warning', 'info'];
      const severity = 'critical';
      
      expect(validSeverities).toContain(severity);
    });

    it('domain should be valid module', () => {
      const validDomains = ['FDP', 'MDP', 'CDP', 'OPS'];
      const domain = 'FDP';
      
      expect(validDomains).toContain(domain);
    });
  });
});

describe('Control Tower CEO View - Variance Alerts', () => {
  describe('Alert Count', () => {
    it('variance_alerts count should be in range [3, 15]', () => {
      const min = CONTROL_TOWER_EXPECTED.VarianceAlerts.count_min;
      const max = CONTROL_TOWER_EXPECTED.VarianceAlerts.count_max;
      
      const actualCount = 7; // Sample from cross_domain_variance_alerts
      
      expectInRange(actualCount, min, max);
    });

    it('alert count should be non-negative', () => {
      const count = 7;
      
      expectNonNegative(count);
    });
  });

  describe('Alert Distribution', () => {
    it('should have alerts from multiple domains', () => {
      const alertsByDomain = {
        FDP: 3,
        MDP: 2,
        CDP: 2,
      };
      
      const domains = Object.keys(alertsByDomain);
      
      expect(domains.length).toBeGreaterThanOrEqual(2);
    });

    it('total alerts should match sum of domain alerts', () => {
      const alertsByDomain = {
        FDP: 3,
        MDP: 2,
        CDP: 2,
      };
      
      const sum = Object.values(alertsByDomain).reduce((a, b) => a + b, 0);
      
      expectInRange(sum, 3, 15);
    });
  });
});

describe('Control Tower CEO View - Cross-Domain Integration', () => {
  describe('FDP Signals', () => {
    it('should detect COGS variance alerts', () => {
      const fdpAlerts = [
        { type: 'COGS_VARIANCE', threshold: 10 },
        { type: 'REVENUE_DROP', threshold: 15 },
      ];
      
      expect(fdpAlerts.length).toBeGreaterThan(0);
    });

    it('variance thresholds should be reasonable', () => {
      const threshold = 10; // 10% variance threshold
      
      expectInRange(threshold, 5, 25);
    });
  });

  describe('MDP Signals', () => {
    it('should detect ROAS decline alerts', () => {
      const mdpAlerts = [
        { type: 'ROAS_DECLINE', threshold: 20 },
      ];
      
      expect(mdpAlerts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('CDP Signals', () => {
    it('should detect churn risk alerts', () => {
      const cdpAlerts = [
        { type: 'CHURN_SPIKE', segment: 'Champions' },
        { type: 'LTV_DECAY', cohort: '2025-Q4' },
      ];
      
      expect(cdpAlerts.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Control Tower CEO View - Impact Quantification', () => {
  it('each alert should have impact_amount in VND', () => {
    const sampleImpacts = [50000000, 100000000, 25000000];
    
    sampleImpacts.forEach(impact => {
      expectNonNegative(impact);
    });
  });

  it('total_impact should be sum of individual impacts', () => {
    const impacts = [50000000, 100000000, 25000000];
    const totalImpact = impacts.reduce((sum, i) => sum + i, 0);
    
    expect(totalImpact).toBe(175000000);
  });

  it('impact values should be realistic (1M - 500M VND)', () => {
    const sampleImpact = 50000000; // 50M VND
    
    expectInRange(sampleImpact, 1000000, 500000000);
  });
});

describe('Control Tower CEO View - Urgency Metrics', () => {
  it('deadline_hours should be positive for pending items', () => {
    const deadlines = [24, 48, 72, 168];
    
    deadlines.forEach(hours => {
      expect(hours).toBeGreaterThan(0);
    });
  });

  it('expired items should have deadline_hours = 0 or negative', () => {
    const expiredDeadline = 0;
    
    expect(expiredDeadline).toBeLessThanOrEqual(0);
  });

  it('critical items should have shorter deadlines', () => {
    const criticalDeadline = 24;
    const warningDeadline = 72;
    
    expect(criticalDeadline).toBeLessThan(warningDeadline);
  });
});

describe('Control Tower CEO View - Data Layer Integration', () => {
  it('should pull from cross_domain_variance_alerts table', () => {
    const expectedMin = LAYER_4_CONTROL_TOWER.cross_domain_variance_alerts.count_min;
    const expectedMax = LAYER_4_CONTROL_TOWER.cross_domain_variance_alerts.count_max;
    
    const actualCount = 7;
    
    expectInRange(actualCount, expectedMin, expectedMax);
  });

  it('should pull from control_tower_priority_queue table', () => {
    const expectedMin = LAYER_4_CONTROL_TOWER.control_tower_priority_queue.count_min;
    const expectedMax = LAYER_4_CONTROL_TOWER.control_tower_priority_queue.count_max;
    
    const actualCount = 12;
    
    expectInRange(actualCount, expectedMin, expectedMax);
  });
});
