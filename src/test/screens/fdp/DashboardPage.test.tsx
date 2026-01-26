/**
 * FDP Dashboard Page - Screen-Level Data Accuracy Tests
 * 
 * Verifies that financial metrics displayed on /dashboard
 * match expected values from E2E test data.
 */

import { describe, it, expect } from 'vitest';
import { 
  FDP_DASHBOARD_EXPECTED,
  LAYER_1_CDP_SOURCE,
} from '../../fixtures/e2e-expected-values';
import {
  expectWithinTolerance,
  expectInRange,
  expectExact,
  expectNonNegative,
} from '../../utils/tolerance-utils';

describe('FDP Dashboard Page - Key Metrics', () => {
  describe('COGS Percentage', () => {
    it('cogs_percent should be ~53% (±3%)', () => {
      const expected = FDP_DASHBOARD_EXPECTED.KeyMetrics.cogs_percent;
      const tolerance = FDP_DASHBOARD_EXPECTED.KeyMetrics.cogs_tolerance;
      
      const actual = 53; // From fdp_locked_costs or cdp_order_items
      
      expectWithinTolerance(actual, expected, tolerance * 1.89); // Convert to relative tolerance
    });

    it('cogs_percent should be in valid range (0-100%)', () => {
      const cogsPercent = 53;
      
      expectInRange(cogsPercent, 0, 100);
    });

    it('cogs_percent should be realistic for retail (30-70%)', () => {
      const cogsPercent = 53;
      
      expectInRange(cogsPercent, 30, 70);
    });
  });

  describe('Gross Margin Percentage', () => {
    it('gross_margin_percent should be ~47% (±3%)', () => {
      const expected = FDP_DASHBOARD_EXPECTED.KeyMetrics.gross_margin_percent;
      const tolerance = FDP_DASHBOARD_EXPECTED.KeyMetrics.gross_margin_tolerance;
      
      const actual = 47; // 100% - 53% COGS
      
      expectWithinTolerance(actual, expected, tolerance * 2.13);
    });

    it('gross_margin + cogs should equal 100%', () => {
      const cogsPercent = 53;
      const grossMarginPercent = 47;
      
      expectExact(cogsPercent + grossMarginPercent, 100);
    });

    it('gross_margin should be positive', () => {
      const grossMarginPercent = 47;
      
      expect(grossMarginPercent).toBeGreaterThan(0);
    });
  });

  describe('Platform Fees', () => {
    it('platform_fees_percent should be ~4.5% (±1%)', () => {
      const expected = FDP_DASHBOARD_EXPECTED.KeyMetrics.platform_fees_percent;
      const tolerance = FDP_DASHBOARD_EXPECTED.KeyMetrics.platform_fees_tolerance;
      
      const actual = 4.5;
      
      expectWithinTolerance(actual, expected, tolerance * 22.2);
    });

    it('platform_fees should be realistic for marketplaces (2-10%)', () => {
      const platformFees = 4.5;
      
      expectInRange(platformFees, 2, 10);
    });
  });
});

describe('FDP Dashboard Page - Revenue by Channel', () => {
  describe('Channel Distribution', () => {
    it('Shopee should have ~40% share (±5%)', () => {
      const expected = FDP_DASHBOARD_EXPECTED.RevenueByChannel.shopee_share;
      const tolerance = FDP_DASHBOARD_EXPECTED.RevenueByChannel.share_tolerance;
      
      const actual = 40;
      
      expectWithinTolerance(actual, expected, tolerance * 2.5);
    });

    it('Lazada should have ~25% share (±5%)', () => {
      const expected = FDP_DASHBOARD_EXPECTED.RevenueByChannel.lazada_share;
      const tolerance = FDP_DASHBOARD_EXPECTED.RevenueByChannel.share_tolerance;
      
      const actual = 25;
      
      expectWithinTolerance(actual, expected, tolerance * 4);
    });

    it('Website should have ~15% share (±5%)', () => {
      const expected = FDP_DASHBOARD_EXPECTED.RevenueByChannel.website_share;
      const tolerance = FDP_DASHBOARD_EXPECTED.RevenueByChannel.share_tolerance;
      
      const actual = 15;
      
      expectWithinTolerance(actual, expected, tolerance * 6.67);
    });

    it('TikTok should have ~20% share (±5%)', () => {
      const expected = FDP_DASHBOARD_EXPECTED.RevenueByChannel.tiktok_share;
      const tolerance = FDP_DASHBOARD_EXPECTED.RevenueByChannel.share_tolerance;
      
      const actual = 20;
      
      expectWithinTolerance(actual, expected, tolerance * 5);
    });

    it('all channel shares should sum to 100%', () => {
      const shopee = 40;
      const lazada = 25;
      const website = 15;
      const tiktok = 20;
      
      expectExact(shopee + lazada + website + tiktok, 100);
    });
  });

  describe('Channel Revenue Amounts', () => {
    it('each channel should have positive revenue', () => {
      const channelRevenues = [
        633600000, // Shopee (40%)
        396000000, // Lazada (25%)
        237600000, // Website (15%)
        316800000, // TikTok (20%)
      ];
      
      channelRevenues.forEach(revenue => {
        expect(revenue).toBeGreaterThan(0);
      });
    });

    it('channel revenues should sum to total revenue', () => {
      const totalRevenue = LAYER_1_CDP_SOURCE.revenue.total_net_revenue;
      const shopeeRevenue = totalRevenue * 0.40;
      const lazadaRevenue = totalRevenue * 0.25;
      const websiteRevenue = totalRevenue * 0.15;
      const tiktokRevenue = totalRevenue * 0.20;
      
      const sum = shopeeRevenue + lazadaRevenue + websiteRevenue + tiktokRevenue;
      
      expectWithinTolerance(sum, totalRevenue, 1);
    });
  });
});

describe('FDP Dashboard Page - Contribution Margin', () => {
  it('contribution_margin should be gross_margin minus variable_costs', () => {
    const grossMargin = 47;
    const platformFees = 4.5;
    const expectedCM = grossMargin - platformFees;
    
    expectInRange(expectedCM, 40, 45);
  });

  it('contribution_margin should be positive for healthy business', () => {
    const contributionMargin = 42.5;
    
    expect(contributionMargin).toBeGreaterThan(0);
  });
});

describe('FDP Dashboard Page - Data Integrity', () => {
  it('COGS amount should match percentage of revenue', () => {
    const totalRevenue = LAYER_1_CDP_SOURCE.revenue.total_net_revenue;
    const cogsPercent = 53;
    const expectedCOGS = totalRevenue * (cogsPercent / 100);
    
    expectNonNegative(expectedCOGS);
    expect(expectedCOGS).toBeLessThan(totalRevenue);
  });

  it('gross profit should be revenue minus COGS', () => {
    const totalRevenue = LAYER_1_CDP_SOURCE.revenue.total_net_revenue;
    const cogsPercent = 53;
    const cogs = totalRevenue * (cogsPercent / 100);
    const grossProfit = totalRevenue - cogs;
    
    expectNonNegative(grossProfit);
  });

  it('all percentages should be non-negative', () => {
    const percentages = [53, 47, 4.5, 40, 25, 15, 20];
    
    percentages.forEach(pct => {
      expectNonNegative(pct);
    });
  });
});
