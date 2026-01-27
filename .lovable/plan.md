
# KẾ HOẠCH FIX TOÀN DIỆN 7 TRANG FDP

## TÓM TẮT VẤN ĐỀ

### Root Cause Chính (CRITICAL)

Cron job `refresh-finance-snapshot-daily` đang truyền **sai tham số**:

```sql
-- HIỆN TẠI (BUG)
PERFORM compute_central_metrics_snapshot(t_id, current_date);

-- ĐÚNG
PERFORM compute_central_metrics_snapshot(t_id);
```

**Hậu quả:** `current_date` được map vào `p_start_date`, khiến:
- `period_start = period_end = 2026-01-27` (cùng ngày)
- Net Revenue = 0, DSO/DIO/DPO/CCC = 0
- Tất cả dashboard phụ thuộc snapshot đều hiển thị 0

### Bảng tổng hợp Issues theo trang

| # | Trang | Issues | Mức độ |
|---|-------|--------|--------|
| 1 | Cash Position | Translation missing + UI thiếu Ops/Platform | P0 + P1 |
| 2 | Cash Flow Direct | Chart negative values + Activity badges tiếng Anh | P2 |
| 3 | Working Capital Hub | Translation missing + Trend chart empty | P0 + P1 |
| 4 | Executive Summary | Doanh thu = 0 do snapshot bug | P0 |
| 5 | Risk Dashboard (Concentration) | Data hardcoded mock | P2 |
| 6 | Risk Dashboard (Stress Testing) | Frontend-only simulation | P2 |
| 7 | Decision Support | ✅ Hoạt động tốt - chỉ cần verify edge function | OK |

---

## PHẦN 1: DATABASE FIXES

### 1.1 Fix Cron Job Command (CRITICAL - P0)

**File:** New migration `supabase/migrations/[timestamp]_fix_cron_job_params.sql`

```sql
-- Unschedule existing broken cron
SELECT cron.unschedule('refresh-finance-snapshot-daily');

-- Reschedule with correct syntax (no date params)
SELECT cron.schedule(
  'refresh-finance-snapshot-daily',
  '0 3 * * *',
  $$
  DO $inner$
  DECLARE
    t_id UUID;
  BEGIN
    FOR t_id IN SELECT id FROM tenants WHERE is_active = true
    LOOP
      -- Call WITHOUT date params to use 90-day default logic
      PERFORM compute_central_metrics_snapshot(t_id);
    END LOOP;
  END $inner$;
  $$
);
```

### 1.2 Trigger Immediate Snapshot Refresh

```sql
-- Refresh E2E tenant immediately after migration
SELECT compute_central_metrics_snapshot('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
```

### 1.3 Update RPC to Compute Locked Cash (Phase 4 Completion)

Hiện tại `locked_cash_*` columns đều = 0. Cần update function body:

```sql
-- Add to compute_central_metrics_snapshot function body:

-- Locked Cash: Inventory (already calculated as v_inventory_value)
v_locked_inventory := v_inventory_value;

-- Locked Cash: Ads (14-day marketing spend)
SELECT COALESCE(SUM(amount), 0)
INTO v_locked_ads
FROM marketing_expenses
WHERE tenant_id = p_tenant_id
  AND expense_date > CURRENT_DATE - INTERVAL '14 days';

-- Locked Cash: Ops (pending logistics/shipping bills)
SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0)
INTO v_locked_ops
FROM bills
WHERE tenant_id = p_tenant_id
  AND status IN ('pending', 'partial')
  AND (category ILIKE '%shipping%' OR category ILIKE '%logistics%' OR category ILIKE '%fulfillment%');

-- Locked Cash: Platform Hold (eCommerce T+14 settlement)
SELECT COALESCE(SUM(net_revenue), 0) * 0.85
INTO v_locked_platform
FROM cdp_orders
WHERE tenant_id = p_tenant_id
  AND order_at > CURRENT_DATE - INTERVAL '14 days'
  AND LOWER(channel) IN ('shopee', 'lazada', 'tiktok shop', 'tiktok');

v_locked_total := v_locked_inventory + v_locked_ads + v_locked_ops + v_locked_platform;
```

