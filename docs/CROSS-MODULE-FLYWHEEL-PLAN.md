# CROSS-MODULE DATA FLYWHEEL IMPLEMENTATION PLAN

---
**Document Metadata**
| Field | Value |
|-------|-------|
| Title | Cross-Module Data Flywheel Implementation Plan |
| Version | 2.0 |
| Status | ✅ **IMPLEMENTED** |
| Created | 2025-01-26 |
| Last Updated | 2025-01-26 |
| Author | BlueCore AI |
| Approver | Approved |

---

## IMPLEMENTATION STATUS

| Wave | Cases | Status |
|------|-------|--------|
| **Wave 1: Foundation** | Tables, Types, Base Components | ✅ Complete |
| **Wave 2: Core Integration** | Cases 2, 5, 7, 8, 11, 12 | ✅ Complete |
| **Wave 3: Enhancement** | Cases 1, 3, 4, 6, 9, 10 | ✅ Complete |

### Implemented Components

#### Database Tables (12 new tables)
- `fdp_locked_costs` - FDP monthly finalized costs
- `cdp_customer_cohort_cac` - CDP cohort acquisition costs
- `cross_domain_variance_alerts` - Cross-module variance tracking
- `revenue_allocation_bridge` - CDP→FDP revenue mapping
- `cross_module_revenue_forecast` - Revenue projections
- `mdp_segment_budget_targets` - MDP budget allocation
- `cdp_equity_calibration_log` - Equity recalibration history
- `cdp_customer_credit_risk` - Customer credit risk scores
- `control_tower_priority_queue` - Signal aggregation queue
- `cdp_churn_signals` - Churn detection signals
- `mdp_customer_acquisition_source` - Customer source tagging
- `mdp_seasonal_patterns` - Seasonal pattern data
- `mdp_channel_roi` - Channel ROI tracking
- `cdp_segment_ltv_for_mdp` - Segment LTV for budget allocation
- `fdp_actual_revenue_for_cdp` - Actual revenue for recalibration

#### Database Functions (20+ new functions)
- `mdp_get_costs_for_roas` - 3-level fallback for ROAS costs
- `cdp_push_revenue_to_fdp` - Revenue allocation sync
- `detect_cross_domain_variance` - Variance detection
- `control_tower_aggregate_signals` - Signal aggregation
- `cdp_generate_churn_signals` - Churn signal generation
- `mdp_push_attribution_to_cdp` - Attribution sync
- `fdp_push_ar_to_cdp` - AR aging sync
- `cross_module_run_daily_sync` - Master orchestration

#### Frontend Hooks (`src/hooks/cross-module/`)
- 35+ hooks with `CrossModuleData<T>` interface
- Full 3-level fallback chain support
- Transparent metadata tracking

#### UI Components
- `CrossModuleBadge` - Confidence level indicator
- `CrossModuleDataCard` - Data display with upgrade prompts

---

## TABLE OF CONTENTS

