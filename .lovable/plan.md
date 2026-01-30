
# Customer Journey: Hệ thống Onboarding Toàn diện

## Tổng quan Kiến trúc 3 Lớp

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     BLUECORE ONBOARDING SYSTEM                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LAYER 1: PLATFORM                LAYER 2: TENANT                   │
│  ┌────────────────────┐          ┌────────────────────┐             │
│  │ 👋 Welcome         │          │ 🏢 Company Profile │             │
│  │ 👤 Role Selection  │    →     │ 📊 Industry/Scale  │             │
│  │ 🎯 Dashboard Intro │          │ 🔌 Data Sources    │             │
│  └────────────────────┘          └────────────────────┘             │
│            │                              │                          │
│            └──────────────┬───────────────┘                         │
│                           ▼                                          │
│                    ┌──────────────┐                                 │
│                    │  Portal Hub  │                                 │
│                    └──────┬───────┘                                 │
│                           │                                          │
│            ┌──────────────┼──────────────┐                          │
│            ▼              ▼              ▼                          │
│   LAYER 3: MODULE   ┌─────────┐   ┌─────────┐                       │
│   ┌─────────┐       │   MDP   │   │   CDP   │                       │
│   │   FDP   │       │ Wizard  │   │ Wizard  │                       │
│   │ Wizard  │       └─────────┘   └─────────┘                       │
│   └─────────┘                                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Customer Journey Chi tiết

### Giai đoạn 1: Đăng ký → Platform Onboarding

| Bước | Màn hình | Mục đích | Dữ liệu thu thập |
|------|----------|----------|------------------|
| 1.1 | Welcome Screen | Chào mừng, giới thiệu nhanh Bluecore | - |
| 1.2 | Role Selection | Xác định vai trò người dùng | `profile.role`: CEO/CFO/CMO/COO/Marketer/Accountant |
| 1.3 | Dashboard Preview | Show preview dashboard phù hợp với role | - |

### Giai đoạn 2: Tenant Onboarding

| Bước | Màn hình | Mục đích | Dữ liệu thu thập |
|------|----------|----------|------------------|
| 2.1 | Company Profile | Thông tin cơ bản doanh nghiệp | `tenant.name`, `tenant.logo` |
| 2.2 | Industry Selection | Xác định ngành (Retail/D2C/B2B/F&B) | `tenant.industry` |
| 2.3 | Scale & Revenue | Quy mô và doanh thu tháng | `tenant.scale`, `tenant.monthly_revenue` |
| 2.4 | Data Sources Overview | Chọn các nền tảng đang sử dụng | `tenant.data_sources[]` |

### Giai đoạn 3: Module Onboarding (theo module đầu tiên user vào)

| Bước | Màn hình | Mục đích |
|------|----------|----------|
| 3.1 | Nguồn dữ liệu | Chọn chi tiết sub-sources |
| 3.2 | Xác nhận dữ liệu | Xem dữ liệu inferred + bổ sung |
| 3.3 | Kế hoạch Import | Roadmap: Connect/Import/Skip |

---

## Database Schema Changes