### 1.4 Create Working Capital Daily Cron Job

Để trend chart hiển thị data:

```sql
-- Create RPC to copy snapshot to working_capital_daily
CREATE OR REPLACE FUNCTION compute_working_capital_daily(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_snapshot RECORD;
BEGIN
  SELECT * INTO v_snapshot
  FROM central_metrics_snapshots
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_snapshot IS NULL THEN RETURN; END IF;
  
  INSERT INTO working_capital_daily (
    tenant_id, day, dso, dio, dpo, ccc,
    ar_balance, inventory_value, ap_balance
  ) VALUES (
    p_tenant_id,
    CURRENT_DATE,
    v_snapshot.dso,
    v_snapshot.dio,
    v_snapshot.dpo,
    v_snapshot.ccc,
    v_snapshot.total_ar,
    v_snapshot.total_inventory_value,
    v_snapshot.total_ap
  )
  ON CONFLICT (tenant_id, day) DO UPDATE SET
    dso = EXCLUDED.dso,
    dio = EXCLUDED.dio,
    dpo = EXCLUDED.dpo,
    ccc = EXCLUDED.ccc;
END;
$$;

-- Schedule daily (after snapshot refresh)
SELECT cron.schedule(
  'refresh-working-capital-daily',
  '5 3 * * *',
  $$SELECT compute_working_capital_daily(id) FROM tenants WHERE is_active = true;$$
);
```

---

## PHẦN 2: FRONTEND FIXES

### 2.1 Translation Keys (P0)

**File:** `src/contexts/LanguageContext.tsx`

Thêm keys sau vào **Vietnamese section** (sau line ~59):
```typescript
'nav.cashPosition': 'Vị thế tiền mặt',
```

Thêm vào **Vietnamese section** (sau line ~270):
```typescript
'workingCapital.hubTitle': 'Vốn lưu động & CCC',
'workingCapital.hubSubtitle': 'Quản lý vốn lưu động và chu kỳ chuyển đổi tiền mặt',
```

Thêm vào **English section** (tương ứng):
```typescript
'nav.cashPosition': 'Cash Position',
'workingCapital.hubTitle': 'Working Capital & CCC',
'workingCapital.hubSubtitle': 'Working capital and cash conversion cycle management',
```

### 2.2 RealCashBreakdown UI Update (P1)

**File:** `src/components/dashboard/RealCashBreakdown.tsx`

Thêm Ops Float + Platform Hold vào grid "Chi tiết Cash bị khóa":

```tsx
// Update grid từ 2 columns thành 4 columns
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  {/* Tồn kho - existing */}
  <div className="p-3 rounded-lg bg-muted/50">
    <div className="flex items-center gap-2 mb-1">
      <Package className="h-4 w-4 text-amber-500" />
      <span className="text-xs text-muted-foreground">Tồn kho</span>
    </div>
    <p className="font-semibold">{formatVNDCompact(inventoryValue)}</p>
  </div>
  
  {/* Ads Float - existing */}
  <div className="p-3 rounded-lg bg-muted/50">
    <div className="flex items-center gap-2 mb-1">
      <Megaphone className="h-4 w-4 text-blue-500" />
      <span className="text-xs text-muted-foreground">Ads Float</span>
    </div>
    <p className="font-semibold">{formatVNDCompact(adsFloat)}</p>
  </div>
  
  {/* NEW: Ops Float */}
  <div className="p-3 rounded-lg bg-muted/50">
    <div className="flex items-center gap-2 mb-1">
      <Truck className="h-4 w-4 text-purple-500" />
      <span className="text-xs text-muted-foreground">Ops Float</span>
    </div>
    <p className="font-semibold">{formatVNDCompact(opsFloat)}</p>
  </div>
  
  {/* NEW: Platform Hold */}
  <div className="p-3 rounded-lg bg-muted/50">
    <div className="flex items-center gap-2 mb-1">
      <Store className="h-4 w-4 text-green-500" />
      <span className="text-xs text-muted-foreground">Platform Hold</span>
    </div>
    <p className="font-semibold">{formatVNDCompact(platformHold)}</p>
  </div>
</div>
```

