# MÔ TẢ HỆ THỐNG BLUECORE DATA PLATFORM

## TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PORTAL PAGE (/portal)                       │
│  Cổng vào chính - Điều hướng đến 4 hệ thống con                    │
├────────────┬──────────────┬──────────────────┬─────────────────────┤
│    CDP     │     MDP      │  Control Tower   │       FDP           │
│  Customer  │  Marketing   │    Operations    │     Finance         │
│   Data     │    Data      │     Center       │      Data           │
└────────────┴──────────────┴──────────────────┴─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Data Warehouse   │
                    │  (BigQuery Core)   │
                    └───────────────────┘
```

---

## I. PORTAL PAGE (`/portal`)

### Mục đích
- Cổng vào chính của toàn bộ hệ thống
- Hiển thị 4 module chính dưới dạng card có thể click
- Kết nối trực quan với Data Warehouse ở trung tâm

### Các thành phần
| Card | Viết tắt | Mô tả | Đường dẫn |
|------|----------|-------|-----------|
| Customer Data Platform | CDP | Nền tảng hợp nhất dữ liệu khách hàng 360° | `/cdp` |
| Marketing Data Platform | MDP | Profit before Performance. Cash before Clicks. | `/mdp` |
| Control Tower | OPS | Hệ thống kiểm soát vận hành bán lẻ | `/control-tower` |
| Finance | FIN | Nền tảng quản lý tài chính toàn diện | `/dashboard` |
| Data Warehouse | Core | BigQuery / Snowflake (external link) | `admin.bluecore.vn` |

---

## II. FDP - FINANCIAL DATA PLATFORM

### A. Dashboard CFO (`/dashboard`)

#### Mục đích
- Cung cấp "Financial Truth" - Single Source of Truth cho CEO/CFO
- Hiển thị các chỉ số tài chính quan trọng real-time

#### Các thành phần chính

**1. Financial Truth Card**
- Net Revenue (Doanh thu thuần)
- Contribution Margin (Biên đóng góp)
- Real Cash Position (Tiền mặt thực)
- Công thức được khóa cứng, không cho phép tùy chỉnh

**2. KPI Cards (5 thẻ)**
| KPI | Mô tả | Variant |
|-----|-------|---------|
| Cash Today | Tiền mặt hiện có | Success/Warning |
| Cash Runway | Số tháng có thể hoạt động | Critical nếu < 3 tháng |
| Cash Next 7 Days | Dự báo tiền 7 ngày tới | - |
| Overdue AR | Công nợ quá hạn | Warning |
| CCC | Chu kỳ chuyển đổi tiền mặt | - |

**3. Secondary KPIs (4 thẻ)**
- DSO (Days Sales Outstanding)
- Gross Margin %
- EBITDA Margin %
- EBITDA Amount

**4. AI Insights Panel**
- Phân tích AI tự động về tình hình tài chính
- Gợi ý hành động dựa trên dữ liệu

**5. Charts**
- Cash Forecast Chart (dự báo dòng tiền)
- AR Aging Chart (phân tích tuổi nợ)

**6. Tables**
- Overdue Invoices Table (hóa đơn quá hạn)
- Scenario Planner (công cụ lập kịch bản)

---

### B. Decision Center (`/decision-center`)

#### Mục đích
- Trung tâm ra quyết định cho CEO/CFO
- Hiển thị các quyết định cần xử lý theo mức độ ưu tiên

#### Các Tab chính

**Tab 1: Cần xử lý**
- Decision Cards tự động từ FDP Analysis
- Phân loại: P1 (Khẩn cấp), P2 (Quan trọng), P3 (Theo dõi)
- Giới hạn: max 3 P1, 7 tổng cộng hiển thị

**Tab 2: Theo dõi**
- Các quyết định đang được follow-up
- Outcome tracking

**Tab 3: Lịch sử**
- Các quyết định đã xử lý/dismissed
- Lịch sử kết quả

#### Components

**1. BluecoreScoresPanel**
- 4 chỉ số sức khỏe doanh nghiệp
- Financial Health Score
- Operational Efficiency
- Growth Score
- Risk Score

**2. Decision Card Component**
- Title & Facts (số liệu thực tế từ SSOT)
- Impact Amount (tác động tài chính)
- Priority Badge (P1/P2/P3)
- Deadline
- Actions: Decide / Dismiss / Snooze

**3. ThresholdConfigDialog**
- Cấu hình ngưỡng khẩn cấp cho alerts

---

### C. Unit Economics (`/unit-economics`)

#### Mục đích
- Phân tích chi phí/lợi nhuận theo đơn hàng và SKU
- FDP Principle #6: Unit Economics → Action

#### Các Tab

**Tab 1: Cost Per Order**
- Revenue per Order breakdown
- COGS, Platform Fee, Shipping
- Contribution Margin calculation
- Cost Structure Pie Chart

**Tab 2: Customer**
- LTV (Lifetime Value)
- CAC (Customer Acquisition Cost)
- LTV:CAC Ratio
- Customer metrics

**Tab 3: Channel**
- Phân tích theo kênh bán

**Tab 4: Trends**
- Xu hướng theo thời gian

**Tab 5: SKU Profitability**
- Phân tích lợi nhuận theo SKU
- SKU STOP Action (FDP Principle #6)

#### Key Components

**1. SKUStopAction**
- Hiển thị SKU cần STOP ngay
- Severity: Critical / Warning
- Reasons: Margin âm, COGS cao, Phí sàn cao

**2. RealCashBreakdown**
- Phân loại tiền mặt: Đã về / Sẽ về / Có nguy cơ / Đang bị khóa

**3. FormulaDisplay**
- Hiển thị công thức tính toán
- Locked - không cho phép chỉnh

---

### D. Cash Forecast (`/cash-forecast`)

#### Tab 1: Daily Forecast
- Dự báo tiền mặt theo ngày
- Inflows / Outflows
- Closing Balance

#### Tab 2: Weekly Forecast
- Dự báo theo tuần
- Aggregated view

---

### E. Cash Flow Direct (`/cash-flow-direct`)

#### Mục đích
- Theo dõi dòng tiền trực tiếp
- Phân loại: Operating / Investing / Financing

---

### F. P&L Report (`/pl-report`)

#### Mục đích
- Báo cáo Lãi/Lỗ chi tiết

#### Các Tab

**Tab 1: Summary (Tổng quan)**
- Báo cáo P&L dạng waterfall
- So sánh Actual vs Budget
- Variance Analysis

**Tab 2: Channels (Kênh bán)**
- P&L theo từng kênh

**Tab 3: Detail (Chi tiết)**
- Line-by-line breakdown

**Tab 4: Analysis (Phân tích)**
- AI contextual analysis
- Trend charts

---

### G. Working Capital Hub (`/working-capital-hub`)

#### Nội dung
- Cash Conversion Cycle (DSO + DIO - DPO)
- Working Capital components
- Optimization recommendations

---

### H. Channel Analytics (`/channel-analytics`)

#### Mục đích
- Phân tích hiệu suất từng kênh bán

---

### I. Reconciliation Hub (`/reconciliation`)

#### Mục đích
- Đối chiếu giao dịch TMĐT
- Matching orders với bank transactions

---

## III. CONTROL TOWER

### Triết lý
> "Awareness before Analytics. Action before Reports."
> Control Tower tồn tại để báo động và hành động, không phải để hiển thị số liệu đẹp.

---

### A. Alerts Page (`/control-tower/alerts`)

#### Mục đích
- Trang chính của Control Tower
- Hiển thị các cảnh báo đang hoạt động

#### Cấu trúc Alert Card

```
┌────────────────────────────────────────────────────────────────┐
│ [Impact Amount]  [Severity Icon]  [Title]                      │
│ ₫ 15.2M          ⚠ Cảnh báo      Stock thấp                   │
├────────────────────────────────────────────────────────────────┤
│ Badges: [Severity] [Deadline] [Category] [Summary]             │
├────────────────────────────────────────────────────────────────┤
│ Message: Mô tả chi tiết vấn đề                                │
│ 💰 Impact description                                          │
├────────────────────────────────────────────────────────────────┤
│ Affected: 12 sản phẩm | Store: HCM-01 | 5 phút                │
├────────────────────────────────────────────────────────────────┤
│ Actions: [Assign Owner ▼] [Tạo Task] [Xử lý xong]             │
└────────────────────────────────────────────────────────────────┘
```

#### Alert Levels
| Severity | Màu | Mô tả |
|----------|-----|-------|
| Critical | Đỏ | Nghiêm trọng - cần xử lý ngay |
| Warning | Vàng | Cảnh báo - cần chú ý |
| Info | Xanh | Thông tin - tham khảo |

#### Alert Status Flow
`Active` → `Acknowledged` → `Resolved`

#### Manifesto Rules Applied
- Mỗi alert PHẢI có Impact Amount (mất bao nhiêu tiền?)
- Mỗi alert PHẢI có Deadline
- Mỗi alert PHẢI có Owner
- Max 5-7 alerts tại mọi thời điểm

---

### B. Tasks Page (`/control-tower/tasks`)

#### Mục đích
- Quản lý công việc từ alerts
- Kanban board: Todo → In Progress → Review → Done

#### Task Card Structure
- Priority badge (Urgent/High/Medium/Low)
- Department badge
- Overdue warning
- Deadline với countdown
- Resolution Notes
- Progress bar
- Assignee

#### Actions
- Bắt đầu làm
- Gửi duyệt
- Đánh dấu hoàn thành
- Thêm ghi chú / kết quả

---

### C. KPI Notification Rules (`/control-tower/kpi-rules`)

#### Mục đích
- Cấu hình các rules tự động phát hiện alerts
- 82+ pre-built rules cho đa kênh bán lẻ

#### Tabs

**Tab 1: Intelligent Rules**
- Pre-built rules với công thức
- Toggle enable/disable
- Chỉnh tham số (thresholds)
- Cấu hình người nhận

**Tab 2: Recipients**
- Quản lý người nhận thông báo
- Role-based: CEO, CFO, COO, Manager, etc.
- Channels: Email, SMS, Slack, In-app

#### Rule Card Expanded
```
┌─────────────────────────────────────────────────────────────────┐
│ [Icon] Rule Name                            [Edit] [Toggle]     │
│        [Severity] [Rule Code]                                   │
│        Description                                              │
├─────────────────────────────────────────────────────────────────┤
│ Công thức tính toán:                                           │
│ `current_value < threshold_min`                                │
│ Data sources: [inventory] [orders]                             │
├─────────────────────────────────────────────────────────────────┤
│ Ngưỡng cảnh báo:                                               │
│ threshold_min: 10                                              │
│ threshold_max: 100                                             │
├─────────────────────────────────────────────────────────────────┤
│ Hành động đề xuất:                                             │
│ ✓ Liên hệ nhà cung cấp                                        │
│ ✓ Tạo đơn đặt hàng khẩn                                       │
├─────────────────────────────────────────────────────────────────┤
│ [Chỉnh tham số] [Cấu hình người nhận]                          │
└─────────────────────────────────────────────────────────────────┘
```

---

### D. Stores Page (`/control-tower/stores`)

#### Mục đích
- Theo dõi sức khỏe các cửa hàng/điểm bán
- Hiển thị metrics real-time cho từng store

#### Components

**1. StoreHealthMap**
- Bản đồ trực quan các stores
- Color-coded theo health status

**2. Store Card**
- Revenue today
- Stock status
- Active alerts count
- Manager info

---

### E. Analytics Page (`/control-tower/analytics`)

#### Mục đích
- Phân tích hiệu suất Control Tower
- Alert resolution metrics
- Response time tracking

---

### F. Team Page (`/control-tower/team`)

#### Mục đích
- Quản lý thành viên team
- Phân quyền và vai trò

---

### G. Settings Page (`/control-tower/settings`)

#### Mục đích
- Cài đặt Control Tower
- Notification preferences
- Escalation rules

#### Components

**1. AlertEscalationPanel**
- Cấu hình quy trình leo thang
- Time-based escalation

**2. NotificationRecipientsPanel**
- Quản lý người nhận theo severity

**3. DataSourceHealthPanel**
- Theo dõi trạng thái các nguồn dữ liệu

---

## IV. MDP - MARKETING DATA PLATFORM

### Triết lý
> "Profit before Performance. Cash before Clicks."
> MDP đo lường GIÁ TRỊ TÀI CHÍNH thật của marketing.

---

### A. MDP Dashboard (`/mdp`)

#### Mục đích
- Trang chính của MDP
- Điều hướng đến 2 mode: Marketing Mode & CMO Mode

---

### B. Marketing Mode (`/mdp/marketing-mode`)

#### Mục đích
- Chế độ vận hành hàng ngày cho Marketing Team
- Focus: Execution & Performance

#### Key Metrics Cards
| Metric | Mô tả |
|--------|-------|
| Total Ad Spend | Tổng chi tiêu quảng cáo |
| Revenue Generated | Doanh thu từ marketing |
| Average ROAS | Return on Ad Spend |
| Total Clicks | Tổng lượt clicks |

#### Quick Links
| Link | Mô tả |
|------|-------|
| Campaign Performance | Chi tiết từng chiến dịch |
| Channel Analysis | So sánh hiệu quả các kênh |
| Marketing Funnel | Phân tích tỷ lệ chuyển đổi |
| A/B Testing | Thử nghiệm và tối ưu |
| Audience Insights | Phân tích đối tượng |
| ROI Analytics | Phân tích lợi nhuận đầu tư |
| Customer LTV | Giá trị vòng đời khách hàng |

#### Tabs

**Tab 1: Overview**
- PerformanceOverview
- ChannelBreakdownPanel
- AdvancedMetricsGrid

**Tab 2: Campaigns**
- CampaignPerformanceTable
- Campaign Detail Dialog

**Tab 3: Platforms**
- PlatformAdsOverview (Shopee, Lazada, TikTok, Meta, Google)
- Platform Detail Dialog

**Tab 4: Actions**
- MarketingActionsPanel
- Suggested actions: Scale up, Pause, Review creative, Optimize bid

#### Key Components

**1. PerformanceOverview**
- Tổng quan hiệu suất
- So sánh periods
- Trend indicators

**2. BudgetPacingCard**
- Budget utilization %
- Spend today vs planned
- Remaining budget

**3. DataQualityIndicator**
- Hiển thị chất lượng dữ liệu từ các sources

**4. CampaignPerformanceTable**
- Danh sách campaigns
- Sort/Filter
- Quick actions

**5. CampaignDetailDialog**
- Full metrics của campaign
- Historical charts
- Actions: Pause/Resume

**6. PlatformAdsOverview**
- Performance by platform
- Platform-specific metrics

**7. PlatformDetailDialog**
- Chi tiết platform
- Budget adjustment controls

**8. ExecutionAlertsPanel**
- Cảnh báo vận hành marketing
- Quick fixes

**9. FunnelChart**
- Visualization của marketing funnel
- Conversion rates per stage

**10. AdvancedMetricsGrid**
- Grid các metrics nâng cao
- Benchmarks comparison

**11. ChannelBreakdownPanel**
- Phân tích theo kênh
- KPI achievement

**12. MarketingActionsPanel**
- Recommended actions
- Execute/Dismiss controls

**13. FinancialTruthOverlay**
- Standard ROAS vs Profit ROAS
- Warning khi có gap lớn

---

### C. CMO Mode (`/mdp/cmo-mode`)

#### Mục đích
- Chế độ ra quyết định cho CMO/CFO
- Focus: Decision & Strategy - Profit focused

#### CMO-Level Key Metrics
| Metric | Mô tả |
|--------|-------|
| Contribution Margin | Biên đóng góp (không phải Revenue!) |
| Profit ROAS | Return on Ad Spend tính trên lợi nhuận |
| Cash Locked in Ads | Tiền đang bị khóa trong marketing |
| Active Risks | Số cảnh báo rủi ro đang hoạt động |

#### CMO Tools Quick Links
| Link | Mô tả |
|------|-------|
| Profit Attribution | Lợi nhuận thực từ marketing |
| Cash Impact | Ảnh hưởng dòng tiền |
| Marketing Risks | Cảnh báo rủi ro |
| Decision Center | Hỗ trợ quyết định |
| Budget Optimizer | Tối ưu phân bổ ngân sách |
| Scenario Planner | Mô phỏng kịch bản |

#### Tabs

**Tab 1: Command Center**
- CMOCommandCenter component
- Tổng quan executive
- Critical metrics
- Quick actions

**Tab 2: Profit**
- ProfitAttributionPanel
- CMOCashImpactPanel

**Tab 3: Risks**
- RiskAlertsPanel
- Marketing risk alerts

**Tab 4: Decisions**
- DecisionPanel
- Scale/Stop recommendations

**Tab 5: Settings**
- ChannelBudgetConfigPanel
- Budget allocation config

#### Key Components

**1. CMOCommandCenter**
- Executive dashboard
- Key decisions needed
- Critical alerts

**2. ProfitAttributionPanel**
- Attribution dựa trên profit
- Channel contribution

**3. CashImpactPanel (CMO version)**
- Days to cash
- Cash locked
- Cash risk

**4. RiskAlertsPanel**
- Marketing risk alerts
- Action recommendations

**5. DecisionPanel**
- Pending marketing decisions
- Scale/Stop/Continue options

**6. ChannelBudgetConfigPanel**
- Budget allocation by channel
- Target setting

---

### D. Profit Attribution (`/mdp/profit`)

#### Mục đích
- Attribution lợi nhuận (không phải click!)
- Mỗi campaign → Contribution Margin

---

### E. Cash Impact (`/mdp/cash-impact`)

#### Mục đích
- Theo dõi ảnh hưởng marketing lên cash flow
- Days to Cash
- Cash locked in marketing

---

### F. Risk Alerts (`/mdp/risks`)

#### Mục đích
- Cảnh báo marketing đang "đốt tiền"
- Tăng trưởng giả
- Campaigns dưới ngưỡng sinh lời

---

### G. Decision Support (`/mdp/decision-support`)

#### Mục đích
- Hỗ trợ quyết định marketing
- AI-powered recommendations

---

### H. Budget Optimizer (`/mdp/budget-optimizer`)

#### Mục đích
- Tối ưu phân bổ ngân sách
- Scenario simulation

---

### I. Scenario Planner (`/mdp/scenario-planner`)

#### Mục đích
- Mô phỏng các kịch bản marketing
- What-if analysis

---

### J. Other MDP Pages

| Page | Path | Mô tả |
|------|------|-------|
| Campaigns | `/mdp/campaigns` | Chi tiết campaigns |
| Channels | `/mdp/channels` | Phân tích kênh |
| Funnel | `/mdp/funnel` | Marketing funnel |
| A/B Testing | `/mdp/ab-testing` | Experiments |
| Audience | `/mdp/audience` | Audience insights |
| ROI Analytics | `/mdp/roi-analytics` | ROI analysis |
| Customer LTV | `/mdp/customer-ltv` | LTV analysis |
| Data Sources | `/mdp/data-sources` | Quản lý nguồn dữ liệu |
| Data Readiness | `/mdp/data-readiness` | Kiểm tra sẵn sàng dữ liệu |

---

## V. OTHER FDP PAGES

### A. Scenario Hub (`/scenarios`)

#### Mục đích
- Quản lý các kịch bản tài chính
- Plan vs Actual tracking

#### Tabs

**Tab 1: Overview**
- Danh sách scenarios
- Status tracking

**Tab 2: Plan**
- MonthlyPlanEditor
- Monthly targets setting

**Tab 3: Tracking**
- Plan vs Actual comparison
- Variance analysis

#### Key Components

**1. ScenarioSelector**
- Chọn scenario đang active

**2. MonthlyPlanSection**
- Revenue plan
- OPEX plan
- EBITDA plan

**3. MonthlyPlanEditor**
- Interactive sliders
- Lock/unlock months
- Seasonal patterns

**4. TrackingTab**
- TrackingTable
- Progress tracking

---

### B. Rolling Forecast (`/rolling-forecast`)

#### Mục đích
- Dự báo cuốn chiếu
- 12-month forward looking

---

### C. Budget vs Actual (`/budget-vs-actual`)

#### Mục đích
- So sánh ngân sách vs thực tế
- Variance analysis

---

### D. Variance Analysis (`/variance-analysis`)

#### Mục đích
- Phân tích chênh lệch
- Root cause analysis

---

### E. Working Capital Page (`/working-capital`)

#### Mục đích
- Quản lý vốn lưu động
- DSO, DIO, DPO tracking

---

### F. Cash Conversion Cycle (`/cash-conversion-cycle`)

#### Mục đích
- Phân tích CCC
- Optimization recommendations

---

### G. AR Operations (`/ar-operations`)

#### Mục đích
- Quản lý công nợ phải thu
- Collection tracking

---

### H. Invoice Tracking (`/invoice-tracking`)

#### Mục đích
- Theo dõi hóa đơn
- Status management

---

### I. Bills Page (`/bills`)

#### Mục đích
- Quản lý hóa đơn phải trả
- Payment scheduling

---

### J. Supplier Payments (`/supplier-payments`)

#### Mục đích
- Quản lý thanh toán nhà cung cấp
- Payment optimization

---

### K. Inventory Aging (`/inventory-aging`)

#### Mục đích
- Phân tích tồn kho theo tuổi
- Dead stock identification

---

### L. Channel P&L (`/channel-pl`)

#### Mục đích
- P&L theo từng kênh bán
- Channel profitability

---

### M. Channel What-If (`/channel-whatif`)

#### Mục đích
- What-if analysis theo kênh
- Scenario simulation

---

### N. Risk Dashboard (`/risk-dashboard`)

#### Mục đích
- Tổng quan rủi ro tài chính
- Risk scores

---

### O. Capital Allocation (`/capital-allocation`)

#### Mục đích
- Phân bổ vốn
- Investment decisions

---

### P. Covenant Tracking (`/covenant-tracking`)

#### Mục đích
- Theo dõi cam kết ngân hàng
- Compliance status

---

### Q. Board Reports (`/board-reports`)

#### Mục đích
- Báo cáo cho Board
- Executive summary

---

## VI. ADMIN PAGES (Super Admin Only)

### A. Admin Dashboard (`/admin`)
- Tổng quan admin
- System metrics

### B. Tenants (`/admin/tenants`)
- Quản lý tenants
- Tenant settings

### C. Users (`/admin/users`)
- Quản lý users
- Role assignment

### D. Settings (`/admin/settings`)
- Cài đặt platform
- System configuration

---

## VII. SETTINGS & CONFIGURATION

### A. Settings Page (`/settings`)

#### Tabs

**Tab 1: Profile**
- User profile
- Preferences

**Tab 2: Notifications**
- Notification settings
- Push notification config

**Tab 3: Team**
- Team members
- Roles

**Tab 4: Integrations**
- Connected integrations
- API keys

---

### B. Data Hub (`/data-hub`)

#### Mục đích
- Quản lý nguồn dữ liệu
- Connector management

---

### C. Data Warehouse (`/data-warehouse`)

#### Mục đích
- BigQuery integration
- Schema management

---

### D. ETL Rules (`/etl-rules`)

#### Mục đích
- Cấu hình ETL
- Data transformation rules

---

### E. API Page (`/api`)

#### Mục đích
- API documentation
- API key management

---

### F. RBAC Page (`/rbac`)

#### Mục đích
- Role-based access control
- Permission management

---

## VIII. COMMON DIALOGS & COMPONENTS

### A. Alert System Dialogs

**1. AlertDetailsDialog**
- Chi tiết alert
- Affected products/items
- Historical data
- Resolution notes

**2. AffectedProductsDialog**
- Danh sách sản phẩm bị ảnh hưởng
- Từ summary alerts

**3. CreateTaskFromAlertDialog**
- Tạo task từ alert
- Auto-fill priority, deadline

**4. AssignOwnerDropdown**
- Dropdown chọn owner cho alert/task

**5. AlertConfigDialog**
- Cấu hình alert
- Thresholds, notifications

**6. ExtendedAlertConfigDialog**
- Cấu hình alert mở rộng
- Multi-threshold support

**7. AlertAIRecommendationDialog**
- AI recommendations cho alert

---

### B. Rule Dialogs

**1. CreateRuleDialog**
- Tạo intelligent alert rule mới

**2. EditRuleParamsDialog**
- Chỉnh sửa parameters của rule

**3. RuleRecipientsDialog**
- Cấu hình người nhận cho rule

---

### C. Decision Dialogs

**1. DecisionDetailDialog**
- Chi tiết quyết định

**2. SubmitForApprovalDialog**
- Gửi phê duyệt

**3. ThresholdConfigDialog**
- Cấu hình ngưỡng

---

### D. SKU/Product Dialogs

**1. SKUCostBreakdownDialog**
- Chi tiết cost breakdown theo SKU
- Tabs: Chi phí | Kênh bán | Đơn hàng

---

### E. Campaign Dialogs

**1. CampaignDetailDialog**
- Chi tiết campaign
- Metrics, charts, actions

**2. PlatformDetailDialog**
- Chi tiết platform
- Budget controls

**3. CampaignProfitDrilldown**
- Drill-down lợi nhuận campaign

---

### F. Data Dialogs

**1. FileImportDialog**
- Import dữ liệu từ file

**2. AddConnectorDialog**
- Thêm connector mới

**3. ExportAudienceDialog**
- Export audience data

---

### G. Shared Components

**1. PageHeader**
- Header chuẩn cho mỗi trang
- Title, breadcrumb, actions

**2. StatCard**
- Card hiển thị metric
- Trend indicator

**3. DataSourceNotice**
- Thông báo về nguồn dữ liệu

**4. EmptyState**
- Hiển thị khi không có dữ liệu

**5. LoadingState**
- Loading indicator

**6. DateRangeIndicator**
- Hiển thị khoảng thời gian đang xem

**7. LanguageSwitcher**
- Chuyển đổi ngôn ngữ (VI/EN)

---

## IX. DATA FLOW ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────┐
│                     EXTERNAL DATA SOURCES                    │
│  Shopee │ Lazada │ TikTok │ POS │ Bank │ ERP │ Haravan      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTIONS                          │
│  sync-connector │ detect-alerts │ process-alert-notifications│
│  analyze-financial-data │ generate-decision-cards            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    SUPABASE TABLES                           │
│  products │ product_metrics │ external_orders │ invoices     │
│  alert_instances │ tasks │ intelligent_alert_rules           │
│  decision_cards │ marketing_campaigns │ channel_metrics      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                      REACT HOOKS                             │
│  useProductMetrics │ useAlertInstances │ usePLData          │
│  useMDPData │ useDecisionCards │ useCentralFinancialMetrics │
│  useUnifiedChannelMetrics │ useChannelAnalytics             │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                        UI PAGES                              │
│  CFODashboard │ AlertsPage │ DecisionCenter │ MDPDashboard  │
│  ControlTowerAlerts │ UnitEconomics │ PLReport              │
└──────────────────────────────────────────────────────────────┘
```

