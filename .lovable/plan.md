

# Kế hoạch: Tích hợp Chi phí Tạm tính vào P&L Report

## 1. Tổng quan Business Rule

### 1.1 Rule Ưu tiên Dữ liệu

| Ưu tiên | Nguồn | Mục đích | Badge hiển thị |
|---------|-------|----------|----------------|
| 1 | `expenses` / `finance_expenses_daily` | Chi phí thực tế đã ghi nhận | "Thực tế" |
| 2 | `expense_baselines` | Chi phí cố định tạm tính (Lương, Thuê, Điện) | "Tạm tính" |
| 3 | `expense_estimates` | Biến phí dự kiến (Marketing, Logistics) | "Tạm tính" |

### 1.2 Rule Cảnh báo

- **Underestimate**: Thực tế > Tạm tính + 10% → Cảnh báo màu đỏ
- **On Track**: Chênh lệch trong khoảng ±10% → OK màu xanh
- **Overestimate**: Thực tế < Tạm tính - 20% → Thông tin màu cam

## 2. Thay đổi Database

### 2.1 Thêm cột vào `pl_report_cache`

```sql
ALTER TABLE pl_report_cache 
ADD COLUMN IF NOT EXISTS opex_data_source jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS total_opex_estimated numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_opex_actual numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS opex_logistics numeric DEFAULT 0;
```

### 2.2 Update RPC `refresh_pl_cache`

Thay đổi logic trong function hiện tại để:

**Bước 1**: Lấy chi phí TẠM TÍNH từ `expense_baselines` + `expense_estimates`

```sql
-- Fixed costs từ expense_baselines
SELECT 
  COALESCE(SUM(CASE WHEN category = 'salary' THEN monthly_amount END), 0),
  COALESCE(SUM(CASE WHEN category = 'rent' THEN monthly_amount END), 0),
  COALESCE(SUM(CASE WHEN category = 'utilities' THEN monthly_amount END), 0),
  COALESCE(SUM(CASE WHEN category = 'other' THEN monthly_amount END), 0)
INTO v_est_salary, v_est_rent, v_est_utilities, v_est_other
FROM expense_baselines
WHERE tenant_id = p_tenant_id
  AND effective_from <= v_start_date
  AND (effective_to IS NULL OR effective_to >= v_end_date);

-- Variable costs từ expense_estimates
SELECT 
  COALESCE(SUM(CASE WHEN category = 'marketing' THEN 
    COALESCE(actual_amount, estimated_amount) END), 0),
  COALESCE(SUM(CASE WHEN category = 'logistics' THEN 
    COALESCE(actual_amount, estimated_amount) END), 0)
INTO v_est_marketing, v_est_logistics
FROM expense_estimates
WHERE tenant_id = p_tenant_id
  AND year = p_year
  AND (p_month IS NULL OR month = p_month);
```

**Bước 2**: Lấy chi phí THỰC TẾ (giữ nguyên logic hiện tại từ `finance_expenses_daily`)

**Bước 3**: Merge với rule ưu tiên

```sql
-- Merge: Thực tế > 0 → dùng Thực tế, ngược lại dùng Tạm tính
v_opex_salaries := CASE 
  WHEN v_actual_salary > 0 THEN v_actual_salary 
  ELSE v_est_salary 
END;
v_source_salary := CASE WHEN v_actual_salary > 0 THEN 'actual' ELSE 'estimate' END;

v_opex_rent := CASE 
  WHEN v_actual_rent > 0 THEN v_actual_rent 
  ELSE v_est_rent 
END;
v_source_rent := CASE WHEN v_actual_rent > 0 THEN 'actual' ELSE 'estimate' END;

-- Tương tự cho: utilities, marketing, logistics, other
```

**Bước 4**: Lưu metadata nguồn dữ liệu và tổng tạm tính/thực tế

```sql
INSERT INTO pl_report_cache (
  ...,
  opex_data_source,
  total_opex_estimated,
  total_opex_actual,
  opex_logistics
) VALUES (
  ...,
  jsonb_build_object(
    'salary', v_source_salary,
    'rent', v_source_rent,
    'utilities', v_source_utilities,
    'marketing', v_source_marketing,
    'logistics', v_source_logistics,
    'other', v_source_other
  ),
  v_est_salary + v_est_rent + v_est_utilities + v_est_marketing + v_est_logistics + v_est_other,
  v_actual_salary + v_actual_rent + v_actual_utilities + v_actual_marketing + v_actual_logistics + v_actual_other,
  v_opex_logistics
);
```

### 2.3 Tạo View `v_expense_variance_alerts`

View để phát hiện chênh lệch Tạm tính vs Thực tế, dùng cho Control Tower:

