# SYSTEM AUDIT REPORT: FDP - MDP - CDP
## Ngày: 2025-01-25

---

## 📊 TÓM TẮT EXECUTIVE

| Module | SSOT Compliance | Views/MVs | Auto-Refresh | Triggers | Status |
|--------|-----------------|-----------|--------------|----------|--------|
| **FDP** | ✅ 90% | 1 view (v_fdp_finance_summary) | ⚠️ Partial | ❌ Không có | 🟡 Cần cải thiện |
| **MDP** | ⚠️ 60% | 4 views | ⚠️ Partial | ❌ Không có | 🔴 Cần refactor |
| **CDP** | ✅ 95% | 47 views + 13 MVs | ✅ Có cron | ❌ Không có triggers | 🟢 Tốt |

---

## 1️⃣ FDP (Financial Data Platform)

### ✅ Tuân thủ SSOT

**Canonical Hook:** `useFDPFinanceSSOT.ts`
- ✅ Chỉ fetch từ `central_metrics_snapshots` và `v_fdp_finance_summary`
- ✅ Không tính toán client-side
- ✅ Có metadata `as_of_timestamp`, `source_ref`

**Views hiện có:**
```sql
v_fdp_finance_summary -- Aggregates từ external_orders + promotion_campaigns
```

### ⚠️ Vi phạm phát hiện

#### 1. `useFDPAggregatedMetrics.ts` - CRITICAL VIOLATION
```typescript
// Lines 204-234: Client-side aggregations
const totalOrders = dailyMetrics.reduce((sum, d) => sum + (d.order_count || 0), 0);
const totalRevenue = dailyMetrics.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
const contributionMarginPercent = totalRevenue > 0 ? (contributionMargin / totalRevenue) * 100 : 0;
// ... nhiều .reduce() khác
```
**Impact:** Vi phạm FDP Manifesto Principle #2 - SINGLE SOURCE OF TRUTH

#### 2. `useFDPQuickMetrics` - VIOLATION
```typescript
// Lines 303-314: Client-side reduce
const totalOrders = metrics.reduce((sum, d) => sum + (d.order_count || 0), 0);
const totalRevenue = metrics.reduce((sum, d) => sum + (d.total_revenue || 0), 0);
```

### ❌ Không có Triggers

**Vấn đề:** `v_fdp_finance_summary` là regular view (không cache), nhưng không có trigger refresh khi `external_orders` update.

**Giải pháp đề xuất:**
```sql
-- Tạo materialized view thay vì regular view
CREATE MATERIALIZED VIEW mv_fdp_finance_summary AS ...;

-- Tạo trigger refresh
CREATE OR REPLACE FUNCTION trigger_refresh_fdp_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fdp_finance_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_refresh_fdp
AFTER INSERT OR UPDATE OR DELETE ON external_orders
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_fdp_summary();
```

### Cron Jobs liên quan
- ❌ Không có cron job chuyên refresh FDP metrics

---

## 2️⃣ MDP (Marketing Data Platform)

### ⚠️ Tuân thủ SSOT - PARTIAL

**Canonical Hook:** `useMDPSSOT.ts` (tồn tại nhưng chưa được sử dụng rộng rãi)

**Views hiện có:**
```sql
v_mdp_campaign_attribution
v_mdp_campaign_performance
v_mdp_funnel_summary
v_mdp_mode_summary
```

### 🔴 Vi phạm NGHIÊM TRỌNG

#### 1. `useMDPData.ts` - DEPRECATED nhưng vẫn đang dùng

**File header đã cảnh báo nhưng code vẫn active:**
```typescript
/**
 * @deprecated useMDPData - VIOLATES MDP MANIFESTO
 * 
 * This hook computes business metrics in frontend with SILENT DEFAULTS:
 * - Line 506: 55% COGS fallback (no warning to user)
 * - Line 522: 12% platform fees fallback (no warning to user)
 * - Lines 379-414: Generates alerts in frontend (should be backend only)
 */
```

**Client-side calculations vi phạm:**
```typescript
// Lines 327-356: Fake impressions/clicks from spend
const impressions = Math.floor(spend / 5); // Estimated from spend
const clicks = Math.floor(impressions * 0.02); // 2% CTR estimate
const leads = Math.floor(clicks * 0.1); // 10% lead rate estimate

// Lines 360-394: Client-side funnel aggregation
const totals = marketingPerformance.reduce((acc, c) => ({
  impressions: acc.impressions + c.impressions,
  clicks: acc.clicks + c.clicks,
  ...
}), { impressions: 0, clicks: 0, leads: 0, orders: 0 });

// Lines 396-431: Frontend alert generation (SHOULD BE BACKEND)
const executionAlerts = useMemo<ExecutionAlert[]>(() => {
  const alerts: ExecutionAlert[] = [];
  marketingPerformance.forEach(campaign => {
    if (campaign.cpa > mockPreviousCpa * (1 + MDP_THRESHOLDS.MAX_CPA_CHANGE)) {
      alerts.push({ type: 'cpa_spike', ... });
    }
  });
  return alerts;
}, [marketingPerformance]);
```

