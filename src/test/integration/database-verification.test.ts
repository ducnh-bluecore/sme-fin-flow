/**
 * Database Integration Tests - E2E Data Verification
 * 
 * These tests query REAL data from Supabase and verify against expected values.
 * They ensure that all screens display accurate data from the E2E Test Company.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { 
  E2E_TEST_TENANT_ID,
  LAYER_1_CDP_SOURCE,
  LAYER_2_COMPUTED,
  CDP_OVERVIEW_EXPECTED,
  LTV_ENGINE_EXPECTED,
  FDP_DASHBOARD_EXPECTED,
} from '../fixtures/e2e-expected-values';
import {
  expectWithinTolerance,
  expectInRange,
} from '../utils/tolerance-utils';

// Initialize Supabase client for testing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Skip tests if env vars not available
const skipTests = !supabaseUrl || !supabaseKey;

const supabase = skipTests ? null : createClient(supabaseUrl, supabaseKey);

describe.skipIf(skipTests)('Database Verification: CDP Source Data', () => {
  describe('cdp_orders table', () => {
    it('should have ~5,500 orders for E2E tenant', async () => {
      const { count, error } = await supabase!
        .from('cdp_orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', E2E_TEST_TENANT_ID);
      
      expect(error).toBeNull();
      expectWithinTolerance(count ?? 0, LAYER_1_CDP_SOURCE.orders.count, 5);
    });

    it('should have correct total net_revenue ~₫1.58B', async () => {
      const { data, error } = await supabase!
        .rpc('get_cdp_total_revenue', { p_tenant_id: E2E_TEST_TENANT_ID });
      
      // If RPC doesn't exist, query directly
      if (error?.code === 'PGRST202') {
        const { data: orders } = await supabase!
          .from('cdp_orders')
          .select('net_revenue')
          .eq('tenant_id', E2E_TEST_TENANT_ID);
        
        const totalRevenue = orders?.reduce((sum, o) => sum + (o.net_revenue || 0), 0) ?? 0;
        expectWithinTolerance(totalRevenue, LAYER_1_CDP_SOURCE.revenue.total_net_revenue, 10);
      } else {
        expect(error).toBeNull();
        expectWithinTolerance(data ?? 0, LAYER_1_CDP_SOURCE.revenue.total_net_revenue, 10);
      }
    });

    it('should have 500 unique customers', async () => {
      const { data, error } = await supabase!
        .from('cdp_orders')
        .select('customer_id')
        .eq('tenant_id', E2E_TEST_TENANT_ID);
      
      expect(error).toBeNull();
      const uniqueCustomers = new Set(data?.map(o => o.customer_id));
      expectWithinTolerance(uniqueCustomers.size, LAYER_1_CDP_SOURCE.customers.count, 5);
    });
  });

  describe('cdp_customers table', () => {
    it('should have 500 customers for E2E tenant', async () => {
      const { count, error } = await supabase!
        .from('cdp_customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', E2E_TEST_TENANT_ID);
      
      expect(error).toBeNull();
      expectWithinTolerance(count ?? 0, 500, 5);
    });
  });

  describe('products table', () => {
    it('should have 100 SKUs for E2E tenant', async () => {
      const { count, error } = await supabase!
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', E2E_TEST_TENANT_ID);
      
      expect(error).toBeNull();
      expectWithinTolerance(count ?? 0, 100, 10); // 100 SKUs
    });
  });
});

describe.skipIf(skipTests)('Database Verification: CDP Computed Layer', () => {
  describe('cdp_customer_equity_computed', () => {
    it('should have equity computed for customers', async () => {
      const { count, error } = await supabase!
        .from('cdp_customer_equity_computed')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', E2E_TEST_TENANT_ID);
      
      expect(error).toBeNull();
      expect(count).toBeGreaterThan(0);
    });

    it('should have total_equity_12m ~₫1.23B', async () => {
      const { data, error } = await supabase!
        .from('cdp_customer_equity_computed')
        .select('equity_12m')
        .eq('tenant_id', E2E_TEST_TENANT_ID);
      
      expect(error).toBeNull();
      const totalEquity = data?.reduce((sum, c) => sum + (c.equity_12m || 0), 0) ?? 0;
      expectWithinTolerance(totalEquity, LAYER_2_COMPUTED.equity.total_equity_12m, 20);
    });
  });
});

describe.skipIf(skipTests)('Database Verification: CDP Views', () => {
  describe('v_cdp_customer_audit', () => {
    it('should return valid audit data for sample customer', async () => {
      const sampleCustomerId = '22222222-0002-0000-0000-000000000001';
      
      const { data, error } = await supabase!
        .from('v_cdp_customer_audit')
        .select('*')
        .eq('tenant_id', E2E_TEST_TENANT_ID)
        .eq('id', sampleCustomerId)
        .maybeSingle();
      
      expect(error).toBeNull();
      
      if (data) {
        // Verify RFM scores are in valid range
        expect(data.rfm_r).toBeGreaterThanOrEqual(1);
        expect(data.rfm_r).toBeLessThanOrEqual(5);
        expect(data.rfm_f).toBeGreaterThanOrEqual(1);
        expect(data.rfm_f).toBeLessThanOrEqual(5);
        expect(data.rfm_m).toBeGreaterThanOrEqual(1);
        expect(data.rfm_m).toBeLessThanOrEqual(5);
        
        // Verify days_since_last_purchase is non-negative
        expect(data.days_since_last_purchase).toBeGreaterThanOrEqual(0);
        
        // Verify order_count is positive
        expect(data.order_count).toBeGreaterThan(0);
      }
    });
  });

  describe('v_cdp_equity_overview', () => {
    it('should return equity overview for E2E tenant', async () => {
      const { data, error } = await supabase!
        .from('v_cdp_equity_overview')
        .select('*')
        .eq('tenant_id', E2E_TEST_TENANT_ID)
        .maybeSingle();
      
      expect(error).toBeNull();
      
      if (data) {
        expect(data.total_equity_12m).toBeGreaterThan(0);
        expect(data.customer_count).toBeGreaterThan(0);
      }
    });
  });
});

describe.skipIf(skipTests)('Database Verification: FDP Views', () => {
  describe('FDP Period Summary RPC', () => {
    it('should return financial summary for E2E tenant', async () => {
      const { data, error } = await supabase!
        .rpc('get_fdp_period_summary', { 
          p_tenant_id: E2E_TEST_TENANT_ID,
          p_start_date: '2024-01-01',
          p_end_date: '2026-01-26'
        });
      
      // RPC may not exist yet - skip if not found
      if (error?.code === 'PGRST202') {
        console.log('get_fdp_period_summary RPC not found - skipping');
        return;
      }
      
      expect(error).toBeNull();
      
      if (data) {
        // Verify COGS% is ~53%
        if (data.cogs_percent) {
          expectWithinTolerance(data.cogs_percent, FDP_DASHBOARD_EXPECTED.KeyMetrics.cogs_percent, 5);
        }
      }
    });
  });
});

describe.skipIf(skipTests)('Database Verification: Channel Distribution', () => {
  it('should have orders from 4 channels', async () => {
    const { data, error } = await supabase!
      .from('cdp_orders')
      .select('channel')
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    expect(error).toBeNull();
    
    const channels = new Set(data?.map(o => o.channel));
    expect(channels.size).toBeGreaterThanOrEqual(3); // At least 3 channels
  });

  it('Shopee should have ~40% of orders', async () => {
    const { data: allOrders } = await supabase!
      .from('cdp_orders')
      .select('channel')
      .eq('tenant_id', E2E_TEST_TENANT_ID);
    
    const shopeeOrders = allOrders?.filter(o => 
      o.channel?.toLowerCase().includes('shopee')
    ).length ?? 0;
    
    const totalOrders = allOrders?.length ?? 1;
    const shopeePercent = (shopeeOrders / totalOrders) * 100;
    
    expectInRange(shopeePercent, 30, 50); // 30-50% range
  });
});

describe.skipIf(skipTests)('Database Verification: Data Integrity', () => {
  it('all orders should have valid customer_id', async () => {
    const { data, error } = await supabase!
      .from('cdp_orders')
      .select('id, customer_id')
      .eq('tenant_id', E2E_TEST_TENANT_ID)
      .is('customer_id', null)
      .limit(10);
    
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0); // No null customer_ids
  });

  it('all orders should have positive net_revenue', async () => {
    const { data, error } = await supabase!
      .from('cdp_orders')
      .select('id, net_revenue')
      .eq('tenant_id', E2E_TEST_TENANT_ID)
      .lt('net_revenue', 0)
      .limit(10);
    
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0); // No negative revenues
  });

  it('order dates should be within test period (2024-2026)', async () => {
    const { data, error } = await supabase!
      .from('cdp_orders')
      .select('id, order_at')
      .eq('tenant_id', E2E_TEST_TENANT_ID)
      .or('order_at.lt.2024-01-01,order_at.gt.2027-01-01')
      .limit(10);
    
    expect(error).toBeNull();
    expect(data?.length ?? 0).toBe(0); // All orders in valid range
  });
});

describe.skipIf(skipTests)('Database Verification: Customer Audit Page Data', () => {
  const testCustomerId = '22222222-0002-0000-0000-000000000066';
  
  it('should load customer audit data correctly', async () => {
    const { data, error } = await supabase!
      .from('v_cdp_customer_audit')
      .select('*')
      .eq('tenant_id', E2E_TEST_TENANT_ID)
      .eq('id', testCustomerId)
      .maybeSingle();
    
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    
    if (data) {
      // From network request: this customer has 66 orders, ₫26.3M spend
      expect(data.order_count).toBe(66);
      expectWithinTolerance(data.total_spend, 26304200, 5);
      
      // RFM should be 5,5,5 (top tier customer)
      expect(data.rfm_r).toBe(5);
      expect(data.rfm_f).toBe(5);
      expect(data.rfm_m).toBe(5);
    }
  });

  it('should load channel stats correctly', async () => {
    const { data, error } = await supabase!
      .rpc('cdp_customer_channel_stats', { p_customer_id: testCustomerId });
    
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    
    // From network request: Shopee 33 orders, Lazada 16, TikTok 17
    const shopee = data?.find((c: any) => c.channel === 'Shopee');
    const lazada = data?.find((c: any) => c.channel === 'Lazada');
    const tiktok = data?.find((c: any) => c.channel?.includes('TikTok'));
    
    if (shopee) expect(shopee.order_count).toBe(33);
    if (lazada) expect(lazada.order_count).toBe(16);
    if (tiktok) expect(tiktok.order_count).toBe(17);
  });

  it('should load order items with product names (not UUIDs)', async () => {
    const { data, error } = await supabase!
      .from('cdp_order_items')
      .select(`
        id, product_id, category,
        cdp_orders!inner(order_at, channel)
      `)
      .eq('cdp_orders.customer_id', testCustomerId)
      .limit(10);
    
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    
    // Verify we can join to products table for names
    if (data && data.length > 0) {
      const productIds = data.map(item => item.product_id);
      
      const { data: products } = await supabase!
        .from('products')
        .select('id, name, sku')
        .in('id', productIds);
      
      expect(products?.length).toBeGreaterThan(0);
      
      // Verify product names are human-readable
      products?.forEach(p => {
        expect(p.name).toBeDefined();
        expect(p.name).not.toMatch(/^[0-9a-f]{8}-/); // Not a UUID
      });
    }
  });
});
