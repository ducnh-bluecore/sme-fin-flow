# BLUECORE DATA PLATFORM - TÀI LIỆU HỆ THỐNG TOÀN DIỆN

> **Phiên bản:** 3.0 | **Cập nhật:** 2026-01-23  
> **Modules:** FDP | MDP | Control Tower | CDP

---

## 📑 MỤC LỤC

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Kiến Trúc & Data Flow](#2-kiến-trúc--data-flow)
3. [Nguyên Tắc Cốt Lõi (Manifestos)](#3-nguyên-tắc-cốt-lõi)
4. [Module FDP - Financial Data Platform](#4-module-fdp)
5. [Module MDP - Marketing Data Platform](#5-module-mdp)
6. [Module Control Tower](#6-module-control-tower)
7. [Module CDP - Customer Data Platform](#7-module-cdp)
8. [Bluecore Scores™](#8-bluecore-scores)
9. [Database Schema](#9-database-schema)
10. [Hooks Reference](#10-hooks-reference)
11. [Use Cases](#11-use-cases)

---

## 1. Tổng Quan Hệ Thống

### 1.1 Mục Đích

Bluecore Data Platform là hệ thống **Financial Intelligence** dành cho CEO/CFO điều hành doanh nghiệp SME/E-commerce. Hệ thống được thiết kế theo nguyên tắc **Single Source of Truth (SSOT)** - chỉ có MỘT con số duy nhất cho mỗi metric.

### 1.2 Bốn Module Chính

| Module | Triết Lý | Người Dùng | Vai Trò |
|--------|----------|------------|---------|
| **FDP** | Financial Truth | CEO, CFO | Nguồn sự thật tài chính duy nhất |
| **MDP** | Profit before Performance | CMO, CFO | Đo giá trị tài chính của marketing |
| **Control Tower** | Awareness before Analytics | COO, Operations | Báo động và ép hành động |
| **CDP** | Customer = Financial Asset | CEO, CFO, Head of Growth | Phát hiện value shifts trong khách hàng |

### 1.3 Nguyên Tắc Thiết Kế Chung

| Nguyên Tắc | Mô Tả |
|------------|-------|
| **Single Source of Truth** | 1 Net Revenue, 1 CM, 1 Cash Position - không có phiên bản khác |
| **Real Cash** | Phân biệt: đã về / sẽ về / có nguy cơ không về / đang bị khóa |
| **Truth > Flexibility** | Không cho tùy chỉnh công thức để tránh "chọn số đẹp" |
| **Revenue ↔ Cost** | Mọi doanh thu đều đi kèm chi phí tương ứng |
| **Today's Decision** | Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng |
| **Surface Problems** | Không làm đẹp số, chỉ ra vấn đề sớm |

### 1.4 Stack Công Nghệ

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                    │
│  React 18 + TypeScript + Vite + TailwindCSS + Framer Motion        │
│  Capacitor (Mobile: iOS/Android)                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Lovable Cloud)                        │
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

## 2. Kiến Trúc & Data Flow

### 2.1 High-Level Architecture

```
                              ┌───────────────────────────────────────────────┐
                              │              BLUECORE PORTAL                   │
                              │           (Entry Point: /portal)               │
                              └───────────────────────────────────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    │                               │                               │
          ┌─────────┴─────────┐           ┌────────┴────────┐           ┌──────────┴──────────┐
          ▼                   ▼           ▼                 ▼           ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│       FDP       │   │  CONTROL TOWER  │   │       MDP       │   │       CDP       │
│   Financial     │   │     Alert &     │   │    Marketing    │   │    Customer     │
│     Truth       │   │  Decision Engine│   │   Intelligence  │   │  Value Shifts   │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ • CFO Dashboard │   │ • Alerts        │   │ • CMO Mode      │   │ • Equity        │
│ • Cash Flow     │   │ • Tasks         │   │ • Marketing Mode│   │ • Populations   │
│ • Unit Economics│   │ • Escalation    │   │ • Profit Attr.  │   │ • Insights      │
│ • Channel P&L   │   │ • Risk Appetite │   │ • Cash Impact   │   │ • Decisions     │
│ • Scenario      │   │ • Team          │   │ • ROI Analytics │   │ • Trends        │
│ • Reconciliation│   │                 │   │                 │   │                 │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │                      │
         └─────────────────────┼─────────────────────┼──────────────────────┘
                               │                     │
                               ▼                     ▼
                  ┌───────────────────────────────────────────────┐
                  │              DATA WAREHOUSE HUB               │
                  │  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
                  │  │ BigQuery│ │Connectors│ │  ETL   │          │
                  │  └─────────┘ └─────────┘ └─────────┘          │
                  └───────────────────────────────────────────────┘
```

### 2.2 Data Flow Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATA SOURCES                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│   E-COMMERCE              SHIPPING             BANKING              ERP/POS             │
│   ┌─────────┐            ┌─────────┐          ┌─────────┐          ┌─────────┐          │
│   │ Shopee  │            │   GHN   │          │   VCB   │          │ KiotViet│          │
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
│   CORE TABLES              ANALYTICS TABLES          CDP TABLES                          │
│   ┌─────────────┐          ┌─────────────────┐       ┌─────────────────┐                 │
│   │external_orders│        │channel_analytics │       │cdp_customer_metrics│              │
│   │invoices     │          │marketing_expenses│       │cdp_populations  │                 │
│   │bills        │          │channel_settlements│      │cdp_insights     │                 │
│   │bank_accounts│          │channel_pl_cache  │       │cdp_decision_cards│                │
│   │products     │          │promotion_campaigns│      │cdp_trend_alerts │                 │
│   └─────────────┘          └─────────────────┘       └─────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Nguyên Tắc Cốt Lõi

### 3.1 FDP MANIFESTO - 10 Nguyên Tắc Bất Biến

| # | Nguyên Tắc | Mô Tả |
|---|------------|-------|
| 1 | **KHÔNG PHẢI KẾ TOÁN** | Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế |
| 2 | **SINGLE SOURCE OF TRUTH** | 1 Net Revenue, 1 CM, 1 Cash Position - không có phiên bản khác |
| 3 | **TRUTH > FLEXIBILITY** | Không cho tự định nghĩa metric, không chỉnh công thức |
| 4 | **REAL CASH** | Phân biệt: đã về / sẽ về / có nguy cơ không về / đang bị khóa |
| 5 | **REVENUE ↔ COST** | Mọi doanh thu đều đi kèm chi phí |
| 6 | **UNIT ECONOMICS → ACTION** | SKU lỗ + khóa cash + tăng risk → phải nói STOP |
| 7 | **TODAY'S DECISION** | Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng |
| 8 | **SURFACE PROBLEMS** | Không làm đẹp số, chỉ ra vấn đề sớm |
| 9 | **FEED CONTROL TOWER** | FDP là nguồn sự thật, Control Tower hành động dựa trên đó |
| 10 | **FINAL TEST** | Nếu không khiến quyết định rõ ràng hơn → thất bại |

### 3.2 MDP MANIFESTO - Profit before Performance

| # | Nguyên Tắc | Mô Tả |
|---|------------|-------|
| 1 | **KHÔNG PHẢI MARTECH** | Không chạy ads, không quản lý campaign |
| 2 | **ĐO GIÁ TRỊ TÀI CHÍNH** | Marketing tạo hay phá huỷ giá trị tài chính? |
| 3 | **CEO/CFO TRƯỚC** | CFO hiểu, CEO quyết, marketer điều chỉnh |
| 4 | **PROFIT ATTRIBUTION** | Không có ROAS chưa tính logistics/return |
| 5 | **GẮN VỚI CASHFLOW** | Tiền về nhanh hay chậm? Có khóa cash không? |
| 6 | **NUÔI FDP & CONTROL TOWER** | Insight marketing phải thay đổi số trong FDP |
| 7 | **RỦI RO > THÀNH TÍCH** | Phát hiện marketing đốt tiền, growth giả |
| 8 | **ĐƠN GIẢN HOÁ** | Logic rõ ràng, CFO tin được |

### 3.3 CONTROL TOWER MANIFESTO - Awareness before Analytics

| # | Nguyên Tắc | Mô Tả |
|---|------------|-------|
| 1 | **KHÔNG PHẢI DASHBOARD** | Tồn tại để báo động và hành động |
| 2 | **CHỈ QUAN TÂM "SAI"** | "Điều gì đang sai và cần xử lý ngay?" |
| 3 | **ALERT PHẢI ĐAU** | Mất bao nhiêu? Không xử lý thì sao? Còn bao lâu? |
| 4 | **ÍT NHƯNG CHÍ MẠNG** | Tối đa 5-7 alert tại mọi thời điểm |
| 5 | **CÓ CHỦ SỞ HỮU** | Owner + Trạng thái + Outcome |
| 6 | **KHÔNG REAL-TIME VÔ NGHĨA** | Cash near-realtime, Marketing daily |
| 7 | **GẮN VỚI FDP** | Alert dựa trên Financial Truth |
| 8 | **ÉP HÀNH ĐỘNG** | "Ai cần làm gì trong bao lâu" |

### 3.4 CDP MANIFESTO - Customer = Financial Asset

| # | Nguyên Tắc | Mô Tả |
|---|------------|-------|
| 1 | **KHÔNG PHẢI CRM** | CDP là financial intelligence layer |
| 2 | **POPULATION > INDIVIDUAL** | Phân tích cohort/segment, không cá nhân |
| 3 | **SHIFT, KHÔNG PHẢI SNAPSHOT** | "Đang thay đổi như thế nào so với baseline?" |
| 4 | **INSIGHT QUY RA TIỀN** | Impact bắt buộc: VNĐ hoặc % rủi ro |
| 5 | **KHÔNG SỞ HỮU HÀNH ĐỘNG** | Chỉ phát tín hiệu, không trigger campaign |
| 6 | **CẤM ENGAGEMENT METRICS** | Không CTR, không open rate, không page view |
| 7 | **NGÔN NGỮ KINH TẾ** | "Value shift" không phải "khách không hài lòng" |
| 8 | **FEED DECISION PROMPTS** | Đặt câu hỏi quyết định, không đưa ra quyết định |

---

## 4. Module FDP - Financial Data Platform

### 4.1 Tổng Quan

FDP là nền tảng tài chính cốt lõi, cung cấp **Financial Truth** để ra quyết định điều hành.

**Không phải**: Phần mềm kế toán, báo cáo thuế  
**Là**: Công cụ điều hành tài chính real-time cho CEO/CFO

### 4.2 Chức Năng Chính

| Nhóm | Chức Năng | Mô Tả |
|------|-----------|-------|
| **Financial Truth** | CFO Dashboard | KPIs: Cash, AR, AP, DSO, DPO, CCC |
| | Real Cash Position | Cash đã về vs sẽ về vs bị khóa |
| | Unit Economics | CM per order, AOV, COGS breakdown |
| **Cash Control** | Cash Flow Direct | Dòng tiền phương pháp trực tiếp |
| | Cash Forecast | Dự báo 30 ngày, 13 tuần |
| | Cash Runway | Số ngày còn hoạt động được |
| **Channel Economics** | Channel P&L | Lãi/lỗ theo kênh bán hàng |
| | Fee Breakdown | Chi tiết phí sàn, phí vận chuyển |
| | Reconciliation | Đối soát ngân hàng - hóa đơn |
| **Scenario & Planning** | What-If Analysis | Mô phỏng kịch bản tài chính |
| | Budget vs Actual | So sánh thực tế với ngân sách |
| | Rolling Forecast | Dự báo cuốn chiếu 18 tháng |
| **Decision Support** | Decision Center | Dashboard quyết định |
| | ROI Analysis | Phân tích ROI đầu tư |
| | NPV/IRR Analysis | Định giá dự án |

### 4.3 Màn Hình (Routes)

| Route | Tên | Mô Tả |
|-------|-----|-------|
| `/` hoặc `/fdp` | CFO Dashboard | Tổng quan tài chính |
| `/cash-flow` | Cash Flow Direct | Dòng tiền trực tiếp |
| `/cash-forecast` | Cash Forecast | Dự báo cash |
| `/unit-economics` | Unit Economics | Phân tích SKU |
| `/channel-pl` | Channel P&L | Lãi lỗ theo kênh |
| `/working-capital` | Working Capital | Vốn lưu động |
| `/ar-operations` | AR Operations | Công nợ phải thu |
| `/bills` | AP Bills | Công nợ phải trả |
| `/reconciliation-hub` | Reconciliation | Đối soát |
| `/scenario` | Scenario Hub | Quản lý scenarios |
| `/what-if` | What-If Analysis | Mô phỏng |
| `/budget` | Budget vs Actual | Ngân sách |
| `/rolling-forecast` | Rolling Forecast | Dự báo cuốn chiếu |
| `/decision-center` | Decision Center | Trung tâm quyết định |

### 4.4 Core Hooks

#### `useFDPMetrics()` - SSOT Hook
```typescript
// Location: src/hooks/useFDPMetrics.ts
// Purpose: Single Source of Truth cho TẤT CẢ metrics tài chính

interface FDPMetrics {
  revenue: FDPRevenueMetrics;      // Gross, Net, Returns, Discounts
  costs: FDPCostMetrics;           // COGS, Fees, Marketing, OPEX
  profit: FDPProfitMetrics;        // Gross Profit, Contribution Margin
  marketing: FDPMarketingMetrics;  // ROAS, CAC, LTV
  orders: FDPOrderMetrics;         // AOV, Order counts
  customers: FDPCustomerMetrics;   // New, Repeat, LTV
  channelMetrics: FDPChannelMetrics[];
  formulas: FormulaResults;
  dataQuality: DataQualityInfo;
}

// Usage
const { data: metrics } = useFDPMetrics();
const netRevenue = metrics?.revenue.netRevenue;
const contributionMargin = metrics?.profit.contributionMargin;
```

#### `useCashRunway()` - Cash Analysis
```typescript
// Location: src/hooks/useCashRunway.ts
interface CashRunwayData {
  currentCash: number;
  burnRate: number;           // Monthly burn
  runwayMonths: number;
  runwayDays: number;
  riskLevel: 'safe' | 'warning' | 'critical';
}
```

#### `useFinanceTruthSnapshot()` - Realtime Snapshot
```typescript
// Location: src/hooks/useFinanceTruthSnapshot.ts
interface FinanceTruthSnapshot {
  snapshotAt: string;
  netRevenue: number;
  grossProfit: number;
  contributionMargin: number;
  ebitda: number;
  cashBalance: number;
  totalAR: number;
  overdueAR: number;
  totalAP: number;
  overdueAP: number;
  dso: number;
  dpo: number;
  ccc: number;
}
```

#### `useReconciliationSSOT()` - Ledger Operations
```typescript
// Location: src/hooks/useReconciliationSSOT.ts
// Functions:
useReconciliationLinks()     // List all reconciliation entries
useCreateReconciliationLink() // Create new link (write to ledger)
useVoidReconciliationLink()   // Void a link (soft delete)
useAutoMatchSSOT()           // Auto-matching algorithm
```

### 4.5 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `external_orders` | Order headers | `net_revenue`, `net_profit`, `status` |
| `external_order_items` | SKU-level details | `sku`, `gross_profit`, `margin_percent` |
| `invoices` | AR invoices | `total_amount`, `paid_amount`, `status` |
| `bills` | AP bills | `total_amount`, `paid_amount`, `due_date` |
| `bank_accounts` | Bank registry | `current_balance`, `bank_name` |
| `bank_transactions` | Bank statements | `amount`, `transaction_type` |
| `reconciliation_links` | Core ledger | `settlement_amount`, `match_type` |
| `cash_flow_direct` | Cash flow statement | Operating/Investing/Financing |

### 4.6 Công Thức Tính Toán

```
Net Revenue = Gross Revenue - Returns - Discounts - Vouchers
Gross Profit = Net Revenue - COGS
Contribution Margin = Gross Profit - Variable Costs (Fees + Marketing + Shipping)
EBITDA = Contribution Margin - Fixed Operating Expenses

DSO = (Average AR / Revenue) × Days
DPO = (Average AP / COGS) × Days
CCC = DIO + DSO - DPO

Cash Runway = Available Cash / Average Daily Burn Rate
```

---

## 5. Module MDP - Marketing Data Platform

### 5.1 Tổng Quan

MDP đo lường **giá trị tài chính thật** của marketing, không phải performance metrics.

**Không phải**: Martech, Ads Manager, Analytics  
**Là**: Marketing Financial Intelligence cho CMO/CFO

### 5.2 Two Modes

| Mode | Focus | Users | Metrics |
|------|-------|-------|---------|
| **Marketing Mode** | Execution | Marketing Team | CTR, CPC, CPA, Conversion |
| **CMO Mode** | Decision & Accountability | CMO, CFO, CEO | CM, Profit ROAS, Cash Conversion |

### 5.3 Chức Năng Chính

| Chức Năng | Mô Tả |
|-----------|-------|
| **Profit Attribution** | CM quy về từng campaign/channel |
| **Cash Impact** | Tiền về vs tiền còn đang khóa |
| **Channel Economics** | P&L từng kênh marketing |
| **Risk Alerts** | Cảnh báo marketing đốt tiền |
| **ROI Analytics** | Phân tích ROI theo cohort |

### 5.4 Màn Hình (Routes)

| Route | Tên | Mô Tả |
|-------|-----|-------|
| `/mdp` | MDP Dashboard | Tổng quan CMO Mode |
| `/mdp/marketing` | Marketing Mode | Performance execution |
| `/mdp/funnel` | Funnel Analysis | Conversion funnel |
| `/mdp/roi` | ROI Analytics | Channel ROI deep-dive |
| `/channel-pl` | Channel P&L | Lãi/Lỗ theo kênh |
| `/channel-analytics` | Channel Analytics | Traffic & conversion |

### 5.5 Core Hooks

#### `useMDPData()` - Unified Marketing Data
```typescript
// Location: src/hooks/useMDPData.ts
interface MDPReturn {
  // Marketing Mode
  marketingPerformance: MarketingPerformance[];
  funnelData: FunnelStage[];
  executionAlerts: ExecutionAlert[];
  marketingModeSummary: MarketingModeSummary;
  
  // CMO Mode  
  profitAttribution: ProfitAttribution[];
  cashImpact: CashImpact[];
  riskAlerts: MarketingRiskAlert[];
  cmoModeSummary: CMOModeSummary;
  
  isLoading: boolean;
  error: Error | null;
}
```

#### Key Types

```typescript
interface ProfitAttribution {
  campaign_id: string;
  channel: string;
  gross_revenue: number;
  net_revenue: number;
  ad_spend: number;
  cogs: number;
  platform_fees: number;
  contribution_margin: number;
  contribution_margin_percent: number;
  profit_roas: number;  // CM / Ad Spend
  status: 'profitable' | 'marginal' | 'loss' | 'critical';
}

interface CashImpact {
  channel: string;
  total_spend: number;
  cash_received: number;
  pending_cash: number;
  cash_locked_ads: number;
  cash_conversion_rate: number;
  avg_days_to_cash: number;
  is_cash_positive: boolean;
}
```

### 5.6 MDP Thresholds

```typescript
export const MDP_THRESHOLDS = {
  MIN_CM_PERCENT: 10,         // Minimum 10% margin
  MIN_PROFIT_ROAS: 0.3,       // CM / Ad Spend >= 0.3
  MAX_CAC_TO_AOV: 0.3,        // CAC ≤ 30% AOV
  MIN_CASH_CONVERSION: 0.7,   // ≥ 70% cash received
  MAX_DAYS_TO_CASH: 30,       // Maximum 30 days
};
```

### 5.7 Công Thức

```
Profit ROAS = Contribution Margin / Ad Spend
True CAC = (Ad Spend + Marketing Costs) / New Customers
LTV:CAC Ratio = Customer Lifetime Value / CAC
Days to Cash = Avg days from ad spend to cash received
Cash Conversion Rate = Cash Received / Total Revenue
```

---

## 6. Module Control Tower

### 6.1 Tổng Quan

Control Tower tồn tại để **báo động và ép hành động**, không phải dashboard.

**Không phải**: BI Dashboard, Report viewer  
**Là**: Alert & Decision Engine cho Operations

### 6.2 Chức Năng Chính

| Chức Năng | Mô Tả |
|-----------|-------|
| **Alerts Center** | Trung tâm cảnh báo (max 5-7 alerts) |
| **Tasks Management** | Quản lý công việc từ alerts |
| **Escalation Rules** | Tự động escalate khi không xử lý |
| **Risk Appetite** | Cấu hình ngưỡng rủi ro |
| **Decision Cards** | Auto-generated decision prompts |
| **Store Health** | Sức khỏe từng cửa hàng |

### 6.3 Màn Hình (Routes)

| Route | Tên | Mô Tả |
|-------|-----|-------|
| `/control-tower` | Control Tower | Dashboard chính |
| `/control-tower/alerts` | Alerts | Danh sách cảnh báo |
| `/control-tower/tasks` | Tasks | Quản lý công việc |
| `/control-tower/stores` | Store Health | Sức khỏe cửa hàng |
| `/control-tower/risk-appetite` | Risk Appetite | Cấu hình ngưỡng |
| `/control-tower/team` | Team | Quản lý team |

### 6.4 Alert Structure

Mỗi alert BẮT BUỘC phải có:

```typescript
interface Alert {
  // Identity
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  
  // REQUIRED: Impact
  impact_amount: number;        // Mất bao nhiêu tiền?
  impact_if_ignored: number;    // Không xử lý thì sao?
  deadline: string;             // Còn bao lâu?
  
  // Ownership
  owner_id: string;             // Ai chịu trách nhiệm?
  status: 'active' | 'acknowledged' | 'resolved';
  
  // Action
  suggested_action: string;
  linked_decision_card_id?: string;
}
```

### 6.5 Core Hooks

#### `useAlertInstances()` - Alert Management
```typescript
// Location: src/hooks/useAlertInstances.ts
interface AlertInstance {
  id: string;
  alert_type: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  current_value: number;
  threshold_value: number;
  impact_amount: number;
  status: 'active' | 'acknowledged' | 'resolved' | 'snoozed';
  owner_id: string;
}

// Mutations
useAcknowledgeAlert()
useResolveAlert()
useSnoozeAlert()
useRealtimeAlerts()
```

#### `useRiskAppetite()` - Risk Configuration
```typescript
// Location: src/hooks/useRiskAppetite.ts
interface RiskAppetiteRule {
  risk_domain: string;        // 'liquidity', 'receivables', etc.
  metric_code: string;        // 'cash_runway_days', 'dso', etc.
  warning_threshold: number;
  critical_threshold: number;
  operator: string;           // 'less_than', 'greater_than'
}
```

#### `useAutoDecisionCards()` - Auto-generated Decisions
```typescript
// Location: src/hooks/useAutoDecisionCards.ts
interface AutoDecisionCard {
  card_type: string;          // 'SKU_STOP', 'CASH_ALERT', etc.
  title: string;
  severity: 'critical' | 'warning' | 'info';
  metric_value: number;
  impact_amount: number;
  recommended_action: string;
  status: 'pending' | 'decided' | 'dismissed';
}
```

### 6.6 Alert Categories

| Category | Metrics | Thresholds |
|----------|---------|------------|
| **Liquidity** | Cash Runway | Critical: < 30 days, Warning: < 90 days |
| **Receivables** | DSO, Overdue AR% | Critical: DSO > 60, Warning: DSO > 45 |
| **Profitability** | Gross Margin | Critical: < 15%, Warning: < 25% |
| **Efficiency** | CCC | Critical: > 60 days, Warning: > 45 days |
| **Concentration** | Top Customer % | Critical: > 40%, Warning: > 30% |

---

## 7. Module CDP - Customer Data Platform

### 7.1 Tổng Quan

CDP phát hiện **value shifts** trong tập khách hàng để ra quyết định về pricing, policy, growth.

**Không phải**: CRM, Marketing Automation, Customer 360  
**Là**: Customer Financial Intelligence Layer

### 7.2 CDP Chỉ Trả Lời

| # | Câu Hỏi | Output |
|---|---------|--------|
| 1 | Tập khách hàng đang **mất giá trị** ở đâu? | Trend Insight |
| 2 | Giá trị đang **dịch chuyển** sang cấu trúc kém lợi nhuận? | Trend Insight |
| 3 | Tốc độ **quay vòng khách** đang chậm lại? | Trend Insight |
| 4 | Đang **giữ sai loại khách** hay **mất đúng loại khách**? | Decision Prompt |
| 5 | Không thay đổi chính sách thì **rủi ro tài chính** là gì? | Decision Prompt |

### 7.3 CDP Outputs

CDP **CHỈ** tạo ra 3 loại output:

#### Trend Insight
```typescript
interface TrendInsight {
  metric: string;           // "vip_segment_size"
  baseline_period: string;  // "Q1-2024"
  current_period: string;   // "Q2-2024"
  change_percent: number;   // -8.5
  
  // REQUIRED: Financial impact
  revenue_impact: number;   // -2,400,000,000 VND
  margin_impact: number;    // -340,000,000 VND
  
  confidence: 'high' | 'medium' | 'low';
}
```

#### Decision Prompt
```typescript
interface DecisionPrompt {
  question: string;         // "Có nên điều chỉnh chính sách VIP?"
  context: string;          
  
  // REQUIRED: Trade-offs
  options: {
    action: string;
    projected_impact: number;
    risk_level: 'high' | 'medium' | 'low';
  }[];
  
  // NO action field - CDP không hành động
}
```

#### Audience Definition (Read-only)
```typescript
interface AudienceDefinition {
  id: string;
  name: string;             // "High-Value At-Risk"
  version: number;          // Immutable
  member_count: number;
  total_value: number;
  // NO export/sync/push capabilities
}
```

### 7.4 Màn Hình (Routes)

| Route | Tên | Mô Tả |
|-------|-----|-------|
| `/cdp` | CDP Overview | Tổng quan Customer Equity |
| `/cdp/equity` | Customer Equity | Phân tích giá trị khách hàng |
| `/cdp/populations` | Populations | Quản lý segments |
| `/cdp/insights` | Insights | Trend insights |
| `/cdp/decisions` | Decision Cards | Thẻ quyết định |
| `/cdp/explore` | Explore | Khám phá data |
| `/cdp/trends` | Trend Engine | Phát hiện xu hướng |
| `/cdp/demand` | Demand Insights | Insight về demand |

### 7.5 Core Hooks

#### `useCDPEquity()` - Customer Value Analysis
```typescript
// Location: src/hooks/useCDPEquity.ts
interface CDPEquityData {
  totalEquity12M: number;     // Total projected value
  atRiskValue: number;        // Value at risk
  bySegment: SegmentEquity[];
  byCohort: CohortEquity[];
  trends: EquityTrend[];
}
```

#### `useCDPOverview()` - Equity Snapshot
```typescript
// Location: src/hooks/useCDPOverview.ts
interface CDPEquitySnapshot {
  totalEquity12M: number;
  atRiskValue: number;
  topSegmentConcentration: number;
  churnRiskCustomers: number;
  dataQualityScore: number;
}
```

#### `useCDPInsightFeed()` - Insights
```typescript
// Location: src/hooks/useCDPInsightFeed.ts
interface CDPInsight {
  id: string;
  insight_type: 'value' | 'timing' | 'demand';
  title: string;
  description: string;
  metric_code: string;
  change_percent: number;
  revenue_impact: number;
  confidence_score: number;
  data_quality_score: number;
}
```

#### `useCDPPopulations()` - Segment Management
```typescript
// Location: src/hooks/useCDPPopulations.ts
interface CDPPopulation {
  id: string;
  name: string;
  criteria: PopulationCriteria[];
  member_count: number;
  total_value: number;
  avg_order_value: number;
  version: number;
}
```

#### `useCDPDecisionCards()` - Governance
```typescript
// Location: src/hooks/useCDPDecisionCards.ts
interface CDPDecisionCard {
  id: string;
  title: string;
  problem_statement: string;
  linked_insights: string[];
  linked_populations: string[];
  risk_assessment: {
    revenue_risk: 'high' | 'medium' | 'low';
    cashflow_risk: 'high' | 'medium' | 'low';
    longterm_risk: 'high' | 'medium' | 'low';
  };
  status: 'new' | 'in_review' | 'decided';
  decision_text?: string;
  decision_type?: 'accept_risk' | 'adjust_strategy' | 'investigate';
}
```

### 7.6 CDP Metrics Registry

| Code | Name | Category | Granularity |
|------|------|----------|-------------|
| `VAL_REV` | Revenue per Customer | Value | Cohort/Segment |
| `VAL_GM` | Gross Margin per Customer | Value | Cohort/Segment |
| `VAL_LTV` | Lifetime Value | Value | Cohort/Segment |
| `VAL_AOV` | Average Order Value (median) | Value | Distribution |
| `VEL_T2P` | Time to Second Purchase | Velocity | Cohort |
| `VEL_FRQ` | Purchase Frequency | Velocity | Rolling |
| `RSK_RET` | Return/Refund Rate | Risk | Segment |
| `RSK_CHN` | Churn Probability | Risk | Cohort/Segment |
| `RSK_CON` | Revenue Concentration | Risk | Population |
| `QUA_IDC` | Identity Coverage | Quality | Population |

### 7.7 Metrics Bị Cấm

```
🚫 FORBIDDEN IN CDP:
- Open rate, Click rate, CTR
- Session duration, Page view
- Lead status, Deal stage
- Customer happiness, Engagement score
- Loyalty points, Rewards
- Task count, Call count
```

### 7.8 CDP → Other Modules Integration

```
┌─────────────────────────────────────────────────────────┐
│                        CDP                               │
│              (Value Shift Detection)                     │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Control Tower  │     │      FDP        │
│ • Receive       │     │ • CLV in        │
│   Decision      │     │   projections   │
│   Prompts       │     │ • Customer      │
│ • Assign owner  │     │   margin in P&L │
└─────────────────┘     └─────────────────┘
          │
          ▼
┌─────────────────┐
│      MDP        │
│ • Audience      │
│   definitions   │
│ • CAC/LTV by    │
│   segment       │
└─────────────────┘
```

---

## 8. Bluecore Scores™

### 8.1 Tổng Quan

Bốn điểm số executive-level đánh giá sức khỏe doanh nghiệp:

| Score | Tên Đầy Đủ | Câu Hỏi Trả Lời |
|-------|------------|-----------------|
| **CHS** | Cash Health Score | Doanh nghiệp có đủ tiền để tồn tại? |
| **GQS** | Growth Quality Score | Tăng trưởng có bền vững và có lãi? |
| **MAS** | Marketing Accountability Score | Marketing có đang tạo giá trị thật? |
| **CVRS** | Customer Value & Risk Score | Tập khách hàng có đang tạo/phá giá trị? |

### 8.2 Score Grades

| Grade | Score Range | Meaning |
|-------|-------------|---------|
| **EXCELLENT** | 80-100 | Tuyệt vời, duy trì |
| **GOOD** | 60-79 | Tốt, có thể cải thiện |
| **WARNING** | 40-59 | Cần chú ý, có rủi ro |
| **CRITICAL** | 0-39 | Nguy hiểm, cần hành động ngay |

### 8.3 Công Thức

#### Cash Health Score (CHS)
```
CHS = 
  30% × (Cash Runway Score) +
  25% × (Cash Conversion Score) +
  20% × (AR Collection Score) +
  15% × (Operating Cash Flow Score) +
  10% × (Cash Buffer Score)
```

#### Growth Quality Score (GQS)
```
GQS = 
  35% × (Revenue Growth vs Margin) +
  25% × (Customer Quality Growth) +
  20% × (Repeat Revenue Share) +
  20% × (Channel Diversification)
```

#### Marketing Accountability Score (MAS)
```
MAS = 
  40% × (Profit ROAS Score) +
  30% × (CAC/LTV Score) +
  20% × (Cash Impact Score) +
  10% × (Attribution Confidence)
```

#### Customer Value & Risk Score (CVRS)
```
CVRS = 
  30% × (Value Concentration Score) +
  25% × (Churn Risk Score) +
  25% × (Value Trend Score) +
  20% × (Data Quality Score)
```

### 8.4 Hook

```typescript
// Location: src/hooks/useBluecoreScores.ts
interface BluecoreScore {
  type: 'CASH_HEALTH' | 'GROWTH_QUALITY' | 'MARKETING_ACCOUNTABILITY' | 'CUSTOMER_VALUE_RISK';
  score: number;            // 0-100
  grade: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  trend: 'UP' | 'DOWN' | 'STABLE';
  primary_driver: string;   // What's affecting the score most
  recommendation: string;   // What to do
}

const { data: scores } = useBluecoreScores();
```

---

## 9. Database Schema

### 9.1 Core Tables

| Table | Module | Purpose |
|-------|--------|---------|
| `tenants` | Core | Multi-tenant support |
| `profiles` | Core | User profiles |
| `external_orders` | FDP | Order headers |
| `external_order_items` | FDP | SKU-level order details |
| `invoices` | FDP | AR invoices |
| `bills` | FDP | AP bills |
| `bank_accounts` | FDP | Bank account registry |
| `bank_transactions` | FDP | Bank statement entries |
| `reconciliation_links` | FDP | Bank-invoice matching ledger |
| `cash_flow_direct` | FDP | Direct method cash flow |
| `promotion_campaigns` | MDP | Marketing campaigns |
| `marketing_expenses` | MDP | Marketing spend |
| `channel_analytics` | MDP | Channel performance |
| `channel_settlements` | MDP | Platform settlements |
| `alert_instances` | Control Tower | Alert records |
| `intelligent_alert_rules` | Control Tower | Alert configurations |
| `risk_appetites` | Control Tower | Risk threshold configs |
| `risk_breach_events` | Control Tower | Breach detection log |
| `cdp_customer_metrics` | CDP | Customer value metrics |
| `cdp_populations` | CDP | Customer segments |
| `cdp_insights` | CDP | Trend insights |
| `cdp_decision_cards` | CDP | Decision governance |
| `bluecore_scores` | Scores | Executive health metrics |

### 9.2 Key Views

| View | Module | Purpose |
|------|--------|---------|
| `fdp_sku_summary` | FDP | Aggregated SKU profitability |
| `ar_aging` | FDP | AR aging buckets |
| `ap_aging` | FDP | AP aging buckets |
| `v_invoice_settled_status` | FDP | Invoice settlement SSOT |
| `v_bank_txn_match_state` | FDP | Bank transaction match SSOT |
| `v_customer_ar_summary` | FDP | Customer AR summary |
| `trial_balance` | FDP | Trial balance from GL |
| `mv_board_summary` | Control Tower | Board-level summary |
| `v_cdp_equity_overview` | CDP | Customer equity overview |
| `v_cdp_equity_snapshot` | CDP | Latest equity snapshot |

---

## 10. Hooks Reference

### 10.1 FDP Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useFDPMetrics` | useFDPMetrics.ts | **SSOT** - All financial metrics |
| `useFDPAggregatedMetrics` | useFDPAggregatedMetrics.ts | Aggregated metrics |
| `useFinanceTruthSnapshot` | useFinanceTruthSnapshot.ts | Realtime snapshot |
| `useFinanceMonthlySummary` | useFinanceMonthlySummary.ts | Monthly data |
| `useCentralFinancialMetrics` | useCentralFinancialMetrics.ts | Central metrics |
| `useCashRunway` | useCashRunway.ts | Cash runway & burn |
| `useCashFlowDirect` | useCashFlowDirect.ts | Direct method |
| `useReconciliationSSOT` | useReconciliationSSOT.ts | Reconciliation |
| `useUnitEconomics` | useUnitEconomics.ts | Per-order economics |
| `useSKUProfitabilityCache` | useSKUProfitabilityCache.ts | SKU profitability |
| `useChannelPL` | useChannelPL.ts | Channel P&L |
| `useWorkingCapitalDaily` | useWorkingCapitalDaily.ts | Working capital |
| `useTopCustomersAR` | useTopCustomersAR.ts | Top AR customers |

### 10.2 MDP Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useMDPData` | useMDPData.ts | **SSOT** - All marketing data |
| `useMDPExtendedData` | useMDPExtendedData.ts | Extended marketing data |
| `useChannelAnalytics` | useChannelAnalytics.ts | Channel analytics |
| `useChannelAnalyticsCache` | useChannelAnalyticsCache.ts | Cached analytics |
| `useChannelBudgets` | useChannelBudgets.ts | Budget management |
| `useMarketingProfitability` | useMarketingProfitability.ts | Marketing profit (legacy) |
| `usePromotions` | usePromotions.ts | Promotion management |

### 10.3 Control Tower Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAlertInstances` | useAlertInstances.ts | Alert CRUD |
| `useIntelligentAlertRules` | useIntelligentAlertRules.ts | Alert rules |
| `useAlertEscalation` | useAlertEscalation.ts | Escalation |
| `useRiskAppetite` | useRiskAppetite.ts | Risk configs |
| `useAutoDecisionCards` | useAutoDecisionCards.ts | Auto decisions |
| `useNotificationCenter` | useNotificationCenter.ts | Notifications |
| `useControlTowerAnalytics` | useControlTowerAnalytics.ts | Analytics |
| `useRiskScores` | useRiskScores.ts | Risk scoring |
| `useRiskAlerts` | useRiskAlerts.ts | Risk alerts |

### 10.4 CDP Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useCDPOverview` | useCDPOverview.ts | CDP overview |
| `useCDPEquity` | useCDPEquity.ts | Customer equity |
| `useCDPPopulations` | useCDPPopulations.ts | Populations |
| `useCDPInsightFeed` | useCDPInsightFeed.ts | Insights |
| `useCDPInsightDetail` | useCDPInsightDetail.ts | Insight detail |
| `useCDPInsightRegistry` | useCDPInsightRegistry.ts | Insight registry |
| `useCDPDecisionCards` | useCDPDecisionCards.ts | Decision cards |
| `useCDPDemandInsights` | useCDPDemandInsights.ts | Demand insights |
| `useCDPValueDistribution` | useCDPValueDistribution.ts | Value distribution |
| `useCDPExplore` | useCDPExplore.ts | Customer exploration |
| `useCDPAudit` | useCDPAudit.ts | Audit trail |

### 10.5 Common Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAuth` | useAuth.tsx | Authentication |
| `useActiveTenantId` | useActiveTenantId.ts | Tenant context |
| `useTenant` | useTenant.ts | Tenant management |
| `useTeamMembers` | useTeamMembers.ts | Team management |
| `useBluecoreScores` | useBluecoreScores.ts | Executive scores |
| `useRealtimeDashboard` | useRealtimeDashboard.ts | Realtime updates |

---

## 11. Use Cases

### 11.1 FDP Use Cases

#### UC-FDP-001: Theo dõi Cash Position hàng ngày
**Actor**: CFO  
**Mô tả**: CFO mở CFO Dashboard để xem cash position hiện tại  
**Flow**:
1. Đăng nhập → Portal → FDP
2. Xem CFO Dashboard với Cash Balance, AR, AP
3. Drill-down vào Cash Flow Direct để xem chi tiết
4. Check Cash Runway để đánh giá rủi ro

**Data**: `useFinanceTruthSnapshot()`, `useCashRunway()`

#### UC-FDP-002: Phân tích SKU lỗ để quyết định STOP
**Actor**: CFO, CEO  
**Mô tả**: Xác định SKU đang lỗ để quyết định dừng bán  
**Flow**:
1. Vào Unit Economics → SKU Profitability
2. Xem danh sách SKU với margin < 0
3. Xem chi tiết: COGS, Fees, Impact
4. Tạo Decision Card để phê duyệt STOP

**Data**: `useSKUProfitabilityCache()`, `useAllProblematicSKUs()`

#### UC-FDP-003: Đối soát ngân hàng - hóa đơn
**Actor**: Kế toán  
**Mô tả**: Đối soát giao dịch ngân hàng với hóa đơn  
**Flow**:
1. Vào Reconciliation Hub
2. Chạy Auto-Match để tìm matches
3. Review suggestions, confirm/reject
4. Xử lý exceptions thủ công

**Data**: `useReconciliationSSOT()`, `useAutoMatchSSOT()`

### 11.2 MDP Use Cases

#### UC-MDP-001: Đánh giá hiệu quả marketing theo channel
**Actor**: CMO  
**Mô tả**: Xem channel nào đang tạo profit vs đốt tiền  
**Flow**:
1. Vào MDP → CMO Mode
2. Xem Profit Attribution theo channel
3. Identify channels với CM < 0
4. Xem Cash Impact: tiền đã về vs còn đang khóa

**Data**: `useMDPData()`, `useChannelPL()`

#### UC-MDP-002: Phát hiện marketing đốt tiền
**Actor**: CFO  
**Mô tả**: Alert khi marketing spend không tạo profit  
**Flow**:
1. MDP tự động detect campaigns với Profit ROAS < threshold
2. Tạo Risk Alert
3. Push to Control Tower
4. Assign owner để review

**Data**: `useMDPData().riskAlerts`

### 11.3 Control Tower Use Cases

#### UC-CT-001: Xử lý alert Cash Runway critical
**Actor**: CFO  
**Mô tả**: Cash runway < 30 ngày → cần hành động ngay  
**Flow**:
1. Nhận alert "Cash Runway Critical"
2. Acknowledge alert
3. Review suggested actions
4. Execute (thu AR sớm, delay AP, cut expenses)
5. Resolve với notes

**Data**: `useAlertInstances()`, `useRiskAppetite()`

#### UC-CT-002: Escalate alert không xử lý
**Actor**: System  
**Mô tả**: Alert không được xử lý sau X phút → escalate  
**Flow**:
1. Alert được tạo, assign owner
2. Sau escalation_minutes, owner chưa acknowledge
3. System escalate lên manager
4. Repeat until resolved

**Data**: `useAlertEscalation()`

### 11.4 CDP Use Cases

#### UC-CDP-001: Phát hiện VIP segment shrinking
**Actor**: CEO, Head of Growth  
**Mô tả**: Phát hiện segment VIP đang giảm size  
**Flow**:
1. CDP detect: VIP segment -8% MoM
2. Tạo Trend Insight với revenue_impact
3. Push Decision Prompt: "Có nên điều chỉnh chính sách VIP?"
4. CEO review options và trade-offs
5. Record decision (không trigger action)

**Data**: `useCDPInsightFeed()`, `useCDPDecisionCards()`

#### UC-CDP-002: Đánh giá customer concentration risk
**Actor**: CFO  
**Mô tả**: Top 10% khách hàng đóng góp > 60% revenue  
**Flow**:
1. CDP detect: Revenue Concentration = 65%
2. Tạo Risk Insight
3. Quantify: "Mất 3 top customers = -2.1 tỷ revenue"
4. Decision Prompt: "Có nên đa dạng hóa customer base?"

**Data**: `useCDPEquity()`, `useCDPValueDistribution()`

#### UC-CDP-003: Governance recording cho audit
**Actor**: CEO, CFO  
**Mô tả**: Ghi nhận quyết định cho audit trail  
**Flow**:
1. Xem Decision Card với problem statement
2. Review linked insights và populations
3. Đánh giá risk (Revenue, Cashflow, Long-term)
4. Select decision type và ghi decision text
5. Submit để lưu vào audit log

**Data**: `useCDPDecisionCards()`, `useCDPAudit()`

---

## 12. Appendix

### 12.1 Glossary

| Term | Definition |
|------|------------|
| **SSOT** | Single Source of Truth - nguồn dữ liệu duy nhất |
| **CM** | Contribution Margin - lợi nhuận sau biến phí |
| **DSO** | Days Sales Outstanding - số ngày thu tiền |
| **DPO** | Days Payable Outstanding - số ngày trả tiền |
| **CCC** | Cash Conversion Cycle - vòng quay tiền mặt |
| **AR** | Accounts Receivable - công nợ phải thu |
| **AP** | Accounts Payable - công nợ phải trả |
| **ROAS** | Return on Ad Spend |
| **CAC** | Customer Acquisition Cost |
| **LTV** | Lifetime Value |
| **CLV** | Customer Lifetime Value |
| **AOV** | Average Order Value |

### 12.2 File Structure

```
src/
├── hooks/                    # All React Query hooks
│   ├── useFDPMetrics.ts     # FDP SSOT
│   ├── useMDPData.ts        # MDP SSOT
│   ├── useAlertInstances.ts # Control Tower
│   ├── useCDPOverview.ts    # CDP
│   └── ...
├── pages/
│   ├── fdp/                 # FDP pages
│   ├── mdp/                 # MDP pages
│   ├── control-tower/       # Control Tower pages
│   ├── cdp/                 # CDP pages
│   └── PortalPage.tsx       # Entry point
├── components/
│   ├── decision/            # Decision components
│   ├── fdp/                 # FDP components
│   ├── mdp/                 # MDP components
│   ├── control-tower/       # Control Tower components
│   └── cdp/                 # CDP components
└── integrations/
    └── supabase/            # Supabase client & types
```

---

**Phiên bản:** 3.0  
**Cập nhật:** 2026-01-23  
**Tác giả:** Bluecore Team