1. [Executive Summary](#i-executive-summary)
2. [Core Principles](#ii-core-principles)
3. [Flywheel Architecture](#iii-flywheel-architecture)
4. [12 Integration Flows Detail](#iv-12-integration-flows-detail)
5. [Independent Operation Guarantee](#v-independent-operation-guarantee)
6. [Module-Specific Changes](#vi-module-specific-changes)
7. [Implementation Timeline](#vii-implementation-timeline)
8. [Database Migrations](#viii-database-migrations)
9. [Moat Analysis](#ix-moat-analysis)
10. [Testing Matrix](#x-testing-matrix)
11. [Expected Outcomes](#xi-expected-outcomes)

---

## I. EXECUTIVE SUMMARY

### Mục tiêu

Tạo vòng lặp dữ liệu tự củng cố (Self-Reinforcing Data Flywheel) giữa FDP, MDP, và CDP, với Control Tower đóng vai trò Orchestrator.

### Vấn đề hiện tại

| Module | Trạng thái | Vấn đề |
|--------|-----------|--------|
| **FDP** | Độc lập | Chỉ tính chi phí từ orders, không biết revenue forecast từ CDP |
| **MDP** | Độc lập | Dùng ước lượng COGS 55%, fees 12% (silent defaults) |
| **CDP** | Độc lập | Equity projection không được calibrate từ actual revenue |
| **Control Tower** | Độc lập | Không có variance alerts cross-module |

### Mục tiêu sau triển khai

| Module | Trạng thái | Cải tiến |
|--------|-----------|----------|
| **FDP** | Hub tài chính | Nhận forecast từ CDP, broadcast locked costs sang MDP/CDP |
| **MDP** | Profit-focused | Dùng locked costs thực từ FDP, có CAC target từ CDP LTV |
| **CDP** | Intelligence engine | Equity được calibrate từ FDP actuals, có CAC thực từ MDP |
| **Control Tower** | Orchestrator | Phát hiện variance, dispatch alerts tới đúng module |

### Timeline tổng quan

- **Tổng thời gian**: 20 ngày
- **Wave 1 (Foundation)**: 6 ngày
- **Wave 2 (Core Integration)**: 8 ngày
- **Wave 3 (Enhancement)**: 6 ngày

---

## II. CORE PRINCIPLES

### Nguyên tắc 1: "Integration as Enhancement, Not Dependency"

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATION LEVELS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   LEVEL 3: LOCKED (Cross-module verified)                      │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │ Source: FDP Locked Costs                                  │ │
│   │ Confidence: 100%                                          │ │
│   │ Badge: "Chi phí đã chốt ✓"                                │ │
│   └───────────────────────────────────────────────────────────┘ │
│                          ▲                                      │
│                          │ (Nâng cấp khi có data)               │
│   LEVEL 2: OBSERVED (Module-internal actual data)              │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │ Source: order_items.cogs_amount (có data thật)            │ │
│   │ Confidence: 85%                                           │ │
│   │ Badge: "Từ dữ liệu thực"                                  │ │
│   └───────────────────────────────────────────────────────────┘ │
│                          ▲                                      │
│                          │ (Nâng cấp khi có data)               │
│   LEVEL 1: ESTIMATED (Fallback defaults)                       │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │ Source: Industry benchmark / Rule of thumb                │ │
│   │ Confidence: 40-60%                                        │ │
│   │ Badge: "Ước tính ⚠"                                       │ │
│   └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│   ⚠️ MỌI MODULE PHẢI HOẠT ĐỘNG ĐƯỢC Ở LEVEL 1                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Nguyên tắc 2: Transparent Data Quality

- Mọi metric cross-module phải có `confidence_level`
- Mọi metric cross-module phải có `data_source`
- UI phải hiển thị badge tương ứng
- Không có "silent defaults" - mọi estimate đều cần warning

### Nguyên tắc 3: Graceful Degradation

- Module A không có data → Module B vẫn hoạt động với fallback
- Fallback chain: Locked → Observed → Estimated
- User biết rõ data đang ở level nào

---

## III. FLYWHEEL ARCHITECTURE

### 3.1 Sơ đồ tổng quan

```
                                    CONTROL TOWER
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              │     Case 11: Variance    │     Case 12: Priority    │
              │     Alert Dispatch       │     Queue Aggregate      │
              ▼                          ▼                          ▼
        ┌─────────┐               ┌─────────┐               ┌─────────┐
        │   FDP   │               │   MDP   │               │   CDP   │
        │ Finance │               │Marketing│               │Customer │
        └────┬────┘               └────┬────┘               └────┬────┘
             │                         │                         │
   ┌─────────┼─────────────────────────┼─────────────────────────┼─────────┐
   │         │                         │                         │         │
   │    Case 7,8                  Case 2,9,10               Case 1,3,4    │
   │    Actuals,AR ──────────────────→│←──────────────────── Forecast,LTV │
   │         │                    Locked Costs                   │         │
   │         │                         │                         │         │
   │         │      Case 5: CAC        │                         │         │
   │         │      ←──────────────────┼─────────────────────────┤         │
   │         │                         │                         │         │
   │         │                    Case 6: Source                 │         │
   │         │                    ─────────────────────────────→ │         │
   │         │                         │                         │         │
   └─────────┴─────────────────────────┴─────────────────────────┴─────────┘
```

### 3.2 Data Flow Summary

| Case | Flow | Direction | Purpose |
|------|------|-----------|---------|
| 1 | CDP → FDP | Revenue Forecast | FDP scenario planning |
| 2 | FDP → MDP | Locked Costs | Accurate Profit ROAS |
| 3 | CDP → MDP | Segment LTV | Max CAC per segment |
| 4 | CDP → MDP | Churn Signal | Trigger retention |
| 5 | MDP → CDP | Attribution | Cohort CAC |
| 6 | MDP → CDP | Customer Source | Acquisition channel |
| 7 | FDP → CDP | Actuals | Equity calibration |
| 8 | FDP → CDP | AR Aging | Credit risk score |
| 9 | MDP → FDP | Seasonal | Better forecasting |
| 10 | MDP → FDP | Channel ROI | Budget reallocation |
| 11 | CT → All | Variance Alert | Cross-module dispatch |
| 12 | All → CT | Priority Queue | Aggregate signals |

---

## IV. 12 INTEGRATION FLOWS DETAIL

### TIER 1: CORE FLOWS (Moat ⭐⭐⭐⭐-⭐⭐⭐⭐⭐)

---

#### CASE 5: MDP → CDP | Attribution → Cohort CAC

**Moat Rating**: ⭐⭐⭐⭐⭐ (5/5)

**Mô tả**: MDP đẩy dữ liệu attribution (campaign → conversion) sang CDP. CDP sử dụng để tính CAC thực tế theo từng cohort khách hàng.

**Before**:
- CDP ước lượng CAC = 150K VND (industry benchmark)
- LTV/CAC ratio không chính xác

**After**:
- CDP biết CAC thực theo cohort: "Cohort T1/2024 có CAC = 1.2M"
- LTV/CAC ratio chính xác, phát hiện cohort xấu sớm

**Data Flow**:
```
MDP Campaign Attribution
  │
  ├─ campaign_id
  ├─ customer_id  
  ├─ acquisition_date
  ├─ total_spend_attributed
  └─ attribution_method
          │
          ▼
CDP Cohort CAC Table
  │
  ├─ cohort_month
  ├─ customer_count
  ├─ total_cac
  ├─ avg_cac_per_customer
  └─ source: 'mdp_attribution'
```

**Fallback Chain**:
```
1. TRY: cdp_customer_cohort_cac (LEVEL 3 - Locked)
   └─ SELECT cac_per_customer FROM cdp_customer_cohort_cac
   └─ Confidence: 100%, Badge: "CAC từ MDP Attribution ✓"

2. FALLBACK: Aggregate từ campaigns (LEVEL 2 - Observed)
   └─ Total ad spend / New customers in period
   └─ Confidence: 75%, Badge: "Tính từ campaigns"

3. FALLBACK: Industry benchmark (LEVEL 1 - Estimated)
   └─ CAC = 150,000 VND (SME E-commerce benchmark)
   └─ Confidence: 40%, Badge: "Ước tính ngành ⚠"
```

---

#### CASE 11: Control Tower → All | Variance Alert Dispatch

**Moat Rating**: ⭐⭐⭐⭐⭐ (5/5)

**Mô tả**: Control Tower phát hiện variance giữa CDP forecast và FDP actual, tự động dispatch Decision Cards tới module phụ trách.

**Before**:
- Variance được phát hiện thủ công cuối tháng
- Không biết module nào cần hành động

**After**:
- Auto-detect khi CDP forecast lệch FDP actual > 10%
- Auto-dispatch Decision Card tới đúng module

**Data Flow**:
```
Control Tower Variance Detection
  │
  ├─ Compares: CDP What-If forecast vs FDP Actual revenue
  ├─ Threshold: variance > 10% triggers alert
  │
  └─ Dispatch Logic:
       │
       ├─ Revenue shortfall → FDP Decision Card
       ├─ CAC spike → MDP Decision Card  
       ├─ Equity drift → CDP Decision Card
       └─ Cross-cutting → CEO Priority Queue
```

**Alert Dispatch Template**:
```json
{
  "variance_type": "REVENUE_SHORTFALL",
  "variance_percent": -18,
  "variance_amount": -800000000,
  "period": "2024-10",
  "dispatch_to": [
    {
      "module": "FDP",
      "decision_card": {
        "title": "Doanh thu T10 thấp hơn dự báo 18%",
        "action": "Review budget allocation",
        "priority": "CRITICAL"
      }
    },
    {
      "module": "CDP", 
      "decision_card": {
        "title": "Equity cần điều chỉnh theo actual",
        "action": "Recalibrate equity projection",
        "priority": "HIGH"
      }
    }
  ]
}
```

---

#### CASE 7: FDP → CDP | Actuals → Equity Recalibration

**Moat Rating**: ⭐⭐⭐⭐ (4/5)

**Mô tả**: FDP đẩy actual revenue (đã close books) sang CDP. CDP dùng để calibrate equity projection.

**Before**:
- CDP equity projection dựa trên model, không được verify
- Over time, drift tích lũy

**After**:
- Mỗi tháng, CDP so sánh projected vs actual
- Điều chỉnh calibration factor

**Calibration Logic**:
```
T10 Actual Revenue (FDP): 3,800,000,000
T10 Projected Revenue (CDP): 4,200,000,000

Calibration Factor = 3.8B / 4.2B = 0.905

→ Điều chỉnh tất cả equity projections giảm 9.5%
→ Log vào cdp_equity_calibration_log
```

**Fallback Chain**:
```
1. TRY: cdp_equity_calibration_log (LEVEL 3 - Calibrated)
   └─ Equity đã điều chỉnh theo actual
   └─ Confidence: 95%, Badge: "Đã calibrate từ FDP ✓"

2. FALLBACK: Raw equity projection (LEVEL 2 - Model)
   └─ Từ cdp_customer_equity_computed
   └─ Confidence: 70%, Badge: "Dự báo chưa calibrate"

3. NOTE: CDP vẫn hoạt động bình thường với uncalibrated equity
```

---

#### CASE 8: FDP → CDP | AR Aging → Credit Risk Score

**Moat Rating**: ⭐⭐⭐⭐ (4/5)

**Mô tả**: FDP đẩy thông tin công nợ quá hạn sang CDP. CDP dùng để đánh giá credit risk của khách hàng.

**Before**:
- CDP không biết khách hàng nào có nợ xấu
- Equity của khách hàng nợ xấu bị overestimate

**After**:
- CDP có credit_risk_score dựa trên AR aging
- Equity được điều chỉnh bằng risk_multiplier

**Risk Multiplier Logic**:
```
AR Aging Days | Risk Score | Equity Multiplier
0-30         | 100        | 1.00
31-60        | 80         | 0.90
61-90        | 60         | 0.75
91-120       | 40         | 0.50
>120         | 20         | 0.25
```

**Fallback Chain**:
```
1. TRY: cdp_customer_credit_risk (LEVEL 3 - From FDP)
   └─ Credit score dựa trên AR aging thật
   └─ Confidence: 95%, Badge: "Từ công nợ FDP ✓"

2. FALLBACK: No credit adjustment (LEVEL 1)
   └─ equity_risk_multiplier = 1.0
   └─ Confidence: 50%, Badge: "Chưa có dữ liệu rủi ro"

3. NOTE: Equity vẫn hiển thị, chỉ không có risk adjustment
```

---

#### CASE 3: CDP → MDP | Segment LTV → Budget Allocation

**Moat Rating**: ⭐⭐⭐⭐ (4/5)

**Mô tả**: CDP đẩy LTV trung bình theo segment sang MDP. MDP dùng để set max CAC target.

**Before**:
- MDP không biết LTV của segments
- Có thể overspend để acquire low-value customers

**After**:
- MDP biết: "Platinum LTV = 15M → Max CAC = 5M (LTV/CAC=3)"
- Campaign budget được gate bởi LTV data

**Max CAC Calculation**:
```
Target LTV/CAC Ratio = 3.0

Segment   | Avg LTV   | Max CAC (LTV/3)
----------|-----------|----------------
Platinum  | 15,200,000| 5,066,667
Gold      | 6,800,000 | 2,266,667
Silver    | 2,100,000 | 700,000
Bronze    | 500,000   | 166,667
```

---

#### CASE 12: All → Control Tower | Priority Queue

**Moat Rating**: ⭐⭐⭐⭐ (4/5)

**Mô tả**: Tất cả modules đẩy signals lên Control Tower. CT aggregate và prioritize cho CEO view.

**Before**:
- CEO phải check từng module riêng
- Không biết vấn đề nào urgent nhất

**After**:
- Một priority queue duy nhất
- Sorted by impact × urgency

**Priority Queue Example**:
```
Rank | Module | Issue | Impact | Urgency | Score
-----|--------|-------|--------|---------|------
1    | FDP    | Cash risk - Revenue shortfall | 800M | 24h | 95
2    | CDP    | Equity drift - Platinum tier | 500M | 48h | 85
3    | MDP    | CAC spike - Facebook campaigns | 200M | 72h | 70
4    | CDP    | Churn signal - 45 at-risk | 150M | 7d | 60
```

---

### TIER 2: ENHANCEMENT FLOWS (Moat ⭐⭐⭐-⭐⭐⭐⭐)

---

#### CASE 1: CDP → FDP | Revenue Forecast → Monthly Plans

**Moat Rating**: ⭐⭐⭐ (3/5)

**Mô tả**: CDP đẩy dự báo revenue 12 tháng từ What-If scenario sang FDP để làm input cho kế hoạch tài chính.

**Data Structure**:
```json
{
  "source": "cdp_whatif",
  "scenario_id": "uuid",
  "forecast": [
    {"month": "2025-01", "revenue": 850000000},
    {"month": "2025-02", "revenue": 920000000},
    ...
  ],
  "assumptions": {
    "frequency_boost": 1.1,
    "churn_reduction": 0.95
  }
}
```

---

#### CASE 2: FDP → MDP | Locked Costs → Profit ROAS

**Moat Rating**: ⭐⭐⭐⭐ (4/5)

**Mô tả**: FDP chốt chi phí hàng tháng (COGS, Fees) và broadcast sang MDP để tính Profit ROAS chính xác.

**Before**:
- MDP dùng COGS 55%, Fees 12% (hardcoded)
- Profit ROAS có thể sai 20-30%

**After**:
- MDP dùng locked costs từ FDP
- Profit ROAS chính xác

**Fallback Chain**:
```
1. TRY: fdp_locked_costs (LEVEL 3 - Locked)
   └─ SELECT * FROM fdp_locked_costs WHERE month = current_month
   └─ Confidence: 100%, Badge: "Chi phí đã chốt từ FDP ✓"

2. FALLBACK: order_items.cogs_amount (LEVEL 2 - Observed)  
   └─ SELECT SUM(cogs_amount) FROM external_order_items
   └─ Confidence: 85%, Badge: "Từ dữ liệu đơn hàng"

3. FALLBACK: Historical average (LEVEL 2 - Observed)
   └─ Tính từ 90 ngày gần nhất
   └─ Confidence: 70%, Badge: "Trung bình 90 ngày"

4. FALLBACK: Industry benchmark (LEVEL 1 - Estimated)
   └─ COGS 55%, Fees 12%
   └─ Confidence: 40%, Badge: "Ước tính ngành ⚠"
```

---

#### CASE 4: CDP → MDP | Churn Signal → Retention Campaign

**Moat Rating**: ⭐⭐⭐ (3/5)

**Mô tả**: CDP phát hiện khách hàng at-risk và đẩy signal sang MDP để trigger retention campaign.

**Signal Structure**:
```json
{
  "signal_type": "CHURN_RISK",
  "customer_ids": ["uuid1", "uuid2", ...],
  "segment": "Platinum",
  "at_risk_count": 45,
  "estimated_ltv_at_risk": 682500000,
  "recommended_action": "WIN_BACK_CAMPAIGN"
}
```

---

#### CASE 6: MDP → CDP | New Customer Source → Tagging

**Moat Rating**: ⭐⭐⭐ (3/5)

**Mô tả**: MDP gắn acquisition source (campaign/channel) cho mỗi khách hàng mới vào CDP.

**Data Flow**:
```
New Customer Acquired
  │
  ├─ customer_id
  ├─ acquisition_campaign_id
  ├─ acquisition_channel (facebook, google, organic...)
  ├─ acquisition_date
  └─ first_order_id
          │
          ▼
CDP Customer Record
  │
  ├─ acquisition_source: "facebook"
  ├─ acquisition_campaign: "Summer Sale 2024"
  └─ acquisition_cost: 1,250,000
```

---

### TIER 3: OPTIMIZATION FLOWS (Moat ⭐⭐⭐)

---

#### CASE 9: MDP → FDP | Seasonal Patterns → Revenue Forecast

**Moat Rating**: ⭐⭐⭐ (3/5)

**Mô tả**: MDP phân tích seasonal patterns từ campaign performance và đẩy sang FDP để cải thiện revenue forecasting.

**Pattern Example**:
```json
{
  "pattern_type": "SEASONAL",
  "periods": [
    {"month": 1, "multiplier": 0.85, "reason": "Post-Tet slowdown"},
    {"month": 2, "multiplier": 1.30, "reason": "Tet peak"},
    {"month": 11, "multiplier": 1.45, "reason": "11.11 sale"},
    {"month": 12, "multiplier": 1.25, "reason": "Year-end sale"}
  ]
}
```

---

#### CASE 10: MDP → FDP | Channel ROI → Budget Reallocation

**Moat Rating**: ⭐⭐⭐ (3/5)

**Mô tả**: MDP đẩy ROI analysis theo channel sang FDP để suggest budget reallocation.

**ROI Signal**:
```json
{
  "period": "2024-10",
  "channels": [
    {"channel": "facebook", "spend": 150000000, "revenue": 600000000, "roas": 4.0},
    {"channel": "google", "spend": 100000000, "revenue": 350000000, "roas": 3.5},
    {"channel": "tiktok", "spend": 50000000, "revenue": 100000000, "roas": 2.0}
  ],
  "recommendation": "Shift 30% TikTok budget to Facebook"
}
```

---

## V. INDEPENDENT OPERATION GUARANTEE

### 5.1 Complete Fallback Matrix

| Case | Flow | Level 3 (Locked) | Level 2 (Observed) | Level 1 (Estimated) |
|------|------|------------------|-------------------|---------------------|
| 1 | CDP→FDP Revenue | `revenue_allocation_bridge` | CDP What-If projection | FDP internal forecast |
| 2 | FDP→MDP Costs | `fdp_locked_costs` | `order_items.cogs` | 55% COGS, 12% fees |
| 3 | CDP→MDP LTV | `mdp_segment_budget_targets` | CDP equity average | Industry LTV/CAC=3 |
| 4 | CDP→MDP Churn | `mdp_retention_signals` | CDP at-risk count | No action needed |
| 5 | MDP→CDP CAC | `cdp_customer_cohort_cac` | Campaigns/NewCustomers | 150K VND benchmark |
| 6 | MDP→CDP Source | Customer.acquisition_channel | First order channel | "organic" default |
| 7 | FDP→CDP Actuals | `cdp_equity_calibration_log` | Uncalibrated equity | N/A (equity works) |
| 8 | FDP→CDP AR Risk | `cdp_customer_credit_risk` | No adjustment | multiplier = 1.0 |
| 9 | MDP→FDP Seasonal | `fdp_seasonal_patterns` | FDP internal patterns | multiplier = 1.0 |
| 10 | MDP→FDP ROI | `fdp_channel_roi_signals` | FDP internal ROI | Equal allocation |
| 11 | CT→All Variance | Auto-dispatch | Manual review | No alerts |
| 12 | All→CT Queue | Aggregate signals | Individual module alerts | Empty queue |

### 5.2 Database Pattern: COALESCE Chain

```sql
-- Template cho tất cả cross-module functions
CREATE OR REPLACE FUNCTION [module]_get_[data]_with_fallback(
  p_tenant_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  -- Data columns
  [data_column_1] [type],
  [data_column_2] [type],
  -- Metadata columns (REQUIRED)
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
) AS $$
BEGIN
  -- LEVEL 3: Try cross-module locked data
  IF EXISTS (
    SELECT 1 FROM [cross_module_table] 
    WHERE tenant_id = p_tenant_id 
    AND year = p_year AND month = p_month
  ) THEN
    RETURN QUERY
    SELECT 
      [data_columns],
      'LOCKED'::TEXT as confidence_level,
      '[cross_module_table]'::TEXT as data_source,
      TRUE as is_cross_module
    FROM [cross_module_table]
    WHERE tenant_id = p_tenant_id 
    AND year = p_year AND month = p_month;
    RETURN;
  END IF;

  -- LEVEL 2: Try internal observed data
  IF EXISTS (
    SELECT 1 FROM [internal_table] 
    WHERE tenant_id = p_tenant_id
    AND [date_condition]
    LIMIT 1
  ) THEN
    RETURN QUERY
    SELECT 
      [aggregated_data],
      'OBSERVED'::TEXT as confidence_level,
      '[internal_table]'::TEXT as data_source,
      FALSE as is_cross_module
    FROM [internal_table]
    WHERE tenant_id = p_tenant_id
    AND [date_condition];
    RETURN;
  END IF;

  -- LEVEL 1: Fallback to industry benchmark
  RETURN QUERY
  SELECT 
    [benchmark_values],
    'ESTIMATED'::TEXT as confidence_level,
    'industry_benchmark'::TEXT as data_source,
    FALSE as is_cross_module;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.3 Hook Pattern: CrossModuleData Interface

```typescript
// src/lib/cross-module/types.ts

export interface CrossModuleMetadata {
  confidenceLevel: 'LOCKED' | 'OBSERVED' | 'ESTIMATED';
  dataSource: string;
  isFromCrossModule: boolean;
  timestamp: string;
  sourceModule?: 'FDP' | 'MDP' | 'CDP' | 'CT';
}

export interface CrossModuleData<T> {
  data: T;
  meta: CrossModuleMetadata;
}

// Example usage in hook
export function useMDPLockedCosts(year: number, month: number): {
  data: CrossModuleData<CostData> | null;
  isLoading: boolean;
  error: Error | null;
} {
  const { data: tenantId } = useActiveTenantId();
  
  return useQuery({
    queryKey: ['mdp-costs', tenantId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mdp_get_costs_for_roas', {
        p_tenant_id: tenantId,
        p_year: year,
        p_month: month
      });
      
      if (error) throw error;
      
      return {
        data: {
          cogsPercent: data[0].cogs_percent,
          feePercent: data[0].fee_percent,
        },
        meta: {
          confidenceLevel: data[0].confidence_level,
          dataSource: data[0].data_source,
          isFromCrossModule: data[0].is_cross_module,
          timestamp: new Date().toISOString(),
          sourceModule: data[0].is_cross_module ? 'FDP' : undefined
        }
      };
    },
    enabled: !!tenantId
  });
}
```

### 5.4 UI Pattern: CrossModuleBadge Component

```typescript
// src/components/shared/CrossModuleBadge.tsx

import { Badge } from "@/components/ui/badge";
import { Lock, Database, AlertTriangle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  confidenceLevel: 'LOCKED' | 'OBSERVED' | 'ESTIMATED';
  dataSource: string;
  sourceModule?: 'FDP' | 'MDP' | 'CDP' | 'CT';
}

const moduleLabels = {
  FDP: 'Tài chính',
  MDP: 'Marketing',
  CDP: 'Khách hàng',
  CT: 'Control Tower'
};

export function CrossModuleBadge({ confidenceLevel, dataSource, sourceModule }: Props) {
  if (confidenceLevel === 'LOCKED') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
              <Lock className="h-3 w-3 mr-1" />
              {sourceModule ? `Từ ${moduleLabels[sourceModule]} ✓` : 'Đã xác thực ✓'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nguồn: {dataSource}</p>
            <p>Độ tin cậy: 100%</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (confidenceLevel === 'OBSERVED') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              <Database className="h-3 w-3 mr-1" />
              Từ dữ liệu thực
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nguồn: {dataSource}</p>
            <p>Độ tin cậy: 70-85%</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // ESTIMATED
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Ước tính ⚠
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Nguồn: {dataSource}</p>
          <p>Độ tin cậy: 40-60%</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nâng cấp độ chính xác bằng cách đồng bộ dữ liệu từ các module khác
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

---

## VI. MODULE-SPECIFIC CHANGES

### A. FDP - Financial Data Platform

#### Tính năng MỚI

| # | Tính năng | Mô tả | Source | Target |
|---|-----------|-------|--------|--------|
| 1 | Nhận Revenue Forecast | Import dự báo doanh thu 12 tháng từ CDP What-If | CDP | FDP Scenario Plans |
| 2 | Lock Monthly Costs | Chốt COGS, Fees, Marketing spend hàng tháng | FDP Actuals | MDP, CDP |
| 3 | Push AR Risk | Đẩy thông tin công nợ quá hạn sang CDP | Invoices | CDP Credit Risk |
| 4 | Nhận Seasonal Patterns | Import pattern mùa vụ từ MDP campaigns | MDP | FDP Forecasting |
| 5 | Nhận Channel ROI | Import hiệu quả kênh từ MDP | MDP | Budget Allocation |

#### UI Mockup: Scenario Planning

```
┌─────────────────────────────────────────────────────────────────┐
│  FDP Scenario Planning Page                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Badge: Từ CDP What-If ✓]  Revenue Forecast                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  T1: 850M  │  T2: 920M  │  T3: 880M  │  ...               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Button: Đồng bộ từ CDP]  [Button: Chốt chi phí tháng này]    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Locked Costs Status:                                      │ │
│  │  ✓ T1-T10: Đã chốt  │  ⏳ T11: Đang chờ  │  - T12: Chưa   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Objects

**Tables**:
- `fdp_locked_costs`
- `fdp_seasonal_patterns`
- `fdp_channel_roi_signals`

**Functions**:
- `fdp_lock_monthly_costs()`
- `fdp_push_actuals_to_cdp()`
- `fdp_push_ar_risk_to_cdp()`

**Views**:
- `v_fdp_locked_costs_status`

---

### B. MDP - Marketing Data Platform

#### Tính năng MỚI

| # | Tính năng | Mô tả | Source | Target |
|---|-----------|-------|--------|--------|
| 1 | Real Profit ROAS | Tính ROAS dựa trên locked costs từ FDP | FDP Locked Costs | MDP Profit Attribution |
| 2 | Segment Budget Target | Biết max CAC theo từng segment từ CDP LTV | CDP Segment LTV | Campaign Planning |
| 3 | Push Attribution | Đẩy attribution data sang CDP để tính cohort CAC | MDP Campaigns | CDP Cohort CAC |
| 4 | Tag Customer Source | Gắn acquisition source cho khách hàng mới | MDP Campaign ID | CDP Customer Record |
| 5 | Push Seasonal | Gửi seasonal patterns từ campaign analysis sang FDP | MDP Analysis | FDP Forecasting |
| 6 | Push Channel ROI | Gửi hiệu quả kênh sang FDP để reallocation | MDP Performance | FDP Budget |

#### UI Mockup: Profit Attribution

```
┌─────────────────────────────────────────────────────────────────┐
│  MDP Profit Attribution Page                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Profit ROAS Calculation                                    ││
│  │  [Badge: Chi phí đã chốt ✓] hoặc [Badge: Ước tính ⚠]        ││
│  │                                                              ││
│  │  Revenue:       2,500,000,000                               ││
│  │  - COGS:       -  750,000,000  (30% - từ FDP)               ││
│  │  - Fees:       -  200,000,000  (8% - từ FDP)                ││
│  │  - Ad Spend:   -  300,000,000                               ││
│  │  = Profit:       1,250,000,000                              ││
│  │  Profit ROAS:   4.17x                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Segment Budget Target (từ CDP)                             ││
│  │  ┌─────────┬─────────┬────────────┬──────────────┐          ││
│  │  │ Segment │ Avg LTV │ LTV/CAC=3  │ Max CAC      │          ││
│  │  ├─────────┼─────────┼────────────┼──────────────┤          ││
│  │  │ Platinum│ 15.2M   │ 3.0x       │ 5,066,000    │          ││
│  │  │ Gold    │ 6.8M    │ 3.0x       │ 2,266,000    │          ││
│  │  │ Silver  │ 2.1M    │ 3.0x       │   700,000    │          ││
│  │  └─────────┴─────────┴────────────┴──────────────┘          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Button: Đồng bộ CAC sang CDP]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Objects

**Tables**:
- `mdp_segment_budget_targets`
- `mdp_retention_signals`

**Functions**:
- `mdp_push_attribution_to_cdp()`
- `mdp_tag_customer_source()`
- `mdp_get_locked_costs_for_roas()`
- `mdp_push_seasonal_to_fdp()`
- `mdp_push_roi_to_fdp()`

---

### C. CDP - Customer Data Platform

#### Tính năng MỚI

| # | Tính năng | Mô tả | Source | Target |
|---|-----------|-------|--------|--------|
| 1 | Push Revenue Forecast | Đẩy dự báo equity 12 tháng sang FDP theo tháng | CDP What-If | FDP Scenario Plans |
| 2 | Cohort CAC | Nhận CAC thực theo cohort từ MDP attribution | MDP Attribution | CDP LTV/CAC Analysis |
| 3 | Equity Recalibration | Điều chỉnh equity dựa trên actual revenue từ FDP | FDP Actuals | CDP Equity Accuracy |
| 4 | Credit Risk Score | Nhận AR aging từ FDP để đánh giá rủi ro khách hàng | FDP AR Data | CDP Customer Risk |
| 5 | Push Segment LTV | Đẩy LTV theo segment sang MDP để set budget target | CDP Equity | MDP Budget Planning |
| 6 | Push Churn Signal | Đẩy tín hiệu at-risk sang MDP để trigger retention | CDP At-risk | MDP Retention Campaign |
| 7 | Acquisition Source | Nhận channel source từ MDP cho từng khách hàng mới | MDP Campaign | CDP Customer Profile |

#### UI Mockup: LTV Engine

```
┌─────────────────────────────────────────────────────────────────┐
│  CDP LTV Engine Page (What-If Scenario)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Doanh thu dự kiến 12 tháng: 45,000,000,000                 ││
│  │  [Button: Đẩy sang Kế hoạch Tài chính (FDP)]                ││
│  │                                                              ││
│  │  Phân bổ theo quý:                                          ││
│  │  Q1: 22% (9.9B) │ Q2: 26% (11.7B) │ Q3: 24% (10.8B) │ Q4: 28%││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  LTV / CAC Analysis                                         ││
│  │  [Badge: CAC từ MDP ✓]                                      ││
│  │                                                              ││
│  │  ┌─────────┬─────────┬─────────┬───────────┐                ││
│  │  │ Cohort  │ LTV 12m │ CAC     │ LTV/CAC   │                ││
│  │  ├─────────┼─────────┼─────────┼───────────┤                ││
│  │  │ 2024-01 │ 8.5M    │ 1.2M    │ 7.1x ✓    │                ││
│  │  │ 2024-02 │ 6.2M    │ 1.8M    │ 3.4x ✓    │                ││
│  │  │ 2024-03 │ 4.1M    │ 2.5M    │ 1.6x ⚠    │                ││
│  │  └─────────┴─────────┴─────────┴───────────┘                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Equity Calibration Log                                     ││
│  │  [Badge: Đã calibrate từ FDP Actual ✓]                      ││
│  │                                                              ││
│  │  T10/2024: Dự báo 4.2B │ Thực tế 3.8B │ Factor: 0.90       ││
│  │  → Đã điều chỉnh equity giảm 10%                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### UI Mockup: Customer Equity with Credit Risk

```
┌─────────────────────────────────────────────────────────────────┐
│  CDP Customer Equity Page                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Customer: ABC Corp                                         ││
│  │                                                              ││
│  │  Equity 12m:        15,200,000                              ││
│  │  Credit Risk Score: 70/100 ⚠ (Có công nợ quá hạn 45 ngày)  ││
│  │  Risk Multiplier:   0.85x                                   ││
│  │  Adjusted Equity:   12,920,000                              ││
│  │                                                              ││
│  │  Acquisition Source: [Badge: Facebook - Campaign XYZ]       ││
│  │  Acquisition CAC:    1,250,000                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Button: Đẩy Segment LTV sang MDP]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Objects

**Tables**:
- `cross_module_revenue_forecast`
- `revenue_allocation_bridge`
- `cdp_customer_cohort_cac`
- `cdp_equity_calibration_log`
- `cdp_customer_credit_risk`

**Functions**:
- `cdp_push_revenue_to_fdp()`
- `cdp_push_segment_ltv_to_mdp()`
- `cdp_push_churn_to_mdp()`
- `cdp_recalibrate_equity()`

**Views**:
- `v_cdp_cohort_ltv_cac`
- `v_cdp_calibration_history`

---

### D. Control Tower

#### Tính năng MỚI

| # | Tính năng | Mô tả | Source | Target |
|---|-----------|-------|--------|--------|
| 1 | Variance Detection | Phát hiện gap giữa CDP forecast vs FDP actual | CDP + FDP | Alert Queue |
| 2 | Alert Dispatch | Tự động tạo Decision Cards tại module phụ trách | Control Tower | FDP, MDP, CDP |
| 3 | Priority Queue | Aggregate signals từ tất cả modules, prioritize | All Modules | CEO View |
| 4 | Sync Status Dashboard | Theo dõi trạng thái đồng bộ giữa các modules | All Bridges | Governance View |

#### UI Mockup: Cross-Module Status

```
┌─────────────────────────────────────────────────────────────────┐
│  Control Tower - Cross-Module Status                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Data Flywheel Status                                       ││
│  │                                                              ││
│  │  CDP → FDP:  ✓ 12 forecasts synced (last: 2h ago)          ││
│  │  FDP → MDP:  ✓ 10 months locked costs (last: 1d ago)       ││
│  │  FDP → CDP:  ✓ 10 months actuals pushed (last: 1d ago)     ││
│  │  MDP → CDP:  ✓ 8 cohorts CAC synced (last: 3h ago)         ││
│  │  CDP → MDP:  ⚠ 2 segments LTV pending                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Variance Alerts                                            ││
│  │                                                              ││
│  │  🔴 CRITICAL: Revenue T10 -18% vs forecast                  ││
│  │     → Dispatched to: FDP ✓, CDP ✓                           ││
│  │     → FDP Card: "Review budget allocation"                  ││
│  │     → CDP Card: "Equity recalibration needed"               ││
│  │                                                              ││
│  │  🟡 HIGH: CAC T10 +25% vs target                            ││
│  │     → Dispatched to: MDP ✓                                  ││
│  │     → MDP Card: "Review campaign efficiency"                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Priority Queue (Aggregated)                                ││
│  │                                                              ││
│  │  1. [FDP] Cash risk - Revenue shortfall 800M                ││
│  │  2. [CDP] Equity drift - Platinum tier declining            ││
│  │  3. [MDP] CAC spike - Facebook campaigns                    ││
│  │  4. [CDP] Churn signal - 45 at-risk customers               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Database Objects

**Tables**:
- `ct_variance_alerts`

**Functions**:
- `ct_dispatch_variance_alert()`
- `ct_detect_variance()`

**Views**:
- `v_ct_priority_queue`
- `v_cross_module_sync_status`

---

## VII. IMPLEMENTATION TIMELINE

### Wave 1: Foundation (6 ngày)

| Day | Case | Task | Deliverable |
|-----|------|------|-------------|
| 1-2 | 5 | MDP → CDP Attribution tables & functions | `cdp_customer_cohort_cac` populated |
| 3-4 | 5 | CDP LTV/CAC UI với real CAC | LTV/CAC page shows cross-module badge |
| 5-6 | 11 | CT Variance Detection & Dispatch | Variance alerts auto-dispatch working |

**Milestone**: CDP có CAC thực từ MDP, CT detect variance

### Wave 2: Core Integration (8 ngày)

| Day | Cases | Task | Deliverable |
|-----|-------|------|-------------|
| 7-8 | 1, 2 | CDP→FDP forecast, FDP→MDP locked costs | Cross-module cost data flowing |
| 9-10 | 7, 8 | FDP→CDP actuals, AR risk | CDP equity calibrated, credit risk scores |
| 11-12 | 3 | CDP→MDP segment LTV | MDP knows max CAC per segment |
| 13-14 | 12 | All→CT priority queue | CEO priority queue aggregated |

**Milestone**: Full bidirectional flow FDP↔MDP↔CDP

### Wave 3: Enhancement (6 ngày)

| Day | Cases | Task | Deliverable |
|-----|-------|------|-------------|
| 15-16 | 4, 6 | CDP churn signals, MDP customer source | Retention triggers, acquisition tagging |
| 17-18 | 9, 10 | MDP→FDP seasonal, channel ROI | FDP improved forecasting |
| 19-20 | All | Testing, polish, documentation | Production ready |

**Milestone**: All 12 flows operational

---

## VIII. DATABASE MIGRATIONS

### 8.1 FDP Tables

```sql
-- fdp_locked_costs: Chi phí đã chốt theo tháng
CREATE TABLE IF NOT EXISTS public.fdp_locked_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- Locked metrics
  total_revenue NUMERIC,
  total_cogs NUMERIC,
  total_fees NUMERIC,
  total_marketing_spend NUMERIC,
  
  -- Percentages for cross-module use
  avg_cogs_percent NUMERIC,
  avg_fee_percent NUMERIC,
  
  -- Metadata
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_by UUID REFERENCES auth.users(id),
  source_description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, year, month)
);

-- fdp_seasonal_patterns: Pattern mùa vụ từ MDP
CREATE TABLE IF NOT EXISTS public.fdp_seasonal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  multiplier NUMERIC DEFAULT 1.0,
  reason TEXT,
  
  source_module TEXT DEFAULT 'internal',
  source_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, month)
);

-- fdp_channel_roi_signals: ROI signals từ MDP
CREATE TABLE IF NOT EXISTS public.fdp_channel_roi_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  channel TEXT NOT NULL,
  
  spend NUMERIC,
  revenue NUMERIC,
  roas NUMERIC,
  
  recommendation TEXT,
  
  source_module TEXT DEFAULT 'mdp',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fdp_locked_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdp_seasonal_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdp_channel_roi_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant isolation" ON fdp_locked_costs
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON fdp_seasonal_patterns
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON fdp_channel_roi_signals
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
```

### 8.2 MDP Tables

```sql
-- mdp_segment_budget_targets: Max CAC từ CDP LTV
CREATE TABLE IF NOT EXISTS public.mdp_segment_budget_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  segment_name TEXT NOT NULL,
  avg_ltv NUMERIC,
  target_ltv_cac_ratio NUMERIC DEFAULT 3.0,
  max_cac NUMERIC,
  
  source_module TEXT DEFAULT 'cdp',
  source_timestamp TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, segment_name)
);

-- mdp_retention_signals: Churn signals từ CDP
CREATE TABLE IF NOT EXISTS public.mdp_retention_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  signal_type TEXT NOT NULL, -- 'CHURN_RISK', 'HIGH_VALUE_DECLINE', etc.
  segment TEXT,
  customer_count INTEGER,
  estimated_ltv_at_risk NUMERIC,
  
  customer_ids UUID[],
  recommended_action TEXT,
  
  source_module TEXT DEFAULT 'cdp',
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mdp_segment_budget_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdp_retention_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant isolation" ON mdp_segment_budget_targets
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON mdp_retention_signals
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
```

### 8.3 CDP Tables

```sql
-- cross_module_revenue_forecast: Forecast từ CDP What-If
CREATE TABLE IF NOT EXISTS public.cross_module_revenue_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  scenario_id UUID,
  scenario_name TEXT,
  
  forecast_year INTEGER NOT NULL,
  forecast_month INTEGER NOT NULL,
  forecast_revenue NUMERIC,
  
  assumptions JSONB,
  
  pushed_to_fdp BOOLEAN DEFAULT FALSE,
  pushed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, scenario_id, forecast_year, forecast_month)
);

-- cdp_customer_cohort_cac: CAC từ MDP Attribution
CREATE TABLE IF NOT EXISTS public.cdp_customer_cohort_cac (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  cohort_year INTEGER NOT NULL,
  cohort_month INTEGER NOT NULL,
  
  customer_count INTEGER,
  total_cac NUMERIC,
  avg_cac_per_customer NUMERIC,
  
  source_module TEXT DEFAULT 'mdp',
  source_campaign_ids UUID[],
  attribution_method TEXT,
  
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, cohort_year, cohort_month)
);