### 1. Thêm cột vào bảng `profiles`

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  onboarding_status TEXT DEFAULT 'pending' 
  CHECK (onboarding_status IN ('pending', 'platform_done', 'completed', 'skipped'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  user_role TEXT 
  CHECK (user_role IN ('ceo', 'cfo', 'cmo', 'coo', 'marketer', 'accountant', 'admin'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  onboarding_completed_at TIMESTAMPTZ;
```

### 2. Thêm cột vào bảng `tenants`

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  onboarding_status TEXT DEFAULT 'pending' 
  CHECK (onboarding_status IN ('pending', 'in_progress', 'completed', 'skipped'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  industry TEXT;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  company_scale TEXT 
  CHECK (company_scale IN ('startup', 'sme', 'enterprise'));

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  monthly_revenue_range TEXT;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS 
  data_sources JSONB DEFAULT '[]'::jsonb;
```

---

## File Structure Mới

```text
src/
├── pages/
│   └── onboarding/
│       ├── index.ts                    # Export all
│       ├── WelcomePage.tsx             # Step 1.1
│       ├── RoleSelectionPage.tsx       # Step 1.2
│       ├── DashboardPreviewPage.tsx    # Step 1.3
│       ├── CompanyProfilePage.tsx      # Step 2.1
│       ├── IndustrySelectionPage.tsx   # Step 2.2
│       ├── ScaleRevenuePage.tsx        # Step 2.3
│       ├── DataSourcesOverviewPage.tsx # Step 2.4
│       └── DataAssessmentPage.tsx      # Existing (Module layer)
│
├── components/
│   └── onboarding/
│       ├── OnboardingGuard.tsx         # Global guard component
│       ├── OnboardingProgress.tsx      # Progress indicator
│       ├── RoleCard.tsx                # Role selection card
│       ├── IndustryCard.tsx            # Industry card
│       └── ScaleSlider.tsx             # Revenue scale slider
│
├── hooks/
│   ├── useOnboardingStatus.ts          # Check & update status
│   └── useOnboardingFlow.ts            # Navigation logic
│
└── lib/
    └── onboardingConfig.ts             # Steps config, validation
```

---

## Routing Changes (App.tsx)

```typescript
// Onboarding Routes - Platform Layer
<Route path="/onboarding/welcome" element={<WelcomePage />} />
<Route path="/onboarding/role" element={<RoleSelectionPage />} />
<Route path="/onboarding/preview" element={<DashboardPreviewPage />} />

// Onboarding Routes - Tenant Layer  
<Route path="/onboarding/company" element={<CompanyProfilePage />} />
<Route path="/onboarding/industry" element={<IndustrySelectionPage />} />
<Route path="/onboarding/scale" element={<ScaleRevenuePage />} />
<Route path="/onboarding/sources" element={<DataSourcesOverviewPage />} />

// Existing Module Layer
<Route path="/onboarding/data-assessment/:moduleKey" element={<DataAssessmentPage />} />
```

---

## OnboardingGuard Logic

```typescript
// src/components/onboarding/OnboardingGuard.tsx
function OnboardingGuard({ children }) {
  const { profile, tenant } = useOnboardingStatus();
  
  // Check profile onboarding
  if (profile.onboarding_status === 'pending') {
    return <Navigate to="/onboarding/welcome" />;
  }
  
  // Check tenant onboarding (if platform done)
  if (profile.onboarding_status === 'platform_done' && 
      tenant.onboarding_status === 'pending') {
    return <Navigate to="/onboarding/company" />;
  }
  
  return children;
}
```

---

## Implementation Priority

### Phase 1: Core Infrastructure
1. Database migration (profiles + tenants columns)
2. `useOnboardingStatus` hook
3. `OnboardingGuard` component
4. Update `useAuthRedirect` to check onboarding

### Phase 2: Platform Layer (User)
1. WelcomePage with animation
2. RoleSelectionPage (6 roles)
3. DashboardPreviewPage (role-based preview)

### Phase 3: Tenant Layer (Company)
1. CompanyProfilePage
2. IndustrySelectionPage (4 industries)
3. ScaleRevenuePage
4. DataSourcesOverviewPage

### Phase 4: Integration
1. Connect all routes in App.tsx
2. Test full flow
3. Add skip functionality
4. Analytics tracking

---

## UX Considerations

### Visual Design
- Full-screen wizard với progress indicator
- Card-based selection (không dùng dropdown)
- Animation giữa các bước (framer-motion)
- Mobile-first responsive

### Skip & Resume
- Cho phép skip từng layer
- Lưu progress để resume sau
- Badge nhắc nhở trên Portal nếu chưa hoàn thành

### Personalization Result
- CEO → FDP Dashboard + Control Tower alerts
- CFO → Full FDP + Scenario Planning
- CMO → MDP focus + Marketing Mode
- Marketer → MDP Marketing Mode only
