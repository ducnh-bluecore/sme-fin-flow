
# Nang Cap UI Design System - Command Module

## Muc tieu
Nang cap chat luong visual cua Command module (Overview, Assortment, Clearance) len muc chuyen nghiep hon, lay cam hung tu template Ixartz ve spacing, card design, typography, va micro-interactions. Giu nguyen chuc nang va data logic, chi thay doi lop presentation.

## Phan tich hien trang

**Van de chinh:**
1. **Cards qua phang** - KPI cards chi dung `bg-card` + `border`, thieu gradient border, thieu glow effect, thieu depth
2. **Spacing chat** - Padding trong cards (p-5, pt-5 pb-4) qua nho, khoang cach giua cac section chua du "tho"
3. **Typography don dieu** - Tat ca heading dung cung weight/size, thieu hierarchy ro rang giua label/value/subtitle
4. **Thieu micro-interactions** - Chi co fade-in co ban, thieu hover glow, thieu scale effect, thieu shimmer cho loading
5. **HealthStrip qua day dac** - 12-column grid nhoi qua nhieu metric, kho scan nhanh
6. **DecisionFeed thieu contrast** - Cac signal card dung background opacity qua thap, kho phan biet

## Ke hoach thuc hien (3 phases)

### Phase 1: Design System Foundation
**Files thay doi:** `src/index.css`, `tailwind.config.ts`

- Them CSS classes moi cho "premium card" voi gradient border effect (1px gradient border quanh card)
- Them `.card-glow-hover` class - hover thi card phat sang nhe (box-shadow transition)
- Tang spacing tokens: them utility classes cho padding lon hon (p-6, p-8 cho KPI cards)
- Them keyframe animation `shimmer` cho loading states
- Them `.metric-value` class voi font-size lon hon, font-weight 800, letter-spacing tighter
- Them `.metric-label` class voi uppercase, tracking-wider, font-size 11px
- Them gradient background classes cho severity (critical/warning/success) dep hon

### Phase 2: Component Upgrades
**Files thay doi chính:**

#### 2a. KPI Cards - `CommandOverviewPage.tsx`
- Tang padding: `pt-5 pb-4` -> `p-6`
- Them gradient border (subtle) cho moi card
- Icon background: rounded-lg -> rounded-xl, tang size icon
- Value text: `text-2xl font-bold` -> `text-3xl font-black tracking-tight`
- Label text: them `uppercase tracking-wider text-[11px]`
- Them hover effect: scale(1.02) + glow shadow transition
- Them subtle gradient bg cho card (dark -> slightly lighter)

#### 2b. HealthStrip - `HealthStrip.tsx`
- Chuyen tu 12-col grid sang layout 2 phan: left (health score + status) va right (scrollable metrics)
- Health score: tang len `text-6xl` voi gradient text effect
- Metric tiles: them border-left color-coded, tang padding
- "Neu Hanh Dong" section: them gradient bg card rieng, noi bat hon
- Them subtle pulse animation cho status badge khi CRITICAL

#### 2c. DecisionFeed - `DecisionFeed.tsx`
- Tang padding tu `p-3` -> `p-4`
- Them backdrop blur cho expanded panel
- Health score (goc phai): them circular progress ring background
- Size badges: tang kich thuoc tu `h-4` -> `h-5`, them hover tooltip
- Narrative text: bo italic, tang font-size, them border-left accent
- Them transition animation cho expand/collapse (framer-motion AnimatePresence)

#### 2d. ActionImpactPanel - `ActionImpactPanel.tsx`
- "Gia Tri Cuu Duoc" section: them gradient bg (emerald gradient) dep hon
- Value display: tang size, them animated counter effect
- Top destinations: them numbered circle badges thay vi plain text
- Them hover highlight cho destination rows

### Phase 3: Micro-interactions & Polish
**Files thay doi:**

#### 3a. Staggered animations
- KPI cards: stagger delay 80ms (hien tai 50ms), them scale effect
- Decision signals: stagger vao tu left-to-right
- Tab content: fade + slide-up transition khi switch tab

#### 3b. Hover & Focus states
- Tat ca interactive cards: `transition-all duration-300` (hien tai 200ms)
- Them `hover:border-primary/30` cho cards
- Them `focus-visible:ring-2 ring-primary/50` cho accessibility

#### 3c. Loading states
- Thay Skeleton (`h-12 w-full`) bang shimmer cards co hinh dang tuong tu real content
- HealthStrip loading: shimmer voi gradient animation

## Khong thay doi
- Khong thay doi data fetching logic
- Khong thay doi hooks (useSizeControlTower, useClearanceCandidates, etc.)
- Khong thay doi routing
- Khong thay doi business logic trong components

## Uu tien thuc hien
1. Phase 1 (CSS foundation) -> lam truoc de cac component dung ngay
2. Phase 2a + 2b (Overview + HealthStrip) -> impact lon nhat, nhin thay ngay
3. Phase 2c + 2d (DecisionFeed + ActionImpact) -> chi tiet hon
4. Phase 3 (micro-interactions) -> polish cuoi cung

## Chi tiet ky thuat

### CSS Variables moi (them vao index.css)
```text
--gradient-card: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)
--gradient-border: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))
--glow-primary: 0 0 30px -8px hsl(var(--primary) / 0.3)
--glow-success: 0 0 30px -8px hsl(var(--success) / 0.3)
--glow-warning: 0 0 30px -8px hsl(var(--warning) / 0.3)
```

### Shimmer Keyframe
```text
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Card Gradient Border Pattern
```text
.premium-card {
  position: relative;
  background: var(--gradient-card);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
}
.premium-card::before {
  /* gradient border overlay */
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 13px;
  padding: 1px;
  background: var(--gradient-border);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
}
```

## So luong files can sua
- `src/index.css` - them ~60 dong CSS moi
- `tailwind.config.ts` - them 2-3 animations
- `src/pages/command/CommandOverviewPage.tsx` - sua UI markup
- `src/components/command/SizeControlTower/HealthStrip.tsx` - sua layout + styling
- `src/components/command/SizeControlTower/DecisionFeed.tsx` - sua spacing + animations
- `src/components/command/SizeControlTower/ActionImpactPanel.tsx` - sua styling
- `src/pages/command/ClearancePage.tsx` - ap dung card styling moi

Tong cong: ~7 files, khong them file moi, khong thay doi logic.
