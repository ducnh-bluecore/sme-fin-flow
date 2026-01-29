

# THÊM NGÀY THANH TOÁN VÀ ALERT CHO CHI PHÍ CỐ ĐỊNH

## Mục tiêu

Thêm field "Ngày thanh toán hàng tháng" (payment_due_day) vào chi phí cố định để:
1. CFO định nghĩa ngày cần chi trả mỗi tháng (VD: lương ngày 5, tiền thuê ngày 10)
2. Hệ thống tự động alert các khoản sắp đến hạn thanh toán trong 7 ngày tới
3. Tích hợp vào Control Tower để báo động khi có chi phí cần thanh toán

## Ví dụ thực tế

```text
Ngày hôm nay: 29/01/2026

CHI PHÍ SẮP ĐẾN HẠN (7 ngày tới):
┌────────────────────────────────────────────────────────────────┐
│ 🔔 Lương nhân viên          Hạn: 05/02   Còn 7 ngày   ₫195M   │
│ ⚠️ Tiền thuê mặt bằng       Hạn: 01/02   Còn 3 ngày   ₫50M    │
│ 🔴 Điện nước văn phòng      Hạn: 30/01   Còn 1 ngày   ₫15M    │
└────────────────────────────────────────────────────────────────┘
```

## Thay đổi

### 1. Database - Thêm column `payment_due_day`

```sql
-- Thêm column ngày thanh toán trong tháng (1-31)
ALTER TABLE expense_baselines 
ADD COLUMN payment_due_day INTEGER CHECK (payment_due_day >= 1 AND payment_due_day <= 31);

-- Tạo view cho payment alerts
CREATE VIEW v_upcoming_payment_alerts AS
SELECT 
  eb.tenant_id,
  eb.id,
  eb.category,
  eb.name,
  eb.monthly_amount,
  eb.payment_due_day,
  -- Tính ngày thanh toán tiếp theo
  CASE 
    WHEN eb.payment_due_day >= EXTRACT(DAY FROM CURRENT_DATE) 
    THEN make_date(
      EXTRACT(YEAR FROM CURRENT_DATE)::int,
      EXTRACT(MONTH FROM CURRENT_DATE)::int,
      LEAST(eb.payment_due_day, 
        DATE_PART('day', DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::int)
    )
    ELSE make_date(
      EXTRACT(YEAR FROM CURRENT_DATE + INTERVAL '1 month')::int,
      EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')::int,
      LEAST(eb.payment_due_day, 
        DATE_PART('day', DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '1 month' - INTERVAL '1 day')::int)
    )
  END AS next_payment_date,
  -- Số ngày còn lại
  (next_payment_date - CURRENT_DATE) AS days_until_due,
  -- Mức độ cảnh báo
  CASE 
    WHEN (next_payment_date - CURRENT_DATE) <= 1 THEN 'critical'
    WHEN (next_payment_date - CURRENT_DATE) <= 3 THEN 'warning'
    WHEN (next_payment_date - CURRENT_DATE) <= 7 THEN 'info'
  END AS alert_level
FROM expense_baselines eb
WHERE eb.payment_due_day IS NOT NULL
  AND eb.effective_from <= CURRENT_DATE
  AND (eb.effective_to IS NULL OR eb.effective_to >= CURRENT_DATE)
  AND (next_payment_date - CURRENT_DATE) <= 7;
```

### 2. UI Form - Thêm field "Ngày thanh toán"

**File: `src/components/expenses/FixedCostDefinitionPanel.tsx`**

