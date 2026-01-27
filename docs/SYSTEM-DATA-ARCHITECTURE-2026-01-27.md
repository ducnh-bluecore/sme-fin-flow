# BLUECORE SYSTEM DATA ARCHITECTURE
## Rà soát toàn diện - 2026-01-27

---

## 📊 TỔNG QUAN KIẾN TRÚC

### Data Flow Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BLUECORE 6-LAYER ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

LAYER 0: EXTERNAL/RAW DATA
┌──────────────────────────────────────────────────────────────────────────────┐
│ external_orders │ external_products │ Shopee/Lazada/TikTok API Connectors    │
│ (Staging Only - NO FRONTEND ACCESS)                                          │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ trigger_sync_external_to_cdp
LAYER 1: SSOT SOURCE TABLES
┌──────────────────────────────────────────────────────────────────────────────┐
│ cdp_orders      │ cdp_order_items │ cdp_customers │ products │ invoices     │
│ bills           │ bank_accounts   │ marketing_expenses │ promotion_campaigns│
│ platform_ads_daily │ risk_scores  │ cdp_customer_equity_computed             │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Cron Jobs (Daily/30min)
LAYER 2: COMPUTED TABLES
┌──────────────────────────────────────────────────────────────────────────────┐
│ central_metrics_snapshots │ cdp_customer_equity_computed │ dashboard_kpi_cache│
│ fdp_locked_costs         │ cdp_customer_metrics_rolling  │ bluecore_scores    │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ PostgreSQL Views
LAYER 3: SSOT VIEWS
┌──────────────────────────────────────────────────────────────────────────────┐
│ v_base_order_metrics    │ v_channel_pl_summary   │ v_cdp_equity_snapshot     │
│ v_mdp_platform_ads_summary │ v_risk_radar_summary │ v_mdp_marketing_funnel   │
│ v_fdp_finance_summary   │ v_cdp_demographics_summary │ v_customer_ar_summary │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ React Hooks
LAYER 4: FRONTEND HOOKS
┌──────────────────────────────────────────────────────────────────────────────┐
│ useFDPFinanceSSOT       │ useChannelPLSSOT       │ useCDPEquity             │
│ usePlatformAdsData      │ useRiskRadarData       │ useDemographicsData      │
│ useFinanceTruthSnapshot │ useMDPDataSSOT         │ useTopCustomersAR        │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ React Pages
LAYER 5: UI PAGES
┌──────────────────────────────────────────────────────────────────────────────┐
│ PortalPage │ DashboardPage │ MDPDashboardPage │ CDPOverviewPage │ RiskPage  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 LAYER 0 & 1: SOURCE DATA (E2E Tenant)

### Data Counts (tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')

| Table | Row Count | Purpose |
|-------|-----------|---------|
| `cdp_orders` | **5,500** | SSOT for all orders |
| `cdp_order_items` | **13,200** | Order line items |
| `cdp_customers` | **500** | Customer master data |
| `cdp_customer_equity_computed` | **500** | Computed customer value |
| `products` | **100** | Product catalog |
| `invoices` | **5,500** | AR invoices |
| `bills` | **200** | AP bills |
| `bank_accounts` | **3** | Cash positions |
| `marketing_expenses` | **155** | Marketing spend data |
| `platform_ads_daily` | **5** | Ads performance (5 platforms) |
| `risk_scores` | **31** | Daily risk scores |
| `central_metrics_snapshots` | **9** | Pre-computed finance snapshots |

---

## 📐 LAYER 2: COMPUTED METRICS

### `central_metrics_snapshots` - Finance SSOT
**Computed by:** `compute_central_metrics_snapshot()` RPC  
**Schedule:** Daily at 03:00 + Manual refresh

