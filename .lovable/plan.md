
# VC Pitch Deck - 12 Slides Tương tác (Song ngữ Việt-Anh)

## Tổng quan

Tạo **2 trang presentation tương tác** cho VC Pitch Deck:
1. **Tiếng Anh**: `/investor/vc-pitch` - Dành cho pitch với VC quốc tế
2. **Tiếng Việt**: `/investor/vc-pitch-vi` - Dành cho pitch với VC Việt Nam

Deck này được thiết kế để pitch với nhà đầu tư Series A, tập trung vào **category claim** thay vì product demo.

---

## Cấu trúc 12 Slides

| # | Slide | Headline (EN) | Headline (VI) | Mục tiêu |
|---|-------|---------------|---------------|----------|
| 1 | Category Claim | The Financial Awareness Layer for Modern Commerce | Tầng Nhận thức Tài chính cho Thương mại Hiện đại | Claim category trong 5 giây |
| 2 | Inevitable Shift | Companies Don't Fail From Lack of Data. They Fail From Delayed Financial Truth | Doanh nghiệp không thất bại vì thiếu data. Họ thất bại vì sự thật tài chính đến muộn | Định vị macro shift |
| 3 | Broken Stack | The Modern Data Stack Was Not Built for Decision Makers | Data Stack hiện đại không được xây cho người ra quyết định | Chỉ ra missing layer |
| 4 | Introducing Category | Bluecore is the Financial Decision OS | Bluecore là Hệ điều hành Quyết định Tài chính | Define category |
| 5 | Why Now | The Awareness Era Has Begun | Kỷ nguyên Nhận thức đã bắt đầu | 3 forces driving change |
| 6 | Product as Infrastructure | The Control Layer for Financial Reality | Tầng kiểm soát cho Sự thật Tài chính | Architecture story |
| 7 | What Makes This Hard | Financial Awareness Is a Deep Systems Problem | Nhận thức Tài chính là bài toán hệ thống phức tạp | Defensibility |
| 8 | Early Signal | Once Leadership Trusts the System - It Becomes Mission Critical | Khi lãnh đạo tin tưởng hệ thống - Nó trở thành sống còn | Traction signal |
| 9 | Market | Every Margin-Sensitive Company Will Need a Financial Awareness Layer | Mọi doanh nghiệp nhạy cảm với margin sẽ cần một Tầng Nhận thức Tài chính | TAM/SAM story |
| 10 | Moat | Awareness Compounds | Nhận thức cộng hưởng | 4 moat layers |
| 11 | Vision Scale | Financial Awareness Will Become Default Infrastructure | Nhận thức Tài chính sẽ trở thành hạ tầng mặc định | Big vision |
| 12 | Company Building | Bluecore Is Building the Financial Control Plane for Commerce | Bluecore đang xây dựng Tầng kiểm soát Tài chính cho Thương mại | Closing |

---

## Design System

### Visual Style
- **Background**: Slate-950 (dark mode premium)
- **Accent Colors**: 
  - Blue-400/500 cho category language
  - Emerald-400 cho positive signals
  - Amber-400 cho caution/old world
- **Typography**:
  - Headlines: text-5xl to text-6xl, font-bold
  - Sub-headlines: text-2xl to text-3xl, font-light
  - Body: text-lg to text-xl
  - Punchlines: italic, slate-400, border-l-4 style

### Presenter Notes Panel
- Toggle với icon MessageSquareText hoặc keyboard shortcut (N)
- Hiển thị "Founder Tip" và talking points cho mỗi slide
- Slide 1 có note đặc biệt: "Pause. Let it land."

### Navigation
- Arrow keys (← →) để chuyển slide
- Progress indicator dots ở bottom
- Slide counter (e.g., "3 / 12")
- Click vào slide để next

---

## Files sẽ tạo

```text
src/pages/investor/
├── VCPitchDeck.tsx          # English version
└── VCPitchDeckVI.tsx        # Vietnamese version
```

---

## Component Structure

```text
VCPitchDeck / VCPitchDeckVI
├── Navigation (back to portal, language switch)
├── SlideContainer
│   ├── Slide01CategoryClaim
│   ├── Slide02InevitableShift
│   ├── Slide03BrokenStack (với ASCII diagram)
│   ├── Slide04IntroducingCategory
│   ├── Slide05WhyNow (3 forces grid)
│   ├── Slide06ProductInfrastructure (architecture flow)
│   ├── Slide07WhatMakesHard
│   ├── Slide08EarlySignal (metrics)
│   ├── Slide09Market (wedge → horizontal diagram)
│   ├── Slide10Moat (4 layers)
│   ├── Slide11VisionScale
│   └── Slide12CompanyBuilding
├── PresenterNotesPanel (collapsible)
└── SlideNavigation (dots + arrows + keyboard)
```

---

## Diagrams đặc biệt

### Slide 3 - Broken Stack (ASCII/Visual)
```text
┌─────────────────────────────────────────────┐
│     ERP  →  CRM  →  BI  →  Analytics        │
│                    ↓                         │
│              Operators                       │
│              Analysts                        │
│                                              │
│     ═══════════════════════════════════     │
│            MISSING LAYER                     │
│       EXECUTIVE AWARENESS                    │
│     ═══════════════════════════════════     │
└─────────────────────────────────────────────┘
```