---

## X. KEY FORMULAS (FDP Locked)

| Metric | Formula | Ghi chú |
|--------|---------|---------|
| Net Revenue | Gross Revenue - Returns - Discounts - Refunds | SSOT, không chỉnh |
| Contribution Margin | Net Revenue - COGS - Variable Costs | SSOT |
| Real Cash | Bank Balance - Pending Payments + Confirmed Receivables | Phân biệt các loại cash |
| Cash Runway | Current Cash / Average Monthly Burn | Critical nếu < 3 |
| DSO | (AR / Revenue) × Days | Days Sales Outstanding |
| DPO | (AP / COGS) × Days | Days Payable Outstanding |
| DIO | (Inventory / COGS) × Days | Days Inventory Outstanding |
| CCC | DSO + DIO - DPO | Cash Conversion Cycle |
| Profit ROAS | Contribution Margin / Ad Spend | MDP core metric |
| LTV:CAC | Customer Lifetime Value / Customer Acquisition Cost | Unit Economics |
| Gross Margin % | (Revenue - COGS) / Revenue × 100 | |
| EBITDA Margin % | EBITDA / Revenue × 100 | |

---

## XI. ALERT CATEGORIES

| Category | Code | Mô tả |
|----------|------|-------|
| Cash | CASH | Cảnh báo dòng tiền |
| Inventory | INV | Cảnh báo tồn kho |
| Revenue | REV | Cảnh báo doanh thu |
| Margin | MGN | Cảnh báo biên lợi nhuận |
| AR | AR | Cảnh báo công nợ |
| Operations | OPS | Cảnh báo vận hành |
| Marketing | MKT | Cảnh báo marketing |
| Risk | RISK | Cảnh báo rủi ro |