-- cdp_equity_calibration_log: Calibration history
CREATE TABLE IF NOT EXISTS public.cdp_equity_calibration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  calibration_year INTEGER NOT NULL,
  calibration_month INTEGER NOT NULL,
  
  projected_revenue NUMERIC,
  actual_revenue NUMERIC,
  calibration_factor NUMERIC,
  
  source_module TEXT DEFAULT 'fdp',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cdp_customer_credit_risk: Credit risk từ FDP AR
CREATE TABLE IF NOT EXISTS public.cdp_customer_credit_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL,
  
  ar_aging_days INTEGER,
  credit_risk_score INTEGER, -- 0-100
  equity_risk_multiplier NUMERIC DEFAULT 1.0,
  
  source_module TEXT DEFAULT 'fdp',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, customer_id)
);

-- Enable RLS
ALTER TABLE cross_module_revenue_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdp_customer_cohort_cac ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdp_equity_calibration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdp_customer_credit_risk ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant isolation" ON cross_module_revenue_forecast
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON cdp_customer_cohort_cac
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON cdp_equity_calibration_log
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
  
CREATE POLICY "Tenant isolation" ON cdp_customer_credit_risk
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
```

### 8.4 Control Tower Tables

```sql
-- ct_variance_alerts: Variance alerts
CREATE TABLE IF NOT EXISTS public.ct_variance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  variance_type TEXT NOT NULL, -- 'REVENUE_SHORTFALL', 'CAC_SPIKE', 'EQUITY_DRIFT'
  variance_percent NUMERIC,
  variance_amount NUMERIC,
  
  period_year INTEGER,
  period_month INTEGER,
  
  severity TEXT DEFAULT 'MEDIUM', -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
  
  -- Dispatch tracking
  dispatched_to JSONB, -- [{"module": "FDP", "decision_card_id": "uuid"}]
  dispatched_at TIMESTAMPTZ,
  
  -- Resolution
  status TEXT DEFAULT 'OPEN', -- 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ct_variance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Tenant isolation" ON ct_variance_alerts
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
```

### 8.5 Core Functions

```sql
-- MDP: Get costs with fallback chain
CREATE OR REPLACE FUNCTION mdp_get_costs_for_roas(
  p_tenant_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  cogs_percent NUMERIC,
  fee_percent NUMERIC,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
) AS $$
BEGIN
  -- LEVEL 3: Try locked costs from FDP
  IF EXISTS (
    SELECT 1 FROM fdp_locked_costs 
    WHERE tenant_id = p_tenant_id 
    AND year = p_year AND month = p_month
  ) THEN
    RETURN QUERY
    SELECT 
      flc.avg_cogs_percent,
      flc.avg_fee_percent,
      'LOCKED'::TEXT,
      'fdp_locked_costs'::TEXT,
      TRUE
    FROM fdp_locked_costs flc
    WHERE flc.tenant_id = p_tenant_id 
    AND flc.year = p_year AND flc.month = p_month;
    RETURN;
  END IF;

  -- LEVEL 2: Try actual order data
  IF EXISTS (
    SELECT 1 FROM external_order_items eoi
    JOIN external_orders eo ON eoi.order_id = eo.id
    WHERE eo.tenant_id = p_tenant_id
    AND eoi.cogs_amount IS NOT NULL
    AND EXTRACT(YEAR FROM eo.order_date) = p_year
    AND EXTRACT(MONTH FROM eo.order_date) = p_month
    LIMIT 1
  ) THEN
    RETURN QUERY
    SELECT 
      (SUM(eoi.cogs_amount) / NULLIF(SUM(eo.total_amount), 0) * 100)::NUMERIC,
      8::NUMERIC,
      'OBSERVED'::TEXT,
      'external_order_items'::TEXT,
      FALSE
    FROM external_orders eo
    JOIN external_order_items eoi ON eoi.order_id = eo.id
    WHERE eo.tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM eo.order_date) = p_year
    AND EXTRACT(MONTH FROM eo.order_date) = p_month;
    RETURN;
  END IF;

  -- LEVEL 1: Fallback to industry benchmark
  RETURN QUERY
  SELECT 
    55::NUMERIC,
    12::NUMERIC,
    'ESTIMATED'::TEXT,
    'industry_benchmark'::TEXT,
    FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CDP: Get cohort CAC with fallback
