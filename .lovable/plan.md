
# KẾ HOẠCH: SỬA LỖI HIỂN THỊ COGS VÀ AUDIT formatPercent

## 1. PHÂN TÍCH CHI TIẾT

### 1.1 Vấn đề formatPercent COGS/Revenue

| Vị trí | Code hiện tại | Kết quả sai | Kết quả đúng |
|--------|---------------|-------------|--------------|
| Dòng 975 | `formatPercent(plData.cogs / plData.netSales)` | "0.5%" | "48.5%" |

**Nguyên nhân**: Hàm `formatPercent` mặc định `isDecimal=false`. Khi tính `cogs / netSales = 0.485`, nó hiểu là `0.485%` thay vì `48.5%`.

### 1.2 Thông tin sai lệch

| Vấn đề | Chi tiết |
|--------|----------|
| Dòng 964 | Text cứng: "COGS được ước tính dựa trên tỷ lệ **65%** doanh thu thuần" |
| Thực tế | COGS thực = ~48.5% từ database (`pl_report_cache`) |
| Vi phạm | FDP Manifesto: "TRUTH > FLEXIBILITY" - không được nói sai về dữ liệu |

### 1.3 Audit toàn bộ formatPercent trong PLReportPage

| Dòng | Code | Nguồn giá trị | Đúng/Sai |
|------|------|---------------|----------|
| 839 | `formatPercent(ch.grossMargin)}%` | Hook tính sẵn * 100 | ⚠️ Thừa dấu `%` |
| 860 | `formatPercent(channelsPLData.totals.grossMargin)` | Hook tính sẵn * 100 | ✅ OK |
| 975 | `formatPercent(plData.cogs / plData.netSales)` | Decimal 0.485 | ❌ Thiếu `isDecimal=true` |
| 979 | `formatPercent(plData.grossMargin)` | Database * 100 | ✅ OK |
| 1072 | `formatPercent(item.value)` | Database * 100 | ✅ OK |
| 1073 | `formatPercent(item.target)` | Hardcode 0.40, 0.12 | ❌ Thiếu `isDecimal=true` |
| 1085-1086 | `formatPercent(item.value - item.target)` | Mixed format | ❌ Logic sai |

### 1.4 Hiểu đúng Data Format

```text
┌───────────────────────────────────────────────────────────────────┐
│ NGUỒN DỮ LIỆU                                                     │
├───────────────────────────────────────────────────────────────────┤
│ usePLData hook:                                                   │
│   • grossMargin = (gross_profit / net_sales) * 100  → VD: 51.5    │
│   • operatingMargin = (operating_income / net_sales) * 100 → 8.2  │
│   • netMargin = (net_income / net_sales) * 100 → 5.1              │
│                                                                   │
│ useAllChannelsPL hook:                                            │
│   • grossMargin = (grossProfit / totalRevenue) * 100 → VD: 42.0   │
│                                                                   │
│ Hardcode trong code:                                              │
│   • target: 0.40 (40%), 0.12 (12%), 0.08 (8%) → DECIMAL format    │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. GIẢI PHÁP CHI TIẾT

### 2.1 Fix COGS/Revenue ratio (Dòng 975)

```typescript
// TRƯỚC (sai):
<span className="font-semibold">{formatPercent(plData.cogs / plData.netSales)}</span>

// SAU (đúng):
<span className="font-semibold">{formatPercent(plData.cogs / plData.netSales, true)}</span>
```

### 2.2 Cập nhật text COGS estimation (Dòng 962-969)

**Trước:**
```tsx
<div className="p-4 mt-4 rounded-lg bg-muted/30">
  <p className="text-sm text-muted-foreground mb-2">
    COGS được ước tính dựa trên tỷ lệ 65% doanh thu thuần - phù hợp với ngành bán lẻ.
  </p>
  <p className="text-xs text-muted-foreground">
    Để có số liệu chính xác hơn, cần tích hợp hệ thống quản lý kho hàng.
  </p>
</div>
```

**Sau:**
```tsx
<div className="p-4 mt-4 rounded-lg bg-muted/30">
  <p className="text-sm text-muted-foreground mb-2">
    COGS được tính từ dữ liệu đơn hàng thực tế. 
    Tỷ lệ hiện tại: {formatPercent(plData.cogs / plData.netSales, true)} doanh thu thuần.
  </p>
  <p className="text-xs text-muted-foreground">
    Để chi tiết hơn theo SKU, cần tích hợp hệ thống quản lý kho hàng.
  </p>
</div>
```

### 2.3 Fix channel grossMargin có thừa dấu `%` (Dòng 839)

```typescript
// TRƯỚC (thừa %):
<Badge ...>
  {formatPercent(ch.grossMargin)}%
</Badge>

// SAU (đúng):
<Badge ...>
  {formatPercent(ch.grossMargin)}