```sql
CREATE OR REPLACE VIEW v_expense_variance_alerts AS
SELECT 
  eb.tenant_id,
  eb.category,
  eb.name,
  eb.monthly_amount AS estimated,
  COALESCE(act.actual_amount, 0) AS actual,
  COALESCE(act.actual_amount, 0) - eb.monthly_amount AS variance,
  CASE 
    WHEN eb.monthly_amount > 0 THEN 
      ((COALESCE(act.actual_amount, 0) - eb.monthly_amount) / eb.monthly_amount) * 100
    ELSE 0
  END AS variance_percent,
  CASE 
    WHEN COALESCE(act.actual_amount, 0) > eb.monthly_amount * 1.1 THEN 'underestimate'
    WHEN COALESCE(act.actual_amount, 0) < eb.monthly_amount * 0.8 THEN 'overestimate'
    ELSE 'on_track'
  END AS alert_status,
  date_trunc('month', CURRENT_DATE) AS alert_month
FROM expense_baselines eb
LEFT JOIN (
  SELECT tenant_id, category, SUM(amount) as actual_amount
  FROM expenses
  WHERE expense_date >= date_trunc('month', CURRENT_DATE)
    AND expense_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY tenant_id, category
) act ON eb.tenant_id = act.tenant_id AND eb.category = act.category::text
WHERE eb.effective_from <= CURRENT_DATE
  AND (eb.effective_to IS NULL OR eb.effective_to >= CURRENT_DATE);
```

## 3. Thay đổi Frontend

### 3.1 Update Hooks

**`src/hooks/usePLData.ts`** - Thêm fields mới:

```typescript
export interface PLData {
  // ... existing fields
  opexDataSource?: Record<string, 'actual' | 'estimate'>;
  totalOpexEstimated?: number;
  totalOpexActual?: number;
  hasProvisionalData?: boolean;
}
```

**`src/hooks/usePLCache.ts`** - Map thêm cột mới:

```typescript
const plData: PLData | null = query.data ? {
  // ... existing
  opexDataSource: query.data.opex_data_source as Record<string, 'actual' | 'estimate'> || {},
  totalOpexEstimated: query.data.total_opex_estimated || 0,
  totalOpexActual: query.data.total_opex_actual || 0,
  hasProvisionalData: Object.values(query.data.opex_data_source || {}).includes('estimate'),
} : null;
```

**`src/hooks/useExpenseVarianceAlerts.ts`** - Hook mới:

```typescript
export function useExpenseVarianceAlerts() {
  // Fetch từ v_expense_variance_alerts
  // Return alerts với status: underestimate | overestimate | on_track
}
```

### 3.2 Update `PLReportPage.tsx`

**A. Thêm Badge nguồn dữ liệu vào `PLLineItem`:**

```typescript
// Trong PLLineItem props
dataSource?: 'actual' | 'estimate';

// Render badge nhỏ bên cạnh label
{dataSource === 'estimate' && (
  <Badge variant="outline" className="text-[10px] ml-1 px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-300">
    Tạm tính
  </Badge>
)}
```

**B. Thêm Section "Chi phí dự kiến tháng tới" vào Tab Summary:**

```text
┌─────────────────────────────────────────────────────────────┐
│ 📊 Chi phí dự kiến tháng tới (từ định nghĩa)               │
├─────────────────────────────────────────────────────────────┤
│ Chi phí cố định                                            │
│   Lương nhân viên      210,000,000đ                        │
│   Thuê mặt bằng         35,000,000đ                        │
│   Điện nước              5,000,000đ                        │
│ ─────────────────────────────────────────────────────────   │
│ Biến phí dự kiến                                           │
│   Marketing Shopee      20,000,000đ                        │
│   Vận chuyển            15,000,000đ                        │
│ ─────────────────────────────────────────────────────────   │
│ TỔNG DỰ KIẾN           285,000,000đ                        │
│                                                             │
│ ⓘ Dữ liệu từ "Định nghĩa chi phí" trong menu Chi phí       │
└─────────────────────────────────────────────────────────────┘
```

**C. Thêm Tab "Dự báo" (tùy chọn sau này):**

Hiển thị forecast 6 tháng từ baselines/estimates.

### 3.3 Update `ExpensesPage.tsx` 

**Thêm cảnh báo Variance vào tab "Định nghĩa chi phí":**

```typescript
// Component nhỏ dưới mỗi panel
<ExpenseVarianceAlerts />
```

### 3.4 Tạo Component mới

**`src/components/expenses/ExpenseVarianceAlerts.tsx`:**

```typescript
// Hiển thị cảnh báo kiểu:
// ⚠️ "Lương nhân viên vượt kế hoạch +20M (9.5%)" 
// ✓ "Marketing Shopee đang đúng kế hoạch"
```

**`src/components/pl/ProvisionalExpensesSummary.tsx`:**

```typescript
// Panel hiển thị tổng chi phí tạm tính
// Dùng trong P&L Report
```

## 4. Data Flow