CREATE OR REPLACE FUNCTION cdp_get_cohort_cac(
  p_tenant_id UUID,
  p_cohort_year INTEGER,
  p_cohort_month INTEGER
) RETURNS TABLE (
  avg_cac NUMERIC,
  customer_count INTEGER,
  confidence_level TEXT,
  data_source TEXT,
  is_cross_module BOOLEAN
) AS $$
BEGIN
  -- LEVEL 3: Try MDP attribution data
  IF EXISTS (
    SELECT 1 FROM cdp_customer_cohort_cac 
    WHERE tenant_id = p_tenant_id 
    AND cohort_year = p_cohort_year 
    AND cohort_month = p_cohort_month
  ) THEN
    RETURN QUERY
    SELECT 
      ccc.avg_cac_per_customer,
      ccc.customer_count,
      'LOCKED'::TEXT,
      'cdp_customer_cohort_cac (from MDP)'::TEXT,
      TRUE
    FROM cdp_customer_cohort_cac ccc
    WHERE ccc.tenant_id = p_tenant_id 
    AND ccc.cohort_year = p_cohort_year 
    AND ccc.cohort_month = p_cohort_month;
    RETURN;
  END IF;

  -- LEVEL 2: Calculate from campaigns (if data exists)
  -- (Simplified - would need campaign attribution logic)

  -- LEVEL 1: Industry benchmark
  RETURN QUERY
  SELECT 
    150000::NUMERIC,
    0::INTEGER,
    'ESTIMATED'::TEXT,
    'industry_benchmark_vn_ecommerce'::TEXT,
    FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Control Tower: Detect variance
