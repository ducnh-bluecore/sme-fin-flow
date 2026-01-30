
# Tenant Health & Customer Success Tracking System

## Mục tiêu

Xây dựng hệ thống theo dõi sức khỏe tenant để:
1. **Đo lường hoạt động** - Tenant đang làm gì, tần suất ra sao
2. **Theo dõi tiến độ** - Onboarding đến bước nào, feature adoption
3. **Phát hiện rủi ro churn** - Dấu hiệu sớm của việc khách hàng bỏ
4. **Cảnh báo proactive** - Đẩy alert cho CS team để can thiệp kịp thời

## Kiến trúc Hệ thống

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                          User Actions (Frontend)                              │
│   Page Views │ Feature Usage │ Decisions Made │ Time on Page                  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      Event Tracking Hook (useActivityTracker)                 │
│   - Auto track page views                                                     │
│   - Manual track feature usage                                                │
│   - Batch insert every 30s                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Database Tables                                       │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐  │
│  │ tenant_events      │  │ tenant_health      │  │ cs_alerts              │  │
│  │ (raw events)       │  │ (daily aggregated) │  │ (proactive warnings)   │  │
│  └────────────────────┘  └────────────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Admin UI (AdminTenantDetailPage)                           │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     NEW TAB: "Sức khỏe Tenant"                       │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │    │
│  │  │ Health Score    │  │ Engagement      │  │ Onboarding          │   │    │
│  │  │ (0-100)         │  │ Metrics         │  │ Progress            │   │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │    │
│  │  │ Feature         │  │ Risk            │  │ CS                  │   │    │
│  │  │ Adoption        │  │ Indicators      │  │ Recommendations     │   │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### 1. tenant_events (Raw Event Log)

Lưu trữ mọi hoạt động của user thuộc tenant:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | FK to tenants |
| user_id | uuid | FK to profiles |
| event_type | text | 'page_view', 'feature_use', 'decision', 'export', 'error' |
| event_name | text | Tên cụ thể: 'fdp.dashboard', 'cdp.insight.view' |
| module | text | 'fdp', 'mdp', 'cdp', 'control_tower', 'settings' |
| route | text | Full path: '/fdp/dashboard' |
| metadata | jsonb | Chi tiết bổ sung |
| session_id | text | Group events by session |
| duration_ms | integer | Time spent (for page_view) |
| created_at | timestamptz | Event timestamp |

### 2. tenant_health (Daily Aggregated Metrics)

Tính toán hàng ngày bởi DB function hoặc cron:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | FK to tenants |
| date | date | Ngày thống kê |
| health_score | integer | 0-100, composite score |
| daily_active_users | integer | DAU |
| weekly_active_users | integer | WAU (rolling 7 days) |
| total_page_views | integer | Số lượt xem trang |
| total_decisions | integer | Số quyết định (actions taken) |
| modules_used | text[] | Modules được sử dụng |
| avg_session_duration_min | numeric | Thời gian sử dụng trung bình |
| onboarding_step | text | Bước onboarding hiện tại |
| data_freshness_days | integer | Số ngày kể từ lần import cuối |
| churn_risk_score | integer | 0-100, risk level |
| engagement_trend | text | 'increasing', 'stable', 'declining' |

### 3. cs_alerts (Customer Success Alerts)

Cảnh báo cho team CS hành động:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | FK to tenants |
| alert_type | text | 'churn_risk', 'inactive', 'stuck_onboarding', 'engagement_drop' |
| severity | text | 'low', 'medium', 'high', 'critical' |
| title | text | Tiêu đề ngắn |
| description | text | Chi tiết vấn đề |
| recommended_action | text | Đề xuất hành động |
| status | text | 'open', 'acknowledged', 'resolved', 'ignored' |
| assigned_to | uuid | CS team member |
| resolved_at | timestamptz | Thời điểm xử lý xong |
| created_at | timestamptz | Thời điểm tạo |

## Frontend Components

### 1. useActivityTracker Hook

Global hook đặt trong App.tsx để tự động track:

```typescript
// Auto-tracks:
// - Page views (every route change)
// - Time on page (before navigate away)
// - Feature interactions (manual calls)

export function useActivityTracker() {
  // Batch events and insert every 30 seconds
  // Uses navigator.sendBeacon for reliability
}
```

### 2. TenantHealthTab Component

