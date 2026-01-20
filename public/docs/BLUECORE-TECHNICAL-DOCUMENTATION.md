# BLUECORE DATA PLATFORM - Technical Documentation

> **Version:** 2.0 | **Last Updated:** 2026-01-20  
> **Modules:** FDP (Financial Data Platform) | MDP (Marketing Data Platform) | Control Tower

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Principles (Manifestos)](#core-principles)
3. [FDP - Financial Data Platform](#fdp-financial-data-platform)
4. [MDP - Marketing Data Platform](#mdp-marketing-data-platform)
5. [Control Tower](#control-tower)
6. [Database Schema](#database-schema)
7. [Hooks Reference](#hooks-reference)
8. [Formulas & Calculations](#formulas-calculations)
9. [Data Flow Architecture](#data-flow-architecture)

---

## 1. System Overview {#system-overview}

Bluecore Data Platform là hệ thống quản lý tài chính và vận hành dành cho CEO/CFO điều hành doanh nghiệp e-commerce. Hệ thống được thiết kế theo nguyên tắc **Single Source of Truth (SSOT)** - chỉ có MỘT con số duy nhất cho mỗi metric.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PORTAL (Entry Point)                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│      FDP      │     │      MDP      │     │ CONTROL TOWER │
│   Financial   │◄───►│   Marketing   │◄───►│   Operations  │
│    Truth      │     │   Analytics   │     │    Alerts     │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌───────────────────┐
                    │   DATA WAREHOUSE  │
                    │    (Supabase)     │
                    └───────────────────┘
```

---

## 2. Core Principles {#core-principles}

### FDP MANIFESTO - 10 Nguyên tắc bất biến

| # | Nguyên tắc | Mô tả |
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

### MDP MANIFESTO - Profit before Performance

| # | Nguyên tắc | Mô tả |
|---|------------|-------|
| 1 | **KHÔNG PHẢI MARTECH** | Không chạy ads, không quản lý campaign |
| 2 | **ĐO GIÁ TRỊ TÀI CHÍNH** | Marketing tạo hay phá huỷ giá trị tài chính? |
| 3 | **CEO/CFO TRƯỚC** | CFO hiểu, CEO quyết, marketer điều chỉnh |
| 4 | **PROFIT ATTRIBUTION** | Không có ROAS chưa tính logistics/return |
| 5 | **GẮN VỚI CASHFLOW** | Tiền về nhanh hay chậm? Có khóa cash không? |
| 6 | **NUÔI FDP & CONTROL TOWER** | Insight marketing phải thay đổi số trong FDP |
| 7 | **RỦI RO > THÀNH TÍCH** | Phát hiện marketing đốt tiền, growth giả |
| 8 | **ĐƠN GIẢN HOÁ** | Logic rõ ràng, CFO tin được |

### CONTROL TOWER MANIFESTO - Awareness before Analytics

| # | Nguyên tắc | Mô tả |
|---|------------|-------|
| 1 | **KHÔNG PHẢI DASHBOARD** | Tồn tại để báo động và hành động |
| 2 | **CHỈ QUAN TÂM "SAI"** | "Điều gì đang sai và cần xử lý ngay?" |
| 3 | **ALERT PHẢI ĐAU** | Mất bao nhiêu? Không xử lý thì sao? Còn bao lâu? |
| 4 | **ÍT NHƯNG CHÍ MẠNG** | Tối đa 5-7 alert tại mọi thời điểm |
| 5 | **CÓ CHỦ SỞ HỮU** | Owner + Trạng thái + Outcome |
| 6 | **KHÔNG REAL-TIME VÔ NGHĨA** | Cash near-realtime, Marketing daily |
| 7 | **GẮN VỚI FDP** | Alert dựa trên Financial Truth |
| 8 | **ÉP HÀNH ĐỘNG** | "Ai cần làm gì trong bao lâu" |

---

## 3. FDP - Financial Data Platform {#fdp-financial-data-platform}

### 3.1 Features Overview

| Feature | Route | Mô tả |
|---------|-------|-------|
| **CFO Dashboard** | `/fdp` | Tổng quan tài chính: Cash + AR + AP + P&L |
| **Unit Economics** | `/fdp/unit-economics` | Phân tích CM per order, AOV, COGS breakdown |
| **SKU Profitability** | `/fdp/sku-profitability` | Lợi nhuận từng SKU, Stop/Scale recommendations |
| **Cash Flow** | `/fdp/cash-flow` | Dòng tiền Direct Method, Cash Runway |
| **P&L Statement** | `/fdp/pl` | Báo cáo Lãi/Lỗ theo kênh |
| **AR Operations** | `/fdp/ar` | Quản lý công nợ phải thu |
| **AP Operations** | `/fdp/ap` | Quản lý công nợ phải trả |
| **Reconciliation** | `/fdp/reconciliation` | Đối soát ngân hàng - hóa đơn |
| **Inventory** | `/fdp/inventory` | Tồn kho, Days of Stock, Slow-moving |
| **Board Reports** | `/fdp/board-reports` | Báo cáo cho HĐQT |

### 3.2 Core Hooks

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
  formulas: FormulaResults;        // With interpretation
  dataQuality: DataQualityInfo;
}

// Usage - PHẢI dùng hook này thay vì tự tính
const { data: metrics } = useFDPMetrics();
const netRevenue = metrics?.revenue.netRevenue;
const contributionMargin = metrics?.profit.contributionMargin;
```

#### `useCashRunway()` - Cash Analysis
```typescript
// Location: src/hooks/useCashRunway.ts
// Purpose: Tính Cash Runway và Burn Rate

interface CashRunwayData {
  currentCash: number;
  burnRate: number;           // Monthly burn
  runwayMonths: number;
  runwayDays: number;
  riskLevel: 'safe' | 'warning' | 'critical';
}
```

#### `useReconciliationSSOT()` - Ledger Operations
```typescript
// Location: src/hooks/useReconciliationSSOT.ts
// Purpose: Đối soát ngân hàng - hóa đơn

// Core functions:
useReconciliationLinks()     // List all reconciliation entries
useCreateReconciliation()    // Create new link
useVoidReconciliation()      // Void a link
useReconciliationStats()     // Summary stats
```

#### `useUnitEconomics()` - Per-Order Analysis
```typescript
// Location: src/hooks/useUnitEconomics.ts
// Purpose: Unit Economics từ FDP Aggregated Metrics

interface UnitEconomicsData {
  aov: number;
  cogsPerOrder: number;
  feesPerOrder: number;
  shippingPerOrder: number;
  cmPerOrder: number;
  cmPercent: number;
  marketingCostPerOrder: number;
}
```

#### `useSKUProfitabilityFromView()` - SKU Analysis
```typescript
// Location: src/hooks/useSKUProfitabilityCache.ts
// Purpose: SKU-level profitability từ pre-aggregated view

interface SKUProfitability {
  sku: string;
  productName: string;
  orderCount: number;
  totalQuantity: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  marginPercent: number;
  recommendation: 'scale' | 'maintain' | 'review' | 'stop';
}
```

### 3.3 Database Tables

#### `external_orders` - Order Header
```sql
CREATE TABLE public.external_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  integration_id UUID NOT NULL,
  external_order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  channel TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  status TEXT,                    -- pending, confirmed, delivered, cancelled, returned
  
  -- Customer Info
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  shipping_address JSONB,
  
  -- Financials
  subtotal NUMERIC DEFAULT 0,
  item_discount NUMERIC DEFAULT 0,
  order_discount NUMERIC DEFAULT 0,
  voucher_discount NUMERIC DEFAULT 0,
  platform_fee NUMERIC DEFAULT 0,
  commission_fee NUMERIC DEFAULT 0,
  payment_fee NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  cost_of_goods NUMERIC DEFAULT 0,
  net_revenue NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `external_order_items` - SKU-Level Details
```sql
CREATE TABLE public.external_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  external_order_id UUID NOT NULL REFERENCES external_orders(id),
  
  -- Identification
  item_id TEXT,
  sku TEXT,
  product_id TEXT,
  product_name TEXT,
  category TEXT,
  
  -- Quantity & Pricing
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC,
  original_price NUMERIC,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC,
  
  -- Cost & Profit
  unit_cogs NUMERIC,
  total_cogs NUMERIC,
  gross_profit NUMERIC,
  margin_percent NUMERIC,
  
  -- Status
  item_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `invoices` - AR Invoices
```sql
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  customer_id UUID,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Amounts
  subtotal NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft',  -- draft, sent, paid, overdue, partial
  currency_code TEXT DEFAULT 'VND',
  exchange_rate NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `bills` - AP Bills
```sql
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  bill_number TEXT NOT NULL,
  vendor_id UUID,
  vendor_name TEXT NOT NULL,
  bill_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Amounts
  subtotal NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft',
  currency_code TEXT DEFAULT 'VND',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `reconciliation_links` - Core Ledger
```sql
CREATE TABLE public.reconciliation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Evidence
  bank_transaction_id UUID,       -- NULL = manual payment
  settlement_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'VND',
  settlement_date DATE NOT NULL,
  
  -- Target
  target_type TEXT DEFAULT 'invoice',  -- invoice, bill
  target_id UUID NOT NULL,
  
  -- Matching
  match_type TEXT,                -- auto, manual, exception
  match_confidence NUMERIC,
  
  -- Status
  is_voided BOOLEAN DEFAULT false,
  voided_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
```

#### `cash_flow_direct` - Cash Flow Statement
```sql
CREATE TABLE public.cash_flow_direct (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) DEFAULT 'monthly',
  
  -- Operating Inflows
  cash_from_customers NUMERIC(15,2) DEFAULT 0,
  cash_from_interest_received NUMERIC(15,2) DEFAULT 0,
  cash_from_other_operating NUMERIC(15,2) DEFAULT 0,
  
  -- Operating Outflows
  cash_to_suppliers NUMERIC(15,2) DEFAULT 0,
  cash_to_employees NUMERIC(15,2) DEFAULT 0,
  cash_for_rent NUMERIC(15,2) DEFAULT 0,
  cash_for_utilities NUMERIC(15,2) DEFAULT 0,
  cash_for_taxes NUMERIC(15,2) DEFAULT 0,
  cash_for_interest_paid NUMERIC(15,2) DEFAULT 0,
  cash_for_other_operating NUMERIC(15,2) DEFAULT 0,
  
  -- Calculated
  net_cash_operating NUMERIC(15,2) GENERATED ALWAYS AS (...),
  net_cash_investing NUMERIC(15,2) GENERATED ALWAYS AS (...),
  net_cash_financing NUMERIC(15,2) GENERATED ALWAYS AS (...),
  
  -- Balances
  opening_cash_balance NUMERIC(15,2) DEFAULT 0,
  closing_cash_balance NUMERIC(15,2) GENERATED ALWAYS AS (...)
);
```

### 3.4 Views

#### `fdp_sku_summary` - SKU Aggregation
```sql
CREATE VIEW public.fdp_sku_summary AS
SELECT 
  tenant_id,
  sku,
  product_name,
  COUNT(DISTINCT external_order_id) as order_count,
  SUM(quantity) as total_quantity,
  SUM(total_amount) as total_revenue,
  SUM(COALESCE(total_cogs, 0)) as total_cogs,
  SUM(COALESCE(gross_profit, 0)) as gross_profit,
  CASE WHEN SUM(total_amount) > 0 
    THEN (SUM(gross_profit) / SUM(total_amount)) * 100 
    ELSE 0 
  END as margin_percent
FROM external_order_items
GROUP BY tenant_id, sku, product_name;
```

---

## 4. MDP - Marketing Data Platform {#mdp-marketing-data-platform}

### 4.1 Features Overview

| Feature | Route | Mô tả |
|---------|-------|-------|
| **CMO Dashboard** | `/mdp` | Profit Attribution, Cash Impact |
| **Campaigns** | `/mdp/campaigns` | Hiệu suất campaigns |
| **Funnel Analysis** | `/mdp/funnel` | Conversion funnel |
| **ROI Analytics** | `/mdp/roi` | Channel ROI deep-dive |
| **Channel P&L** | `/mdp/channel-pl` | Lãi/Lỗ theo kênh |

### 4.2 Two Modes

#### Marketing Mode (Execution)
- Focus: Campaign performance, CTR, CPC, CPA
- Users: Marketing Team
- Metrics: Impressions, Clicks, Leads, Conversion Rate

#### CMO Mode (Decision & Accountability)
- Focus: Profit Attribution, Cash Impact
- Users: CMO, CFO, CEO
- Metrics: Contribution Margin, Profit ROAS, Cash Conversion

### 4.3 Core Hook

#### `useMDPData()` - Unified Marketing Data
```typescript
// Location: src/hooks/useMDPData.ts
// Purpose: Single data layer for both Marketing Mode & CMO Mode

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

### 4.4 Key Types

#### `MarketingPerformance` (Marketing Mode)
```typescript
interface MarketingPerformance {
  campaign_id: string;
  campaign_name: string;
  channel: string;
  status: 'active' | 'paused' | 'ended';
  
  // Performance
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  orders: number;
  revenue: number;
  
  // Calculated
  ctr: number;        // Click-Through Rate
  cpc: number;        // Cost Per Click
  cpa: number;        // Cost Per Acquisition
  roas: number;       // Return on Ad Spend
  conversion_rate: number;
}
```

#### `ProfitAttribution` (CMO Mode)
```typescript
interface ProfitAttribution {
  campaign_id: string;
  campaign_name: string;
  channel: string;
  cohort: string;
  
  // Revenue Breakdown
  gross_revenue: number;
  discount_given: number;
  net_revenue: number;
  
  // Cost Breakdown
  ad_spend: number;
  cogs: number;
  platform_fees: number;
  logistics_cost: number;
  payment_fees: number;
  return_cost: number;
  
  // Profit Metrics
  contribution_margin: number;
  contribution_margin_percent: number;
  profit_roas: number;          // CM / Ad Spend
  
  status: 'profitable' | 'marginal' | 'loss' | 'critical';
}
```

#### `CashImpact` (CMO Mode)
```typescript
interface CashImpact {
  channel: string;
  campaign_id?: string;
  
  // Cash Flow
  total_spend: number;
  cash_received: number;
  pending_cash: number;
  refund_amount: number;
  cash_locked_ads: number;
  
  // Metrics
  cash_conversion_rate: number;
  avg_days_to_cash: number;
  
  // Assessment
  is_cash_positive: boolean;
  cash_impact_score: number;    // -100 to +100
}
```

### 4.5 MDP Thresholds
```typescript
export const MDP_THRESHOLDS = {
  // Marketing Mode
  MIN_CTR: 0.01,              // 1%
  MAX_CPA_CHANGE: 0.3,        // 30% increase triggers alert
  MAX_FUNNEL_DROP: 0.5,       // 50% drop rate
  MAX_SPEND_SPIKE: 0.5,       // 50% spend increase
  
  // CMO Mode
  MIN_CM_PERCENT: 10,         // Minimum 10% margin
  MIN_PROFIT_ROAS: 0.3,       // CM / Ad Spend >= 0.3
  MAX_CAC_TO_AOV: 0.3,        // CAC ≤ 30% AOV
  MIN_CASH_CONVERSION: 0.7,   // ≥ 70% cash received
  MAX_DAYS_TO_CASH: 30,       // Maximum 30 days
};
```

### 4.6 Database Tables

#### `promotion_campaigns`
```sql
CREATE TABLE public.promotion_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  campaign_name TEXT NOT NULL,
  channel TEXT,
  campaign_type TEXT,
  status TEXT DEFAULT 'planned',
  
  -- Budget
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  
  -- Performance
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_discount_given NUMERIC DEFAULT 0,
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `marketing_expenses`
```sql
CREATE TABLE public.marketing_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  channel TEXT,
  campaign_id UUID,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `channel_analytics`
```sql
CREATE TABLE public.channel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  channel TEXT NOT NULL,
  analytics_date DATE NOT NULL,
  
  -- Traffic
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  -- Conversion
  sessions INTEGER DEFAULT 0,
  add_to_carts INTEGER DEFAULT 0,
  checkouts INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  
  -- Revenue
  revenue NUMERIC DEFAULT 0,
  aov NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `channel_settlements`
```sql
CREATE TABLE public.channel_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  channel TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  
  -- Amounts
  gross_sales NUMERIC DEFAULT 0,
  total_commission NUMERIC DEFAULT 0,
  total_shipping_fee NUMERIC DEFAULT 0,
  total_payment_fee NUMERIC DEFAULT 0,
  total_service_fee NUMERIC DEFAULT 0,
  total_refunds NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  
  -- Stats
  total_orders INTEGER DEFAULT 0,
  settlement_status TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. Control Tower {#control-tower}

### 5.1 Features Overview

| Feature | Route | Mô tả |
|---------|-------|-------|
| **Alerts Center** | `/control-tower/alerts` | Trung tâm cảnh báo |
| **Tasks** | `/control-tower/tasks` | Quản lý công việc |
| **Store Health** | `/control-tower/stores` | Sức khỏe cửa hàng |
| **Risk Appetite** | `/control-tower/risk-appetite` | Cấu hình ngưỡng rủi ro |
| **Decision Cards** | `/fdp/decision-cards` | Auto-generated decisions |

### 5.2 Core Hooks

#### `useAlertInstances()` - Alert Management
```typescript
// Location: src/hooks/useAlertInstances.ts

interface AlertInstance {
  id: string;
  tenant_id: string;
  alert_type: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  
  // Object Context
  object_type: string;
  object_name: string;
  external_object_id: string;
  
  // Metric Info
  metric_name: string;
  current_value: number;
  threshold_value: number;
  threshold_operator: string;  // 'less_than', 'greater_than', 'equals'
  change_percent: number;
  
  // Status
  status: 'active' | 'acknowledged' | 'resolved' | 'snoozed';
  priority: number;  // 1 = highest
  
  // Tracking
  acknowledged_by: string;
  acknowledged_at: string;
  resolved_by: string;
  resolved_at: string;
  resolution_notes: string;
  snoozed_until: string;
  
  // Decision Link
  linked_decision_card_id: string;
  resolved_by_decision: boolean;
}

// Available mutations
useAcknowledgeAlert()   // Mark as acknowledged
useResolveAlert()       // Mark as resolved
useSnoozeAlert()        // Snooze until date
useBulkUpdateAlerts()   // Bulk operations
useRealtimeAlerts()     // Real-time subscription
```

#### `useIntelligentAlertRules()` - Rule Configuration
```typescript
// Location: src/hooks/useIntelligentAlertRules.ts

interface IntelligentAlertRule {
  id: string;
  rule_name: string;
  rule_type: string;
  target_object_type: string;
  
  // Condition
  metric_name: string;
  condition_operator: string;
  threshold_value: number;
  comparison_period: string;
  
  // Notification
  severity: string;
  notification_channels: string[];
  escalation_minutes: number;
  
  is_active: boolean;
}
```

#### `useAutoDecisionCards()` - Decision Support
```typescript
// Location: src/hooks/useAutoDecisionCards.ts

interface AutoDecisionCard {
  id: string;
  card_type: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  
  // Context
  metric_value: number;
  threshold_value: number;
  impact_amount: number;
  
  // Actions
  recommended_action: string;
  available_actions: DecisionCardAction[];
  
  // Status
  status: 'pending' | 'decided' | 'dismissed' | 'snoozed';
  decided_at: string;
  decided_by: string;
}
```

#### `useRiskAppetite()` - Risk Configuration
```typescript
// Location: src/hooks/useRiskAppetite.ts

interface RiskAppetite {
  id: string;
  name: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
}

interface RiskAppetiteRule {
  id: string;
  risk_appetite_id: string;
  risk_domain: string;
  metric_code: string;
  
  // Thresholds
  warning_threshold: number;
  critical_threshold: number;
  operator: string;
  
  is_active: boolean;
}

// Available hooks
useRiskAppetites()          // List configurations
useRiskAppetiteRules()      // Get rules for a config
useCheckBreaches()          // Detect threshold breaches
useActivateRiskAppetite()   // Activate a configuration
```

### 5.3 Database Tables

#### `alert_instances`
```sql
CREATE TABLE public.alert_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  alert_config_id UUID,
  alert_object_id UUID,
  
  -- Alert Info
  alert_type TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  
  -- Object Context
  object_type TEXT,
  object_name TEXT,
  external_object_id TEXT,
  
  -- Metric Info
  metric_name TEXT,
  current_value NUMERIC,
  threshold_value NUMERIC,
  threshold_operator TEXT,
  change_percent NUMERIC,
  
  -- Status
  status TEXT DEFAULT 'active',
  priority INTEGER DEFAULT 5,
  
  -- Tracking
  notification_sent BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  snoozed_until TIMESTAMPTZ,
  
  -- Impact
  impact_amount NUMERIC,
  impact_description TEXT,
  suggested_action TEXT,
  action_url TEXT,
  
  -- Decision Link
  linked_decision_card_id UUID,
  resolved_by_decision BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `risk_breach_events`
```sql
CREATE TABLE public.risk_breach_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metric_code TEXT NOT NULL,
  metric_value NUMERIC(18,2) NOT NULL,
  rule_id UUID NOT NULL,
  severity TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN',  -- OPEN, ACKNOWLEDGED, RESOLVED
  detected_at TIMESTAMPTZ DEFAULT now()
);
```

#### `mv_board_summary` (Materialized View)
```sql
CREATE MATERIALIZED VIEW public.mv_board_summary AS
SELECT
  tenant_id,
  period_start,
  period_end,
  cash_settled,
  allocations_count,
  invoices_settled,
  bank_txns_used,
  open_exceptions,
  total_exceptions,
  auto_actions
FROM ...
-- Aggregates monthly data for board-level reporting
```

---

## 6. Database Schema Summary {#database-schema}

### Core Tables

| Table | Module | Purpose |
|-------|--------|---------|
| `external_orders` | FDP | Order headers with financials |
| `external_order_items` | FDP | SKU-level order details |
| `invoices` | FDP | AR invoices |
| `invoice_items` | FDP | Invoice line items |
| `bills` | FDP | AP bills |
| `bill_items` | FDP | Bill line items |
| `reconciliation_links` | FDP | Bank-invoice matching |
| `settlement_allocations` | FDP | Partial payment allocations |
| `cash_flow_direct` | FDP | Direct method cash flow |
| `bank_accounts` | FDP | Bank account registry |
| `bank_transactions` | FDP | Bank statement entries |
| `promotion_campaigns` | MDP | Marketing campaigns |
| `marketing_expenses` | MDP | Marketing spend tracking |
| `channel_analytics` | MDP | Channel performance data |
| `channel_settlements` | MDP | Platform settlements |
| `channel_fees` | MDP | Platform fee tracking |
| `alert_instances` | Control Tower | Alert records |
| `intelligent_alert_rules` | Control Tower | Alert rule configurations |
| `risk_appetites` | Control Tower | Risk threshold configs |
| `risk_appetite_rules` | Control Tower | Individual risk rules |
| `risk_breach_events` | Control Tower | Breach detection log |
| `alert_objects` | Control Tower | Monitored objects (stores, SKUs) |

### Views

| View | Module | Purpose |
|------|--------|---------|
| `fdp_sku_summary` | FDP | Aggregated SKU profitability |
| `ar_aging` | FDP | AR aging buckets |
| `ap_aging` | FDP | AP aging buckets |
| `cash_position` | FDP | Current cash by account |
| `mv_board_summary` | Control Tower | Board-level monthly summary |
| `trial_balance` | FDP | Trial balance from GL |

---

## 7. Hooks Reference {#hooks-reference}

### FDP Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useFDPMetrics` | useFDPMetrics.ts | **SSOT** - All financial metrics |
| `useFDPAggregatedMetrics` | useFDPAggregatedMetrics.ts | Aggregated metrics for performance |
| `useCashRunway` | useCashRunway.ts | Cash runway & burn rate |
| `useCashFlowDirect` | useCashFlowDirect.ts | Direct method cash flow |
| `useCashFlowAnalysis` | useCashFlowDirect.ts | Cash flow analysis |
| `useReconciliationSSOT` | useReconciliationSSOT.ts | Reconciliation operations |
| `useReconciliationKPIs` | useReconciliationKPIs.ts | Reconciliation metrics |
| `useUnitEconomics` | useUnitEconomics.ts | Per-order economics |
| `useSKUProfitabilityFromView` | useSKUProfitabilityCache.ts | SKU profitability |
| `useAllProblematicSKUs` | useSKUProfitabilityCache.ts | Problematic SKU alerts |
| `useInventoryData` | useInventoryData.ts | Inventory items |
| `useInventoryAging` | useInventoryAging.ts | Inventory aging analysis |
| `useInvoiceTracking` | useInvoiceTracking.ts | AR invoice tracking |
| `useBillsData` | useBillsData.ts | AP bills |
| `useChannelPL` | useChannelPL.ts | Channel P&L |

### MDP Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useMDPData` | useMDPData.ts | **SSOT** - All marketing data |
| `useMarketingProfitability` | useMarketingProfitability.ts | Marketing profit (legacy wrapper) |
| `useChannelAnalytics` | useChannelAnalytics.ts | Channel analytics |
| `useChannelBudgets` | useChannelBudgets.ts | Budget management |
| `useUnifiedChannelMetrics` | useUnifiedChannelMetrics.ts | Unified channel view |

### Control Tower Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAlertInstances` | useAlertInstances.ts | Alert CRUD operations |
| `useActiveAlerts` | useAlertInstances.ts | Active alerts only |
| `useAlertInstanceStats` | useAlertInstances.ts | Alert statistics |
| `useRealtimeAlerts` | useAlertInstances.ts | Real-time subscription |
| `useIntelligentAlertRules` | useIntelligentAlertRules.ts | Alert rule management |
| `useAlertEscalation` | useAlertEscalation.ts | Escalation rules |
| `useControlTowerAnalytics` | useControlTowerAnalytics.ts | Dashboard analytics |
| `useRiskAppetites` | useRiskAppetite.ts | Risk configurations |
| `useRiskAppetiteRules` | useRiskAppetite.ts | Risk rules |
| `useCheckBreaches` | useRiskAppetite.ts | Breach detection |
| `useAutoDecisionCards` | useAutoDecisionCards.ts | Auto-generated decisions |
| `useStores` | useStores.ts | Store registry |
| `useStoreMetrics` | useStoreMetrics.ts | Store performance |

### Common Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useActiveTenantId` | useActiveTenantId.ts | Current tenant context |
| `useDateRangeForQuery` | DateRangeContext.tsx | Date range filter |
| `useTenantUsers` | useTenantUsers.ts | User management |

---

## 8. Formulas & Calculations {#formulas-calculations}

### Revenue Formulas

```
Net Revenue = Gross Revenue - Platform Fees - Returns - Discounts

Gross Revenue = Order Revenue + Invoice Revenue + Contract Revenue

Platform Fees = Platform Fee + Commission Fee + Payment Fee
```

### Profitability Formulas

```
Gross Profit = Net Revenue - COGS
Gross Margin % = (Gross Profit / Net Revenue) × 100

Contribution Margin = Net Revenue - COGS - Shipping - Marketing Spend
CM % = (Contribution Margin / Net Revenue) × 100

CM per Order = AOV - (COGS/Order) - (Fees/Order) - (Shipping/Order)
```

### Marketing Formulas

```
ROAS = Revenue / Marketing Spend
Profit ROAS = Contribution Margin / Marketing Spend

CAC = Total Marketing Spend / New Customers
LTV = AOV × Avg Orders per Customer × CM %
LTV/CAC Ratio = LTV / CAC (Target: ≥ 3.0)

Cost per Order = Marketing Spend / Total Orders
```

### Cash Flow Formulas

```
Cash Runway (months) = Current Cash / Monthly Burn Rate
Monthly Burn Rate = (Outflows - Inflows) / Months

Cash Conversion Rate = Cash Received / Total Revenue
Days Sales Outstanding (DSO) = (AR Balance / Revenue) × Days
Days Payable Outstanding (DPO) = (AP Balance / COGS) × Days
Cash Conversion Cycle (CCC) = DSO + DIO - DPO
```

### Control Tower Formulas

```
MTTR = Total Resolution Time / Number of Resolved Alerts
Alert Volume Trend = (Current Period - Previous Period) / Previous Period
Escalation Rate = Escalated Alerts / Total Alerts
```

---

## 9. Data Flow Architecture {#data-flow-architecture}

### Data Ingestion

```
External Channels          Internal Systems
(Shopee, Lazada, Tiki)    (POS, Accounting)
        │                         │
        ▼                         ▼
┌─────────────────────────────────────────┐
│         Integration Layer               │
│   (connector_integrations, webhooks)    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Raw Data Tables                 │
│   external_orders, external_order_items │
│   channel_analytics, channel_fees       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Aggregated Views                │
│   fdp_sku_summary, ar_aging, ap_aging   │
│   mv_board_summary, cash_position       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         SSOT Hooks                      │
│   useFDPMetrics, useMDPData             │
│   useAlertInstances, useCashRunway      │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         UI Components                   │
│   Dashboards, Tables, Charts, Alerts    │
└─────────────────────────────────────────┘
```

### Alert Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  FDP Metrics │────▶│ Alert Rules  │────▶│   Alert      │
│  MDP Data    │     │  Evaluation  │     │  Instances   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                     ┌────────────────────────────┤
                     ▼                            ▼
              ┌──────────────┐            ┌──────────────┐
              │  Decision    │            │ Notification │
              │   Cards      │            │   Channels   │
              └──────────────┘            └──────────────┘
                     │                           │
                     ▼                           ▼
              ┌──────────────┐            ┌──────────────┐
              │    User      │            │ Email/Slack  │
              │   Action     │            │    Push      │
              └──────────────┘            └──────────────┘
```

---

## Appendix A: File Structure

```
src/
├── hooks/
│   ├── useFDPMetrics.ts           # FDP SSOT
│   ├── useMDPData.ts              # MDP SSOT
│   ├── useAlertInstances.ts       # Control Tower alerts
│   ├── useCashRunway.ts           # Cash analysis
│   ├── useReconciliationSSOT.ts   # Reconciliation
│   ├── useSKUProfitabilityCache.ts # SKU analysis
│   ├── useUnitEconomics.ts        # Unit economics
│   ├── useRiskAppetite.ts         # Risk config
│   └── useAutoDecisionCards.ts    # Decision support
├── lib/
│   └── fdp-formulas.ts            # Standardized formulas
├── pages/
│   ├── fdp/                       # FDP pages
│   ├── mdp/                       # MDP pages
│   └── control-tower/             # Control Tower pages
└── components/
    ├── fdp/                       # FDP components
    ├── mdp/                       # MDP components
    └── control-tower/             # Control Tower components
```

---

## Appendix B: Thresholds Reference

### FDP Thresholds
```typescript
export const FDP_THRESHOLDS = {
  // Cash
  RUNWAY_CRITICAL_MONTHS: 3,
  RUNWAY_WARNING_MONTHS: 6,
  
  // Margins
  MIN_GROSS_MARGIN: 20,
  MIN_CM_PERCENT: 10,
  
  // SKU
  SKU_CRITICAL_MARGIN: -5,
  SKU_STOP_MARGIN: 5,
  
  // AR/AP
  DSO_WARNING_DAYS: 45,
  DSO_CRITICAL_DAYS: 60,
  DPO_TARGET_DAYS: 30,
};
```

### MDP Thresholds
```typescript
export const MDP_THRESHOLDS = {
  MIN_CTR: 0.01,
  MAX_CPA_CHANGE: 0.3,
  MIN_CM_PERCENT: 10,
  MIN_PROFIT_ROAS: 0.3,
  MAX_CAC_TO_AOV: 0.3,
  MIN_CASH_CONVERSION: 0.7,
  MAX_DAYS_TO_CASH: 30,
};
```

---

**Document maintained by:** Bluecore Engineering Team  
**For questions:** Refer to in-app documentation at `/documentation`