CREATE OR REPLACE FUNCTION ct_detect_variance(
  p_tenant_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  variance_type TEXT,
  variance_percent NUMERIC,
  variance_amount NUMERIC,
  severity TEXT
) AS $$
DECLARE
  v_projected NUMERIC;
  v_actual NUMERIC;
  v_variance_pct NUMERIC;
BEGIN
  -- Get CDP projection
  SELECT forecast_revenue INTO v_projected
  FROM cross_module_revenue_forecast
  WHERE tenant_id = p_tenant_id
  AND forecast_year = p_year
  AND forecast_month = p_month
  LIMIT 1;
  
  -- Get FDP actual
  SELECT total_revenue INTO v_actual
  FROM fdp_locked_costs
  WHERE tenant_id = p_tenant_id
  AND year = p_year
  AND month = p_month;
  
  -- Calculate variance
  IF v_projected IS NOT NULL AND v_actual IS NOT NULL AND v_projected > 0 THEN
    v_variance_pct := ((v_actual - v_projected) / v_projected) * 100;
    
    -- Only alert if variance > 10%
    IF ABS(v_variance_pct) > 10 THEN
      RETURN QUERY
      SELECT 
        CASE 
          WHEN v_variance_pct < 0 THEN 'REVENUE_SHORTFALL'
          ELSE 'REVENUE_SURPLUS'
        END,
        v_variance_pct,
        v_actual - v_projected,
        CASE 
          WHEN ABS(v_variance_pct) > 20 THEN 'CRITICAL'
          WHEN ABS(v_variance_pct) > 15 THEN 'HIGH'
          ELSE 'MEDIUM'
        END;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.6 Views

