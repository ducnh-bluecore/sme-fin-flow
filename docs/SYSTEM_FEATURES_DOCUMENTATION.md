# BLUECORE FINANCE HUB - TÀI LIỆU MÔ TẢ TÍNH NĂNG HỆ THỐNG

**Phiên bản:** 2.0  
**Ngày cập nhật:** 28/01/2026  
**Trạng thái:** Production Ready

---

## MỤC LỤC

1. [Tổng quan Hệ thống](#1-tổng-quan-hệ-thống)
2. [Portal - Trung tâm Điều khiển](#2-portal---trung-tâm-điều-khiển)
3. [FDP - Finance Data Platform](#3-fdp---finance-data-platform)
4. [MDP - Marketing Data Platform](#4-mdp---marketing-data-platform)
5. [CDP - Customer Data Platform](#5-cdp---customer-data-platform)
6. [Control Tower - Hệ thống Quyết định](#6-control-tower---hệ-thống-quyết-định)
7. [Cross-Module Integration](#7-cross-module-integration)
8. [Data Architecture](#8-data-architecture)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Triết lý Thiết kế

Bluecore Finance Hub được xây dựng dựa trên 3 nguyên tắc cốt lõi:

| Nguyên tắc | Mô tả |
|------------|-------|
| **Decision-First** | Mọi màn hình phục vụ ra quyết định, không phải xem báo cáo |
| **Single Source of Truth (SSOT)** | Một nguồn dữ liệu duy nhất cho mỗi metric |
| **DB-First Architecture** | Mọi tính toán thực hiện ở database, frontend chỉ hiển thị |

### 1.2 Các Module Chính

```
┌─────────────────────────────────────────────────────────────────┐
│                         PORTAL                                   │
│              (Executive Command Center)                          │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│     FDP     │     MDP     │     CDP     │   Control   │  Data   │
│  (Finance)  │ (Marketing) │ (Customer)  │    Tower    │Warehouse│
└─────────────┴─────────────┴─────────────┴─────────────┴─────────┘
```

### 1.3 Đối tượng Sử dụng

| Role | Primary Module | Use Cases |
|------|----------------|-----------|
| CEO | Control Tower, Portal | Strategic decisions, Cross-module oversight |
| CFO | FDP, Control Tower | Financial management, Cash flow, P&L |
| CMO | MDP, CDP | Marketing ROI, Customer insights |
| COO | Control Tower | Operations, Alert management |
| Board | Control Tower | Strategic review, Governance |

---

## 2. PORTAL - TRUNG TÂM ĐIỀU KHIỂN

### 2.1 Mục đích
Portal là điểm truy cập trung tâm, cung cấp overview toàn bộ hệ thống trong một màn hình.

### 2.2 Các Tính năng

#### 2.2.1 Data Warehouse Card
- **Mô tả:** Hiển thị trạng thái Single Source of Truth
- **Metrics:** 
  - Số bảng dữ liệu (Tables)
  - Trạng thái sync (Live/Delayed)
  - Tổng số records
- **Actions:** Open Data Warehouse

#### 2.2.2 Module Cards
Mỗi module hiển thị 2 metrics quan trọng nhất:

| Module | Metric 1 | Metric 2 |
|--------|----------|----------|
| FDP | Net Cash | Unreconciled Amount |
| MDP | True ROAS | Cash at Risk |
| Control Tower | Active Alerts | At Risk Amount |
| CDP | Customer Equity | At Risk Equity |

#### 2.2.3 System Overview
- **Data Freshness:** Real-time sync status
- **Active Alerts:** Critical + Pending count
- **Pending Decisions:** Awaiting action count
- **Cash Position:** Current + Runway

### 2.3 Routes
- `/portal` - Main portal view

---

## 3. FDP - FINANCE DATA PLATFORM

### 3.1 Triết lý (FDP Manifesto)

> **"Truth > Flexibility"** - FDP không phải phần mềm kế toán. FDP phục vụ CEO/CFO điều hành, không nộp báo cáo thuế.

**10 Nguyên tắc Bất biến:**
1. FDP KHÔNG PHẢI PHẦN MỀM KẾ TOÁN
2. SINGLE SOURCE OF TRUTH
3. TRUTH > FLEXIBILITY
4. REAL CASH (Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa)
5. REVENUE ↔ COST (Mọi doanh thu đều đi kèm chi phí)
6. UNIT ECONOMICS → ACTION
7. TODAY'S DECISION
8. SURFACE PROBLEMS
9. FEED CONTROL TOWER
10. FINAL TEST: Nếu không khiến quyết định rõ ràng hơn → FDP đã thất bại

### 3.2 Các Tính năng Chi tiết

#### 3.2.1 Dashboard Thanh khoản (`/dashboard`)
**Mục đích:** Decision-first financial overview

**Key Metrics:**
| Metric | Mô tả | Công thức |
|--------|-------|-----------|
| Cash Today | Tiền mặt hiện có | SUM(bank_accounts.current_balance) |
| Cash Runway | Số tháng có thể hoạt động | Cash Today / Monthly Burn Rate |
| Cash 7-Day | Dự báo tiền mặt 7 ngày | Cash Today + Inflows - Outflows |
| Overdue AR | Công nợ quá hạn | SUM(invoices WHERE due_date < today) |
| CM% | Contribution Margin | (Gross Profit - Variable Costs) / Net Revenue |
| CCC | Cash Conversion Cycle | DSO + DIO - DPO |

**Decision Cards:**
- AR Collection decisions
- Contribution Margin alerts
- Cash runway warnings

**Charts:**
- AR Aging Donut Chart
- 7-Day Cash Forecast Line Chart
- Overdue Invoices Table

#### 3.2.2 Báo cáo P&L (`/fdp/pl-report`)
**Mục đích:** Profit & Loss analysis với decision context

**Sections:**
1. **Hero KPI Strip:** Net Revenue, Gross Profit, Net Income, Cash Position
2. **P&L Waterfall Chart:** Revenue → COGS → Gross Profit → OpEx → Net Income
3. **Profit Drivers:** Variable cost breakdown
4. **Category Analysis:** P&L by product category
5. **Channel Analysis:** P&L by sales channel

**Aggregation Modes:**
- Last 30/90 days
- Quarter (Q1, Q2, Q3, Q4)
- Year to Date (YTD)
- Custom range

#### 3.2.3 Chi phí (`/fdp/expenses`)
**Mục đích:** Expense tracking và budget control

**Tabs:**
- **Tổng quan:** Expense summary by category
- **Xu hướng:** Monthly expense trends
- **Chi tiết:** Individual expense records

**Categories:**
- COGS (Giá vốn hàng bán)
- Salary (Lương nhân viên)
- Rent (Thuê mặt bằng)
- Marketing (Chi phí quảng cáo)
- Logistics (Vận chuyển)
- Utilities (Điện nước)
- Other (Khác)

#### 3.2.4 Vốn lưu động (`/fdp/working-capital`)
**Mục đích:** Working capital và cash conversion optimization

**Key Metrics:**
| Metric | Mô tả | Target |
|--------|-------|--------|
| DSO | Days Sales Outstanding | < 30 days |
| DIO | Days Inventory Outstanding | < 45 days |
| DPO | Days Payable Outstanding | > 30 days |
| CCC | Cash Conversion Cycle | < 45 days |

**Features:**
- Trend charts (30/60/90 days)
- Target comparison
- Improvement recommendations

#### 3.2.5 Vị thế Tiền mặt (`/fdp/cash-position`)
**Mục đích:** Real-time cash visibility

**Locked Cash Breakdown:**
| Type | Mô tả |
|------|-------|
| Inventory Lock | Chi phí hàng tồn kho |
| Ads Float | Chi phí quảng cáo pending (T+14) |
| Ops Float | Bills vận hành chưa thanh toán |
| Platform Hold | Tiền sàn TMĐT giữ (T+14) |

**Cash Flow Sources:**
- Bank balances
- Pending collections
- Scheduled payments

#### 3.2.6 Dự báo Dòng tiền (`/fdp/cash-forecast`)
**Mục đích:** Cash flow projection 30/60/90 days

**Methodology:**
- **Inflows:** AR collections (by aging probability) + New Sales (90-day average)
- **Outflows:** Fixed costs (baselines) + Variable costs (estimates)
- **Settlement Delay:** T+14 for eCommerce platforms

**Adjustable Parameters:**
- Growth rate assumptions
- Collection rate adjustments
- Expense projections

#### 3.2.7 Công nợ Phải thu (AR) (`/fdp/ar-aging`)
**Mục đích:** Accounts Receivable management

**Aging Buckets:**
| Bucket | Days | Risk Level |
|--------|------|------------|
| Current | 0 | Low |
| 1-30 | 1-30 | Low |
| 31-60 | 31-60 | Medium |
| 61-90 | 61-90 | High |
| Over 90 | >90 | Critical |

**Actions:**
- Collection priority assignment
- Customer credit risk flags
- Write-off recommendations

#### 3.2.8 Công nợ Phải trả (AP) (`/fdp/ap-aging`)
**Mục đích:** Accounts Payable optimization

**Features:**
- Payment scheduling
- Early payment discount opportunities
- Vendor relationship management

#### 3.2.9 Hỗ trợ Quyết định (`/fdp/decision-support`)
**Mục đích:** CFO Decision Command Center

**Tabs:**
1. **ROI Analysis:** Investment return calculations
2. **NPV/IRR:** Net Present Value và Internal Rate of Return
3. **Payback:** Payback period analysis
4. **Sensitivity:** Tornado charts, scenario analysis

**Tools:**
- Scenario Sandbox (Inflation, Supply Shock, Demand Surge toggles)
- Make vs Buy comparison cards
- Decision workflow (Approve/Reject)

#### 3.2.10 Báo cáo Tài chính (`/fdp/financial-reports`)
**Mục đích:** Comprehensive financial reporting

**Report Types:**
- Income Statement
- Balance Sheet (simplified)
- Cash Flow Statement

#### 3.2.11 Phân tích Chênh lệch (`/fdp/variance-analysis`)
**Mục đích:** Budget vs Actual analysis

**Features:**
- Variance by category
- Favorable/Unfavorable indicators
- Root cause analysis

#### 3.2.12 Executive Summary (`/fdp/executive-summary`)
**Mục đích:** Board-ready financial overview

**Health Score Dimensions:**
1. Liquidity Score
2. Receivables Score
3. Profitability Score
4. Efficiency Score
5. Growth Score
6. Stability Score

**Visualization:** Radar chart với 6 dimensions

#### 3.2.13 Rủi ro Tập trung (`/fdp/concentration-risk`)
**Mục đích:** Retail concentration risk analysis

**Risk Vectors:**
| Vector | Description | Alert Threshold |
|--------|-------------|-----------------|
| Channel | % revenue từ top platform | >50% = High |
| Category | % từ top product groups | >40% = High |
| Customer | Top 10 customers share | >30% = High |
| SKU | % profit từ top 5 SKUs | >50% = High |
| Seasonal | Peak vs average ratio | >2x = High |

#### 3.2.14 Risk Appetite (`/fdp/risk-appetite`)
**Mục đích:** Risk tolerance configuration

**Risk Categories:**
- Financial Risk
- Operational Risk
- Market Risk
- Credit Risk

### 3.3 FDP Routes Summary

| Route | Feature | Priority |
|-------|---------|----------|
| `/dashboard` | Thanh khoản Dashboard | Critical |
| `/fdp/pl-report` | Báo cáo P&L | High |
| `/fdp/expenses` | Chi phí | High |
| `/fdp/working-capital` | Vốn lưu động | High |
| `/fdp/cash-position` | Vị thế Tiền mặt | High |
| `/fdp/cash-forecast` | Dự báo Dòng tiền | Medium |
| `/fdp/ar-aging` | Công nợ Phải thu | High |
| `/fdp/ap-aging` | Công nợ Phải trả | Medium |
| `/fdp/decision-support` | Hỗ trợ Quyết định | Medium |
| `/fdp/financial-reports` | Báo cáo Tài chính | Low |
| `/fdp/variance-analysis` | Phân tích Chênh lệch | Low |
| `/fdp/executive-summary` | Executive Summary | Medium |
| `/fdp/concentration-risk` | Rủi ro Tập trung | Medium |
| `/fdp/risk-appetite` | Risk Appetite | Low |

---

## 4. MDP - MARKETING DATA PLATFORM

### 4.1 Triết lý (MDP Manifesto)

> **"Profit before Performance. Cash before Clicks."** - MDP đo lường giá trị tài chính thật của marketing, không phải vanity metrics.

**Nguyên tắc Chính:**
1. MDP KHÔNG PHẢI MARTECH
2. ĐO LƯỜNG GIÁ TRỊ TÀI CHÍNH THẬT
3. PHỤC VỤ CEO & CFO TRƯỚC, MARKETER SAU
4. PROFIT ATTRIBUTION, KHÔNG PHẢI CLICK ATTRIBUTION
5. LUÔN GẮN MARKETING VỚI CASHFLOW
6. TỒN TẠI ĐỂ NUÔI FDP & CONTROL TOWER
7. ƯU TIÊN RỦI RO HƠN THÀNH TÍCH
8. CỐ Ý ĐƠN GIẢN HOÁ ATTRIBUTION
9. KHÔNG CHO PHÉP "TĂNG TRƯỞNG KHÔNG TRÁCH NHIỆM"
10. FINAL TEST: Nếu MDP không làm quyết định marketing rõ ràng hơn → thất bại

### 4.2 Các Tính năng Chi tiết

#### 4.2.1 Marketing Decision Center (`/mdp`)
**Mục đích:** Profit-first marketing decisions

**Key Metrics:**
| Metric | Mô tả | Formula |
|--------|-------|---------|
| Net Marketing Impact | Tổng lợi nhuận từ marketing | Created - Lost |
| Cash at Risk | Tiền đang bị lock trong marketing | Ads spend pending conversion |
| Cash Conversion | % tiền marketing convert thành cash | Received / (Received + Pending + Locked) |
| True ROAS | Return on Ad Spend thực | Campaign Revenue / Campaign Cost |

**Decision Rules (Automated):**
| Rule | Condition | Action |
|------|-----------|--------|
| KILL | Profit ROAS < 0 for 3+ days | Stop campaign |
| KILL | CM% Worst-case < -10% | Stop campaign |
| PAUSE | Cash Conv. at D14 < 50% | Pause for review |
| SCALE | CM% ≥ 15% AND Cash Conv. ≥ 70% | Increase budget |

**Decision Cards:**
- Channel-level recommendations (SCALE/PAUSE/KILL)
- Impact amount (VND)
- Assigned owner (CMO)
- Due date (hours remaining)

#### 4.2.2 Promotion ROI (`/promotion-roi`)
**Mục đích:** Campaign-level ROI analysis

**Metrics per Campaign:**
- Impressions, Clicks, CTR
- Actual Cost, Revenue
- ROAS, ACOS
- Contribution Margin

**Decision Cards:**
- Campaigns to KILL (ROAS < 3x)
- Campaigns to SCALE (ROAS > 6x)
- Budget efficiency alerts

#### 4.2.3 Channel Performance (`/mdp/channels`)
**Mục đích:** Platform-level marketing analysis

**Supported Channels:**
- Shopee
- Lazada
- TikTok Shop
- Website
- Meta Ads
- Google Ads

**Metrics per Channel:**
- Spend, Revenue, ROAS
- Orders, AOV
- Contribution Margin

#### 4.2.4 Platform Ads Summary
**Mục đích:** Cross-platform ad performance

**Aggregated View:**
- Total Ad Spend
- Total Ad Revenue
- Blended ROAS
- Platform comparison

### 4.3 MDP Routes Summary

| Route | Feature | Priority |
|-------|---------|----------|
| `/mdp` | Marketing Decision Center | Critical |
| `/promotion-roi` | Promotion ROI | High |
| `/mdp/channels` | Channel Performance | Medium |

---

## 5. CDP - CUSTOMER DATA PLATFORM

### 5.1 Triết lý (CDP Manifesto)

> **"Customer as Financial Asset"** - CDP xem khách hàng như tài sản tài chính, không phải CRM target.

**Nguyên tắc Chính:**
1. POPULATION > INDIVIDUAL (Tập trung vào cohort/segment)
2. SHIFT > SNAPSHOT (Theo dõi thay đổi, không chỉ trạng thái)
3. INSIGHT = MONEY/RISK (Mọi insight phải có financial impact)
4. FORBIDDEN: Campaign builders, task management, "soft" engagement metrics

### 5.2 Các Tính năng Chi tiết

#### 5.2.1 CDP Overview (`/cdp`)
**Mục đích:** Customer equity và risk overview

**Key Metrics:**
| Metric | Mô tả | Calculation |
|--------|-------|-------------|
| Total Equity (12M) | Giá trị khách hàng 12 tháng | SUM(customer_equity) |
| Total Equity (24M) | Dự báo 24 tháng | Projected from 12M |
| At Risk Value | Giá trị có nguy cơ mất | Equity from at-risk customers |
| At Risk % | % equity at risk | At Risk / Total |

**Sections:**
- Tín hiệu nổi bật (Insights detected)
- Giá trị Khách hàng (Equity breakdown)
- Thẻ Quyết định (Decision Cards)
- Độ tin cậy Dữ liệu (Data Quality)

**Data Quality Metrics:**
| Metric | Target |
|--------|--------|
| Điền đúng hợp | >95% |
| Định danh KH | >95% |
| Ghép chính xác | >95% |
| Dữ liệu hoàn trả | >95% |
| Độ mới | <3 days |

#### 5.2.2 LTV Intelligence Engine (`/cdp/ltv-engine`)
**Mục đích:** Customer Lifetime Value analysis

**LTV Formula:**
```
LTV = Σ (BaseValue × Retention_t × AOV_Growth_t) / (1 + DiscountRate)^t
```

**Components:**
- Base Value (Historical spend)
- Retention Curve (Tenant-specific)
- AOV Growth Rate
- Discount Rate

**Views:**
- Individual LTV
- Cohort LTV
- Source-level LTV

#### 5.2.3 CDP Explore (`/cdp/explore`)
**Mục đích:** Research interface for customer analysis

**Filter Dimensions:**
- Order Count (Range)
- Total Spend (Range)
- AOV (Range)
- Recency (Days)

**Features:**
- Save Research View → Create Segment
- Hypothesis testing
- Population comparison

#### 5.2.4 CDP Populations (`/cdp/populations`)
**Mục đích:** Segment management

**Default Segments:**
| Segment | Definition |
|---------|------------|
| Champions | High value, recent, frequent |
| Loyal | High frequency, moderate value |
| Potential | Recent, growing value |
| New | First-time customers |
| At Risk | Previously active, declining |
| Dormant | No activity 90+ days |

**Segment Actions:**
- View population details
- Track equity over time
- Export for analysis

#### 5.2.5 Customer Audit View (`/cdp/customer/:id`)
**Mục đích:** Individual customer verification (READ-ONLY)

**Sections:**
1. **Identity & Merge Block:** Multi-source connection status
2. **Transaction Summary:** Key milestones
3. **RFM/CLV Verification:** Logic audit
4. **CLV Breakdown:** Realized vs Potential value

**Philosophy:** "Hồ sơ Kiểm chứng" - Audit view, NOT CRM profile

#### 5.2.6 Insight Engine
**Mục đích:** Automated behavioral change detection

**Insight Categories:**
| Code | Category | Example |
|------|----------|---------|
| V01-V10 | Value Shifts | High-value spend decline |
| T01-T10 | Timing Changes | Purchase frequency slowdown |
| M01-M10 | Margin Drifts | AOV compression |
| R01-R10 | Risk Signals | Churn indicators |

**Insight Governance:**
- Cooldown periods (prevent noise)
- Accuracy validation (source comparison)
- Business actionability requirements

#### 5.2.7 Product & Demand Intelligence (`/cdp/insights/demand`)
**Mục đích:** Spending shift analysis across populations

**Insight Codes (PD01-PD25):**
- Demand Shift
- Substitution patterns
- Basket Structure changes
- Product-Customer Interaction
- Product-Led Risk

### 5.3 CDP Routes Summary

| Route | Feature | Priority |
|-------|---------|----------|
| `/cdp` | CDP Overview | Critical |
| `/cdp/ltv-engine` | LTV Intelligence | High |
| `/cdp/explore` | CDP Explore | High |
| `/cdp/populations` | Populations | High |
| `/cdp/customer/:id` | Customer Audit | Medium |
| `/cdp/insights/demand` | Product & Demand | Medium |

---

## 6. CONTROL TOWER - HỆ THỐNG QUYẾT ĐỊNH

### 6.1 Triết lý (Control Tower Manifesto)

> **"Awareness before Analytics. Action before Reports."** - Control Tower không phải dashboard, mà là hệ thống báo động và hành động.

**Nguyên tắc Chính:**
1. CONTROL TOWER KHÔNG PHẢI DASHBOARD
2. CHỈ QUAN TÂM ĐẾN "ĐIỀU GÌ SAI"
3. MỖI ALERT PHẢI ĐAU – VÀ PHẢI CÓ GIÁ
4. ƯU TIÊN ÍT NHƯNG CHÍ MẠNG (max 5-7 alerts)
5. ALERT PHẢI CÓ CHỦ SỞ HỮU & KẾT QUẢ
6. KHÔNG REAL-TIME VÔ NGHĨA
7. LUÔN GẮN VỚI FDP
8. ÉP HÀNH ĐỘNG, KHÔNG ĐỀ XUẤT SUÔNG
9. KHÔNG ĐỂ DOANH NGHIỆP BỊ BẤT NGỜ
10. FINAL TEST: Nếu không khiến việc được xử lý sớm hơn → thất bại

### 6.2 Các View Chính

#### 6.2.1 CEO View (`/control-tower/ceo`)
**Mục đích:** Strategic decisions requiring CEO attention

**Content:**
- Cross-module conflicts
- Critical resource allocation
- Strategic risks

**States:**
- ✓ "All decisions are on track" (Green)
- ⚠ Active decisions requiring attention (Yellow/Red)

#### 6.2.2 COO View (`/control-tower/coo`)
**Mục đích:** Operational execution queue

**Content:**
- Daily operational alerts
- Process issues
- Resource conflicts

#### 6.2.3 Situation Room
**Mục đích:** Crisis management

**Triggers:**
- Multiple critical alerts
- Cross-module cascades
- Emergency scenarios

#### 6.2.4 Board View
**Mục đích:** Governance và strategic oversight

**Content:**
- Key performance summary
- Risk overview
- Strategic decisions pending

#### 6.2.5 All Alerts
**Mục đích:** Complete alert history

**Filters:**
- By severity (Critical, High, Medium, Low)
- By status (Active, Acknowledged, Resolved)
- By module (FDP, MDP, CDP)

### 6.3 Alert Structure

Mỗi alert phải trả lời:
1. **Mất bao nhiêu tiền?** (Impact amount)
2. **Nếu không xử lý, sẽ mất thêm bao nhiêu?** (Escalation impact)
3. **Còn bao lâu để hành động?** (Deadline)

**Alert Lifecycle:**
```
Created → Acknowledged → In Progress → Resolved
                ↓
            Escalated (if overdue)
```

### 6.4 Decision Card Structure

| Element | Description |
|---------|-------------|
| Title | ≤8 words (verb + object) |
| Context | 1 line situation summary |
| Impact | Financial impact + Risk level |
| Confidence | Locked/Observed/Estimated badge |
| Recommended Action | Primary + Alternative |
| Owner | Assigned role |
| Resolution Window | Time remaining |

### 6.5 Control Tower Routes Summary

| Route | Feature | Priority |
|-------|---------|----------|
| `/control-tower/ceo` | CEO View | Critical |
| `/control-tower/coo` | COO View | High |
| `/control-tower/situation` | Situation Room | High |
| `/control-tower/board` | Board View | Medium |
| `/control-tower/alerts` | All Alerts | Medium |

---

## 7. CROSS-MODULE INTEGRATION

### 7.1 Data Flywheel (12 Integration Cases)

```
┌─────────────────────────────────────────────────────────────┐
│  CDP ──────> FDP (Case 1: Revenue Forecast)                 │
│  FDP ──────> MDP (Case 2: Locked Costs)                     │
│  CDP ──────> MDP (Case 3: Segment LTV)                      │
│  CDP ──────> MDP (Case 4: Churn Signals)                    │
│  MDP ──────> CDP (Case 5: Attribution CAC)                  │
│  MDP ──────> CDP (Case 6: Acquisition Source)               │
│  FDP ──────> CDP (Case 7: Actual Revenue)                   │
│  FDP ──────> CDP (Case 8: Credit Risk)                      │
│  MDP ──────> FDP (Case 9: Seasonal Patterns)                │
│  MDP ──────> FDP (Case 10: Channel ROI)                     │
│  CT  ──────> All (Case 11: Variance Alerts)                 │
│  All ──────> CT  (Case 12: Priority Queue)                  │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Chi tiết Integration Cases

| Case | From | To | Data | Purpose |
|------|------|----|----|---------|
| 1 | CDP | FDP | Revenue Forecast | Monthly planning |
| 2 | FDP | MDP | Locked Costs | Profit ROAS calculation |
| 3 | CDP | MDP | Segment LTV | Budget allocation |
| 4 | CDP | MDP | Churn Signals | Retention campaigns |
| 5 | MDP | CDP | Attribution | Cohort CAC |
| 6 | MDP | CDP | New Customer Source | Customer tagging |
| 7 | FDP | CDP | Actual Revenue | Equity recalibration |
| 8 | FDP | CDP | AR Aging | Credit risk scoring |
| 9 | MDP | FDP | Seasonal Patterns | Revenue forecast |
| 10 | MDP | FDP | Channel ROI | Budget reallocation |
| 11 | CT | All | Variance Alerts | Decision dispatch |
| 12 | All | CT | Aggregate Signals | Priority queue |

### 7.3 Fallback Strategy (3-Level Chain)

| Level | Name | Description | Confidence |
|-------|------|-------------|------------|
| 3 | LOCKED | Cross-module verified data | High |
| 2 | OBSERVED | Module-internal actual data | Medium |
| 1 | ESTIMATED | Industry benchmarks | Low |

**Example (MDP Cost for ROAS):**
1. Try `fdp_locked_costs` (LOCKED)
2. Fallback to `cdp_orders.cogs_amount` (OBSERVED)
3. Fallback to 55% COGS benchmark (ESTIMATED)

---

## 8. DATA ARCHITECTURE

### 8.1 Layer Architecture

```
Layer 0: External Data (Connectors)
    ↓
Layer 1: Source Tables (cdp_orders, cdp_customers)
    ↓
Layer 2: Computed Tables (cdp_customer_equity_computed)
    ↓
Layer 3: Database Views (v_fdp_finance_summary, v_cdp_*)
    ↓
Layer 4: Hooks (useFinanceTruthSnapshot, useCDPPopulations)
    ↓
Layer 5: Pages (Dashboard, CDP Overview)
    ↓
Layer 6: Menu (Navigation)
```

### 8.2 Key Tables

| Table | Module | Purpose |
|-------|--------|---------|
| cdp_orders | CDP/FDP | SSOT for all order data |
| cdp_customers | CDP | Customer master data |
| cdp_customer_equity_computed | CDP | Pre-computed customer value |
| central_metrics_snapshots | FDP | Precomputed financial metrics |
| promotion_campaigns | MDP | Campaign performance data |
| alert_instances | CT | Alert storage |
| decision_cards | CT | Decision card storage |

### 8.3 Key Views

| View | Purpose |
|------|---------|
| v_fdp_finance_summary | Rolling financial overview |
| v_channel_pl_summary | Channel-level P&L |
| v_cdp_category_conversion_stats | Category performance |
| v_ct_priority_queue | Control Tower priority queue |

### 8.4 Key RPCs

| RPC | Purpose |
|-----|---------|
| compute_central_metrics_snapshot | Financial metrics computation |
| cdp_run_full_daily_pipeline | CDP daily orchestration |
| cross_module_run_daily_sync | Cross-module sync |
| detect_cross_domain_variance | Variance detection |

---

## APPENDIX

### A. Glossary

| Term | Definition |
|------|------------|
| SSOT | Single Source of Truth |
| ROAS | Return on Ad Spend |
| CM | Contribution Margin |
| CCC | Cash Conversion Cycle |
| DSO | Days Sales Outstanding |
| DIO | Days Inventory Outstanding |
| DPO | Days Payable Outstanding |
| LTV | Lifetime Value |
| CAC | Customer Acquisition Cost |
| RFM | Recency, Frequency, Monetary |

### B. Quick Reference - Routes

| Route | Module | Feature |
|-------|--------|---------|
| `/portal` | Portal | Main dashboard |
| `/dashboard` | FDP | Liquidity dashboard |
| `/fdp/*` | FDP | Finance features |
| `/mdp` | MDP | Marketing decisions |
| `/cdp` | CDP | Customer platform |
| `/control-tower/*` | CT | Decision center |

### C. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 01/01/2026 | Initial release |
| 2.0 | 28/01/2026 | Phase 8 fixes, Full documentation |

---

**Document Status:** ✅ Complete  
**Maintained by:** Bluecore System Team  
**Next Review:** 28/02/2026
