/**
 * E2E Expected Values - Ground Truth for Screen-Level Testing
 * Source: supabase/e2e-test/expected-values.json
 * 
 * These values are used to verify UI accuracy against known database state.
 * Tests use these as the single source of truth for expected metrics.
 */

export const E2E_TENANT = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  name: 'E2E Test Company',
  slug: 'e2e-test-company',
  plan: 'pro',
} as const;

// Convenience export for tenant ID
export const E2E_TEST_TENANT_ID = E2E_TENANT.id;

export const E2E_PERIOD = {
  start: '2026-01-01',
  end: '2027-01-26',
  months: 13,
} as const;

// =============================================================================
// LAYER 0: Source Data
// =============================================================================
export const LAYER_0_SOURCE = {
  products: {
    count: 100,
    tolerance: 0,
    categories: {
      'Áo': 30,
      'Quần': 25,
      'Váy': 20,
      'Phụ kiện': 15,
      'Giày dép': 10,
    },
  },
  connectors: {
    count: 4,
    list: ['Shopee', 'Lazada', 'TikTok Shop', 'Website'],
  },
} as const;

// =============================================================================
// LAYER 1: CDP Source Data
// =============================================================================
export const LAYER_1_CDP_SOURCE = {
  customers: {
    count: 500,
    tolerance: 0,
    by_tier: {
      platinum: 25,
      gold: 75,
      silver: 150,
      standard: 250,
    },
  },
  orders: {
    count: 3000,
    tolerance: 5, // percentage
    by_channel: {
      Shopee: { percent: 40, orders: 1200 },
      Lazada: { percent: 25, orders: 750 },
      Website: { percent: 15, orders: 450 },
      'TikTok Shop': { percent: 20, orders: 600 },
    },
  },
  order_items: {
    count: 6600,
    tolerance: 10,
    avg_items_per_order: 2.2,
  },
  revenue: {
    total_net_revenue: 1584000000, // 1.58B VND
    tolerance_percent: 15,
  },
  costs: {
    cogs_percent: 53,
    tolerance: 3,
  },
} as const;

// =============================================================================
// LAYER 2: Computed Data
// =============================================================================
export const LAYER_2_COMPUTED = {
  cdp_customer_equity_computed: {
    row_count: 500,
    tolerance: 5,
    unique_customers: 500,
  },
  equity: {
    total_equity_12m: 1227758419, // ~1.23B VND
    total_equity_24m: 1825614700, // ~1.83B VND
    avg_equity_12m: 2455517,
    tolerance_percent: 20,
  },
  customer_activity: {
    active_90d: 325,
    at_risk: 100,
    dormant: 75,
    tolerance: 20,
  },
} as const;

// =============================================================================
// MDP: Marketing Performance Data
// =============================================================================
export const MDP_EXPECTED = {
  campaigns: {
    total_count: 10,
    active_count: 5,
    completed_count: 3,
    paused_count: 2,
    tolerance: 0,
  },
  performance: {
    total_spend: 61500000, // ~61.5M VND
    total_revenue: 316000000, // ~316M VND
    avg_roas: 5.14,
    tolerance_percent: 10,
  },
  channels: {
    facebook: 3,
    google: 3,
    tiktok: 2,
    email: 2,
  },
  mode_summary: {
    active_campaigns: 5,
    total_spend: 36700000,
    total_revenue: 200000000,
    overall_roas: 5.45,
    tolerance_percent: 10,
  },
  funnel: {
    impressions: 7340000,
    clicks: 146800,
    leads: 14680,
    orders: 537,
    is_estimated: true,
  },
} as const;

// =============================================================================
// LAYER 3: Cross-Module Data
// =============================================================================
export const LAYER_3_CROSS_MODULE = {
  fdp_locked_costs: {
    row_count: 13,
    tolerance: 0,
  },
  cdp_segment_ltv_for_mdp: {
    row_count: 4,
    tolerance: 0,
    segments: ['Champions', 'Loyal', 'Potential', 'New'],
  },
  cdp_customer_cohort_cac: {
    row_count_min: 40,
    row_count_max: 60,
  },
} as const;

