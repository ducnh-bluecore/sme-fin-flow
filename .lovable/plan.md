
# Fix Font Issues + Upgrade FDP Sales Deck

## Problem Analysis

### 1. Font Loading Error (Critical)
Current registration uses relative path:
```typescript
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 400 },  // WRONG
  ],
});
```

Browser/PDF renderer cần **absolute URL**. Phải dùng `window.location.origin` hoặc hardcode URL.

### 2. Emoji Not Rendering
Icons như `📊`, `💰`, `📦`, `🔮` không có trong Noto Sans font. PDF renderer không thể render emojis.

**Solution:** Thay emoji bằng text labels hoặc số thứ tự.

---

## Technical Fix Plan

### File: `src/components/sales-deck/FDPSalesDeckPDF.tsx`

**Change 1: Dynamic Font URL**
```typescript
// Get base URL dynamically for font loading
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

Font.register({
  family: 'NotoSans',
  fonts: [
    { src: `${getBaseUrl()}/fonts/NotoSans-Regular.ttf`, fontWeight: 400 },
    { src: `${getBaseUrl()}/fonts/NotoSans-Bold.ttf`, fontWeight: 700 },
  ],
});
```

**Change 2: Replace Emojis with Text Labels**
```typescript
// BEFORE
{ icon: '📊', title: 'Single Source of Truth Dashboard' }

// AFTER (use numbered badges or simple text)
{ icon: 'A', title: 'Single Source of Truth Dashboard' }
// Or simple styled circles with numbers
```

---

## New Content: 2 New Slides

### Slide: "Tai sao can Bluecore?" (Why Bluecore?)

| Pain Point | Problem | Solution |
|------------|---------|----------|
| Data Fragmented | Data nam rai rac tren nhieu he thong | Single Source of Truth |
| Bao cao cham | Mat 3-5 ngay de dong bao cao | Realtime dashboard |
| Quyet dinh mu | Thieu data khi can quyet dinh | Decision-first platform |
| Khong biet cash thuc | Chi biet doanh thu, khong biet tien that | Real Cash Tracking |
| SKU lo ma van ban | Khong biet unit economics | Unit Economics Engine |

### Slide: "So sanh voi doi thu" (Competitive Comparison)

| Feature | Excel | ERP | BI Tools | Bluecore FDP |
|---------|-------|-----|----------|--------------|
| Setup time | Ngay | Thang | Tuan | Gio |
| Real cash tracking | Khong | Co mot phan | Khong | Day du |
| Unit economics | Thu cong | Khong | Co mot phan | Tu dong |
| Decision support | Khong | Khong | Charts only | Decision-first |
| CEO/CFO focus | Khong | Ke toan focus | IT focus | CEO/CFO focus |

---

## Updated Slide Order (Total: 9 slides)

| # | Slide | Background |
|---|-------|------------|
| 1 | Cover | Dark blue + ornaments |
| 2 | **Tai sao can Bluecore (NEW)** | White + gradient accent |
| 3 | **So sanh doi thu (NEW)** | Light background + table |
| 4 | FDP Manifesto | White |
| 5 | Core Capabilities | White + cards |
| 6 | Chuc nang Chi tiet | White |
| 7 | Quy trinh Quyet dinh | White + blue CTA box |
| 8 | Do luong Ket qua | White |
| 9 | Contact/CTA | Dark blue + ornaments |

---

## Visual Design Improvements

### Varied Backgrounds
- **Slide 2 (Why Bluecore):** Light gradient from white to slate-50, with colored accent bar on left
- **Slide 3 (Comparison):** White background with a highlight row for Bluecore column
- **Feature cards:** Alternate between white and light blue backgrounds

### Icon Replacement Strategy
Instead of emojis, use:
- **Letter badges:** A, B, C, D in colored circles
- **Or number badges:** 01, 02, 03, 04

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/sales-deck/FDPSalesDeckPDF.tsx` | Fix font URL, remove emojis, add 2 new slides, improve visual design |

---

## Expected Outcome

1. Vietnamese text renders correctly on all slides
2. No broken emoji characters
3. More compelling sales story with "Why Bluecore" and competitor comparison
4. Better visual variety with alternating backgrounds and accent colors
