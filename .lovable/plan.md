
# Kế hoạch: Thêm 3 Screenshots MDP mới vào Sales Deck

## Tổng quan

Bạn đã upload 3 screenshots mới của MDP module, hiển thị các tính năng quan trọng:

| # | File | Tên | Nội dung |
|---|------|-----|----------|
| 1 | image-317 | `mdp-campaigns.png` | Campaigns Performance với Financial Truth, Profit ROAS -0.52x, Campaign table |
| 2 | image-318 | `mdp-channels.png` | Channel Health Matrix - Ma trận Scale/Stop theo Margin + Cash Score |
| 3 | image-319 | `mdp-audience.png` | Audience Insights - RFM Analysis (Champions, Loyal, At Risk, Hibernating) |

---

## Thay đổi

### 1. Copy 3 screenshots mới

```
public/screenshots/
├── ... (18 screenshots hiện có)
├── mdp-campaigns.png      ← NEW (image-317)
├── mdp-channels.png       ← NEW (image-318)  
└── mdp-audience.png       ← NEW (image-319)
```

### 2. Cập nhật MDP slide trong Sales Deck

**Phương án A: Thay thế screenshot hiện tại**
- Thay `mdp-profit-attribution.png` bằng `mdp-campaigns.png` (có đầy đủ Financial Truth + Campaign table)

**Phương án B: Thêm slide MDP mới (Recommended)**
- Tạo thêm 1 slide MDP chi tiết với 2 screenshots side-by-side:
  - `mdp-channels.png` (Channel Health Matrix)
  - `mdp-audience.png` (Audience RFM Analysis)

### 3. Files cần thay đổi

| File | Action |
|------|--------|
| `public/screenshots/mdp-campaigns.png` | COPY từ image-317 |
| `public/screenshots/mdp-channels.png` | COPY từ image-318 |
| `public/screenshots/mdp-audience.png` | COPY từ image-319 |
| `FullSystemSalesDeckPDF.tsx` | UPDATE - thêm/thay screenshots |
| `FullSystemSalesDeckPDF_EN.tsx` | UPDATE - tương tự với English |

---

## Kết quả mong đợi

### MDP Slide cập nhật

```
┌────────────────────────────────────┐
│  MODULE 2: MDP                     │
│  Marketing Data Platform           │
│                                    │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │   [Campaigns Screenshot]     │  │
│  │   Financial Truth + Table    │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│  Campaigns - Profit ROAS thật...   │
│                                    │
│  ┌─────────┐ ┌─────────┐          │
│  │Channel  │ │Audience │          │
│  │Matrix   │ │RFM      │          │
│  └─────────┘ └─────────┘          │
│                                    │
│  bluecore.vn                    6  │
└────────────────────────────────────┘
```

---

## Ước tính thời gian

| Task | Thời gian |
|------|-----------|
| Copy 3 screenshots | 2 phút |
| Update FullSystemSalesDeckPDF.tsx | 15 phút |
| Update FullSystemSalesDeckPDF_EN.tsx | 10 phút |
| **Tổng** | **~30 phút** |
