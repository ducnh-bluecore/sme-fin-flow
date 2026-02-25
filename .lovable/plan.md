

# Nang cap toan bo Layout theo phong cach Aniq UI

## Phan tich hien trang

Project hien co **7 layout files** va **3 mobile components** can duoc thong nhat:

| Layout | File | Vai tro |
|--------|------|---------|
| DashboardLayout | FDP - Sidebar dang toggle open/close |
| Sidebar | FDP sidebar content - Accordion nav |
| Header | FDP header |
| BluecoreCommandLayout | Command - Sidebar collapsible (72/260px) |
| ControlTowerLayout | Control Tower - Sidebar collapsible |
| CDPLayout | CDP - Sidebar toggle open/close |
| MDPLayout | MDP - Sidebar toggle open/close |
| AdminLayout | Super Admin panel |
| MobileBottomNav | Bottom tab bar |
| MobileHeader | Sticky top header |
| MobileDrawer | Right-side slide drawer |

## Van de hien tai

1. **Khong nhat quan**: Moi layout code sidebar/header rieng, co layout dung `width 280`, co cai dung `260`, co cai dung `72` khi collapse
2. **Sidebar style khac nhau**: FDP dung accordion expand, Command/CT dung flat list, CDP dung flat list, MDP dung section headers
3. **Header khac nhau**: Co layout co bell icon, co layout khong; co layout co QuickDateSelector, co layout khong
4. **Mobile components**: MobileDrawer hardcode nav items cua Control Tower, khong dynamic theo module dang dung
5. **Thieu Aniq UI patterns**: Sidebar chua co section labels ("MAIN", "MANAGEMENT", "RESOURCES"), chua co status dots, chua co search bar trong sidebar

## Thiet ke moi theo Aniq UI

Dua tren screenshot Aniq UI, cac diem chinh can ap dung:

```text
+---------------------------+----------------------------------------+
|  [S] StartUp              |  Deployments            [Search icon]  |
|---------------------------|----------------------------------------|
|  MAIN                     |  Dashboard Overview                    |
|    Overview               |  +----------+ +----------+ +--------+ |
|    Projects          12   |  | KPI Card | | KPI Card | | KPI    | |
|  > Deployments        3   |  +----------+ +----------+ +--------+ |
|                           |                                        |
|  MANAGEMENT               |  PROJECT    STATUS    TIME             |
|    Notifications      9   |  Frontend   * Live    2m ago           |
|    Team                   |  API Server * Building 5m ago          |
|    Settings               |  Database   * Failed  12m ago          |
|                           |                                        |
|  RESOURCES                |                                        |
|    Documentation          |                                        |
|    Support                |                                        |
|    Changelog              |                                        |
|    Logout                 |                                        |
+---------------------------+----------------------------------------+
```

### Cac thay doi cu the

#### 1. Tao Shared Layout Shell (`src/components/layout/AppShell.tsx`)
- Component dung chung cho **tat ca** layouts (FDP, Command, CT, CDP, MDP, Admin)
- Props: `navConfig`, `logo`, `subtitle`, `headerActions`
- Sidebar: 280px open / 72px collapsed (icon-only mode)
- Section labels uppercase nhu Aniq UI: "MAIN", "MANAGEMENT", etc.
- Active item: `bg-primary/15 text-primary` voi left border accent
- Badge counts: Pill badges ben phai nav items (nhu Aniq: "12", "3", "9")
- Bottom: Back to Portal + Logout

#### 2. Cap nhat Sidebar Design
- **Section headers**: Text uppercase, `text-[11px] font-semibold text-muted-foreground tracking-wider` (giong "MAIN", "MANAGEMENT" cua Aniq)
- **Active state**: `bg-primary/10` voi `border-l-2 border-primary` hoac filled background
- **Badge style**: `bg-muted text-foreground rounded-md px-2 py-0.5 text-xs` (giong Aniq "12", "3")
- **Hover**: `bg-white/5` subtle
- **Icon-only collapsed mode**: Chi hien icon + tooltip, khong hien text
- **Search bar**: Optional search input o dau sidebar (nhu Aniq co search icon)