**Impact:** 
- Vi phạm MDP Manifesto: "Profit before Performance. Cash before Clicks."
- Silent defaults 55% COGS, 12% fees = số liệu giả
- Alerts tạo ở frontend = không audit được

### ❌ Không có Triggers

MDP views không có cơ chế tự động refresh khi dữ liệu nguồn thay đổi.

### Cron Jobs liên quan
- ❌ Không có cron job chuyên cho MDP

---

## 3️⃣ CDP (Customer Data Platform)

### ✅ Tuân thủ SSOT - EXCELLENT

**Canonical Hook:** `useCDPSSOT.ts`, `useCDPEquity.ts`, `useCDPLTVEngine.ts`

**Materialized Views (13):**
```sql
mv_cdp_basket_structure_60d_vs_prev60d
mv_cdp_basket_structure_daily
mv_cdp_category_share_60d_vs_prev60d
mv_cdp_category_spend_daily
mv_cdp_category_substitution_matrix_60d
mv_cdp_cohort_metrics_rolling
mv_cdp_customer_primary_category_baseline_current
mv_cdp_customer_rolling_windows
mv_cdp_data_quality_daily
mv_cdp_order_items_enriched
mv_cdp_percentile_value_tiers
mv_cdp_segment_metrics_rolling
mv_cdp_value_tier_metrics_rolling
```

**Regular Views (47):** `v_cdp_*` các loại

### ✅ Có Functions Refresh

```sql
cdp_refresh_demand_insights() -- Refresh 7 MVs liên quan demand intelligence
cdp_refresh_mvs()             -- Refresh 4 MVs metrics rolling
cdp_build_customer_equity()   -- Build equity từ orders
cdp_build_customer_metrics_daily()
cdp_build_customer_metrics_rolling()
cdp_build_value_tiers()
cdp_run_daily_build()         -- Master orchestrator
```

### ✅ Có Cron Jobs

```sql
-- Job 4: scheduled-cdp-build (2:00 AM daily)
SELECT net.http_post(
  url := 'https://.../functions/v1/scheduled-cdp-build',
  ...
) AS request_id;
-- Schedule: 0 2 * * *

-- Job 5: cdp_run_daily_all (7:15 PM daily)  
SELECT cdp_run_daily_all(current_date - 1);
-- Schedule: 15 19 * * *
```

### ❌ Không có Triggers trên source tables

**Vấn đề:** Khi insert/update `cdp_orders` hoặc `external_orders`, các MVs không tự động refresh.

**Workaround hiện tại:** Cron jobs chạy daily

**Giải pháp đề xuất:**
```sql
-- Option 1: Event-based trigger (có thể chậm production)
CREATE TRIGGER trg_orders_refresh_cdp_mvs
AFTER INSERT ON cdp_orders
FOR EACH STATEMENT
WHEN (pg_trigger_depth() < 1)
EXECUTE FUNCTION cdp_schedule_mv_refresh();

-- Option 2: Batch trigger với debounce
-- Ghi vào queue table, cron job check queue mỗi 15 phút
```

---

## 4️⃣ CONTROL TOWER

### 🔴 Vi phạm nghiêm trọng

#### `useControlTowerAnalytics.ts` - HARDCODED DATA

```typescript
// Lines 79-87: Fake revenue data
for (let i = 6; i >= 0; i--) {
  revenueData.push({
    date: key,
    revenue: 120 + (6 - i) * 8 + Math.floor(Math.random() * 10), // FAKE!
    target: 120 + (6 - i) * 5,
  });
}

// Lines 112-119: Hardcoded fallback
if (categoryMap.size === 0) {
  categoryMap.set('Điện thoại', 45);  // HARDCODED!
  categoryMap.set('Laptop', 25);
  ...
}

// Lines 138-153: Hardcoded hourly data
const hourlyData: HourlyDataPoint[] = [
  { hour: '8h', orders: 12 },
  { hour: '9h', orders: 25 },
  ...  // ALL HARDCODED!
];

// Lines 166-175: Fallback hardcoded summary
summary: {
  totalRevenue: totalRevenue || 1950000000, // HARDCODED FALLBACK!
  newCustomers: 1234, // HARDCODED!
  ...
}
```

