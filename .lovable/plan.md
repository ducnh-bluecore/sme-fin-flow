
# Kế hoạch: Export Toàn bộ Bluecore Design System

## Tổng quan những gì sẽ được Export

| Category | Nội dung | Format |
|----------|----------|--------|
| **Design Tokens** | Colors, Shadows, Typography, Spacing | JSON (Figma-compatible) |
| **CSS Variables** | Full CSS custom properties | Standalone CSS file |
| **Tailwind Preset** | Complete Tailwind config | TypeScript module |
| **Component Library** | All UI components | React + TypeScript |
| **Chart System** | Chart config & components | TypeScript |
| **Formatters** | Vietnamese locale utilities | TypeScript |
| **Documentation** | Visual preview + usage guide | HTML page |

---

## Chi tiết Export Files

### 1. Design Tokens (JSON)
```
bluecore-design-tokens.json
```
- **Brand Colors**: Bluecore palette (50-900)
- **Semantic Colors**: Primary, Secondary, Success, Warning, Destructive, Info
- **Surface Colors**: Background, Card, Popover, Sidebar
- **Shadows**: xs, sm, md, lg, card, elevated
- **Typography**: Font family, sizes, weights
- **Spacing & Radius**: Border radius values
- **Chart Colors**: 5-color palette

### 2. CSS Variables (Standalone)
```
bluecore-theme.css
```
- All `:root` variables from `index.css`
- Component classes: `.decision-card`, `.data-card`, `.kpi-card`, `.status-badge`
- Utility classes: `.vnd-value`, `.format-vnd`, animations
- No Tailwind dependency - pure CSS

### 3. Tailwind Preset
```
bluecore-tailwind-preset.ts
```
- Complete `theme.extend` configuration
- Custom colors, shadows, animations, keyframes
- Plugin dependencies listed
- Ready for `npm install` usage

### 4. React Component Library
```
bluecore-components/
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Input.tsx
│   └── ... (50+ components)
├── shared/
│   ├── StatCard.tsx
│   ├── StatusIndicator.tsx
│   ├── AnimatedComponents.tsx
│   ├── CrossModuleBadge.tsx
│   └── ...
├── charts/
│   ├── ChartComponents.tsx
│   └── chartConfig.ts
└── index.ts
```

### 5. Utilities & Formatters
```
bluecore-utils/
├── formatters.ts    # VND, date, percent formatting
├── cn.ts            # className utility
└── index.ts
```

### 6. Theme Documentation Page
```
/theme-export (new route)
```
- Live preview of all colors
- Component showcase
- Copy-paste code snippets
- Download buttons for all files

---

## Implementation Details

### File: `src/lib/theme-export.ts`
Generates all export formats programmatically:

```text
+------------------+
| Design Tokens    |
| (Source of Truth)|
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+-------+  +-------+
|  CSS  |  |Tailwind|
+-------+  +-------+
    |         |
    +----+----+
         |
         v
  +-------------+
  | Components  |
  +-------------+
```

### File: `src/pages/ThemeExportPage.tsx`
UI for viewing and downloading:
- Color palette grid with hex/HSL values
- Typography scale preview
- Component gallery
- Download buttons (JSON, CSS, TS, ZIP)
- Copy buttons for quick snippets

### File: `src/components/theme-export/`
- `ColorPalettePreview.tsx` - Visual color swatches
- `ComponentShowcase.tsx` - Live component demos
- `ExportDownloadButtons.tsx` - Download handlers
- `CodePreview.tsx` - Syntax-highlighted code blocks

---

## Export Formats - Chi tiết

### Design Tokens JSON (Figma-compatible)
```json
{
  "$schema": "https://design-tokens.github.io/community-group/format",
  "bluecore": {
    "50": { "$value": "#f5f8fc", "$type": "color" },
    "500": { "$value": "#3b6cd4", "$type": "color" }
  },
  "semantic": {
    "primary": { "$value": "{bluecore.500}", "$type": "color" },
    "success": { "$value": "#1b9d5d", "$type": "color" }
  },
  "shadow": {
    "card": { "$value": "0 1px 3px 0 rgb(0 0 0 / 0.04)", "$type": "shadow" }
  }
}
```

### Standalone CSS
```css
:root {
  /* Bluecore Brand */
  --bluecore-50: #f5f8fc;
  --bluecore-500: #3b6cd4;
  
  /* Semantic */
  --color-primary: var(--bluecore-500);
  --color-success: #1b9d5d;
  
  /* Shadows */
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.04);
}

.decision-card { /* ... */ }
.kpi-card { /* ... */ }
```

### Tailwind Preset
```typescript
export const bluecorePreset = {
  theme: {
    extend: {
      colors: {
        bluecore: { /* palette */ },
        primary: { /* semantic */ },
      },
      boxShadow: { /* shadows */ },
      animation: { /* keyframes */ },
    }
  }
}
```

---

## Route & Navigation

| Route | Purpose |
|-------|---------|
| `/theme-export` | Main export page with all options |

Page sections:
1. **Overview** - Design system summary
2. **Colors** - All palettes with values
3. **Components** - Live component demos
4. **Downloads** - All format options
5. **Usage Guide** - How to use in other projects

---

## Files to Create

| File | Description |
|------|-------------|
| `src/lib/theme-export.ts` | Theme data generators |
| `src/pages/ThemeExportPage.tsx` | Main export UI page |
| `src/components/theme-export/ColorPalettePreview.tsx` | Color grid component |
| `src/components/theme-export/ComponentShowcase.tsx` | Component demos |
| `src/components/theme-export/ExportDownloadButtons.tsx` | Download handlers |
| `src/components/theme-export/CodePreview.tsx` | Code display |
| `src/components/theme-export/index.ts` | Exports barrel |
| Update `App.tsx` | Add route `/theme-export` |

---

## Download Options

| Button | Format | Content |
|--------|--------|---------|
| **JSON Tokens** | `.json` | Figma-compatible design tokens |
| **CSS Variables** | `.css` | Standalone CSS theme |
| **Tailwind Preset** | `.ts` | Tailwind configuration |
| **Components** | `.zip` | Full React component library |
| **Formatters** | `.ts` | VND/date utilities |
| **Full Package** | `.zip` | Everything bundled |

---

## Kết quả Mong đợi

Sau khi implement:
1. Truy cập `/theme-export` để xem toàn bộ design system
2. Preview tất cả colors, components trực quan
3. Download từng format riêng lẻ hoặc full package
4. Copy code snippets trực tiếp từ UI
5. Sử dụng design tokens trong Figma
6. Import Tailwind preset vào project khác
7. Copy CSS variables vào bất kỳ project nào

