

# Kế hoạch: Fix trùng lặp Real Cash Breakdown + Nâng cấp Unit Economics

## Phần A: Fix Real Cash Breakdown Duplication

### 1. Vấn đề hiện tại

| Component | Vị trí | Chức năng | Trùng lặp |
|-----------|--------|-----------|-----------|
| `RealCashBreakdown.tsx` | Line 248-290 | Chi tiết 4 loại locked cash | ✅ Trùng với LockedCashDrilldown |
| `LockedCashDrilldown.tsx` | Standalone | Chi tiết 4 loại locked cash | Component chính |

### 2. Sửa đổi

**File: `src/components/fdp/RealCashBreakdown.tsx`**

```text
TRƯỚC:
├── Summary Section (Cash đã có, sẽ về, bị khóa, thực sự có thể dùng)
├── AR Timeline
├── Chi tiết Cash bị khóa (4 columns) ← TRÙNG LẶP
└── Cash Quality Indicator

SAU:
├── Summary Section (Cash đã có, sẽ về, bị khóa, thực sự có thể dùng)
├── AR Timeline
├── [XÓA] ← Dùng LockedCashDrilldown riêng khi cần drill-down
└── Cash Quality Indicator
```

### 3. Fix Calculation Logic

```typescript
// TRƯỚC (Line 96) - Thiếu 2 loại
const lockedCash = metrics?.lockedCashTotal || (inventoryValue + adsFloat);

// SAU - Đầy đủ 4 loại
const lockedCash = metrics?.lockedCashTotal || 
  (inventoryValue + adsFloat + opsFloat + platformHold);
```

---

## Phần B: Nâng cấp Unit Economics Page

### 1. Fix Data Pipeline (Database)

Sửa RPC `get_fdp_period_summary` để đọc fees từ `cdp_orders`:

```sql
-- Thay đổi từ hardcoded 0 sang đọc thực tế
'totalPlatformFees', COALESCE(SUM(o.platform_fee + o.other_fees), 0),
'totalShippingFees', COALESCE(SUM(o.shipping_fee), 0),
```

### 2. Fix Channel Query

**File: `src/hooks/useFDPAggregatedMetricsSSOT.ts`**

```typescript
// TRƯỚC - Query view không tồn tại
.from('fdp_channel_summary')

// SAU - Dùng view có sẵn
.from('v_channel_performance')
```

### 3. Thêm Decision Cards

**File mới: `src/components/unit-economics/UnitEconomicsDecisionCards.tsx`**

```text
Decision Cards hiển thị:
├── ⚠️ LTV:CAC < 3x → Cảnh báo CAC quá cao
├── 📉 CM% < 30% → Cảnh báo margin thấp
└── 🎯 Opportunity → SKU có thể tăng giá
```

### 4. Thêm What-If Calculator

**File mới: `src/components/unit-economics/UnitEconomicsCalculator.tsx`**

```text
Interactive sliders:
├── COGS: -10% to +10% → Impact on CM/Order
├── AOV: -10% to +10% → Impact on ROAS
└── Marketing: -20% to +20% → Impact on LTV:CAC
```

---

## Chi tiết tệp tin cần thay đổi

| File | Thay đổi | Mục đích |
|------|----------|----------|
| **Database Migration** | Fix RPC `get_fdp_period_summary` | Đọc fees từ cdp_orders |
| `src/components/fdp/RealCashBreakdown.tsx` | Xóa section trùng lặp + fix calculation | Loại bỏ duplication |
| `src/hooks/useFDPAggregatedMetricsSSOT.ts` | Sửa channel query | Fix channel breakdown |
| `src/components/unit-economics/UnitEconomicsDecisionCards.tsx` | Component mới | Decision insights |
| `src/components/unit-economics/UnitEconomicsCalculator.tsx` | Component mới | What-if calculator |
| `src/pages/UnitEconomicsPage.tsx` | Tích hợp decision cards + calculator | Enhanced UX |
| `src/contexts/LanguageContext.tsx` | Thêm translation keys | i18n support |

---

## Kết quả mong đợi

### Real Cash Breakdown:
- Không còn section trùng lặp
- Calculation đầy đủ 4 loại locked cash
- UI gọn gàng hơn

### Unit Economics:
| Metric | Trước | Sau |
|--------|-------|-----|
| AOV | 0 | ~403,420₫ |
| CM/Order | 0 | ~142,857₫ |
| LTV:CAC | 0.0x | ~2.1x |
| Channel data | Trống | 4 kênh đầy đủ |
| Decision Cards | Không có | 3 insights |
| Calculator | Không có | What-if tool |

