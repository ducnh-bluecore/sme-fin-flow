
# KẾ HOẠCH PHASE 4: CASH POSITION DASHBOARD
## Đánh giá thay đổi và ảnh hưởng

---

## 1. TÌNH TRẠNG HIỆN TẠI

### 1.1 Đã có sẵn

| Component/File | Chức năng | Vị trí |
|----------------|-----------|--------|
| `RealCashBreakdown.tsx` | UI hiển thị 4 loại cash | `src/components/dashboard/` |
| `useFinanceTruthSnapshot` | SSOT hook cho metrics | `src/hooks/` |
| `calculateRealCash()` | Hàm tính toán trong formulas | `src/lib/fdp-formulas.ts` |
| `central_metrics_snapshots` | DB table lưu metrics | Database |
| `compute_central_metrics_snapshot` | RPC tính metrics | Database |

### 1.2 Vấn đề cần giải quyết

| Vấn đề | Mức độ | Chi tiết |
|--------|--------|----------|
| **Magic Number** | Cao | Ads Float = 20% marketing spend (hardcoded) |
| **Thiếu DB columns** | Cao | Không có `locked_cash`, `ads_float`, `ops_float` |
| **Thiếu Ops Float** | Trung bình | Chưa tính tiền bị khóa trong logistics/shipping |
| **Thiếu Drill-down** | Trung bình | Không thể xem chi tiết từng loại locked cash |
| **Chưa có trang riêng** | Thấp | Component được nhúng trong UnitEconomicsPage |

---

## 2. MA TRẬN ẢNH HƯỞNG

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    IMPACT ASSESSMENT MATRIX                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  DATABASE LAYER                                                          │
│  ├─ central_metrics_snapshots  ████████████  HIGH (add 5 columns)       │
│  ├─ compute_central_metrics_snapshot ████████  HIGH (add locked logic)  │
│  └─ NEW: v_locked_cash_detail  ██████  MEDIUM (new view)                │
│                                                                          │
│  HOOKS LAYER                                                             │
│  ├─ useFinanceTruthSnapshot  ████████  HIGH (add locked fields)         │
│  ├─ NEW: useLockedCashDetail  ████  LOW (new hook)                      │
│  └─ useCashRunway  ████  LOW (update calculations)                      │
│                                                                          │
│  COMPONENT LAYER                                                         │
│  ├─ RealCashBreakdown  ████████████  HIGH (major refactor)              │
│  ├─ NEW: LockedCashDrilldown  ██████  MEDIUM (new component)            │
│  └─ NEW: CashPositionSummary  ████  LOW (new component)                 │
│                                                                          │
│  PAGE LAYER                                                              │
│  ├─ NEW: CashPositionPage  ██████  MEDIUM (new page)                    │
│  ├─ CFODashboard  ████  LOW (add link)                                  │
│  └─ UnitEconomicsPage  ██  VERY LOW (keep existing)                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. LOCKED CASH METHODOLOGY

### 3.1 Phân loại Chi tiết

Theo FDP Manifesto Principle #4, "Locked Cash" được phân thành:

| Loại | Nguồn dữ liệu | Công thức |
|------|---------------|-----------|
| **Inventory Lock** | `products` table | `SUM(current_stock * cost_price)` |
| **Ads Float** | `marketing_expenses` + `cdp_orders` | Ads spend chưa convert thành revenue |
| **Ops Float** | `bills` + COD | Tiền logistics chưa settle |
| **Platform Hold** | eCommerce channels | Tiền bị sàn giữ (T+14 settlement) |

### 3.2 Công thức Ads Float (Cải tiến)

```text
HIỆN TẠI (Magic Number):
  Ads Float = Marketing Spend × 20%

ĐỀ XUẤT (DB-First):
  Ads Float = SUM(
    marketing_expenses.amount 
    WHERE expense_date > (CURRENT_DATE - settlement_days)
      AND NOT EXISTS (matched revenue)
  )
  
  settlement_days = {
    Shopee: 14,
    Lazada: 14,
    TikTok: 7,
    Meta: 0 (realtime),
    Google: 0 (realtime)
  }
```

---

## 4. DATABASE CHANGES

### 4.1 New Columns in `central_metrics_snapshots`

```sql
ALTER TABLE central_metrics_snapshots ADD COLUMN IF NOT EXISTS
  locked_cash_inventory NUMERIC(15,2) DEFAULT 0;
ALTER TABLE central_metrics_snapshots ADD COLUMN IF NOT EXISTS
  locked_cash_ads NUMERIC(15,2) DEFAULT 0;
ALTER TABLE central_metrics_snapshots ADD COLUMN IF NOT EXISTS
  locked_cash_ops NUMERIC(15,2) DEFAULT 0;
ALTER TABLE central_metrics_snapshots ADD COLUMN IF NOT EXISTS
  locked_cash_platform NUMERIC(15,2) DEFAULT 0;
ALTER TABLE central_metrics_snapshots ADD COLUMN IF NOT EXISTS
  locked_cash_total NUMERIC(15,2) DEFAULT 0;
```