Thêm vào form dialog:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Thêm chi phí cố định                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Danh mục: [Lương nhân viên ▼]                                  │
│  Tên chi phí: [Lương văn phòng___________]                      │
│  Số tiền/tháng: [150000000]                                     │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐                         │
│  │ Từ ngày        │  │ Đến ngày       │                         │
│  │ [01/29/2026]   │  │ [mm/dd/yyyy]   │                         │
│  └────────────────┘  └────────────────┘                         │
│                                                                 │
│  🆕 Ngày thanh toán hàng tháng (tùy chọn)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ [Ngày 5 hàng tháng ▼]                                      │ │
│  │ VD: Lương thường thanh toán ngày 5, tiền thuê ngày 1       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Ghi chú: [_______________________________]                     │
│                                                                 │
│                                      [Hủy]  [Thêm mới]          │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Component - Hiển thị ngày thanh toán trong list

```text
Chi phí cố định hàng tháng
245.000.000 ₫/tháng

👥 Lương nhân viên                                    ₫195.000.000
   ├─ chi phí thuê mặt bằng        📅 Ngày 5         ₫150.000.000
   └─ Trả lương nhân viên          📅 Ngày 5         ₫45.000.000

🏢 Thuê mặt bằng                                      ₫50.000.000
   └─ Tiền thuê văn phòng          📅 Ngày 1         ₫50.000.000
```

### 4. Hook - useUpcomingPaymentAlerts

**File: `src/hooks/useUpcomingPaymentAlerts.ts`**

```typescript
export function useUpcomingPaymentAlerts() {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['upcoming-payment-alerts', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_upcoming_payment_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('days_until_due', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}
```

### 5. Component - UpcomingPaymentAlerts

**File: `src/components/expenses/UpcomingPaymentAlerts.tsx`**

Hiển thị alert card cho các khoản sắp đến hạn:

```text
┌─────────────────────────────────────────────────────────────────┐
│  🔔 Chi phí sắp đến hạn thanh toán                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔴 Điện nước văn phòng              Còn 1 ngày    ₫15.000.000 │
│     Hạn thanh toán: 30/01/2026                                  │
│                                                                 │
│  ⚠️ Tiền thuê mặt bằng               Còn 3 ngày    ₫50.000.000 │
│     Hạn thanh toán: 01/02/2026                                  │
│                                                                 │
│  🔔 Lương nhân viên                  Còn 7 ngày   ₫195.000.000 │
│     Hạn thanh toán: 05/02/2026                                  │
│                                                                 │
│  ────────────────────────────────────────────────────────────── │
│  Tổng cần chi trả trong 7 ngày tới:          ₫260.000.000      │
└─────────────────────────────────────────────────────────────────┘
```

### 6. Tích hợp vào trang Expenses

Thêm component `UpcomingPaymentAlerts` vào tab "Định nghĩa chi phí" hoặc phần đầu trang.

## Files cần tạo/sửa

| File | Loại | Mô tả |
|------|------|-------|
| Migration SQL | Tạo mới | Thêm column `payment_due_day` và view `v_upcoming_payment_alerts` |
| `src/hooks/useExpenseBaselines.ts` | Sửa | Thêm field `paymentDueDay` vào interface và mapping |
| `src/components/expenses/FixedCostDefinitionPanel.tsx` | Sửa | Thêm Select cho ngày thanh toán trong form + hiển thị trong list |
| `src/hooks/useUpcomingPaymentAlerts.ts` | Tạo mới | Hook fetch upcoming payments |
| `src/components/expenses/UpcomingPaymentAlerts.tsx` | Tạo mới | Component hiển thị alerts |
| `src/pages/ExpensesPage.tsx` | Sửa | Tích hợp UpcomingPaymentAlerts |

## Logic cảnh báo

| Số ngày còn lại | Mức độ | Màu sắc |
|-----------------|--------|---------|
| ≤ 1 ngày | Critical | 🔴 Đỏ |
| 2-3 ngày | Warning | ⚠️ Cam |
| 4-7 ngày | Info | 🔔 Xanh dương |

## Timeline
- Database migration: 5 phút
- UI form update: 10 phút  
- Alert components: 15 phút
- Tích hợp & test: 10 phút
- **Tổng: ~40 phút**