---

## XII. USER ROLES & PERMISSIONS

| Role | FDP | MDP | Control Tower | Admin |
|------|-----|-----|---------------|-------|
| Super Admin | Full | Full | Full | Full |
| CEO | Full | CMO Mode | View | Limited |
| CFO | Full | CMO Mode | View | - |
| CMO | View | Full | View | - |
| COO | View | View | Full | - |
| Manager | Limited | Marketing Mode | Limited | - |
| Analyst | View | View | View | - |

---

## XIII. MOBILE SUPPORT

### Mobile Pages

| Page | Path | Mô tả |
|------|------|-------|
| Mobile Home | `/mobile` | Dashboard mobile |
| Mobile Alerts | `/mobile/alerts` | Alerts on mobile |
| Mobile Settings | `/mobile/settings` | Settings mobile |

### Mobile Components

**1. MobileHeader**
- Mobile-optimized header

**2. MobileBottomNav**
- Bottom navigation

**3. MobileKPICard**
- Mobile KPI display

**4. MobileAlertItem**
- Mobile alert item

**5. MobileTaskItem**
- Mobile task item

**6. PullToRefresh**
- Pull-to-refresh functionality

**7. MobileDrawer**
- Mobile drawer menu

---

## XIV. NOTIFICATIONS SYSTEM