### 4.2 New View: `v_locked_cash_detail`

```sql
CREATE VIEW v_locked_cash_detail AS
SELECT
  tenant_id,
  'inventory' AS lock_type,
  sku,
  product_name,
  current_stock * cost_price AS locked_amount,
  current_stock AS quantity,
  CASE 
    WHEN last_sold_at < CURRENT_DATE - INTERVAL '90 days' THEN 'slow_moving'
    ELSE 'active'
  END AS status
FROM products
WHERE current_stock > 0

UNION ALL

SELECT
  tenant_id,
  'ads' AS lock_type,
  channel AS sku,
  campaign_name AS product_name,
  amount AS locked_amount,
  NULL AS quantity,
  CASE 
    WHEN expense_date > CURRENT_DATE - INTERVAL '14 days' THEN 'pending'
    ELSE 'settled'
  END AS status
FROM marketing_expenses
WHERE expense_date > CURRENT_DATE - INTERVAL '30 days';
```

### 4.3 Update `compute_central_metrics_snapshot`

```sql
-- Add locked cash calculations
v_locked_inventory := v_inventory_value; -- Already calculated

-- Ads float (more accurate than 20% estimate)
SELECT COALESCE(SUM(amount), 0)
INTO v_locked_ads
FROM marketing_expenses
WHERE tenant_id = p_tenant_id
  AND expense_date > CURRENT_DATE - INTERVAL '14 days';

-- Ops float (from pending bills + COD)
SELECT COALESCE(SUM(total_amount - paid_amount), 0)
INTO v_locked_ops
FROM bills
WHERE tenant_id = p_tenant_id
  AND status IN ('pending', 'partial')
  AND category IN ('shipping', 'logistics', 'fulfillment');

-- Platform hold (eCommerce pending settlement)
SELECT COALESCE(SUM(net_revenue), 0) * 0.85 -- 85% after fees
INTO v_locked_platform
FROM cdp_orders
WHERE tenant_id = p_tenant_id
  AND order_at > CURRENT_DATE - INTERVAL '14 days'
  AND channel IN ('Shopee', 'Lazada', 'TikTok Shop');

v_locked_total := v_locked_inventory + v_locked_ads + v_locked_ops + v_locked_platform;
```

---

## 5. FRONTEND CHANGES

### 5.1 Update `useFinanceTruthSnapshot`

```typescript
// Add to FinanceTruthSnapshot interface
lockedCashInventory: number;
lockedCashAds: number;
lockedCashOps: number;
lockedCashPlatform: number;
lockedCashTotal: number;
```

### 5.2 New Hook: `useLockedCashDetail`

```typescript
// File: src/hooks/useLockedCashDetail.ts

export interface LockedCashItem {
  lockType: 'inventory' | 'ads' | 'ops' | 'platform';
  sku: string;
  name: string;
  amount: number;
  quantity: number | null;
  status: 'active' | 'slow_moving' | 'pending' | 'settled';
}

export function useLockedCashDetail() {
  // Query v_locked_cash_detail view
  // Group by lock_type
  // Return drill-down data
}
```

### 5.3 Refactor `RealCashBreakdown`

```typescript
// BEFORE: Magic number
const estimatedAdsFloat = (metrics?.totalMarketingSpend || 0) * 0.2;
const lockedCash = inventoryValue + estimatedAdsFloat;

// AFTER: DB-First
const lockedCash = metrics?.lockedCashTotal || 0;
const lockedBreakdown = {
  inventory: metrics?.lockedCashInventory || 0,
  ads: metrics?.lockedCashAds || 0,
  ops: metrics?.lockedCashOps || 0,
  platform: metrics?.lockedCashPlatform || 0,
};
```

### 5.4 New Component: `LockedCashDrilldown`

```typescript
// File: src/components/fdp/LockedCashDrilldown.tsx

export function LockedCashDrilldown() {
  const { data, isLoading } = useLockedCashDetail();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi tiết Cash bị khóa</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="inventory">
          <TabsList>
            <TabsTrigger value="inventory">Tồn kho</TabsTrigger>
            <TabsTrigger value="ads">Ads Float</TabsTrigger>
            <TabsTrigger value="ops">Ops Float</TabsTrigger>
            <TabsTrigger value="platform">Platform Hold</TabsTrigger>
          </TabsList>
          
          {/* Drill-down tables for each type */}
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

### 5.5 New Page: `CashPositionPage`

```typescript
// File: src/pages/CashPositionPage.tsx