#### 3. Cap nhat Header
- Thong nhat chieu cao `h-14`
- Backdrop blur: `bg-background/80 backdrop-blur-xl`
- Left: TenantSwitcher (hoac collapse toggle khi sidebar dong)
- Right: LanguageSwitcher + optional actions (bell, date selector)
- Border bottom: `border-b border-border`

#### 4. Cap nhat Mobile Components
- **MobileHeader**: Giu nguyen nhung dam bao consistent voi dark theme
- **MobileDrawer**: Nhan `navItems` tu props thay vi hardcode, them section labels
- **MobileBottomNav**: Cho phep truyen `items` tu props, active indicator dung primary color

#### 5. Cap nhat tung Layout file
Moi layout se import `AppShell` va chi can truyen config:

**FDP (DashboardLayout + Sidebar + Header):**
- Sections: "TONG QUAN", "PHAN TICH", "DOI SOAT", "NHAP LIEU", "KE HOACH"
- Accordion sub-items giu nguyen
- Header: TenantSwitcher + LanguageSwitcher + Bell

**Command (BluecoreCommandLayout):**
- Sections: "COMMAND CENTER", "OPERATIONS", "SYSTEM"
- Flat nav items
- Header: TenantSwitcher + LanguageSwitcher

**Control Tower (ControlTowerLayout):**
- Sections: "COMMAND", "MONITORING", "SYSTEM"
- Badge on Command item
- Header: TenantSwitcher + LanguageSwitcher + Bell

**CDP (CDPLayout):**
- Sections: "PHAN TICH", "QUAN TRI", "HE THONG"
- Flat nav items
- Header: TenantSwitcher + LanguageSwitcher

**MDP (MDPLayout):**
- Sections: "CMO MODE", "MARKETING MODE", "SYSTEM"
- Section headers expandable
- Header: TenantSwitcher + QuickDateSelector + LanguageSwitcher

**Admin (AdminLayout):**
- Sections: "MANAGEMENT", "SYSTEM"
- Super Admin badge
- Header: SUPER ADMIN label

#### 6. CSS Updates (`src/index.css`)
- Them `.sidebar-section-label` class cho section headers
- Them `.sidebar-nav-item` class thong nhat
- Them `.sidebar-badge` class cho count badges
- Dam bao tat ca su dung CSS variables da co

## Chi tiet ky thuat

### Files can tao moi:
1. `src/components/layout/AppShell.tsx` - Shared layout shell

### Files can cap nhat:
1. `src/components/layout/DashboardLayout.tsx` - Su dung AppShell
2. `src/components/layout/Sidebar.tsx` - Ap dung Aniq section labels + badge style
3. `src/components/layout/Header.tsx` - Thong nhat style
4. `src/components/layout/BluecoreCommandLayout.tsx` - Su dung AppShell pattern
5. `src/components/layout/ControlTowerLayout.tsx` - Su dung AppShell pattern
6. `src/components/layout/CDPLayout.tsx` - Su dung AppShell pattern
7. `src/components/layout/MDPLayout.tsx` - Su dung AppShell pattern
8. `src/components/layout/AdminLayout.tsx` - Su dung AppShell pattern
9. `src/components/mobile/MobileBottomNav.tsx` - Dynamic nav items
10. `src/components/mobile/MobileHeader.tsx` - Consistent dark theme
11. `src/components/mobile/MobileDrawer.tsx` - Dynamic nav items + section labels
12. `src/index.css` - Them sidebar utility classes
13. `src/components/shared/PageHeader.tsx` - Dong bo style

### Ket qua mong doi:
- Tat ca 6 modules (FDP, Command, CT, CDP, MDP, Admin) co **giao dien sidebar/header dong nhat**
- Section labels uppercase style Aniq UI
- Badge counts dong nhat
- Collapse/expand sidebar hoat dong giong nhau o moi module
- Mobile experience nhat quan
- Dark glassmorphism duoc ap dung toan bo