**Impact:** Control Tower Manifesto violation - "Awareness before Analytics. Action before Reports."

---

## 5️⃣ DEPRECATED HOOKS STATUS

| Hook | Status | Replacement | Migration % |
|------|--------|-------------|-------------|
| `useFDPMetrics` | ⚠️ Deprecated | `useFDPFinanceSSOT` | 80% |
| `useFDPAggregatedMetrics` | 🔴 Active with violations | `useFDPFinanceSSOT` | 0% |
| `useMDPData` | 🔴 Active with violations | `useMDPSSOT` | 20% |
| `useChannelPL` | ⚠️ Has client-side reduce | `useChannelPLSSOT` | 60% |
| `useKPIData` | ✅ Migrated | `useFinanceTruthSnapshot` | 100% |
| `useAnalyticsData` | ✅ Migrated | `useFinanceTruthSnapshot` | 100% |
| `useCentralFinancialMetrics` | ✅ Migrated | `useFinanceTruthSnapshot` | 100% |
| `useControlTowerAnalytics` | 🔴 Hardcoded data | Cần refactor | 0% |

---

## 6️⃣ CRON JOBS SUMMARY

| Job ID | Function | Schedule | Status |
|--------|----------|----------|--------|
| 1 | scheduled-detect-alerts | */15 * * * * | ⚠️ Auth error |
| 2 | sync-ecommerce-data | 5,20,35,50 * * * * | ✅ Active |
| 3 | generate-decision-cards | 0 6 * * * | ✅ Active |
| 4 | scheduled-cdp-build | 0 2 * * * | ✅ Active |
| 5 | cdp_run_daily_all | 15 19 * * * | ✅ Active |

**⚠️ Issue:** Job 1 (scheduled-detect-alerts) đang fail với lỗi auth:
```
Unauthorized: scheduled-detect-alerts requires service role key
```

---

## 7️⃣ KHUYẾN NGHỊ HÀNH ĐỘNG

### 🔴 CRITICAL (Fix ngay)

1. **Fix scheduled-detect-alerts auth**
   - Cron job đang dùng anon key thay vì service role key
   
2. **Migrate useFDPAggregatedMetrics**
   - Xóa tất cả `.reduce()` calculations
   - Chuyển sang fetch từ precomputed view
   
3. **Deprecate useMDPData completely**
   - Migrate tất cả consumers sang `useMDPSSOT`
   - Remove silent 55% COGS / 12% fees defaults

### 🟡 HIGH (1-2 tuần)

4. **Refactor useControlTowerAnalytics**
   - Xóa hardcoded data
   - Fetch từ real metrics tables
   
5. **Convert FDP view to materialized view**
   - `v_fdp_finance_summary` → `mv_fdp_finance_summary`
   - Add cron job refresh

6. **Fix useChannelPL reduce operations**
   - Move aggregations to database view

### 🟢 MEDIUM (1 tháng)

7. **Add triggers for near-realtime refresh**
   - CDP: Trigger on cdp_orders insert
   - FDP: Trigger on external_orders insert
   
8. **Create MDP materialized views**
   - mv_mdp_profit_attribution
   - mv_mdp_cash_impact

9. **Implement metric_registry validation**
   - All new metrics phải register trong `metric_registry`
   - Pre-commit check enforce

---

## 8️⃣ ARCHITECTURE COMPLIANCE MATRIX

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA FLOW ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   SOURCE TABLES          COMPUTE LAYER           HOOKS          │
│   ─────────────         ─────────────           ─────           │
│                                                                  │
│   external_orders   →   mv_fdp_*         →   useFDPFinanceSSOT  │
│   cdp_orders        →   mv_cdp_*         →   useCDPSSOT         │
│   promotion_campaigns → v_mdp_*          →   useMDPSSOT         │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ REFRESH MECHANISMS                                       │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │ CDP: ✅ Cron (2 jobs) + Refresh functions               │   │
│   │ FDP: ⚠️ Regular view (no cache)                         │   │
│   │ MDP: ⚠️ Regular views (no cache)                        │   │
│   │ Triggers: ❌ None on source tables                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9️⃣ TIẾP THEO

1. [ ] Fix cron job auth issue (Job 1)
2. [ ] Create migration cho useFDPAggregatedMetrics → useFDPFinanceSSOT
3. [ ] Remove useMDPData from all consumers
4. [ ] Add MV cho FDP
5. [ ] Implement trigger-based refresh cho CDP

---

**Auditor:** Lovable AI  
**Date:** 2025-01-25  
**Version:** 1.0