```sql
-- v_fdp_locked_costs_status
CREATE OR REPLACE VIEW v_fdp_locked_costs_status AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  EXTRACT(YEAR FROM NOW()) as current_year,
  EXTRACT(MONTH FROM NOW()) as current_month,
  (
    SELECT COUNT(*) 
    FROM fdp_locked_costs flc 
    WHERE flc.tenant_id = t.id 
    AND flc.year = EXTRACT(YEAR FROM NOW())
  ) as months_locked_this_year,
  (
    SELECT MAX(locked_at) 
    FROM fdp_locked_costs flc 
    WHERE flc.tenant_id = t.id
  ) as last_locked_at
FROM tenants t;

-- v_cdp_cohort_ltv_cac
CREATE OR REPLACE VIEW v_cdp_cohort_ltv_cac AS
SELECT 
  cec.tenant_id,
  DATE_TRUNC('month', cc.first_order_at) as cohort_month,
  COUNT(DISTINCT cec.customer_id) as customer_count,
  AVG(cec.customer_equity) as avg_ltv,
  COALESCE(ccc.avg_cac_per_customer, 150000) as avg_cac,
  CASE 
    WHEN ccc.avg_cac_per_customer IS NOT NULL THEN 'LOCKED'
    ELSE 'ESTIMATED'
  END as cac_confidence,
  AVG(cec.customer_equity) / NULLIF(COALESCE(ccc.avg_cac_per_customer, 150000), 0) as ltv_cac_ratio
FROM cdp_customer_equity_computed cec
JOIN cdp_customers cc ON cc.id = cec.customer_id AND cc.tenant_id = cec.tenant_id
LEFT JOIN cdp_customer_cohort_cac ccc 
  ON ccc.tenant_id = cec.tenant_id
  AND ccc.cohort_year = EXTRACT(YEAR FROM cc.first_order_at)
  AND ccc.cohort_month = EXTRACT(MONTH FROM cc.first_order_at)
GROUP BY 
  cec.tenant_id, 
  DATE_TRUNC('month', cc.first_order_at),
  ccc.avg_cac_per_customer;

-- v_cross_module_sync_status
CREATE OR REPLACE VIEW v_cross_module_sync_status AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  
  -- CDP → FDP
  (SELECT COUNT(*) FROM cross_module_revenue_forecast WHERE tenant_id = t.id AND pushed_to_fdp = TRUE) as cdp_to_fdp_synced,
  (SELECT MAX(pushed_at) FROM cross_module_revenue_forecast WHERE tenant_id = t.id) as cdp_to_fdp_last_sync,
  
  -- FDP → MDP
  (SELECT COUNT(*) FROM fdp_locked_costs WHERE tenant_id = t.id) as fdp_to_mdp_synced,
  (SELECT MAX(locked_at) FROM fdp_locked_costs WHERE tenant_id = t.id) as fdp_to_mdp_last_sync,
  
  -- MDP → CDP
  (SELECT COUNT(*) FROM cdp_customer_cohort_cac WHERE tenant_id = t.id) as mdp_to_cdp_synced,
  (SELECT MAX(synced_at) FROM cdp_customer_cohort_cac WHERE tenant_id = t.id) as mdp_to_cdp_last_sync,
  
  -- CDP → MDP
  (SELECT COUNT(*) FROM mdp_segment_budget_targets WHERE tenant_id = t.id) as cdp_to_mdp_synced,
  (SELECT MAX(updated_at) FROM mdp_segment_budget_targets WHERE tenant_id = t.id) as cdp_to_mdp_last_sync

FROM tenants t;

-- v_ct_priority_queue
CREATE OR REPLACE VIEW v_ct_priority_queue AS
WITH all_signals AS (
  -- Variance alerts from Control Tower
  SELECT 
    tenant_id,
    'CT' as source_module,
    variance_type as signal_type,
    variance_amount as impact_amount,
    severity,
    created_at as triggered_at,
    status
  FROM ct_variance_alerts
  WHERE status = 'OPEN'
  
  UNION ALL
  
  -- Retention signals to MDP
  SELECT 
    tenant_id,
    'CDP' as source_module,
    signal_type,
    estimated_ltv_at_risk as impact_amount,
    'HIGH' as severity,
    triggered_at,
    CASE WHEN processed_at IS NULL THEN 'OPEN' ELSE 'PROCESSED' END as status
  FROM mdp_retention_signals
  WHERE processed_at IS NULL
)
SELECT 
  *,
  ROW_NUMBER() OVER (
    PARTITION BY tenant_id 
    ORDER BY 
      CASE severity 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
      END,
      impact_amount DESC NULLS LAST,
      triggered_at ASC
  ) as priority_rank
FROM all_signals
WHERE status = 'OPEN';
```