export default function CashPositionPage() {
  return (
    <DashboardLayout>
      <PageHeader title="Cash Position Dashboard" />
      
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Real Cash Breakdown (enhanced) */}
        <RealCashBreakdown showDrilldown={true} />
        
        {/* Cash Runway + Burn Rate */}
        <CashRunwayCard />
      </div>
      
      {/* Locked Cash Detail */}
      <LockedCashDrilldown />
      
      {/* Bank Account Sync Status */}
      <BankAccountsPanel />
      
      {/* Cash Alerts */}
      <CashAlertsPanel />
    </DashboardLayout>
  );
}
```

---

## 6. RISK ASSESSMENT

| Thay đổi | Rủi ro | Lý do | Mitigation |
|----------|--------|-------|------------|
| Add DB columns | **Thấp** | Chỉ thêm nullable columns | Default = 0 |
| Update RPC | **Trung bình** | Logic phức tạp hơn | Test với E2E data |
| Update hook interface | **Trung bình** | TypeScript breaking change | Backward-compatible fields |
| Refactor component | **Thấp** | Isolated component | Keep old logic as fallback |
| New page | **Thấp** | Additive change | No routing conflicts |

---

## 7. TESTING CHECKLIST

### Database
- [ ] New columns added to `central_metrics_snapshots`
- [ ] RPC computes all 4 locked cash types correctly
- [ ] View `v_locked_cash_detail` returns expected data
- [ ] Total locked = inventory + ads + ops + platform

### Frontend
- [ ] `useFinanceTruthSnapshot` returns new fields
- [ ] `RealCashBreakdown` uses DB values (not magic number)
- [ ] Drill-down shows correct breakdown by type
- [ ] New page `/fdp/cash-position` accessible
- [ ] No regression in UnitEconomicsPage

### Business Logic
- [ ] Ads Float reflects recent (14d) marketing spend
- [ ] Platform Hold reflects T+14 eCommerce settlement
- [ ] Slow-moving inventory flagged correctly
- [ ] Cash runway calculation unchanged

---

## 8. FILES SUMMARY

### New Files (5)

| File | Purpose |
|------|---------|
| `supabase/migrations/[NEW]_add_locked_cash_columns.sql` | DB schema |
| `supabase/migrations/[NEW]_create_locked_cash_view.sql` | Detail view |
| `src/hooks/useLockedCashDetail.ts` | Drill-down hook |
| `src/components/fdp/LockedCashDrilldown.tsx` | Drill-down UI |
| `src/pages/CashPositionPage.tsx` | New dashboard page |

### Modified Files (5)

| File | Changes |
|------|---------|
| `supabase/migrations/compute_central_metrics_snapshot` | Add locked cash logic |
| `src/hooks/useFinanceTruthSnapshot.ts` | Add new fields to interface |
| `src/components/dashboard/RealCashBreakdown.tsx` | Use DB values, add drill-down |
| `src/App.tsx` | Add route for /fdp/cash-position |
| `src/components/layout/DashboardSidebar.tsx` | Add menu item |

---

## 9. TIMELINE

```text
Day 1 ──────────────────────────────────────────────────────
│
│  MORNING: Database Changes
│  ├─ Add 5 locked cash columns to central_metrics_snapshots
│  ├─ Create v_locked_cash_detail view
│  └─ Update compute_central_metrics_snapshot RPC
│
│  AFTERNOON: Hook Updates
│  ├─ Update FinanceTruthSnapshot interface
│  ├─ Create useLockedCashDetail hook
│  └─ Test with E2E data
│
Day 2 ──────────────────────────────────────────────────────
│
│  MORNING: Component Updates
│  ├─ Refactor RealCashBreakdown (remove magic number)
│  ├─ Create LockedCashDrilldown component
│  └─ Update CashRunwayCard (optional)
│
│  AFTERNOON: Page & Navigation
│  ├─ Create CashPositionPage
│  ├─ Add route and sidebar item
│  └─ QA and testing
│
└───────────────────────────────────────────────────────────
```

---

## 10. SUCCESS METRICS

| Metric | Before | After |
|--------|--------|-------|
| Ads Float calculation | Magic 20% | DB-computed from marketing_expenses |
| Locked Cash sources | 2 (inventory + ads) | 4 (+ ops + platform) |
| Drill-down capability | None | Full breakdown by type |
| Data transparency | Low (estimation) | High (actual DB values) |
| Page availability | Embedded in Unit Economics | Dedicated page |

---

## 11. BACKWARD COMPATIBILITY

Để đảm bảo không break existing code:

```typescript
// In useFinanceTruthSnapshot.ts - add fallback
const lockedCashTotal = snapshot?.locked_cash_total 
  ?? (snapshot?.total_inventory_value || 0) + (snapshot?.total_marketing_spend || 0) * 0.2;
```

Khi migration hoàn tất và RPC được cập nhật, giá trị sẽ tự động chuyển sang DB-computed.
