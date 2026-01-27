
# KẾ HOẠCH SỬA LỖI TRANG CHI PHÍ KHÔNG LOAD DỮ LIỆU

## PHÂN TÍCH VẤN ĐỀ

### Nguyên nhân gốc
Trang Chi phí hiển thị **0đ** và biểu đồ trống vì:

1. **Bảng `finance_expenses_daily` trống** - Bảng precomputed này không có dữ liệu
2. **Có 300 records trong bảng `expenses`** cho E2E Test Company (dữ liệu gốc tồn tại)
3. **Thiếu hàm aggregate** - Không có RPC hoặc cron job để chuyển dữ liệu từ `expenses` → `finance_expenses_daily`

### Luồng dữ liệu hiện tại (BROKEN)

```text
expenses (300 records)
         │
         ╳ (MISSING: không có hàm aggregate)
         │
         ▼
finance_expenses_daily (0 records)
         │
         ▼
useExpensesDaily → returns []
         │
         ▼
useExpensesSummary → returns null
         │
         ▼
UI hiển thị 0đ, biểu đồ trống
```

---

## GIẢI PHÁP

### Bước 1: Tạo RPC function `compute_finance_expenses_daily`

Tạo hàm aggregate dữ liệu từ `expenses` vào `finance_expenses_daily`:

```sql
CREATE OR REPLACE FUNCTION compute_finance_expenses_daily(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert/Update daily expense aggregates
  INSERT INTO finance_expenses_daily (
    tenant_id, day, total_amount,
    cogs_amount, salary_amount, rent_amount, utilities_amount,
    marketing_amount, logistics_amount, depreciation_amount,
    interest_amount, tax_amount, other_amount, expense_count
  )
  SELECT
    e.tenant_id,
    e.expense_date as day,
    SUM(e.amount) as total_amount,
    SUM(CASE WHEN e.category = 'cogs' THEN e.amount ELSE 0 END),
    SUM(CASE WHEN e.category = 'salary' THEN e.amount ELSE 0 END),
    SUM(CASE WHEN e.category = 'rent' THEN e.amount ELSE 0 END),
    SUM(CASE WHEN e.category = 'utilities' THEN e.amount ELSE 0 END),
    SUM(CASE WHEN e.category = 'marketing' THEN e.amount ELSE 0 END),
    SUM(CASE WHEN e.category = 'logistics' THEN e.amount ELSE 0 END),
    SUM(CASE WHEN e.category = 'depreciation' THEN e.amount ELSE 0 END),
    SUM(CASE WHEN e.category = 'interest' THEN e.amount ELSE 0 END),
    SUM(CASE WHEN e.category = 'tax' THEN e.amount ELSE 0 END),
    SUM(CASE WHEN e.category = 'other' OR e.category NOT IN (...) THEN e.amount ELSE 0 END),
    COUNT(*)
  FROM expenses e
  WHERE e.tenant_id = p_tenant_id
  GROUP BY e.tenant_id, e.expense_date
  ON CONFLICT (tenant_id, day) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    -- ... update all category columns
    expense_count = EXCLUDED.expense_count,
    updated_at = now();
END;
$$;
```

### Bước 2: Chạy populate dữ liệu lịch sử

Sau khi tạo hàm, chạy một lần để populate dữ liệu cho E2E tenant:

```sql
SELECT compute_finance_expenses_daily('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
```

### Bước 3: Schedule cron job để tự động cập nhật

```sql
SELECT cron.schedule(
  'refresh-finance-expenses-daily',
  '10 3 * * *',  -- Chạy hàng ngày lúc 3:10 AM
  $$SELECT compute_finance_expenses_daily(id) FROM tenants WHERE is_active = true;$$
);
```

---

## FILES CẦN TẠO

| File | Mục đích |
|------|----------|
| `supabase/migrations/[timestamp]_add_compute_expenses_daily.sql` | Migration tạo RPC và cron job |

---

## KẾT QUẢ MONG ĐỢI

Sau khi thực hiện:

