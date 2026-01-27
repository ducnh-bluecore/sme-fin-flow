
# KE HOACH FIX: Performance Analysis Page

## VAN DE PHAT HIEN

### 1. THIEU TRANSLATION KEYS (CRITICAL)
Trang hien thi chuoi "performance.hubTitle" va "performance.hubSubtitle" thay vi text thuc su.

**Nguyen nhan:** Translation keys `performance.hubTitle` va `performance.hubSubtitle` **CHUA DUOC DINH NGHIA** trong `src/contexts/LanguageContext.tsx`.

**Code hien tai (line 40-44):**
```tsx
<h1>{t('performance.hubTitle') || 'Phân tích Hiệu suất'}</h1>
<p>{t('performance.hubSubtitle') || 'So sánh kế hoạch...'}</p>
```

**Van de:** Ham `t()` tra ve key thay vi undefined, nen fallback `||` khong hoat dong.

---

## PHAN TICH CHI TIET

### Thieu translations trong LanguageContext.tsx:

| Key | Gia tri tieng Viet | Gia tri tieng Anh |
|-----|-------------------|-------------------|
| `performance.hubTitle` | Phân tích Hiệu suất | Performance Analysis |
| `performance.hubSubtitle` | So sánh kế hoạch vs thực tế và phân tích biến động | Compare budget vs actual and analyze variances |

---

## FIX PLAN

### Task 1: Them translation keys vao LanguageContext.tsx

**File:** `src/contexts/LanguageContext.tsx`

**Them vao phan Vietnamese translations (vi object):**
```typescript
// Performance Analysis Hub
'performance.hubTitle': 'Phân tích Hiệu suất',
'performance.hubSubtitle': 'So sánh kế hoạch vs thực tế và phân tích biến động',
```

**Them vao phan English translations (en object):**
```typescript
// Performance Analysis Hub
'performance.hubTitle': 'Performance Analysis',
'performance.hubSubtitle': 'Compare budget vs actual and analyze variances',
```

---

### Task 2: Verify fallback pattern (Optional)

**File:** `src/pages/PerformanceAnalysisPage.tsx`

Kiem tra ham `t()` trong LanguageContext.tsx de xac nhan cach xu ly khi key khong ton tai.

**Kiem tra:** Neu `t()` tra ve key thay vi undefined/empty, can cap nhat logic fallback.

---

## FILES THAY DOI

| File | Action |
|------|--------|
| `src/contexts/LanguageContext.tsx` | Them 4 translation keys (2 VI + 2 EN) |

---

## TAC DONG SAU FIX

| UI Element | Truoc | Sau |
|------------|-------|-----|
| Page Title | "performance.hubTitle" | "Phân tích Hiệu suất" |
| Page Subtitle | "performance.hubSubtitle" | "So sánh kế hoạch vs thực tế..." |
| Browser Tab | "performance.hubTitle \| Bluecore" | "Phân tích Hiệu suất \| Bluecore" |

---

## THOI GIAN UOC TINH

~5 phut
