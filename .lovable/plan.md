

# Plan: Smart Data Inference - Tự động suy luận data từ nguồn đã chọn

## Vấn đề hiện tại

Hỏi "Bạn có loại dữ liệu nào?" quá technical cho người dùng phổ thông:
- CEO/CFO không quan tâm "invoices" hay "bills" là gì
- Họ chỉ biết "tôi dùng Shopee" hoặc "tôi có phần mềm kế toán MISA"
- Bắt họ chọn từng loại data = gây confusion và drop-off

## Giải pháp: Smart Data Inference

**Nguyên tắc**: Từ nguồn dữ liệu → Tự suy ra loại data có sẵn

### Logic Mapping:

| Nguồn user chọn | Hệ thống tự biết có |
|-----------------|---------------------|
| Sàn TMĐT (Shopee, Lazada...) | orders, customers, products, channel_fees, settlements |
| Website (Haravan, Sapo...) | orders, customers, products |
| Phần mềm kế toán (MISA, Fast...) | invoices, bills, expenses, vendors, bank_transactions |
| ERP (SAP, Oracle...) | invoices, bills, expenses, vendors, inventory, bank_transactions |
| Nền tảng quảng cáo | marketing_spend, campaigns |
| Excel / Manual | *Cần hỏi thêm* (không suy được) |

## Flow mới (3 bước thay vì 4 bước)

```text
TRƯỚC (4 steps):
[Nguồn] → [Loại data] → [Format] → [Plan]

SAU (3 steps):
[Nguồn chi tiết] → [Xác nhận & bổ sung] → [Plan]
```

### Step 1: Chọn nguồn CHI TIẾT hơn (có sub-options)

**Thay đổi UI**: Khi chọn "Sàn TMĐT", hiện thêm sub-options:

```text
┌─────────────────────────────────────────────────────────┐
│ ☑ Sàn TMĐT                                              │
│   ├─ ☑ Shopee                                           │
│   ├─ ☑ Lazada                                           │
│   ├─ ☐ TikTok Shop                                      │
│   └─ ☐ Sendo                                            │
│                                                         │
│ ☑ Phần mềm kế toán                                      │
│   ├─ ☑ MISA                                             │
│   ├─ ☐ Fast Accounting                                  │
│   └─ ☐ Bravo                                            │
│                                                         │
│ ☐ Excel / Google Sheets                                 │
│   (Nếu chọn → hỏi thêm loại data ở step 2)             │
└─────────────────────────────────────────────────────────┘
```

### Step 2: Xác nhận & Bổ sung

**Auto-generated summary + cho phép bổ sung:**

```text
┌─────────────────────────────────────────────────────────┐
│ Dựa trên nguồn bạn chọn, hệ thống xác định:             │
│                                                         │
│ ✅ Từ Shopee, Lazada:                                   │
│   • Đơn hàng                                            │
│   • Khách hàng                                          │
│   • Sản phẩm                                            │
│   • Phí sàn                                             │
│                                                         │
│ ✅ Từ MISA:                                             │
│   • Hóa đơn bán hàng (AR)                               │
│   • Hóa đơn mua hàng (AP)                               │
│   • Chi phí vận hành                                    │
│                                                         │
│ ❓ Bạn còn data nào khác? (chọn thêm nếu có)            │
│   ☐ Giao dịch ngân hàng (Excel)                         │
│   ☐ Chi phí marketing (Excel)                           │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Import Plan (như cũ)

Hiển thị kế hoạch: Connect vs Import vs Skip

---

## Thay đổi kỹ thuật

### 1. Thêm `providedDataTypes` vào `DataSourceOption`

```typescript
// src/lib/dataRequirementsMap.ts

export interface DataSourceOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  connectorTypes: string[];
  // NEW: Data types this source typically provides
  providedDataTypes: string[];
  // NEW: Sub-sources (specific platforms)
  subSources?: {
    id: string;
    label: string;
    connectorType: string;
    logo?: string;
  }[];
}