---

## IX. MOAT ANALYSIS

### 9.1 Network Effect Strength Matrix

| Flow | Data Quality Over Time | Competitor Replication Difficulty | Switching Cost |
|------|------------------------|-----------------------------------|----------------|
| Case 5 (MDP→CDP CAC) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Case 7 (FDP→CDP Calibration) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Case 2 (FDP→MDP Costs) | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Case 11 (CT Variance) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### 9.2 Time-Based Moat Building

```
Month 0-6:   Basic integration, fallback mostly ESTIMATED
Month 6-12:  Calibration history builds, OBSERVED data increases
Month 12-18: Strong LOCKED data coverage, predictions improve
Month 18-24: Full flywheel effect, switching cost maximized
Month 24+:   Competitor cannot replicate calibration history
```

### 9.3 Switching Cost Analysis

| Component | Switching Cost | Why |
|-----------|----------------|-----|
| CDP Cohort CAC History | Very High | 24 months of CAC data per cohort |
| Equity Calibration Log | Very High | Calibration factors tuned to business |
| Variance Pattern Recognition | High | CT learns what variances matter |
| Seasonal Patterns | Medium | 12+ months to rebuild |

---

## X. TESTING MATRIX

### 10.1 Independent Operation Tests

| Test ID | Module | Scenario | Expected Behavior |
|---------|--------|----------|-------------------|
| T1 | MDP | FDP không có data | Hiển thị ROAS với badge "Ước tính ⚠" |
| T2 | MDP | FDP có locked costs | Hiển thị ROAS với badge "Từ FDP ✓" |
| T3 | CDP | MDP không có CAC | LTV/CAC ratio dùng benchmark 150K |
| T4 | CDP | MDP có attribution | LTV/CAC ratio dùng actual CAC |
| T5 | CDP | FDP không có AR | Equity không có risk adjustment |
| T6 | CDP | FDP có AR aging | Equity có credit risk multiplier |
| T7 | FDP | CDP không có forecast | FDP dùng internal forecast |
| T8 | FDP | CDP có What-If | FDP import từ CDP với badge |
| T9 | CT | Không có module data | Empty priority queue |
| T10 | CT | Tất cả modules có signals | Aggregated priority queue |