| Metric | Current Value | Formula |
|--------|---------------|---------|
| `net_revenue` | ₫340,391,502 | `SUM(cdp_orders.net_revenue)` WHERE 90 days |
| `gross_profit` | ₫145,859,495 | `SUM(cdp_orders.gross_margin)` |
| `gross_margin_percent` | 42.85% | `gross_profit / net_revenue * 100` |
| `contribution_margin` | ₫-79,693,211 | `gross_profit - total_platform_fees - total_shipping_fees - marketing_spend` |
| `contribution_margin_percent` | -23.41% | `contribution_margin / net_revenue * 100` |
| `cash_today` | ₫1,670,000,000 | `SUM(bank_accounts.current_balance)` |
| `total_ar` | ₫186,319,606 | `SUM(invoices.total_amount)` WHERE status IN ('sent', 'overdue') |
| `overdue_ar` | ₫43,194,305 | `SUM(invoices.total_amount)` WHERE due_date < TODAY |
| `total_ap` | ₫527,100,000 | `SUM(bills.total_amount)` WHERE status IN ('pending', 'approved', 'overdue') |
| `total_inventory_value` | ₫2,870,988,000 | `SUM(products.current_stock * products.cost_price)` |
| `dso` | 49.26 days | `(total_ar / net_revenue) * 90` |
| `dpo` | 262.95 days | `(total_ap / total_cogs) * 90` |
| `dio` | 1,432.25 days | `(total_inventory_value / total_cogs) * 365` |
| `ccc` | 1,218.56 days | `dso + dio - dpo` |
| `total_marketing_spend` | ₫131,361,247 | `SUM(marketing_expenses.amount)` WHERE 90 days |
| `total_orders` | 920 | `COUNT(cdp_orders)` WHERE 90 days |
| `avg_order_value` | ₫369,991 | `net_revenue / total_orders` |
| `total_customers` | 299 | `COUNT(DISTINCT cdp_orders.customer_id)` WHERE 90 days |

### `cdp_customer_equity_computed` - Customer Value SSOT
**Computed by:** `cdp_build_customer_equity()` RPC  
**Schedule:** Part of `cdp_run_daily_build()`

| Metric | Formula |
|--------|---------|
| `equity_12m` | NPV of future value using retention curves |
| `equity_24m` | Extended NPV projection |
| `total_revenue` | `SUM(cdp_orders.net_revenue)` per customer |
| `order_count` | `COUNT(cdp_orders)` per customer |
| `avg_order_value` | `total_revenue / order_count` |
| `recency_days` | `CURRENT_DATE - MAX(cdp_orders.order_at)` |

---

## 👁️ LAYER 3: DATABASE VIEWS

### Core Financial Views

#### `v_base_order_metrics`
**Source:** `cdp_orders`  
**Purpose:** Base aggregation for all order metrics

```sql
SELECT 
  tenant_id,
  COUNT(*) as total_orders,
  COUNT(DISTINCT customer_id) as unique_customers,
  SUM(COALESCE(gross_revenue, 0)) as gross_revenue,
  SUM(COALESCE(net_revenue, 0)) as net_revenue,
  SUM(COALESCE(cogs, 0)) as total_cogs,
  SUM(COALESCE(gross_margin, 0)) as gross_profit,
  CASE WHEN COUNT(*) > 0 
    THEN SUM(COALESCE(net_revenue, 0)) / COUNT(*) 
    ELSE 0 
  END as avg_order_value
FROM cdp_orders
GROUP BY tenant_id
```

#### `v_channel_pl_summary`
**Source:** `cdp_orders` + `marketing_expenses`  
**Purpose:** P&L by sales channel (monthly)

| Column | Formula |
|--------|---------|
| `gross_margin` | `SUM(cdp_orders.gross_margin)` |
| `marketing_spend` | `SUM(marketing_expenses.amount)` by channel |
| `contribution_margin` | `gross_margin - marketing_spend` |
| `cm_percent` | `(contribution_margin / net_revenue) * 100` |
| `roas` | `net_revenue / marketing_spend` (NULL if no spend) |

**Current Data (Jan 2026):**
| Channel | Net Revenue | CM% | ROAS |
|---------|-------------|-----|------|
| SHOPEE | ₫30,286,400 | 41% | N/A |
| LAZADA | ₫21,242,040 | 42% | N/A |
| WEBSITE | ₫17,415,015 | 47% | N/A |
| TIKTOK SHOP | ₫13,001,152 | 43% | N/A |

#### `v_fdp_finance_summary`
**Source:** `cdp_orders`  
**Purpose:** Rolling 90-day finance overview

```sql
SELECT 
  tenant_id,
  SUM(gross_revenue) as total_gross_revenue,
  SUM(net_revenue) as total_net_revenue,
  SUM(cogs) as total_cogs,
  SUM(gross_margin) as total_gross_margin,
  ROUND(AVG(NULLIF(gross_margin, 0) / NULLIF(net_revenue, 0) * 100), 2) as avg_gross_margin_percent
FROM cdp_orders
WHERE order_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY tenant_id
```

---

### Marketing Views

#### `v_mdp_platform_ads_summary`
**Source:** `platform_ads_daily`  
**Purpose:** Platform ads performance

| Platform | Spend/Month | ROAS | CPA | CTR |
|----------|-------------|------|-----|-----|
| Shopee | ₫45M | 2.84 | ₫140,625 | 1.47% |
| Lazada | ₫32M | 2.63 | ₫152,381 | 1.44% |
| TikTok | ₫58M | 2.90 | ₫120,833 | 2.33% |
| Meta | ₫28M | 1.70 | ₫294,737 | 1.29% |
| Google | ₫8M | 2.63 | ₫190,476 | 1.40% |