// Updated options:
export const dataSourceOptions: DataSourceOption[] = [
  {
    id: 'ecommerce',
    label: 'Sàn TMĐT',
    description: 'Shopee, Lazada, TikTok Shop...',
    icon: 'ShoppingBag',
    connectorTypes: ['shopee', 'lazada', 'tiktok_shop', 'sendo'],
    providedDataTypes: ['orders', 'customers', 'products', 'channel_fees', 'settlements'],
    subSources: [
      { id: 'shopee', label: 'Shopee', connectorType: 'shopee' },
      { id: 'lazada', label: 'Lazada', connectorType: 'lazada' },
      { id: 'tiktok_shop', label: 'TikTok Shop', connectorType: 'tiktok_shop' },
      { id: 'sendo', label: 'Sendo', connectorType: 'sendo' },
    ],
  },
  {
    id: 'accounting',
    label: 'Phần mềm kế toán',
    description: 'MISA, Fast Accounting, Bravo...',
    icon: 'Calculator',
    connectorTypes: ['misa', 'fast_accounting', 'bravo', 'effect', 'sac'],
    providedDataTypes: ['invoices', 'bills', 'expenses', 'vendors', 'bank_transactions'],
    subSources: [
      { id: 'misa', label: 'MISA', connectorType: 'misa' },
      { id: 'fast', label: 'Fast Accounting', connectorType: 'fast_accounting' },
      { id: 'bravo', label: 'Bravo', connectorType: 'bravo' },
    ],
  },
  // ... etc
];
```

### 2. Mới: `inferDataTypesFromSources()` function

```typescript
// src/lib/dataRequirementsMap.ts

export function inferDataTypesFromSources(
  selectedSourceIds: string[],
  selectedSubSources: string[]
): { inferred: string[]; source: string }[] {
  const result: { inferred: string[]; source: string }[] = [];
  
  selectedSourceIds.forEach(sourceId => {
    const source = dataSourceOptions.find(s => s.id === sourceId);
    if (source && source.providedDataTypes.length > 0) {
      result.push({
        source: source.label,
        inferred: source.providedDataTypes,
      });
    }
  });
  
  return result;
}
```

### 3. Thay `DataTypeStep` bằng `DataConfirmStep`

Component mới hiển thị:
- Auto-inferred data (read-only, từ nguồn đã chọn)
- Additional data selection (chỉ cho Excel/Manual)

### 4. Bỏ `DataFormatStep` 

Format có thể suy từ nguồn:
- Có connector → API
- Excel/Manual → Manual import
- Mixed → cả hai

### 5. Update `SurveyResponses` type

```typescript
export interface SurveyResponses {
  data_sources: string[];         // Main sources: ['ecommerce', 'accounting']
  sub_sources: string[];          // Specific: ['shopee', 'lazada', 'misa']
  additional_data_types: string[]; // Extra from Excel/manual
  // Remove: data_format (auto-inferred)
}
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/dataRequirementsMap.ts` | Update | Add `providedDataTypes`, `subSources`, helper functions |
| `src/hooks/useDataAssessment.ts` | Update | Change `SurveyResponses` type |
| `src/hooks/useSmartDataMatcher.ts` | Update | Use inferred data types instead of user-selected |
| `src/components/assessment/DataSourceStep.tsx` | Update | Add sub-source selection UI |
| `src/components/assessment/DataConfirmStep.tsx` | Create | New step showing inferred + additional |
| `src/components/assessment/DataTypeStep.tsx` | Delete | No longer needed |
| `src/components/assessment/DataFormatStep.tsx` | Delete | No longer needed |
| `src/components/assessment/DataAssessmentWizard.tsx` | Update | Change from 4 steps to 3 steps |
| `src/components/assessment/index.ts` | Update | Export changes |

---

## Lợi ích

1. **Giảm cognitive load**: User chỉ cần biết họ dùng phần mềm gì, không cần hiểu "data types"
2. **Giảm steps**: 4 → 3 steps = faster completion
3. **Accurate matching**: Chọn cụ thể Shopee/Lazada = biết chính xác connector nào
4. **Smart defaults**: Tự suy 80% data, chỉ hỏi 20% còn lại (Excel/manual)
5. **Better UX**: Hiển thị "Bạn có X, Y, Z từ Shopee" = user thấy value ngay