```text
┌─────────────────────┐     ┌─────────────────────┐
│ expense_baselines   │     │ expense_estimates   │
│ (Lương: 210M,       │     │ (Marketing: 20M)    │
│  Thuê: 35M)         │     │                     │
├─────────────────────┤     ├─────────────────────┤
│  NGUỒN TẠM TÍNH     │     │  NGUỒN TẠM TÍNH     │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           └─────────────┬─────────────┘
                         │
                         ▼
           ┌─────────────────────────┐
           │   refresh_pl_cache RPC  │
           │   ─────────────────────│
           │   RULE:                 │
           │   IF actual > 0         │
           │     THEN use actual     │
           │     data_source='actual'│
           │   ELSE use estimate     │
           │     data_source='estimate'│
           └─────────────┬───────────┘
                         ▲
          ┌──────────────┴──────────────┐
          │                             │
┌─────────────────────┐     ┌─────────────────────┐
│ finance_expenses    │     │ expenses table      │
│ _daily              │     │                     │
├─────────────────────┤     ├─────────────────────┤
│  NGUỒN THỰC TẾ      │     │  NGUỒN THỰC TẾ      │
└─────────────────────┘     └─────────────────────┘
                         │
                         ▼
           ┌─────────────────────────┐
           │   pl_report_cache       │
           │   ─────────────────────│
           │   opex_salaries: 210M   │
           │   opex_data_source: {   │
           │     "salary": "estimate"│
           │     "marketing":"actual"│
           │   }                     │
           │   total_opex_estimated  │
           │   total_opex_actual     │
           └─────────────┬───────────┘
                         │
                         ▼
           ┌─────────────────────────┐
           │   usePLData hook        │
           │   ─────────────────────│
           │   hasProvisionalData    │
           │   opexDataSource        │
           └─────────────┬───────────┘
                         │
                         ▼
           ┌─────────────────────────┐
           │   PLReportPage.tsx      │
           │   ─────────────────────│
           │   Badge [Tạm tính]      │
           │   beside expense items  │
           │   Variance alerts       │
           └─────────────────────────┘
```

## 5. Use Cases

### Use Case 1: Tháng chưa có phí thực tế

```text
expense_baselines: Lương = 210M
expenses table: (trống)

→ P&L hiển thị: 
  Lương nhân viên    210,000,000đ  [Tạm tính]
```

### Use Case 2: Tháng có một phần phí thực tế

```text
expense_baselines: 
  - Lương = 210M
  - Thuê = 35M
expenses table: 
  - Lương = 230M (có thực tế)
  - Thuê = (trống)

→ P&L hiển thị:
  Lương nhân viên    230,000,000đ  [Thực tế] ⚠️ +9.5%
  Thuê mặt bằng       35,000,000đ  [Tạm tính]
```

### Use Case 3: Cảnh báo Underestimate

```text
expense_baselines: Marketing = 20M
expense_estimates: Marketing Shopee = 20M
expenses table: Marketing = 25M (thực tế)

→ Cảnh báo: "Chi phí Marketing vượt kế hoạch +5M (+25%)"
→ Alert status: underestimate
```

## 6. Files thay đổi

| File | Loại | Mô tả |
|------|------|-------|
| `supabase/migrations/xxx.sql` | New | ALTER TABLE + UPDATE FUNCTION + CREATE VIEW |
| `src/hooks/usePLData.ts` | Edit | Thêm interface fields mới + map từ cache |
| `src/hooks/usePLCache.ts` | Edit | Thêm types + map cột mới |
| `src/hooks/useExpenseVarianceAlerts.ts` | New | Hook fetch variance alerts |
| `src/pages/PLReportPage.tsx` | Edit | Badge nguồn dữ liệu + Section tạm tính |
| `src/pages/ExpensesPage.tsx` | Edit | Hiển thị variance alerts |
| `src/components/expenses/ExpenseVarianceAlerts.tsx` | New | Component cảnh báo |
| `src/components/pl/ProvisionalExpensesSummary.tsx` | New | Panel tổng hợp tạm tính |

## 7. Kết quả mong đợi

1. **P&L tự động fill chi phí**: Khi chưa có expenses thực → dùng baselines/estimates
2. **Badge nguồn dữ liệu**: User biết số liệu từ đâu (Tạm tính vs Thực tế)
3. **Section dự kiến tháng tới**: Xem chi phí forecast từ định nghĩa
4. **Cảnh báo variance**: Thông báo khi thực tế vượt kế hoạch >10%
5. **SSOT tuân thủ**: Mọi tính toán trong DB, frontend chỉ render

## 8. Lưu ý quan trọng

- **Không xóa fallback hiện tại**: Vẫn giữ logic lấy từ `expenses` table nếu baselines chưa được định nghĩa
- **Yearly aggregation**: Với báo cáo yearly, cần nhân baselines × số tháng hiệu lực (sẽ xử lý trong RPC)
- **Trigger refresh**: Khi user thay đổi baselines/estimates → cần refresh P&L cache