### Types

| Type | Channel | Trigger |
|------|---------|---------|
| Push | FCM | Alert created |
| Email | SMTP | Scheduled digest |
| In-app | Real-time | All events |
| Slack | Webhook | Critical alerts |

### Components

**1. NotificationCenter**
- Notification list
- Mark as read

**2. PushNotificationSettings**
- Push notification config

**3. ScheduledNotificationsManager**
- Schedule management

---

## XV. INTEGRATION CONNECTORS

| Connector | Type | Data |
|-----------|------|------|
| Shopee | E-commerce | Orders, Products |
| Lazada | E-commerce | Orders, Products |
| TikTok Shop | E-commerce | Orders, Products |
| Meta Ads | Marketing | Campaigns, Spend |
| Google Ads | Marketing | Campaigns, Spend |
| Haravan | POS | Orders, Inventory |
| BigQuery | Data Warehouse | All data |
| Bank API | Finance | Transactions |

---

## XVI. MANIFESTO COMPLIANCE CHECKLIST

### FDP Manifesto
- [ ] Single Source of Truth maintained
- [ ] Formulas locked (không cho tùy chỉnh)
- [ ] Real Cash phân biệt rõ ràng
- [ ] Revenue ↔ Cost luôn đi kèm
- [ ] Unit Economics → Action
- [ ] Today's Decision focus
- [ ] Surface Problems (không làm đẹp số)

### Control Tower Manifesto
- [ ] Mỗi alert có Impact Amount
- [ ] Mỗi alert có Deadline
- [ ] Mỗi alert có Owner
- [ ] Max 5-7 alerts hiển thị
- [ ] Alert → Action (không chỉ thông báo)
- [ ] Escalation configured

### MDP Manifesto
- [ ] Profit Attribution (không phải Click)
- [ ] Cash Impact tracked
- [ ] Risk alerts active
- [ ] CFO/CEO đọc được (không chỉ Marketer)
- [ ] Simple attribution (giải thích được trong 2 phút)
