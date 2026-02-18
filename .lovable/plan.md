
# Redesign Toàn Bộ Project: Dark Theme Glassmorphism

## Hiểu đúng vấn đề

Project hiện tại có **7 layouts + 70+ pages**. Nếu đổi từng file sẽ tốn hàng trăm lần chỉnh sửa. Cách đúng: **thay đổi tại gốc — CSS Design Tokens trong `src/index.css`** và **Tailwind config**. Khi đó toàn bộ project tự động đổi màu theo.

Kiến trúc hiện tại dùng CSS variables (`--background`, `--card`, `--foreground`, `--sidebar-background`...) được dùng ở KHẮP NƠI. Đây là điểm đòn bẩy duy nhất.

---

## Phân tích template bạn upload

Template Aniq/Next.js dùng:
- **Background**: `#0a0a0a` / `#111111` (near-black)
- **Cards**: `rgba(255,255,255,0.04)` — glass trên nền dark
- **Borders**: `rgba(255,255,255,0.08)` — subtle white borders
- **Text primary**: `#ffffff` / `#f0f0f0`
- **Text muted**: `rgba(255,255,255,0.45)`
- **Accent**: Gradient blue `#3b82f6` → indigo `#6366f1`
- **Success**: Emerald `#10b981`
- **Warning**: Amber `#f59e0b`
- **Danger**: Rose `#f43f5e`

---

## Chiến lược thay đổi: 3 tầng

```text
TẦNG 1 — CSS Variables (1 file, ảnh hưởng 100% project)
  src/index.css → đổi :root dark theme

TẦNG 2 — Layout Shells (7 files, ảnh hưởng sidebar/header)
  DashboardLayout → Sidebar, Header
  ControlTowerLayout → sidebar dark glass
  BluecoreCommandLayout → sidebar dark glass
  MDPLayout → sidebar dark glass
  CDPLayout → sidebar dark glass
  AuthPage → dark glassmorphism card

TẦNG 3 — Portal Hub (1 file, trang quan trọng nhất)
  PortalPage → full dark immersive redesign
```

---

## Thay đổi cụ thể

### TẦNG 1: `src/index.css` — Dark Design System

Đổi `:root` từ light sang dark:

```css
:root {
  /* Background: near-black slate */
  --background: 222 47% 7%;        /* #0c1120 — deep navy-black */
  --foreground: 213 31% 91%;       /* #dce4f0 — soft white */

  /* Cards: dark glass */
  --card: 222 40% 10%;             /* #111827 — elevated dark */
  --card-foreground: 213 31% 91%;

  /* Sidebar: deeper dark */
  --sidebar-background: 222 50% 5%;  /* #07090f */
  --sidebar-foreground: 213 31% 80%;

  /* Primary: Bluecore signature blue */
  --primary: 221 83% 63%;           /* #4f8ef7 — brighter for dark bg */
  --primary-foreground: 0 0% 100%;

  /* Borders: subtle white glass */
  --border: 222 30% 18%;            /* rgba white ~8% */
  --input: 222 30% 15%;

  /* Muted: dark gray */
  --muted: 222 35% 13%;
  --muted-foreground: 213 20% 55%;

  /* Success, Warning, Danger — brighter for dark bg */
  --success: 152 70% 45%;
  --warning: 38 95% 55%;
  --destructive: 0 80% 62%;
}
```