#### `v_mdp_marketing_funnel`
**Source:** `marketing_expenses`  
**Purpose:** 30-day conversion funnel

| Stage | Value | Formula |
|-------|-------|---------|
| Impressions | 3,740,703 | `SUM(impressions)` |
| Clicks | 63,696 | `SUM(clicks)` |
| Add to Cart | 9,554 | `clicks * 0.15` (estimated) |
| Orders | 1,331 | `SUM(conversions)` |
| CTR | 1.70% | `clicks / impressions * 100` |
| CVR | 2.09% | `orders / clicks * 100` |

---

### CDP Views

#### `v_cdp_equity_snapshot`
**Source:** `cdp_customer_equity_computed`  
**Purpose:** Customer equity overview

| Metric | Current Value |
|--------|---------------|
| `total_equity_12m` | ₫1,227,758,419 |
| `total_equity_24m` | ₫1,825,614,700 |
| `at_risk_value` | ₫98,424,070 |
| `at_risk_percent` | 8.02% |
| `has_cogs_data` | true |
| `has_fees_data` | false |
| `total_with_real_profit` | 500 customers |

#### `v_cdp_demographics_summary`
**Source:** `cdp_customers`  
**Purpose:** Customer demographic distribution

```sql
SELECT 
  tenant_id,
  jsonb_agg(DISTINCT jsonb_build_object(
    'range', age_range,
    'value', count,
    'color', color
  )) as age_distribution,
  jsonb_agg(DISTINCT jsonb_build_object(
    'name', gender,
    'value', count,
    'color', color
  )) as gender_distribution
FROM (aggregated subquery)
```

---

### Risk Views

#### `v_risk_radar_summary`
**Source:** `risk_scores`  
**Purpose:** Latest risk assessment

| Dimension | Score | Severity |
|-----------|-------|----------|
| Liquidity | 68 | Low |
| Credit | 48 | Medium |
| Market | 62 | Low |
| Operational | 56 | Medium |
| **Overall** | **65** | - |

**Severity Rules:**
- `< 40` → HIGH (đỏ)
- `40-59` → MEDIUM (vàng)
- `≥ 60` → LOW (xanh)

---

## 🪝 LAYER 4: FRONTEND HOOKS

### Hook → View Mapping

| Hook | Source View/Table | Purpose |
|------|-------------------|---------|
| `useFinanceTruthSnapshot` | `central_metrics_snapshots` | Executive dashboard KPIs |
| `useFDPFinanceSSOT` | `v_fdp_finance_summary` | FDP metrics |
| `useChannelPLSSOT` | `v_channel_pl_summary` | Channel P&L |
| `usePlatformAdsData` | `v_mdp_platform_ads_summary` | Platform ads cards |
| `useRiskRadarData` | `v_risk_radar_summary` | Risk radar chart |
| `useDemographicsData` | `v_cdp_demographics_summary` | CDP demographics |
| `useCDPEquity` | `v_cdp_equity_snapshot` | Customer equity |
| `useTopCustomersAR` | `v_customer_ar_summary` | AR aging by customer |
| `useMDPDataSSOT` | `v_mdp_marketing_funnel` | Marketing funnel |
| `useWorkingCapitalDaily` | `working_capital_metrics` | DSO/DPO/DIO/CCC |

### Hook Implementation Pattern

```typescript
// SSOT-Compliant Hook Pattern
export function useMetricHook() {
  const { data: tenantId } = useActiveTenantId();

  return useQuery({
    queryKey: ['metric-key', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('v_ssot_view')  // Always query VIEW, not raw table
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();  // Safe for single-row results
        
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,  // 5 minutes cache
  });
}
```

**CRITICAL RULES:**
1. ❌ NO client-side `.reduce()`, `.filter()`, calculations
2. ❌ NO direct queries to `external_orders` (ESLint error)
3. ✅ ALL aggregations in PostgreSQL views/RPCs
4. ✅ Use `maybeSingle()` for single-row results

---

## 🔄 LAYER 5: AUTOMATION & CRON JOBS

### Scheduled Jobs

| Job Name | Schedule | Function | Purpose |
|----------|----------|----------|---------|
| `refresh-finance-snapshot-daily` | 03:00 UTC | `compute_central_metrics_snapshot` | Update finance KPIs |
| `refresh-dashboard-cache-30min` | */30 * * * * | `refresh_dashboard_kpi_cache` | Keep dashboard fresh |
| `cdp-run-daily-build` | 02:00 UTC | `cdp_run_daily_build` | Customer equity/metrics |
| `cross-module-daily-sync` | 04:00 UTC | `cross_module_run_daily_sync` | FDP↔MDP↔CDP sync |