Thêm imports: `Truck, Store` từ lucide-react.

### 2.3 CashPositionPage Locked Cash Card Fix (P1)

**File:** `src/pages/CashPositionPage.tsx` (line 219)

Thay thế magic number:
```tsx
// TRƯỚC (magic number)
{formatVNDCompact(snapshot.totalInventoryValue + snapshot.totalMarketingSpend * 0.2)}

// SAU (DB-computed)
{formatVNDCompact(snapshot.lockedCashTotal || snapshot.totalInventoryValue)}
```

### 2.4 Cash Flow Direct Chart Fix (P2)

**File:** `src/pages/CashFlowDirectPage.tsx`

Stacked bar chart hiện không hiển thị negative đúng. Cần thêm logic:

```tsx
// Line 22-28: Update waterfallData để handle negative correctly
const waterfallData = periodData.slice(0, 12).reverse().map(p => ({
  period: format(new Date(p.periodStart), 'MM/yyyy'),
  operating: p.operating / 1000000,
  investing: p.investing / 1000000, // Already negative in DB
  financing: p.financing / 1000000,
  net: p.netChange / 1000000,
  balance: p.closingBalance / 1000000,
}));
```

Thêm Vietnamese labels cho badges:
```tsx
// Line 123-126: Replace English badges
<Badge variant={summary.operatingCashFlow >= 0 ? 'default' : 'destructive'}>
  Hoạt động KD
</Badge>
// Similar for Investing → "Đầu tư", Financing → "Tài chính"
```

### 2.5 Risk Dashboard - Concentration Risk (P2 - Future)

**File:** `src/pages/RiskDashboardPage.tsx`

Lines 131-143 hiện hardcoded:
```typescript
const customerConcentration = [
  { name: 'Khách hàng A', value: 25, revenue: 12500000000 },
  // ...
];
```

**Giải pháp tương lai:** Tạo view `v_customer_concentration_risk` từ `cdp_orders`:
```sql
CREATE VIEW v_customer_concentration_risk AS
SELECT 
  tenant_id,
  customer_id,
  c.name as customer_name,
  SUM(net_revenue) as total_revenue,
  100.0 * SUM(net_revenue) / SUM(SUM(net_revenue)) OVER (PARTITION BY o.tenant_id) as revenue_pct
FROM cdp_orders o
LEFT JOIN cdp_customers c ON o.customer_id = c.id
WHERE order_at > CURRENT_DATE - INTERVAL '365 days'
GROUP BY tenant_id, customer_id, c.name
ORDER BY total_revenue DESC;
```

---

## PHẦN 3: FILES SUMMARY

### New Migrations (2 files)

| File | Purpose |
|------|---------|
| `[timestamp]_fix_cron_and_locked_cash.sql` | Fix cron job + update RPC locked cash logic |
| `[timestamp]_add_working_capital_daily_cron.sql` | Add WC daily compute + cron job |

### Modified Files (4 files)

| File | Changes |
|------|---------|
| `src/contexts/LanguageContext.tsx` | Add 3 translation keys |
| `src/components/dashboard/RealCashBreakdown.tsx` | Add Ops Float + Platform Hold grid |
| `src/pages/CashPositionPage.tsx` | Use lockedCashTotal instead of magic number |
| `src/pages/CashFlowDirectPage.tsx` | Vietnamese badges + chart fix |

---

## PHẦN 4: VERIFICATION CHECKLIST

### Database
- [ ] Cron job command không còn `current_date` param
- [ ] Latest snapshot có `period_start` = 90 ngày trước
- [ ] `net_revenue` > 0 (expected ~340M)
- [ ] `locked_cash_inventory` > 0 (expected ~2.87B)
- [ ] `locked_cash_ads` > 0 (expected ~131M)
- [ ] `dso` ~ 49 ngày, `dio` ~ 365 ngày (capped)