Bổ sung utility classes mới trong `@layer components`:
```css
/* Glass card — dùng thay cho bg-card thông thường */
.glass-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

/* Glass card hover */
.glass-card-hover:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.14);
}

/* Gradient text */
.gradient-text {
  background: linear-gradient(135deg, #60a5fa, #818cf8, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### TẦNG 2A: `src/components/layout/Sidebar.tsx` — Dark Sidebar

Sidebar hiện dùng `bg-card border-r border-border` — sau khi đổi CSS vars sẽ tự thành dark. Cần thêm:
- Logo area: gradient icon
- Nav active state: `bg-white/8 text-white` thay vì `bg-primary/10 text-primary`
- Nav hover: `hover:bg-white/5`
- Group headers: `text-white/40` uppercase tracking
- Child links: `text-white/60 hover:text-white`
- Bottom section: glass divider

### TẦNG 2B: `src/components/layout/Header.tsx` — Dark Header

Hiện: `bg-card border-b border-border` → sau CSS vars tự dark.
Thêm: `backdrop-blur-xl bg-background/80` cho sticky header effect.

### TẦNG 2C: `src/components/layout/ControlTowerLayout.tsx`

Sidebar: `bg-card border-r` → tự dark.
Nav active: đổi `bg-primary/10 text-primary border border-primary/20` → `bg-white/8 text-white border border-white/10`.

### TẦNG 2D: `src/components/layout/BluecoreCommandLayout.tsx`

Tương tự ControlTower — cập nhật active/hover states.

### TẦNG 2E: `src/components/layout/MDPLayout.tsx`

Cập nhật active/hover states trong sidebar navigation.

### TẦNG 2F: `src/pages/AuthPage.tsx` — Dark Login

Đổi background: `from-background via-background to-primary/5` → giữ nguyên (sẽ tự dark).
Card: thêm `glass-card` class.
Input fields: `bg-white/5 border-white/10 text-white placeholder:text-white/30`.

### TẦNG 3: `src/pages/PortalPage.tsx` — Dark Hub Redesign

Full redesign như đã plan trước:
- Background: ambient gradient radial
- Hero tagline section
- Module cards: glassmorphism với per-module glow
- Data Warehouse hub: dark glass với glow ring
- System overview: dark glass panel
- Footer: principles strip

---

## Files cần thay đổi (theo thứ tự)

| # | File | Loại thay đổi | Impact |
|---|------|---------------|--------|
| 1 | `src/index.css` | CSS Variables dark theme | **100% project** |
| 2 | `src/components/layout/Sidebar.tsx` | Nav active/hover states | FDP sidebar |
| 3 | `src/components/layout/Header.tsx` | Backdrop blur, icon states | FDP header |
| 4 | `src/components/layout/ControlTowerLayout.tsx` | Nav states | CT sidebar |
| 5 | `src/components/layout/BluecoreCommandLayout.tsx` | Nav states | Command sidebar |
| 6 | `src/components/layout/MDPLayout.tsx` | Nav states | MDP sidebar |
| 7 | `src/pages/AuthPage.tsx` | Glass card, dark inputs | Login page |
| 8 | `src/pages/PortalPage.tsx` | Full dark redesign | Portal hub |

**Không cần sửa**: CDPLayout (ít dùng), tất cả 70+ page files (tự thay đổi qua CSS vars), DashboardLayout (wrapper chỉ).

---

## Kết quả trực quan

| Trước | Sau |
|-------|-----|
| `bg-background` = `hsl(220 20% 97%)` — light gray | `bg-background` = `hsl(222 47% 7%)` — near-black |
| `bg-card` = `hsl(0 0% 100%)` — white | `bg-card` = `hsl(222 40% 10%)` — dark glass |
| `border-border` = light gray | `border-border` = subtle white ~8% |
| `text-muted-foreground` = gray | `text-muted-foreground` = white/55% |
| Sidebar: dark navy (sidebar-background) | Sidebar: deeper dark |
| Cards: white with shadows | Cards: dark glass with glow |

---

## Lưu ý quan trọng

- **Tất cả data/logic/hooks**: Giữ nguyên 100% — chỉ thay visual layer
- **CDPLayout**: Có layout riêng nhưng ít critical — có thể update sau
- **AdminLayout**: Ít người dùng — cũng có thể update sau
- **Charts/Recharts**: Sẽ tự adapt theo text color từ CSS vars
- **Shadcn components** (Button, Card, Badge, Input...): Tất cả dùng CSS vars → tự dark
