

# Plan: Mở rộng FDP Requirements - Order = Invoice/Bill trong D2C/Retail

## Bản chất vấn đề

**Logic hiện tại SAI:**
```typescript
// fdp_invoices chỉ nhận phần mềm kế toán
connectorSources: ['misa', 'fast_accounting', 'bravo', 'effect', 'sac']

// fdp_bills cũng vậy  
connectorSources: ['misa', 'fast_accounting', 'bravo', 'effect']
```

**Logic đúng cho D2C/Retail:**
| Thuật ngữ | Trong Retail | Nguồn |
|-----------|--------------|-------|
| Invoice (AR) | Order từ MỌI kênh bán | Sàn, Website, POS |
| Bill (AP) | Phí sàn, phí ship, COGS | Sàn, NCC |
| Settlement | Tiền về thực | Sàn chuyển T+14 |

---

## Giải pháp: Mở rộng connectorSources

### 1. `fdp_invoices` - Thêm TẤT CẢ nguồn bán hàng

```typescript
// BEFORE:
connectorSources: ['misa', 'fast_accounting', 'bravo', 'effect', 'sac']

// AFTER:
connectorSources: [
  // === SÀN TMĐT - Order = Invoice ===
  'shopee', 'lazada', 'tiktok_shop', 'sendo', 'shopify',
  
  // === WEBSITE RIÊNG - Order = Invoice ===
  'haravan', 'sapo', 'woocommerce', 'magento',
  
  // === PHẦN MỀM KẾ TOÁN - Invoice truyền thống ===
  'misa', 'fast_accounting', 'bravo', 'effect', 'sac',
  
  // === ERP ===
  'sap', 'oracle', 'odoo', 'netsuite'
]
```

### 2. `fdp_bills` - Thêm sàn TMĐT (phí sàn = bill)

```typescript
// BEFORE:
connectorSources: ['misa', 'fast_accounting', 'bravo', 'effect']

// AFTER:
connectorSources: [
  // === SÀN TMĐT - Phí sàn = Bill ===
  'shopee', 'lazada', 'tiktok_shop', 'sendo',
  
  // === PHẦN MỀM KẾ TOÁN ===
  'misa', 'fast_accounting', 'bravo', 'effect', 'sac',
  
  // === ERP ===
  'sap', 'oracle', 'odoo', 'netsuite'
]
```

### 3. Thêm `fdp_settlements` - Critical cho Cash Position

```typescript
{
  id: 'fdp_settlements',
  dataType: 'settlements',
  displayName: 'Tiền về từ kênh bán',
  description: 'Cash thực sự về tài khoản (T+14 từ sàn)',
  tableName: 'channel_settlements',
  priority: 'critical',
  connectorSources: ['shopee', 'lazada', 'tiktok_shop', 'haravan', 'sapo'],
  templateId: 'bank_transactions',
  usedFor: ['Cash Position', 'Platform Hold', 'Settlement Reconciliation'],
}
```

### 4. Cập nhật Smart Matcher - Mapping orders → invoices

```typescript
// src/hooks/useSmartDataMatcher.ts
const dataTypeMapping: Record<string, string[]> = {
  // Order từ MỌI nguồn = Invoice
  invoices: ['invoices', 'orders'],
  
  // Phí sàn = Bill
  bills: ['bills', 'channel_fees', 'expenses'],
  
  // Settlement = Bank transaction
  settlements: ['settlements', 'bank_transactions'],
  
  // ...existing
};
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/dataRequirementsMap.ts` | Update | Mở rộng `connectorSources` cho invoices/bills, thêm settlements |
| `src/hooks/useSmartDataMatcher.ts` | Update | Cập nhật mapping `orders→invoices`, `channel_fees→bills` |

---

## Kết quả sau thay đổi

**User chọn: Shopee, Lazada, TikTok Shop, Haravan**

### TRƯỚC:
```text
✅ Đã kết nối: 1 (Khách hàng)
📄 Import Excel: 5 (Invoices, Bills, Bank, Vendors, Expenses)
Độ sẵn sàng: 29%
```

### SAU:
```text
✅ Đã kết nối: 4
   - Doanh thu bán hàng (từ Orders = Invoice)
   - Chi phí sàn (từ Channel Fees = Bill)
   - Tiền về từ kênh bán (Settlements)
   - Khách hàng

📄 Import Excel: 2 (Giao dịch ngân hàng, Chi phí vận hành)
⏭️ Để sau: 1 (Dự báo tiền mặt)

Độ sẵn sàng: 86%
```

---

## Lợi ích

1. **Đúng thực tế D2C/Retail**: Order = Invoice, Phí sàn = Bill
2. **Tương thích đa mô hình**: Vẫn hỗ trợ B2B với phần mềm kế toán
3. **Tăng data coverage**: User sàn TMĐT sẽ có nhiều data tự động kết nối
4. **Đúng FDP Manifesto**: 
   - Order = "Cash sẽ về" 
   - Settlement = "Cash đã về"
   - Phí sàn = "Cash bị khóa/trừ"

