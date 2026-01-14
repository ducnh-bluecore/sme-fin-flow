# 🏗️ Bluecore Platform - Kiến trúc Hệ thống & Spec Chi tiết

> **Phiên bản:** 3.1  
> **Cập nhật:** 2025-01-14

---

## 📑 Mục lục

1. [Tổng quan Kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Sơ đồ Hệ thống Chi tiết](#2-sơ-đồ-hệ-thống-chi-tiết)
3. [Module FDP - Financial Data Platform](#3-module-fdp---financial-data-platform)
4. [Module Control Tower](#4-module-control-tower)
5. [Module MDP - Marketing Data Platform](#5-module-mdp---marketing-data-platform)
6. [Data Warehouse & Integration](#6-data-warehouse--integration)
7. [Luồng dữ liệu End-to-End](#7-luồng-dữ-liệu-end-to-end)
8. [Database Schema Overview](#8-database-schema-overview)

---

## 1. Tổng quan Kiến trúc

### 1.1 Ba Module Chính

Bluecore Platform gồm **3 module chính**, mỗi module có triết lý và mục đích riêng biệt:

| Module | Triết lý | Người dùng chính |
|--------|----------|------------------|
| **FDP** - Financial Data Platform | Financial Truth - Single Source of Truth | CEO, CFO |
| **Control Tower** | Alert & Decision Engine - Awareness before Analytics | COO, Operations |
| **MDP** - Marketing Data Platform | Profit before Performance - Cash before Clicks | CMO, Marketing |

### 1.2 Triết lý Thiết kế

| Nguyên tắc | Mô tả |
|------------|-------|
| **Single Source of Truth** | 1 Net Revenue, 1 Contribution Margin, 1 Cash Position - không có phiên bản khác |
| **Real Cash** | Phân biệt rõ: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa |
| **Truth > Flexibility** | Không cho tùy chỉnh công thức để tránh "chọn số đẹp" |
| **Revenue ↔ Cost** | Mọi doanh thu đều đi kèm chi phí tương ứng |
| **Today's Decision** | Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng |

### 1.3 Stack Công nghệ

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                    │
│  React 18 + TypeScript + Vite + TailwindCSS + Framer Motion        │
│  Capacitor (Mobile: iOS/Android)                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Lovable Cloud)                     │
│  Supabase: PostgreSQL + Auth + Realtime + Edge Functions + Storage │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                │
│  BigQuery │ E-commerce APIs │ Banking APIs │ POS │ ERP             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Sơ đồ Hệ thống Chi tiết

### 2.1 High-Level Architecture

```
                              ┌───────────────────────────────────────────────┐
                              │              BLUECORE PLATFORM                 │
                              └───────────────────────────────────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               │                               │
                    ▼                               ▼                               ▼
          ┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
          │       FDP       │             │  CONTROL TOWER  │             │       MDP       │
          │    Financial    │             │     Alert &     │             │    Marketing    │
          │     Platform    │             │  Decision Engine│             │     Platform    │
          ├─────────────────┤             ├─────────────────┤             ├─────────────────┤
          │ • Dashboard     │             │ • Alerts        │             │ • CMO Mode      │
          │ • Cash Flow     │             │ • Tasks         │             │ • Marketing Mode│
          │ • Unit Economics│             │ • Escalation    │             │ • Profit Attr.  │
          │ • Channel P&L   │             │ • Team          │             │ • Cash Impact   │
          │ • Scenario/WhatIf│            │ • Analytics     │             │ • ROI Analytics │
          │ • Decision Supp.│             │                 │             │                 │
          └────────┬────────┘             └────────┬────────┘             └────────┬────────┘
                   │                               │                               │
                   └───────────────────────────────┼───────────────────────────────┘
                                                   │
                                                   ▼
                              ┌───────────────────────────────────────────────┐
                              │              DATA WAREHOUSE HUB               │
                              │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
                              │  │ BigQuery│ │Connectors│ │  ETL   │          │
                              │  └─────────┘ └─────────┘ └─────────┘          │
                              └───────────────────────────────────────────────┘
                                                    │
              ┌─────────────────┬───────────────────┼───────────────────┬─────────────────┐
              │                 │                   │                   │                 │
              ▼                 ▼                   ▼                   ▼                 ▼
        ┌──────────┐      ┌──────────┐        ┌──────────┐        ┌──────────┐      ┌──────────┐
        │  Shopee  │      │  Lazada  │        │  TikTok  │        │   POS    │      │  Banking │
        │   API    │      │   API    │        │   Shop   │        │  Systems │      │   APIs   │
        └──────────┘      └──────────┘        └──────────┘        └──────────┘      └──────────┘
```

### 2.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATA SOURCES                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│   E-COMMERCE              SHIPPING             BANKING              ERP/POS             │
│   ┌─────────┐            ┌─────────┐          ┌─────────┐          ┌─────────┐          │
│   │ Shopee  │            │   GHN   │          │   VCB   │          │  KiotViet│          │
│   │ Lazada  │            │  GHTK   │          │   TCB   │          │  Sapo   │          │
│   │ TikTok  │            │ Viettel │          │   MBB   │          │  MISA   │          │
│   └────┬────┘            └────┬────┘          └────┬────┘          └────┬────┘          │
│        └──────────────────────┴────────────────────┴────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SYNC CONNECTORS LAYER                                       │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                       │
│   │  sync-connector  │  │  sync-bigquery   │  │ sync-ecommerce   │                       │
│   │  (Edge Function) │  │  (Edge Function) │  │  (Edge Function) │                       │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE DATABASE                                           │
│   CORE TABLES              ANALYTICS TABLES          ALERT TABLES                        │
│   ┌─────────────┐          ┌─────────────────┐       ┌─────────────────┐                 │
│   │external_orders│        │channel_analytics │       │alert_instances  │                 │
│   │invoices     │          │marketing_expenses│       │intelligent_rules│                 │
│   │bills        │          │promotion_campaigns│      │alert_objects    │                 │
│   │bank_accounts│          │channel_settlements│      │escalation_rules │                 │
│   │products     │          │channel_pl_cache  │       │notification_logs│                 │
│   └─────────────┘          └─────────────────┘       └─────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION MODULES                                         │
│                                                                                          │
│         ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐           │
│         │        FDP        │   │   CONTROL TOWER   │   │        MDP        │           │
│         ├───────────────────┤   ├───────────────────┤   ├───────────────────┤           │
│         │ Dashboard         │   │ Alerts            │   │ CMO Mode          │           │
│         │ Cash Flow         │   │ Tasks             │   │ Marketing Mode    │           │
│         │ Unit Economics    │   │ Escalation        │   │ Profit Attribution│           │
│         │ Channel P&L       │   │ Team Management   │   │ Cash Impact       │           │
│         │ Scenario Planning │   │ Analytics         │   │ ROI Analytics     │           │
│         │ Decision Support  │   │                   │   │ A/B Testing       │           │
│         │ What-If Analysis  │   │                   │   │ Customer LTV      │           │
│         └───────────────────┘   └───────────────────┘   └───────────────────┘           │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module FDP - Financial Data Platform

### 3.1 Mục đích & Triết lý

> **FDP KHÔNG PHẢI PHẦN MỀM KẾ TOÁN** - Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế

FDP là nền tảng tài chính cốt lõi, cung cấp **Financial Truth** (Single Source of Truth) để ra quyết định điều hành.

### 3.2 Chức năng chính

| Nhóm chức năng | Mô tả |
|----------------|-------|
| **Financial Truth** | Dashboard KPIs, Real Cash Position, Unit Economics |
| **Cash Control** | Cash Flow Direct, Cash Forecast, Cash Runway |
| **Channel Economics** | Channel P&L, Fee Breakdown, Reconciliation |
| **Scenario & Planning** | What-If Analysis, Budget vs Actual, Rolling Forecast |
| **Decision Support** | Decision Center, ROI Analysis, NPV/IRR, Sensitivity |

### 3.3 Màn hình chính

| Màn hình | Route | Mô tả |
|----------|-------|-------|
| CFO Dashboard | `/` | Tổng quan: Cash, AR, AP, DSO, DPO, CCC |
| Cash Flow Direct | `/cash-flow` | Dòng tiền theo phương pháp trực tiếp |
| Cash Forecast | `/cash-forecast` | Dự báo 30 ngày, 13 tuần |
| Unit Economics | `/unit-economics` | Phân tích hiệu quả SKU/kênh |
| Channel P&L | `/channel-pl` | Lãi lỗ theo kênh bán hàng |
| Working Capital | `/working-capital` | Quản lý vốn lưu động |
| AR Operations | `/ar-operations` | Công nợ phải thu |
| Bills (AP) | `/bills` | Công nợ phải trả |
| **Scenario Hub** | `/scenario` | Quản lý các scenario |
| **What-If Analysis** | `/what-if` | Mô phỏng kịch bản |
| **Budget vs Actual** | `/budget` | So sánh thực tế với ngân sách |
| **Rolling Forecast** | `/rolling-forecast` | Dự báo cuốn chiếu |
| **Decision Center** | `/decision-center` | Dashboard quyết định |
| **Decision Support** | `/decision-support` | ROI/NPV/IRR Analysis |

### 3.4 Bảng dữ liệu chính

| Bảng | Mục đích | Trường quan trọng |
|------|----------|-------------------|
| `bank_accounts` | Tài khoản ngân hàng | `current_balance`, `status` |
| `bank_transactions` | Giao dịch ngân hàng | `amount`, `transaction_type`, `transaction_date` |
| `invoices` | Hóa đơn bán hàng (AR) | `total_amount`, `paid_amount`, `due_date`, `status` |
| `bills` | Hóa đơn mua hàng (AP) | `total_amount`, `paid_amount`, `due_date`, `status` |
| `expenses` | Chi phí hoạt động | `amount`, `category`, `expense_date` |
| `external_orders` | Đơn hàng e-commerce | `order_value`, `channel`, `order_status` |
| `external_products` | Sản phẩm | `cost_price`, `selling_price`, `stock_quantity` |
| `channel_settlements` | Thanh toán từ sàn | `gross_sales`, `total_fees`, `net_amount` |
| `scenarios` | Kịch bản | `name`, `assumptions`, `status` |
| `monthly_plans` | Kế hoạch tháng | `revenue_target`, `expense_budget` |
| `decision_analyses` | Phân tích đầu tư | `npv`, `irr`, `payback_period` |

### 3.5 KPI & Công thức

```
┌─────────────────────────────────────────────────────────────────┐
│                     FDP CORE FORMULAS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NET REVENUE = Gross Sales - Returns - Discounts - Platform Fees│
│                                                                  │
│  CONTRIBUTION MARGIN = Net Revenue - COGS - Variable Costs      │
│                                                                  │
│  REAL CASH POSITION = Bank Balance                              │
│                       + AR sẽ về (trọng số theo tuổi nợ)        │
│                       - AP phải trả (trong kỳ)                  │
│                       - Cash bị khóa (inventory, ads, deposits) │
│                                                                  │
│  DSO = (Total AR × 90) / Revenue 90 ngày                        │
│  DPO = (Total AP × 90) / COGS 90 ngày                           │
│  DIO = (Inventory Value × 90) / COGS 90 ngày                    │
│  CCC = DSO + DIO - DPO                                          │
│                                                                  │
│  CASH RUNWAY = Current Cash / Monthly Burn Rate                 │
│                                                                  │
│  GROSS MARGIN = (Revenue - COGS) / Revenue × 100%               │
│                                                                  │
│  NPV = Σ [Cash Flow / (1 + r)^t]                                │
│  IRR = Rate where NPV = 0                                       │
│  PAYBACK = Time to recover initial investment                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.6 Rule Logic

| Rule | Điều kiện | Hành động |
|------|-----------|-----------|
| AR Overdue Alert | `days_overdue > 30` AND `amount > threshold` | Tạo alert, thông báo collector |
| Cash Runway Warning | `runway_months < 3` | Escalate to CFO/CEO |
| SKU Stop Signal | `contribution_margin < 0` AND `cash_locked > threshold` | Đề xuất ngừng bán SKU |
| AP Priority | `due_date - today <= 7` AND `discount_available` | Đề xuất thanh toán sớm |
| Investment Decision | `NPV > 0` AND `IRR > hurdle_rate` | Recommend Approve |

---

## 4. Module Control Tower

### 4.1 Mục đích & Triết lý

> **CONTROL TOWER KHÔNG PHẢI DASHBOARD** - Tồn tại để báo động và ép hành động, không phải để hiển thị số liệu đẹp

Control Tower là **Alert & Decision Engine**:
- Chỉ quan tâm "điều gì đang sai và cần xử lý ngay"
- Nếu không có vấn đề → Control Tower im lặng
- Mỗi alert phải có: Mất bao nhiêu tiền? Nếu không xử lý sẽ mất thêm bao nhiêu? Còn bao lâu để hành động?

### 4.2 Chức năng chính

| Nhóm chức năng | Mô tả |
|----------------|-------|
| **Alert Detection** | Phát hiện vấn đề dựa trên rules & thresholds |
| **Alert Management** | Quản lý, phân công, theo dõi alerts |
| **Escalation** | Tự động leo thang khi không xử lý |
| **Task Management** | Chuyển alert thành task để tracking |
| **Analytics** | Thống kê alert resolution, response time |

### 4.3 Màn hình chính

| Màn hình | Route | Mô tả |
|----------|-------|-------|
| Alerts | `/control-tower/alerts` | Danh sách alerts đang active |
| Tasks | `/control-tower/tasks` | Quản lý task từ alert |
| Intelligent Rules | `/control-tower/rules` | Cấu hình rule phát hiện |
| Analytics | `/control-tower/analytics` | Thống kê alert & resolution |
| Team | `/control-tower/team` | Quản lý người nhận thông báo |
| Settings | `/control-tower/settings` | Cấu hình escalation |

### 4.4 Bảng dữ liệu chính

| Bảng | Mục đích | Trường quan trọng |
|------|----------|-------------------|
| `intelligent_alert_rules` | Định nghĩa rule | `rule_name`, `calculation_formula`, `threshold_config`, `severity` |
| `alert_instances` | Alert đã phát hiện | `title`, `severity`, `impact_amount`, `assigned_to`, `status` |
| `alert_objects` | Đối tượng giám sát | `object_type`, `object_name`, `current_metrics` |
| `alert_escalation_rules` | Quy tắc leo thang | `escalate_after_minutes`, `escalate_to_role` |
| `alert_notification_logs` | Log thông báo | `channel`, `recipient`, `status`, `sent_at` |
| `notification_recipients` | Người nhận | `name`, `email`, `phone`, `role` |

### 4.5 Alert Structure (Bắt buộc)

```typescript
interface ValidAlert {
  // Mỗi alert PHẢI trả lời đủ 3 câu hỏi:
  impact_amount: number;        // Mất bao nhiêu tiền?
  impact_if_unresolved: number; // Không xử lý sẽ mất thêm bao nhiêu?
  deadline_at: Date;            // Còn bao lâu để hành động?
  
  // Metadata
  title: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  
  // Ownership - Alert PHẢI có owner
  assigned_to: string;
  status: 'open' | 'in_progress' | 'resolved';
  resolution_notes?: string;    // Outcome sau xử lý
}
```

### 4.6 Rule Categories & Formulas

| Category | Example Rules | Formula |
|----------|---------------|---------|
| **Cash & Liquidity** | Cash Runway Low | `cash_runway_months < 3` |
| | Cash Balance Drop | `(cash_today - cash_yesterday) / cash_yesterday < -0.1` |
| **Revenue & Orders** | Revenue Decline | `revenue_today / revenue_avg_7d < 0.8` |
| | Order Cancellation High | `cancelled_orders / total_orders > 0.05` |
| **Marketing** | ROAS Below Threshold | `revenue / ad_spend < 2` |
| | CAC Increase | `cac_today / cac_avg_30d > 1.2` |
| **Inventory** | Stockout Risk | `stock_quantity / avg_daily_sales < lead_time_days` |
| | Overstock Alert | `days_of_inventory > 90` |
| **AR/AP** | AR Aging Critical | `ar_over_90_days / total_ar > 0.2` |
| | Bill Due Approaching | `bill_due_in_days <= 3` |

### 4.7 Escalation Flow

```
┌──────────┐     15 min      ┌──────────┐     30 min      ┌──────────┐
│  Owner   │ ──────────────► │ Manager  │ ──────────────► │   CFO    │
│ Assigned │    No Action    │ Notified │    No Action    │ Notified │
└──────────┘                 └──────────┘                 └──────────┘
                                                                │
                                                                │ 60 min
                                                                │ No Action
                                                                ▼
                                                          ┌──────────┐
                                                          │   CEO    │
                                                          │ Notified │
                                                          └──────────┘
```

---

## 5. Module MDP - Marketing Data Platform

### 5.1 Mục đích & Triết lý

> **MDP KHÔNG PHẢI MARTECH** - Đo lường GIÁ TRỊ TÀI CHÍNH THẬT của marketing, không phải chạy quảng cáo

MDP phục vụ CEO & CFO trước, marketer sau. Marketing insight phải:
- CFO hiểu
- CEO quyết
- Marketer buộc phải điều chỉnh

### 5.2 Two Modes

| Mode | Người dùng | Mục đích |
|------|------------|----------|
| **CMO Mode** | CEO, CFO, CMO | Ra quyết định: Scale/Stop/Optimize dựa trên profit & cash |
| **Marketing Mode** | Marketing Team | Execution: Campaign performance, funnel, A/B testing |

### 5.3 Màn hình chính

**CMO Mode:**
| Màn hình | Route | Mô tả |
|----------|-------|-------|
| Command Center | `/mdp/cmo-mode` | Overview + Quick Actions |
| Profit Attribution | `/mdp/profit` | Profit thật từ marketing |
| Cash Impact | `/mdp/cash-impact` | Marketing ảnh hưởng cash |
| Risk Alerts | `/mdp/risks` | Marketing risks |
| Decisions | `/mdp/decisions` | Scale/Stop recommendations |

**Marketing Mode:**
| Màn hình | Route | Mô tả |
|----------|-------|-------|
| Overview | `/mdp/marketing-mode` | Performance metrics |
| Campaigns | `/mdp/campaigns` | Chi tiết campaigns |
| Channels | `/mdp/channels` | Performance theo platform |
| Funnel | `/mdp/funnel` | Conversion funnel |
| ROI Analytics | `/mdp/roi-analytics` | ROAS & ROI analysis |
| A/B Testing | `/mdp/ab-testing` | Kết quả thử nghiệm |
| Customer LTV | `/mdp/customer-ltv` | Lifetime value analysis |

### 5.4 Bảng dữ liệu chính

| Bảng | Mục đích | Trường quan trọng |
|------|----------|-------------------|
| `promotion_campaigns` | Campaigns | `name`, `channel`, `budget`, `actual_cost`, `start/end_date` |
| `marketing_expenses` | Chi phí MKT | `expense_type`, `channel`, `amount`, `expense_date` |
| `channel_analytics` | Metrics từ ads | `impressions`, `clicks`, `spend`, `conversions`, `revenue` |
| `channel_fees` | Phí platform | `fee_type`, `fee_amount`, `channel` |
| `channel_pl_cache` | P&L đã tính | `channel`, `revenue`, `cogs`, `fees`, `profit`, `margin` |

### 5.5 KPI & Công thức

```
┌─────────────────────────────────────────────────────────────────┐
│                     MDP CORE FORMULAS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ROAS (Traditional) = Revenue / Ad Spend                        │
│                                                                  │
│  PROFIT ROAS = Contribution Margin / Ad Spend                   │
│             = (Revenue - COGS - Fees - Shipping) / Ad Spend     │
│                                                                  │
│  TRUE CAC = (Ad Spend + MKT Salaries + Tools) / New Customers   │
│                                                                  │
│  LTV:CAC = Customer Lifetime Value / CAC                        │
│         ≥ 3 is healthy, < 1 is losing money                     │
│                                                                  │
│  DAYS TO CASH = AVG(order_date → payment_received_date)         │
│                                                                  │
│  MARKETING ROI = (Revenue - Cost - Ad Spend) / Ad Spend × 100%  │
│                                                                  │
│  CASH LOCKED IN ADS = Ad Spend + Days_to_Cash × Daily_Ad_Spend  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.6 Decision Logic

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        MARKETING DECISION TREE                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌─────────────────┐                                 │
│                         │ Profit ROAS > 1 │                                 │
│                         └────────┬────────┘                                 │
│                                  │                                          │
│              ┌───────────────────┴───────────────────┐                      │
│              │ YES                                   │ NO                   │
│              ▼                                       ▼                      │
│     ┌────────────────┐                      ┌────────────────┐              │
│     │ LTV:CAC ≥ 3?   │                      │   STOP/REDUCE  │              │
│     └───────┬────────┘                      │   Immediately  │              │
│             │                               └────────────────┘              │
│     ┌───────┴───────┐                                                       │
│     │ YES       │ NO                                                        │
│     ▼           ▼                                                           │
│  ┌──────┐  ┌───────────┐                                                    │
│  │SCALE │  │ MAINTAIN  │                                                    │
│  │Budget│  │ Optimize  │                                                    │
│  └──────┘  └───────────┘                                                    │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Warehouse & Integration

### 6.1 Màn hình chính

| Màn hình | Route | Mô tả |
|----------|-------|-------|
| Data Hub | `/data-hub` | Tổng quan data sources |
| Data Warehouse | `/data-warehouse` | BigQuery management |
| Reconciliation | `/reconciliation` | Đối soát e-commerce |

### 6.2 Connector Types

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONNECTOR INTEGRATIONS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  E-COMMERCE                SHIPPING                 BANKING      │
│  ┌──────────┐             ┌──────────┐            ┌──────────┐  │
│  │ Shopee   │             │ GHN      │            │ VCB      │  │
│  │ Lazada   │             │ GHTK     │            │ TCB      │  │
│  │ TikTok   │             │ Viettel  │            │ MBB      │  │
│  │ Tiki     │             │ J&T      │            │ BIDV     │  │
│  └──────────┘             └──────────┘            └──────────┘  │
│                                                                  │
│  DATA WAREHOUSE           POS/ERP                  OTHER         │
│  ┌──────────┐             ┌──────────┐            ┌──────────┐  │
│  │ BigQuery │             │ KiotViet │            │ Google   │  │
│  │ Snowflake│             │ Sapo     │            │ Analytics│  │
│  │          │             │ MISA     │            │ Facebook │  │
│  └──────────┘             └──────────┘            └──────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Bảng dữ liệu

| Bảng | Mục đích |
|------|----------|
| `connector_integrations` | Cấu hình kết nối |
| `bigquery_configs` | Cấu hình BigQuery |
| `bigquery_data_models` | Data models từ BQ |
| `sync_logs` | Log đồng bộ |

---

## 7. Luồng dữ liệu End-to-End

### 7.1 Order Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              ORDER LIFECYCLE                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐           │
│  │  Order   │──►│ Shipped  │──►│Delivered │──►│Settlement│──►│  Cash    │           │
│  │ Created  │   │          │   │          │   │ Received │   │ In Bank  │           │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘           │
│       │              │              │              │              │                  │
│       ▼              ▼              ▼              ▼              ▼                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐           │
│  │external_ │   │shipping_ │   │delivery_ │   │channel_  │   │bank_     │           │
│  │orders    │   │tracking  │   │confirmed │   │settlements   │transactions          │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘           │
│                                                                                      │
│  Metrics Updated:                                                                    │
│  - Revenue (gross)          - Shipping cost    - COGS realized  - Net revenue       │
│  - Order count              - Carrier fees     - Return rate    - Platform fees     │
│  - AOV                      - Delivery time    - Complete rate  - Cash position     │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Marketing → Cash Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         MARKETING TO CASH CONVERSION                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  Day 0           Day 1-3         Day 3-7         Day 7-14        Day 14-30          │
│  ┌───────┐       ┌───────┐       ┌───────┐       ┌───────┐       ┌───────┐          │
│  │  Ad   │──────►│ Click │──────►│ Order │──────►│Deliver│──────►│ Cash  │          │
│  │ Spend │       │       │       │       │       │       │       │       │          │
│  └───────┘       └───────┘       └───────┘       └───────┘       └───────┘          │
│     │               │               │               │               │               │
│  Cash OUT        No Cash         Cash Locked     Cash Locked     Cash IN            │
│  (Immediate)     Movement        (Inventory)     (Platform)      (Settlement)       │
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                    DAYS TO CASH = ~14-30 days                                │   │
│  │    Cash Locked in Marketing Cycle = Ad_Spend × Days_to_Cash / 30            │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Alert → Action Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              ALERT TO ACTION FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐           │
│  │ Data     │──►│ Detect   │──►│ Create   │──►│ Assign   │──►│ Resolve  │           │
│  │ Change   │   │ Anomaly  │   │ Alert    │   │ Owner    │   │ & Close  │           │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘           │
│       │              │              │              │              │                  │
│       ▼              ▼              ▼              ▼              ▼                  │
│  detect-alerts   intelligent_   alert_        notification_   resolution_           │
│  edge function   alert_rules    instances     recipients      notes                 │
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │              ESCALATION: 15min → Manager → 30min → CFO → 60min → CEO         │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema Overview

### 8.1 Core Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              ENTITY RELATIONSHIPS                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────┐     1:N     ┌──────────────┐                                      │
│  │   tenants    │────────────►│    users     │                                      │
│  └──────┬───────┘             └──────────────┘                                      │
│         │                                                                            │
│         │ 1:N                                                                        │
│         │                                                                            │
│  ┌──────┴───────────────────────────────────────────────────────────────┐           │
│  │                                                                       │           │
│  ▼                ▼                ▼                ▼                   ▼           │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│  │external_ │   │ invoices │   │  bills   │   │ expenses │   │ bank_    │          │
│  │ orders   │   │          │   │          │   │          │   │ accounts │          │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └──────────┘   └────┬─────┘          │
│       │              │              │                              │                │
│       │ 1:N          │ 1:N          │ 1:N                          │ 1:N            │
│       ▼              ▼              ▼                              ▼                │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                  ┌──────────┐          │
│  │external_ │   │ invoice_ │   │  bill_   │                  │  bank_   │          │
│  │order_items   │  items   │   │  items   │                  │transactions          │
│  └──────────┘   └──────────┘   └──────────┘                  └──────────┘          │
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐           │
│  │                        MARKETING DOMAIN                               │           │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐              │           │
│  │  │  promotion_  │   │  marketing_  │   │  channel_    │              │           │
│  │  │  campaigns   │   │  expenses    │   │  analytics   │              │           │
│  │  └──────────────┘   └──────────────┘   └──────────────┘              │           │
│  └──────────────────────────────────────────────────────────────────────┘           │
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐           │
│  │                          ALERT DOMAIN                                 │           │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐              │           │
│  │  │ intelligent_ │──►│   alert_     │──►│ notification_│              │           │
│  │  │ alert_rules  │   │  instances   │   │    logs      │              │           │
│  │  └──────────────┘   └──────────────┘   └──────────────┘              │           │
│  └──────────────────────────────────────────────────────────────────────┘           │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Key Views

| View | Purpose |
|------|---------|
| `ar_aging` | AR phân theo tuổi nợ |
| `ap_aging` | AP phân theo tuổi nợ |
| `cash_position` | Vị thế tiền mặt tổng hợp |
| `channel_pl_summary` | P&L theo kênh |
| `trial_balance` | Bảng cân đối thử |

---

## 📎 Phụ lục

### A. Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `detect-alerts` | Scheduled/Manual | Quét và tạo alerts |
| `sync-connector` | Scheduled | Sync data từ connectors |
| `sync-bigquery` | Scheduled | Sync data từ BigQuery |
| `process-alert-notifications` | After alert created | Gửi notifications |
| `analyze-financial-data` | Manual | AI phân tích tài chính |
| `decision-advisor` | Manual | AI đề xuất quyết định |
| `optimize-channel-budget` | Manual | AI tối ưu ngân sách |

### B. React Hooks (Key)

| Hook | Module | Purpose |
|------|--------|---------|
| `useCentralFinancialMetrics` | FDP | Single source of financial metrics |
| `useCashConversionCycle` | FDP | DSO, DPO, DIO, CCC calculations |
| `useWhatIfScenarios` | FDP | What-if calculations |
| `useDecisionAnalyses` | FDP | Decision/ROI analysis |
| `useAlertInstances` | Control Tower | Manage alerts |
| `useIntelligentAlertRules` | Control Tower | Manage alert rules |
| `useMDPData` | MDP | Marketing metrics |
| `useChannelPL` | MDP | Channel profitability |

---

## 📊 Tổng kết Cấu trúc Module

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              BLUECORE PLATFORM                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                              FDP                                             │    │
│  │                    Financial Data Platform                                   │    │
│  │                                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │    │
│  │  │ Financial   │  │ Cash        │  │ Scenario    │  │ Decision    │         │    │
│  │  │ Truth       │  │ Control     │  │ Planning    │  │ Support     │         │    │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤         │    │
│  │  │• Dashboard  │  │• Cash Flow  │  │• What-If    │  │• Decision   │         │    │
│  │  │• KPIs       │  │• Forecast   │  │• Budget     │  │  Center     │         │    │
│  │  │• Unit Econ  │  │• Runway     │  │• Rolling    │  │• ROI/NPV    │         │    │
│  │  │• Channel PL │  │• AR/AP      │  │  Forecast   │  │• Sensitivity│         │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌────────────────────────────────┐  ┌────────────────────────────────────────┐     │
│  │        CONTROL TOWER           │  │                MDP                     │     │
│  │    Alert & Decision Engine     │  │    Marketing Data Platform             │     │
│  │                                │  │                                        │     │
│  │  ┌──────────────────────────┐  │  │  ┌─────────────┐  ┌─────────────┐     │     │
│  │  │ • Alerts                 │  │  │  │ CMO Mode   │  │Marketing    │     │     │
│  │  │ • Tasks                  │  │  │  ├─────────────┤  │ Mode        │     │     │
│  │  │ • Escalation             │  │  │  │• Command   │  ├─────────────┤     │     │
│  │  │ • Team                   │  │  │  │  Center    │  │• Campaigns  │     │     │
│  │  │ • Analytics              │  │  │  │• Profit    │  │• Channels   │     │     │
│  │  └──────────────────────────┘  │  │  │• Cash      │  │• Funnel     │     │     │
│  │                                │  │  │• Risks     │  │• A/B Test   │     │     │
│  └────────────────────────────────┘  │  └─────────────┘  └─────────────┘     │     │
│                                      └────────────────────────────────────────┘     │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

*Tài liệu này được cập nhật theo phiên bản 3.1 - Tháng 1/2025*