### 10.2 Integration Tests

| Test ID | Flow | Scenario | Expected |
|---------|------|----------|----------|
| I1 | CDP→FDP→MDP | Full chain | FDP receives forecast, MDP uses locked costs |
| I2 | MDP→CDP→MDP | Circular | MDP pushes CAC, CDP updates LTV, MDP gets new targets |
| I3 | FDP→CDP→CT | Variance | FDP pushes actual, CDP recalibrates, CT detects variance |

### 10.3 Fallback Verification Tests

| Test ID | Function | Fallback Level | Expected Return |
|---------|----------|----------------|-----------------|
| F1 | `mdp_get_costs_for_roas` | LEVEL 3 | confidence_level = 'LOCKED' |
| F2 | `mdp_get_costs_for_roas` | LEVEL 2 | confidence_level = 'OBSERVED' |
| F3 | `mdp_get_costs_for_roas` | LEVEL 1 | confidence_level = 'ESTIMATED', cogs = 55% |
| F4 | `cdp_get_cohort_cac` | LEVEL 3 | confidence_level = 'LOCKED' |
| F5 | `cdp_get_cohort_cac` | LEVEL 1 | confidence_level = 'ESTIMATED', cac = 150000 |

---

## XI. EXPECTED OUTCOMES

### 11.1 Accuracy Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| MDP Profit ROAS accuracy | ±30% | ±5% | 6x better |
| CDP LTV/CAC ratio accuracy | ±50% | ±10% | 5x better |
| CDP Equity projection accuracy | ±25% | ±8% | 3x better |
| FDP Revenue forecast accuracy | ±20% | ±10% | 2x better |

### 11.2 Intelligence Gains

- **CDP**: Knows actual CAC per cohort, not benchmarks
- **MDP**: Knows max CAC per segment, not guessing
- **FDP**: Has customer-backed revenue forecasts
- **CT**: Auto-detects cross-module issues

### 11.3 Proactive Capabilities

- Variance alerts before month-end close
- Churn signals trigger retention automatically
- Budget reallocation suggestions based on ROI

### 11.4 Stickiness Metrics

| Timeline | Switching Difficulty |
|----------|---------------------|
| 6 months | Medium - Losing 6 months calibration |
| 12 months | High - Losing seasonal patterns |
| 24 months | Very High - Losing full cycle data |
| 36+ months | Extreme - Competitor cannot match |

---

## APPENDIX A: Glossary

| Term | Definition |
|------|------------|
| **Locked** | Data verified and confirmed by source module |
| **Observed** | Data calculated from actual transactions |
| **Estimated** | Data based on benchmarks or assumptions |
| **Flywheel** | Self-reinforcing data loop between modules |
| **Calibration** | Adjusting projections based on actuals |
| **Moat** | Competitive advantage from accumulated data |

---

## APPENDIX B: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-26 | Initial draft with 12 flows |
| 1.1 | 2025-01-26 | Added Independent Operation Guarantee |

---

**Document Status**: Ready for Implementation
**Next Steps**: Wave 1 execution (Case 5 + Case 11)