// =============================================================================
// LAYER 4: Control Tower
// =============================================================================
export const LAYER_4_CONTROL_TOWER = {
  cross_domain_variance_alerts: {
    count_min: 3,
    count_max: 15,
  },
  control_tower_priority_queue: {
    count_min: 5,
    count_max: 20,
  },
} as const;

// =============================================================================
// SCREEN-LEVEL EXPECTED VALUES
// =============================================================================

/**
 * CDP Overview Page (/cdp)
 */
export const CDP_OVERVIEW_EXPECTED = {
  CustomerEquitySnapshot: {
    total_equity_12m: 1227758419, // Display: ₫1.2B
    total_equity_12m_formatted: '₫1.2B',
    at_risk_percent: 8, // ~8%
    at_risk_percent_tolerance: 2,
  },
  ActiveCustomersCard: {
    customers_with_orders: 325,
    total_customers: 500,
    tolerance: 20, // percentage for customers_with_orders
  },
  DataQualityCard: {
    order_count: 3000,
    connected_sources: 4,
    order_tolerance: 5,
  },
} as const;

/**
 * LTV Engine Page (/cdp/ltv-engine)
 */
export const LTV_ENGINE_EXPECTED = {
  Overview: {
    total_clv: 1584000000, // Net Revenue from orders
    total_clv_tolerance: 15,
    realized_revenue: 1584000000,
    remaining_potential: 1227758419, // equity_12m
    clv_per_customer: 3168000, // ~3.17M (total / 500)
    equity_per_customer: 2455517,
  },
  ByRiskLevel: {
    low: { count: 100, equity: 826000000, tolerance: 20 },
    medium: { count: 150, equity: 303000000, tolerance: 20 },
    high: { count: 250, equity: 98000000, tolerance: 20 },
  },
  EquityDistribution: {
    bucket_0_1m: 150, // high risk
    bucket_1_5m: 200, // medium
    bucket_5m_plus: 150, // low risk
    tolerance: 30,
  },
} as const;

/**
 * Customer Audit Page (/cdp/audit/:id)
 */
export const CUSTOMER_AUDIT_EXPECTED = {
  TransactionSummary: {
    // These are validation rules, not specific values
    days_since_last_purchase_min: 0, // Must NEVER be negative
    rfm_r_range: [1, 5],
    rfm_f_range: [1, 5],
    rfm_m_range: [1, 5],
  },
  TopProductsBlock: {
    // Product names should NOT be UUIDs
    uuid_pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    should_match_uuid: false, // Names should NOT match UUID pattern
  },
  ChannelBreakdown: {
    // Sum of channel orders should equal total orders
    sum_equals_total: true,
  },
} as const;

/**
 * FDP Dashboard Page (/dashboard)
 */
export const FDP_DASHBOARD_EXPECTED = {
  KeyMetrics: {
    cogs_percent: 53,
    cogs_tolerance: 3,
    gross_margin_percent: 47,
    gross_margin_tolerance: 3,
    platform_fees_percent: 4.5,
    platform_fees_tolerance: 1,
  },
  RevenueByChannel: {
    shopee_share: 40,
    lazada_share: 25,
    website_share: 15,
    tiktok_share: 20,
    share_tolerance: 5,
  },
} as const;

/**
 * Control Tower CEO Page (/control-tower/ceo)
 */
export const CONTROL_TOWER_EXPECTED = {
  PriorityQueue: {
    count_min: 5,
    count_max: 20,
  },
  VarianceAlerts: {
    count_min: 3,
    count_max: 15,
  },
} as const;

// =============================================================================
// TOLERANCE THRESHOLDS (Global)
// =============================================================================
export const TOLERANCES = {
  exact_counts: 0,
  source_data: 5, // percentage
  computed_data: 10, // percentage
  equity: 20, // percentage
  control_tower: 'range', // use min/max
} as const;

// =============================================================================
// TEST CUSTOMER IDS
// =============================================================================
export const TEST_CUSTOMERS = {
  sample_customer: '22222222-0002-0000-0000-000000000066',
} as const;