### Trang 1: Cash Position
- [ ] Translation "Vị thế tiền mặt" hiển thị trên sidebar
- [ ] 4 loại locked cash (Inventory, Ads, Ops, Platform) hiển thị
- [ ] "Cash bị khóa" dùng DB value, không magic number

### Trang 2: Cash Flow Direct
- [ ] KPIs hiển thị đúng (Total Inflow: 3.77B)
- [ ] Badge tiếng Việt (Hoạt động KD, Đầu tư, Tài chính)
- [ ] Stacked chart hiển thị investing (negative) đúng màu

### Trang 3: Working Capital Hub
- [ ] "Vốn lưu động & CCC" thay vì raw key
- [ ] DSO/DIO/DPO/CCC có giá trị > 0
- [ ] Trend chart có data (sau khi run WC daily)

### Trang 4: Executive Summary
- [ ] Radar chart hiển thị health scores
- [ ] Monthly revenue > 0
- [ ] Không còn fallback "Doanh thu tháng: 0"

### Trang 5 & 6: Risk Dashboard
- [ ] Risk Profile radar hoạt động (từ v_risk_radar_summary)
- [ ] Stress Testing Monte Carlo chạy
- [ ] (Future) Concentration risk từ DB thay vì mock

### Trang 7: Decision Support
- [ ] ✅ Tất cả analysis tabs hoạt động
- [ ] AI Chat có kết nối edge function
- [ ] Saved analyses lưu được vào DB

---

## PHẦN 5: EXECUTION TIMELINE

```text
PHASE A: Critical Fixes (Khôi phục data) ─────────────────
│
│  Step 1: Fix cron job params
│          └─ Migration 1
│
│  Step 2: Trigger immediate snapshot refresh  
│          └─ SQL INSERT
│
│  Step 3: Add translation keys
│          └─ LanguageContext.tsx
│
PHASE B: UI Enhancements ─────────────────────────────────
│
│  Step 4: Update RealCashBreakdown grid (4 columns)
│          └─ RealCashBreakdown.tsx
│
│  Step 5: Fix CashPositionPage locked cash display
│          └─ CashPositionPage.tsx
│
│  Step 6: Vietnamese badges for Cash Flow Direct
│          └─ CashFlowDirectPage.tsx
│
PHASE C: Trend Data (Optional) ───────────────────────────
│
│  Step 7: Add working capital daily cron
│          └─ Migration 2
│
│  Step 8: Populate historical WC data
│          └─ SQL INSERT with generate_series
│
└─────────────────────────────────────────────────────────
```

---

## PHẦN 6: EXPECTED RESULTS

| Metric/Screen | Before | After |
|---------------|--------|-------|
| `net_revenue` in snapshot | 0 | ~340M |
| DSO | 0 ngày | ~49 ngày |
| DIO | 0 ngày | 365 ngày (capped) |
| DPO | 0 ngày | ~263 ngày |
| CCC | 0 ngày | ~151 ngày (capped) |
| Locked Cash Inventory | 0 | ~2.87B |
| Locked Cash Ads | 0 | ~131M |
| nav.cashPosition | Raw key | "Vị thế tiền mặt" |
| workingCapital.hubTitle | Raw key | "Vốn lưu động & CCC" |
| Cash Position grid | 2 items | 4 items |
| Working Capital trends | Empty | 90+ data points |

---

## PHẦN 7: RISK ASSESSMENT

| Change | Risk | Mitigation |
|--------|------|------------|
| Fix cron job | Low | Using default params, tested syntax |
| Update RPC locked cash | Medium | COALESCE handles NULL, tested formulas |
| Add translations | Very Low | Additive only, no breaking change |
| Update UI grid | Low | CSS only, no logic change |
| Add WC daily cron | Low | ON CONFLICT handles duplicates |