### Trigger-Based Automation

| Trigger | Table | Action |
|---------|-------|--------|
| `trigger_sync_external_to_cdp` | `external_orders` | Auto-sync to `cdp_orders` |
| `trigger_update_customer_metrics` | `cdp_orders` | Refresh customer stats |
| `trigger_create_decision_outcome` | `decision_cards` | Track resolution |

---

## 📈 METRIC CALCULATION REFERENCE

### Financial Metrics

| Metric | Formula | View/RPC |
|--------|---------|----------|
| **Net Revenue** | `SUM(order.net_revenue)` | `v_base_order_metrics` |
| **Gross Profit** | `SUM(order.gross_margin)` | `v_base_order_metrics` |
| **Gross Margin %** | `gross_profit / net_revenue * 100` | `central_metrics_snapshots` |
| **Contribution Margin** | `gross_profit - platform_fees - shipping - marketing` | `compute_central_metrics_snapshot` |
| **COGS** | `SUM(order.cogs)` | `v_base_order_metrics` |
| **COGS %** | `total_cogs / net_revenue * 100` | Computed in view |

### Working Capital Metrics

| Metric | Formula | Source |
|--------|---------|--------|
| **DSO** | `(total_ar / net_revenue) * period_days` | `central_metrics_snapshots` |
| **DPO** | `(total_ap / total_cogs) * period_days` | `central_metrics_snapshots` |
| **DIO** | `(inventory_value / total_cogs) * 365` | `central_metrics_snapshots` |
| **CCC** | `dso + dio - dpo` | `central_metrics_snapshots` |

### Marketing Metrics

| Metric | Formula | Source |
|--------|---------|--------|
| **ROAS** | `revenue / spend` | `v_mdp_platform_ads_summary` |
| **CPA** | `spend / orders` | `v_mdp_platform_ads_summary` |
| **CTR** | `clicks / impressions * 100` | `v_mdp_marketing_funnel` |
| **CVR** | `orders / clicks * 100` | `v_mdp_marketing_funnel` |
| **ACoS** | `(spend / revenue) * 100` | `v_mdp_platform_ads_summary` |

### Customer Metrics

| Metric | Formula | Source |
|--------|---------|--------|
| **Total Equity (12M)** | NPV of customer lifetime value | `v_cdp_equity_snapshot` |
| **At-Risk %** | `at_risk_customers / total_customers * 100` | `v_cdp_equity_snapshot` |
| **AOV** | `total_revenue / order_count` per customer | `cdp_customer_equity_computed` |
| **Recency** | `CURRENT_DATE - last_order_date` | `cdp_customer_equity_computed` |

---

## 🔐 DATA GOVERNANCE

### ESLint Rules
```javascript
// Blocked patterns (error level)
'no-restricted-syntax': [
  'error',
  {
    selector: 'CallExpression[callee.property.name="from"][arguments.0.value="external_orders"]',
    message: 'Direct access to external_orders is prohibited. Use cdp_orders (SSOT).'
  }
]
```

### Allowed Exemptions
- `useEcommerceReconciliation.ts` - Staging monitoring
- `BigQuerySyncManager.tsx` - Data sync status
- `PortalPage.tsx` - Data health check

---

## 📋 CURRENT SYSTEM STATUS

### ✅ Completed (100%)
- [x] All mock data replaced with real DB queries
- [x] SSOT architecture enforced via ESLint
- [x] Views layer complete for FDP/MDP/CDP
- [x] Hooks refactored to thin wrappers
- [x] Cron jobs configured for auto-refresh

### ⚠️ Known Limitations
- `marketing_expenses` ↔ `channel` join returns NULL ROAS when no matching spend
- `v_mdp_marketing_funnel.estimated_add_to_cart` uses 15% estimate (no real ATC data)
- `dio` shows high value due to inventory vs COGS ratio

### 🔮 Future Improvements
1. Real ATC tracking via ecommerce pixel integration
2. Multi-currency support in financial views
3. Historical trend comparison views

---

## 📚 RELATED DOCUMENTATION

- `docs/DEPENDENCY-ARCHITECTURE.md` - Layer dependency rules
- `supabase/e2e-test/expected-values.json` - E2E test baselines
- `src/hooks/ssot.ts` - Hook exports and deprecation guide

---

*Last Updated: 2026-01-27 01:40 UTC*  
*Generated by: System Architecture Audit*