Tab mới trong AdminTenantDetailPage:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Health Score: 78/100                        [Trend: ↗ Improving] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │ 👥 DAU        │  │ 📊 Decisions  │  │ ⏱ Avg Session │        │
│  │ 3             │  │ 12            │  │ 18 min        │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
│                                                                  │
│  ONBOARDING PROGRESS                                             │
│  ═══════════════════════════════════════ 71%                    │
│  ✓ Welcome → ✓ Role → ✓ Company → ✓ Industry → ○ Scale → ○ Sources │
│                                                                  │
│  MODULE ADOPTION                                                 │
│  FDP ████████████████░░░░ 80%  (Last: 2h ago)                   │
│  MDP ████████░░░░░░░░░░░░ 40%  (Last: 3d ago)                   │
│  CDP ████░░░░░░░░░░░░░░░░ 20%  (Last: 7d ago)                   │
│  CT  ░░░░░░░░░░░░░░░░░░░░  0%  (Never used)                     │
│                                                                  │
│  🚨 RISK INDICATORS                                              │
│  ⚠️ MDP chưa được sử dụng 3 ngày                                 │
│  ⚠️ Chưa import data mới trong 5 ngày                            │
│                                                                  │
│  💡 CS RECOMMENDATIONS                                           │
│  1. Gửi email hướng dẫn sử dụng MDP                              │
│  2. Schedule call giới thiệu Control Tower                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3. CSAlertsList Component

Hiển thị và quản lý alerts:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🔔 Cảnh báo CS (2 open)                                         │
├─────────────────────────────────────────────────────────────────┤
│ 🔴 HIGH - Engagement giảm 50% trong 7 ngày                      │
│    Tenant không đăng nhập từ 15/01/2026                         │
│    [Gọi điện] [Gửi email] [Acknowledge]                         │
├─────────────────────────────────────────────────────────────────┤
│ 🟡 MEDIUM - Stuck ở bước onboarding "Sources"                   │
│    Đã 5 ngày không tiến triển                                   │
│    [Gửi hướng dẫn] [Schedule call] [Acknowledge]                │
└─────────────────────────────────────────────────────────────────┘
```

## Health Score Calculation

Công thức tính Health Score (0-100):

| Factor | Weight | Criteria |
|--------|--------|----------|
| Engagement | 30% | DAU/total_users ratio, session duration |
| Adoption | 25% | Number of modules actively used |
| Data Activity | 20% | Data freshness, import frequency |
| Onboarding | 15% | Completion percentage |
| Growth | 10% | WAU trend (increasing/decreasing) |

**Risk Thresholds:**
- 80-100: Healthy (green)
- 60-79: Monitor (yellow)  
- 40-59: At Risk (orange)
- 0-39: Critical (red)

## Alert Triggers

Tự động tạo CS alerts khi:

| Trigger | Severity | Alert Type |
|---------|----------|------------|
| No login > 7 days | HIGH | inactive |
| Health score drop > 20 points | HIGH | engagement_drop |
| Stuck onboarding > 5 days | MEDIUM | stuck_onboarding |
| No data import > 14 days | MEDIUM | data_stale |
| DAU drop > 50% WoW | HIGH | churn_risk |
| Only using 1 module | LOW | low_adoption |

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useActivityTracker.ts` | Global event tracking hook |
| `src/hooks/useTenantHealth.ts` | Fetch tenant health metrics |
| `src/hooks/useCSAlerts.ts` | Manage CS alerts |
| `src/components/admin/TenantHealthTab.tsx` | Health visualization |
| `src/components/admin/TenantHealthScore.tsx` | Score gauge component |
| `src/components/admin/ModuleAdoptionChart.tsx` | Module usage bars |
| `src/components/admin/OnboardingProgressTracker.tsx` | Step tracker |
| `src/components/admin/CSAlertsList.tsx` | Alert management |
| `src/components/admin/RiskIndicators.tsx` | Risk warnings |
| Database migration | 3 new tables + RPC functions |

### Database Functions (RPC)

1. **calculate_tenant_health(tenant_id)** - Tính health score
2. **aggregate_daily_metrics()** - Cron job chạy hàng ngày
3. **check_alert_triggers()** - Kiểm tra và tạo alerts
4. **get_tenant_activity_summary(tenant_id, days)** - Summary cho UI

### Integration Points

1. **useActivityTracker** đặt trong `AppLayout.tsx` wrapper
2. **TenantHealthTab** thêm vào tabs trong `AdminTenantDetailPage.tsx`
3. **Admin Dashboard** thêm overview alerts count
4. (Future) Email/Slack notifications cho CS team

## Implementation Phases

### Phase 1 (MVP)
- Database tables + basic migrations
- useActivityTracker hook (page views only)
- TenantHealthTab với basic metrics
- Health score calculation (simplified)

### Phase 2
- Full event tracking (features, decisions)
- CS Alerts system
- Alert triggers automation
- Recommendations engine

### Phase 3
- Historical trends charts
- Cohort analysis
- Predictive churn model
- CS team assignment workflow

## Considerations

- **Privacy**: Chỉ track aggregate behavior, không log sensitive data
- **Performance**: Batch inserts, không block UI
- **Storage**: Auto-cleanup events older than 90 days
- **Multi-tenant**: Track cross-tenant từ Admin level
