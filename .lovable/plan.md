

# Size Control Tower - Revenue Protection Center

## Tầm nhìn

Biến trang Assortment hiện tại (dạng bảng + tab truyền thống) thành **Size Control Tower** -- "mission control" screen nơi CFO/Head of Merchandising mở ra trong 7 giây biết: **đang mất tiền ở đâu, cứu được bao nhiêu, làm gì trước**.

## Kiến trúc dữ liệu

Toàn bộ data đã sẵn sàng trong database, không cần tạo bảng mới:

| Source | Data |
|--------|------|
| `v_size_health_by_state` | Summary: broken/risk/watch/healthy counts + financial impacts |
| `v_size_intelligence_summary` | Avg health score, total products |
| `v_lost_revenue_summary` | Total lost revenue |
| `v_transfer_by_destination` | Transfer opportunities + net benefit |
| `v_cash_lock_summary` | Total cash locked |
| `v_margin_leak_summary` | Total margin leak |
| `state_size_health_daily` JOIN `inv_stores` | Store-level heatmap by region |
| `state_size_transfer_daily` | Transfer network data |
| `fn_size_health_details` RPC | Detail drill-down |

Cần tao **1 RPC function** de aggregate store heatmap data (tranh N+1 queries va row limit):

```sql
fn_store_size_heatmap(p_tenant_id) 
  RETURNS TABLE(store_id, store_name, region, broken, risk, watch, healthy, lost_revenue, cash_locked)
```

## Layout -- 6 Sections (khong scroll dai)

```text
=====================================================
  SIZE CONTROL TOWER
  Revenue Protection Center
=====================================================

1. [GLOBAL HEALTH STRIP]  ---- Hero KPIs + Projected
   Retail Health: 74/100
   Broken: 148 | Recoverable: 61 | Revenue at Risk: 17.2 ty
   If actions applied: Health 74 -> 82

2. [STORE HEATMAP]             [ACTION IMPACT PANEL]
   Matrix: Region x Status     Top Action Today
   Toggle: Store/Region        Save X revenue, Fix Y SKUs

3. [BROKEN SKU TABLE -- PRIORITIZED BY FINANCIAL DAMAGE]
   Sort by Lost Rev + Cash Lock + Margin Leak composite
   Fixability Score: Easy/Medium/Hard/Markdown Likely

4. [TRANSFER NETWORK]
   Visual flow: Source -> Dest with revenue saved
   (Reuse TransferSuggestionsCard, compact mode)

5. [DECISION FEED -- TOP 5 AI SIGNALS]
   Critical alerts with financial impact + ETA
```

## Chi tiet tung section

### Section 1: Global Health Strip (Hero)

- **Composite Health Score**: Tu `v_size_intelligence_summary.avg_health_score`
- **Status**: CRITICAL (<60) / WARNING (60-79) / GOOD (>=80)
- **Key metrics** (da co trong `v_size_health_by_state`):
  - Broken SKUs: `broken_count`
  - Revenue at Risk: `total_lost_revenue`
  - Cash Locked: `total_cash_locked`
  - Margin Leak: `total_margin_leak`
- **Projected future** (tinh tu transfer data):
  - "Neu thuc hien dieu chuyen: Health +X, Cuu Y doanh thu"
  - Tinh tu `state_size_transfer_daily` pending net_benefit

### Section 2: Store Heatmap + Action Impact Panel

**Store Heatmap** (side-by-side layout):
- Tao RPC `fn_store_size_heatmap` de aggregate
- Hien thi dang matrix: Row = Store/Region, Columns = Broken/Risk/Watch/Healthy
- Dot indicators (circles) theo so luong, mau theo severity
- Toggle VIEW BY: Store | Region
- Hover: "Broken: 42, Revenue risk: 540M"

**Action Impact Panel** (ben phai heatmap):
- Top Action Today (tu pending transfers):
  - "Chuyen X don vi, Fix Y mau, Cuu Z doanh thu"
  - Effort level: LOW/MEDIUM/HIGH
- Luon visible, khong day xuong duoi

### Section 3: Broken SKU Table (Prioritized)

- Sort theo **Financial Damage Score**: `lost_revenue + cash_locked + margin_leak`
- Columns: Product Name | Stores Impacted | Lost Revenue | Cash Locked | Fixability
- **Fixability Score** (tinh tu du lieu co san):
  - Has pending transfer (donor available) -> "De"
  - High demand + moderate age -> "Trung binh"  
  - High markdown risk + low demand -> "Kho"
  - `markdown_risk_score >= 80` -> "Se phai giam gia"