</Badge>
```

### 2.4 Fix target comparison với decimal values (Dòng 1063-1087)

**Trước:**
```typescript
{[
  { label: 'Biên lãi gộp', value: plData.grossMargin, target: 0.40, color: 'primary' },
  { label: 'Biên lợi nhuận hoạt động', value: plData.operatingMargin, target: 0.12, color: 'info' },
  { label: 'Biên lợi nhuận ròng', value: plData.netMargin, target: 0.08, color: 'success' },
].map((item) => (
  <div key={item.label} className="space-y-2">
    <div className="flex items-center gap-2">
      <span className="font-bold">{formatPercent(item.value)}</span>
      <span className="text-xs text-muted-foreground">/ {formatPercent(item.target)}</span>
    </div>
    ...
    <p className="text-xs text-muted-foreground">
      {item.value >= item.target 
        ? `Đạt ${formatPercent(item.value - item.target)} trên mục tiêu`
        : `Còn ${formatPercent(item.target - item.value)} để đạt mục tiêu`
      }
    </p>
  </div>
))}
```

**Sau:**
```typescript
{[
  { label: 'Biên lãi gộp', value: plData.grossMargin, target: 40, color: 'primary' },
  { label: 'Biên lợi nhuận hoạt động', value: plData.operatingMargin, target: 12, color: 'info' },
  { label: 'Biên lợi nhuận ròng', value: plData.netMargin, target: 8, color: 'success' },
].map((item) => (
  <div key={item.label} className="space-y-2">
    <div className="flex items-center gap-2">
      <span className="font-bold">{formatPercent(item.value)}</span>
      <span className="text-xs text-muted-foreground">/ {formatPercent(item.target)}</span>
    </div>
    ...
    <p className="text-xs text-muted-foreground">
      {item.value >= item.target 
        ? `Đạt ${formatPercent(item.value - item.target)} trên mục tiêu`
        : `Còn ${formatPercent(item.target - item.value)} để đạt mục tiêu`
      }
    </p>
  </div>
))}
```

**Giải thích:** Chuyển target từ decimal (0.40) sang percentage (40) để match với format của `plData.grossMargin` (đã *100 trong hook).

---

## 3. DATA FLOW DIAGRAM

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA FORMAT FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  pl_report_cache (Database)                                         │
│  ├─ gross_margin: 51.5 (đã * 100)                                   │
│  ├─ operating_margin: 8.2 (đã * 100)                                │
│  └─ net_margin: 5.1 (đã * 100)                                      │
│          │                                                          │
│          ▼                                                          │
│  usePLData hook                                                     │
│  ├─ plData.grossMargin = 51.5     → formatPercent(51.5) = "51.5%"   │
│  ├─ plData.cogs = 43,400,000                                        │
│  └─ plData.netSales = 89,500,000                                    │
│          │                                                          │
│          ▼                                                          │
│  PLReportPage UI                                                    │
│  ├─ cogs/netSales = 0.485         → formatPercent(0.485, true) ✓    │
│  └─ grossMargin = 51.5            → formatPercent(51.5) ✓           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. FILES CẦN SỬA ĐỔI

| File | Dòng | Thay đổi | Ưu tiên |
|------|------|----------|---------|
| `src/pages/PLReportPage.tsx` | 975 | Thêm `isDecimal=true` cho COGS ratio | 🔴 High |
| `src/pages/PLReportPage.tsx` | 962-969 | Cập nhật text COGS estimation | 🔴 High |
| `src/pages/PLReportPage.tsx` | 839 | Xóa dấu `%` thừa | 🟠 Medium |
| `src/pages/PLReportPage.tsx` | 1064-1066 | Chuyển target từ 0.40 → 40 | 🟠 Medium |

---

## 5. KẾT QUẢ MONG ĐỢI

### Trước khi sửa

| Metric | Hiển thị | Đúng/Sai |
|--------|----------|----------|
| Tỷ lệ COGS/Doanh thu | "0.5%" | ❌ |
| Text mô tả | "65% doanh thu thuần" | ❌ |
| Channel grossMargin | "42.0%%" | ❌ (thừa %) |
| Target biên lãi gộp | "0.4%" | ❌ |

### Sau khi sửa

| Metric | Hiển thị | Đúng/Sai |
|--------|----------|----------|
| Tỷ lệ COGS/Doanh thu | "48.5%" | ✅ |
| Text mô tả | "Tỷ lệ hiện tại: 48.5% doanh thu thuần" | ✅ |
| Channel grossMargin | "42.0%" | ✅ |
| Target biên lãi gộp | "40.0%" | ✅ |

---

## 6. VERIFICATION CHECKLIST

- [ ] COGS/Revenue ratio hiển thị đúng (~48.5%)
- [ ] Text COGS estimation phản ánh dữ liệu thực
- [ ] Channel margins không có double `%`
- [ ] Margin targets so sánh đúng với actual values
- [ ] Progress bars tính toán đúng tỷ lệ
