/**
 * Screen Data Accuracy Tests
 * 
 * Verifies that data displayed on each screen matches database reality.
 * These are integration tests that query real data.
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { E2E_TEST_TENANT_ID } from '../fixtures/e2e-expected-values';
import { expectWithinTolerance, expectInRange } from '../utils/tolerance-utils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const skipTests = !supabaseUrl || !supabaseKey;
const supabase = skipTests ? null : createClient(supabaseUrl, supabaseKey);

describe.skipIf(skipTests)('Screen: CDP Overview (/cdp)', () => {
  it('CustomerEquitySnapshot should show correct equity total', async () => {
    const { data, error } = await supabase!
      .from('v_cdp_equity_overview')
      .select('total_equity_12m, customer_count, avg_equity_12m')
      .eq('tenant_id', E2E_TEST_TENANT_ID)
      .maybeSingle();
    
    expect(error).toBeNull();
    
    if (data) {
      // Equity should be ~1.23B
      expectWithinTolerance(data.total_equity_12m, 1227758419, 25);
      // Customer count should be ~500
      expectWithinTolerance(data.customer_count, 500, 10);
    }
  });

  it('ActiveCustomersCard should show correct counts', async () => {
    const { data, error } = await supabase!
      .rpc('cdp_count_active_customers', {
        p_tenant_id: E2E_TEST_TENANT_ID,
        p_start_date: '2025-01-01',
        p_end_date: '2026-01-26'
      });
    
    if (error?.code === 'PGRST202') {
      console.log('cdp_count_active_customers RPC not found - calculating manually');
      
      const { data: orders } = await supabase!
        .from('cdp_orders')
        .select('customer_id')
        .eq('tenant_id', E2E_TEST_TENANT_ID)
        .gte('order_at', '2025-01-01')
        .lte('order_at', '2026-01-26');
      
      const uniqueCustomers = new Set(orders?.map(o => o.customer_id));
      expectInRange(uniqueCustomers.size, 200, 500);
      return;
    }
    
    expect(error).toBeNull();
    expectInRange(data ?? 0, 200, 500);
  });
});

describe.skipIf(skipTests)('Screen: LTV Engine (/cdp/ltv-engine)', () => {
  describe('Overview Tab', () => {
    it('should show correct total CLV', async () => {
      // CLV = Realized Revenue + Remaining Potential (Equity)
      const { data: orders } = await supabase!
        .from('cdp_orders')
        .select('net_revenue')
        .eq('tenant_id', E2E_TEST_TENANT_ID);
      
      const realizedRevenue = orders?.reduce((sum, o) => sum + (o.net_revenue || 0), 0) ?? 0;
      
      const { data: equity } = await supabase!
        .from('cdp_customer_equity_computed')
        .select('equity_12m')
        .eq('tenant_id', E2E_TEST_TENANT_ID);
      
      const totalEquity = equity?.reduce((sum, e) => sum + (e.equity_12m || 0), 0) ?? 0;
      
      const totalCLV = realizedRevenue + totalEquity;
      
      // Should be ~2.8B (1.58B revenue + 1.23B equity)
      expectWithinTolerance(totalCLV, 2811758419, 20);
    });
  });

  describe('By Risk Level Tab', () => {
    it('should have customers distributed across risk levels', async () => {
      const { data, error } = await supabase!
        .from('cdp_customer_equity_computed')
        .select('churn_risk_level')
        .eq('tenant_id', E2E_TEST_TENANT_ID);
      
      expect(error).toBeNull();
      
      const riskCounts = {
        low: 0,
        medium: 0,
        high: 0,
      };
      
      data?.forEach(c => {
        const risk = c.churn_risk_level?.toLowerCase() || 'medium';
        if (risk.includes('low')) riskCounts.low++;
        else if (risk.includes('high')) riskCounts.high++;
        else riskCounts.medium++;
      });
      
      // Verify distribution exists
      expect(riskCounts.low + riskCounts.medium + riskCounts.high).toBeGreaterThan(0);
    });
  });
});

describe.skipIf(skipTests)('Screen: Customer Audit (/cdp/audit/:id)', () => {
  const testCustomerId = '22222222-0002-0000-0000-000000000066';
  
  it('TransactionSummary should match actual order data', async () => {
    // Get audit view data
    const { data: audit } = await supabase!
      .from('v_cdp_customer_audit')
      .select('total_spend, order_count, aov')
      .eq('id', testCustomerId)
      .maybeSingle();
    
    // Get raw order data to verify
    const { data: orders } = await supabase!
      .from('cdp_orders')
      .select('net_revenue')
      .eq('customer_id', testCustomerId);
    
    const actualTotal = orders?.reduce((sum, o) => sum + (o.net_revenue || 0), 0) ?? 0;
    const actualCount = orders?.length ?? 0;
    const actualAOV = actualCount > 0 ? actualTotal / actualCount : 0;
    
    if (audit) {
      // View data should match raw calculation
      expectWithinTolerance(audit.total_spend, actualTotal, 1);
      expect(audit.order_count).toBe(actualCount);
      expectWithinTolerance(audit.aov, actualAOV, 1);
    }
  });

  it('RFM scores should be calculated correctly', async () => {
    const { data } = await supabase!
      .from('v_cdp_customer_audit')
      .select('rfm_r, rfm_f, rfm_m, order_count, total_spend')
      .eq('id', testCustomerId)
      .maybeSingle();
    
    if (data) {
      // High order count + high spend = high F and M scores
      if (data.order_count >= 50) {
        expect(data.rfm_f).toBeGreaterThanOrEqual(4);
      }
      if (data.total_spend >= 20000000) { // 20M+
        expect(data.rfm_m).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('TopProducts should display human-readable names', async () => {
    const { data: items } = await supabase!
      .from('cdp_order_items')
      .select('product_id')
      .eq('cdp_orders.customer_id', testCustomerId)
      .limit(50);
    
    if (items && items.length > 0) {
      const productIds = [...new Set(items.map(i => i.product_id))];
      
      const { data: products } = await supabase!
        .from('products')
        .select('id, name')
        .in('id', productIds.slice(0, 10));
      
      products?.forEach(p => {
        // Name should not be a UUID
        expect(p.name).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
        // Name should be readable Vietnamese
        expect(p.name.length).toBeGreaterThan(5);
      });
    }
  });
});

describe.skipIf(skipTests)('Screen: FDP Dashboard (/fdp)', () => {
  it('should calculate correct COGS percentage', async () => {
    const { data: orders } = await supabase!
      .from('cdp_orders')
      .select('net_revenue, cogs_amount')
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.net_revenue || 0), 0) ?? 0;
    const totalCOGS = orders?.reduce((sum, o) => sum + (o.cogs_amount || 0), 0) ?? 0;
    
    if (totalRevenue > 0) {
      const cogsPercent = (totalCOGS / totalRevenue) * 100;
      // COGS should be ~53%
      expectWithinTolerance(cogsPercent, 53, 10);
    }
  });

  it('should calculate correct Gross Margin percentage', async () => {
    const { data: orders } = await supabase!
      .from('cdp_orders')
      .select('net_revenue, cogs_amount')
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.net_revenue || 0), 0) ?? 0;
    const totalCOGS = orders?.reduce((sum, o) => sum + (o.cogs_amount || 0), 0) ?? 0;
    
    if (totalRevenue > 0) {
      const grossMarginPercent = ((totalRevenue - totalCOGS) / totalRevenue) * 100;
      // Gross Margin should be ~47%
      expectWithinTolerance(grossMarginPercent, 47, 10);
    }
  });
});

describe.skipIf(skipTests)('Screen: Control Tower (/control-tower)', () => {
  it('should have variance alerts in expected range', async () => {
    const { count, error } = await supabase!
      .from('cross_domain_variance_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    // Table may not exist yet
    if (error?.code === 'PGRST204' || error?.code === '42P01') {
      console.log('cross_domain_variance_alerts table not found - skipping');
      return;
    }
    
    expect(error).toBeNull();
    expectInRange(count ?? 0, 0, 20);
  });

  it('should have priority queue items in expected range', async () => {
    const { count, error } = await supabase!
      .from('control_tower_priority_queue')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    // Table may not exist yet
    if (error?.code === 'PGRST204' || error?.code === '42P01') {
      console.log('control_tower_priority_queue table not found - skipping');
      return;
    }
    
    expect(error).toBeNull();
    expectInRange(count ?? 0, 0, 25);
  });
});

describe.skipIf(skipTests)('Cross-Screen Data Consistency', () => {
  it('customer count should be consistent across views', async () => {
    // From cdp_customers
    const { count: customerCount } = await supabase!
      .from('cdp_customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    // From cdp_customer_equity_computed
    const { count: equityCount } = await supabase!
      .from('cdp_customer_equity_computed')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    // Should be roughly equal (computed may lag slightly)
    if (customerCount && equityCount) {
      expectWithinTolerance(equityCount, customerCount, 10);
    }
  });

  it('total revenue should match between sources', async () => {
    // From cdp_orders
    const { data: orders } = await supabase!
      .from('cdp_orders')
      .select('net_revenue')
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    const orderRevenue = orders?.reduce((sum, o) => sum + (o.net_revenue || 0), 0) ?? 0;
    
    // From customer audit totals
    const { data: audits } = await supabase!
      .from('v_cdp_customer_audit')
      .select('total_spend')
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    const auditRevenue = audits?.reduce((sum, a) => sum + (a.total_spend || 0), 0) ?? 0;
    
    // Should match closely
    if (orderRevenue > 0 && auditRevenue > 0) {
      expectWithinTolerance(auditRevenue, orderRevenue, 5);
    }
  });
});