- Click row -> mo Evidence Pack (da co)
- Reuse `fn_size_health_details` RPC, filter `curve_state = 'broken'`

### Section 4: Transfer Network (compact)

- Reuse existing `TransferSuggestionsCard` component
- Giu nguyen flow approve/export Excel
- Compact mode: chi hien top 5 dest, nut "Xem tat ca"

### Section 5: Decision Feed (Top 5)

- Tu `state_size_health_daily` WHERE `curve_state = 'broken'` + `core_size_missing = true`
- Join voi `state_lost_revenue_daily` de lay financial impact
- Hien thi dang alert cards voi:
  - Product name + severity
  - Trend (lost revenue trendline neu co nhieu ngay data)
  - Suggested action + ETA

## Files thay doi

| File | Mo ta |
|------|-------|
| `supabase/migrations/xxx.sql` | Tao RPC `fn_store_size_heatmap` |
| `src/pages/command/AssortmentPage.tsx` | Rebuild thanh Size Control Tower layout |
| `src/components/command/SizeControlTower/HealthStrip.tsx` | **Moi** - Hero section voi health score + projected |
| `src/components/command/SizeControlTower/StoreHeatmap.tsx` | **Moi** - Store/Region heatmap matrix |
| `src/components/command/SizeControlTower/ActionImpactPanel.tsx` | **Moi** - Top action summary |
| `src/components/command/SizeControlTower/PrioritizedBreakdown.tsx` | **Moi** - Broken SKU table sorted by damage |
| `src/components/command/SizeControlTower/DecisionFeed.tsx` | **Moi** - Top 5 AI signals |
| `src/hooks/inventory/useStoreHeatmap.ts` | **Moi** - Hook cho RPC heatmap |
| `src/hooks/inventory/useSizeControlTower.ts` | **Moi** - Aggregate hook cho toan bo SCT data |

## Nguyen tac thiet ke

1. **ALWAYS SHOW MONEY** -- moi metric di kem gia tri tien
2. **Projected future** -- "Neu hanh dong: Health 74 -> 82"
3. **Sort by damage** -- khong theo alphabet, theo tien mat
4. **Mission control** -- khong scroll dai, grid layout compact
5. **7-second rule** -- mo ra la hieu ngay van de
6. **Vietnamese** -- toan bo tieng Viet

## DB Migration

```sql
CREATE OR REPLACE FUNCTION public.fn_store_size_heatmap(p_tenant_id text)
RETURNS TABLE(
  store_id uuid, store_name text, region text,
  broken int, risk int, watch int, healthy int,
  lost_revenue numeric, cash_locked numeric
) AS $$
  SELECT 
    s.id, s.store_name, s.region,
    COUNT(*) FILTER (WHERE h.curve_state='broken')::int,
    COUNT(*) FILTER (WHERE h.curve_state='risk')::int,
    COUNT(*) FILTER (WHERE h.curve_state='watch')::int,
    COUNT(*) FILTER (WHERE h.curve_state='healthy')::int,
    COALESCE(SUM(lr.lost_revenue_est),0),
    COALESCE(SUM(cl.cash_locked_value),0)
  FROM state_size_health_daily h
  JOIN inv_stores s ON s.id = h.store_id AND s.tenant_id::text = h.tenant_id
  LEFT JOIN state_lost_revenue_daily lr ON lr.product_id = h.product_id AND lr.tenant_id = h.tenant_id
  LEFT JOIN state_cash_lock_daily cl ON cl.product_id = h.product_id AND cl.tenant_id = h.tenant_id
  WHERE h.tenant_id = p_tenant_id AND h.store_id IS NOT NULL
  GROUP BY s.id, s.store_name, s.region
$$ LANGUAGE sql SECURITY INVOKER;
```

## Ket qua mong doi

Khi CFO mo Size Control Tower:

- **2 giay**: Thay Health Score 74 (WARNING), biet he thong dang co van de
- **5 giay**: Thay 42 broken styles o HCM, 17.2 ty revenue at risk
- **7 giay**: Thay "Chuyen 432 don vi -> Cuu 302M, Health 74->78"
- **10 giay**: Biet mau nao mat tien nhieu nhat, click de hanh dong

Khong phai dashboard. Day la **Revenue Protection Center**.