### Slide 6 - Architecture Flow
```text
┌────────────────────┐
│   Data sources     │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│ Unified financial  │
│      truth         │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│  Decision engine   │
└─────────┬──────────┘
          ↓
┌────────────────────┐
│  Executive alerts  │
└────────────────────┘
```

### Slide 9 - Market Wedge
```text
Start narrow:  [Retail / Ecommerce]
        ↓
Expand:        [Multi-brand] [Consumer] [Marketplaces]
        ↓
Mid-market:    [All Margin-Sensitive Companies]
```

### Slide 10 - 4 Moat Layers
```text
┌─────────────────────────────────────────────┐
│  1. Semantic Standard                        │
├─────────────────────────────────────────────┤
│  2. Decision Dataset                         │
├─────────────────────────────────────────────┤
│  3. Organizational Trust                     │
├─────────────────────────────────────────────┤
│  4. Executive Workflow Lock-in               │
└─────────────────────────────────────────────┘
```

---

## Presenter Notes Data

### English Version
```typescript
const presenterNotes = {
  1: {
    tip: "We are not building a better dashboard. We are building the system CEOs rely on to understand financial reality — every morning.",
    action: "Pause. Let it land."
  },
  2: {
    tip: "VC invest vào shifts. Không invest vào tools.",
    action: "Frame Bluecore as response to a macro shift."
  },
  3: {
    tip: "Leadership teams still operate without a system designed to answer: 'Are we financially safe right now?'",
    action: "Point to the missing layer."
  },
  // ... slides 4-12
  12: {
    tip: "We are not building a tool. We are building the system companies rely on to stay alive.",
    action: "Pause. End deck. Let silence work."
  }
};
```

### Vietnamese Version
```typescript
const presenterNotesVI = {
  1: {
    tip: "Chúng tôi không xây dashboard tốt hơn. Chúng tôi xây hệ thống mà CEO dựa vào để hiểu sự thật tài chính — mỗi sáng.",
    action: "Dừng. Để câu nói thấm."
  },
  // ... tương tự cho các slides khác
};
```

---

## Routing (App.tsx updates)

```typescript
// Lazy load new pages
const VCPitchDeck = lazy(() => import("./pages/investor/VCPitchDeck"));
const VCPitchDeckVI = lazy(() => import("./pages/investor/VCPitchDeckVI"));

// Add routes
<Route path="/investor/vc-pitch" element={
  <ProtectedRoute>
    <VCPitchDeck />
  </ProtectedRoute>
} />
<Route path="/investor/vc-pitch-vi" element={
  <ProtectedRoute>
    <VCPitchDeckVI />
  </ProtectedRoute>
} />
```

---

## Sales Deck Library Page Updates

Thêm mục mới trong phần "Phiên bản Tương tác":

```tsx
{/* VC Pitch Decks */}
<Button asChild variant="outline" className="...">
  <Link to="/investor/vc-pitch">
    <div className="text-left">
      <div className="font-semibold text-white">VC Pitch Deck (EN)</div>
      <div className="text-xs text-slate-400">Series A presentation - 12 slides</div>
    </div>
  </Link>
</Button>

<Button asChild variant="outline" className="...">
  <Link to="/investor/vc-pitch-vi">
    <div className="text-left">
      <div className="font-semibold text-white">VC Pitch Deck (VI)</div>
      <div className="text-xs text-slate-400">Bản trình bày Series A - 12 slides</div>
    </div>
  </Link>
</Button>
```

---

## Key Features của mỗi phiên bản

### Cả 2 phiên bản đều có:
- Fullscreen slide view với dark premium design
- Keyboard navigation (← → N)
- Progress dots ở bottom
- Presenter notes toggle panel
- Language switcher button (EN ↔ VI)
- Print/Export PDF button
- Back to Portal navigation

### Điểm khác biệt:
| Feature | English | Vietnamese |
|---------|---------|------------|
| Headlines | English | Tiếng Việt |
| Sub-headlines | English | Tiếng Việt |
| Presenter notes | English | Tiếng Việt |
| Punchlines | English | Tiếng Việt |
| Navigation labels | "Back to Portal" | "Quay lại Portal" |

---

## Phần kỹ thuật

### Dependencies sử dụng (đã có sẵn)
- `react-router-dom` cho navigation
- `lucide-react` cho icons
- `framer-motion` cho slide transitions (optional)
- `react-helmet-async` cho SEO

### Keyboard Handlers
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'n' || e.key === 'N') toggleNotes();
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentSlide]);
```

---

## Deliverables

1. **VCPitchDeck.tsx** - English version (12 slides)
2. **VCPitchDeckVI.tsx** - Vietnamese version (12 slides)
3. **App.tsx updates** - 2 new routes
4. **SalesDeckLibraryPage.tsx updates** - Links to both versions

---

## Estimated Time

- VCPitchDeck.tsx (EN): ~25 phút
- VCPitchDeckVI.tsx (VI): ~20 phút (copy + translate)
- App.tsx routing: ~5 phút
- SalesDeckLibraryPage updates: ~5 phút
- **Tổng: ~55 phút**