1. **Tab "Tổng quan"**: Hiển thị tổng chi phí, phân bổ theo danh mục (salary, rent, marketing, etc.)
2. **Tab "Xu hướng"**: Hiển thị biểu đồ xu hướng chi phí theo tháng
3. **Dữ liệu tự động cập nhật**: Cron job chạy hàng ngày để đồng bộ

### Xác minh dữ liệu gốc

- **E2E Test Company**: 300 records trong `expenses`
- **Categories có sẵn**: salary, rent, marketing, logistics, utilities, other
- **Khoảng thời gian**: Dữ liệu từ 01/2024 đến nay

---

## CHI TIẾT KỸ THUẬT

### Migration SQL

```sql
-- 1) Create compute function
CREATE OR REPLACE FUNCTION compute_finance_expenses_daily(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO finance_expenses_daily (
    tenant_id, day, total_amount,
    cogs_amount, salary_amount, rent_amount, utilities_amount,
    marketing_amount, logistics_amount, depreciation_amount,
    interest_amount, tax_amount, other_amount, expense_count
  )
  SELECT
    e.tenant_id,
    e.expense_date::date as day,
    COALESCE(SUM(e.amount), 0) as total_amount,
    COALESCE(SUM(CASE WHEN e.category = 'cogs' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'salary' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'rent' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'utilities' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'marketing' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'logistics' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'depreciation' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'interest' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category = 'tax' THEN e.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN e.category NOT IN ('cogs','salary','rent','utilities','marketing','logistics','depreciation','interest','tax') THEN e.amount ELSE 0 END), 0),
    COUNT(*)::integer
  FROM expenses e
  WHERE e.tenant_id = p_tenant_id
    AND e.expense_date IS NOT NULL
  GROUP BY e.tenant_id, e.expense_date::date
  ON CONFLICT (tenant_id, day) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    cogs_amount = EXCLUDED.cogs_amount,
    salary_amount = EXCLUDED.salary_amount,
    rent_amount = EXCLUDED.rent_amount,
    utilities_amount = EXCLUDED.utilities_amount,
    marketing_amount = EXCLUDED.marketing_amount,
    logistics_amount = EXCLUDED.logistics_amount,
    depreciation_amount = EXCLUDED.depreciation_amount,
    interest_amount = EXCLUDED.interest_amount,
    tax_amount = EXCLUDED.tax_amount,
    other_amount = EXCLUDED.other_amount,
    expense_count = EXCLUDED.expense_count,
    updated_at = now();
END;
$$;

-- 2) Populate historical data for active tenants
DO $$
DECLARE
  t_id UUID;
BEGIN
  FOR t_id IN SELECT id FROM tenants WHERE is_active = true LOOP
    PERFORM compute_finance_expenses_daily(t_id);
  END LOOP;
END $$;

-- 3) Schedule daily refresh via pg_cron
SELECT cron.schedule(
  'refresh-finance-expenses-daily',
  '10 3 * * *',
  $$SELECT compute_finance_expenses_daily(id) FROM tenants WHERE is_active = true;$$
);
```

---

## THỨ TỰ THỰC HIỆN

```text
Bước 1: Tạo migration với RPC function
        └─ compute_finance_expenses_daily
                ↓
Bước 2: Migration tự động populate dữ liệu lịch sử
        └─ Chạy cho tất cả tenants active
                ↓
Bước 3: Schedule cron job
        └─ Chạy hàng ngày 3:10 AM
                ↓
Bước 4: Verify UI
        └─ Tab "Tổng quan" hiển thị dữ liệu
        └─ Tab "Xu hướng" hiển thị biểu đồ
```

---

## VERIFICATION CHECKLIST

- [ ] RPC `compute_finance_expenses_daily` được tạo
- [ ] Bảng `finance_expenses_daily` có dữ liệu cho E2E tenant
- [ ] Cron job `refresh-finance-expenses-daily` được schedule
- [ ] Tab "Tổng quan" hiển thị tổng chi phí != 0
- [ ] Tab "Xu hướng" hiển thị biểu đồ area chart với dữ liệu theo tháng
- [ ] Pie chart hiển thị phân bổ theo danh mục (salary, rent, marketing, etc.)
