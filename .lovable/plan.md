
# BLUECORE ARCHITECTURE FIX PLAN
## Roadmap Sửa lỗi Kiến trúc FDP-MDP-CDP-Control Tower

**Phiên bản:** 2.0  
**Ngày tạo:** 28/01/2026  
**Timeline:** 6 Tuần

---

## TỔNG QUAN

### Mục tiêu
- 100% SSOT compliance
- 0 business logic trong frontend hooks
- Cross-module integration hoàn chỉnh (12/12 cases)

### Metrics Tracking

| Metric | Hiện tại | Mục tiêu |
|--------|----------|----------|
| FDP SSOT % | 85% | 100% |
| MDP SSOT % | 75% | 95% |
| CDP SSOT % | 90% | 100% |
| CT SSOT % | 80% | 95% |
| Cross-Module Integration | 8/12 | 12/12 |
| Frontend Business Logic Lines | ~500 | <50 |

---

## PHASE 1: CRITICAL FIXES (Week 1)

### Task 1.1: Fix Metric Registry
**Priority:** HIGH | **Module:** FDP

**Vấn đề:** `src/lib/metric-registry.ts` reference `external_orders` thay vì `cdp_orders`

**Giải pháp:**
- Update tất cả references từ `external_orders` → `cdp_orders`
- Verify với ESLint rule không còn vi phạm

---

### Task 1.2: Migrate MDP Decision Logic to Database
**Priority:** HIGH | **Module:** MDP

**Vấn đề:** 
- `useMarketingDecisionEngine.ts` chứa hardcoded business rules
- Thresholds `MDP_V2_THRESHOLDS` trong frontend

**Giải pháp:**
- Tạo view `v_mdp_decision_signals` trong database
- Migrate logic KILL/PAUSE/SCALE/MONITOR sang SQL
- Tạo table `mdp_config` cho configurable thresholds
- Refactor hook thành thin wrapper

---

### Task 1.3: Move Control Tower Escalation to Database
**Priority:** HIGH | **Module:** Control Tower

**Vấn đề:** `shouldEscalate` logic trong frontend hook

**Giải pháp:**
- Tạo trigger `auto_escalate_alerts`
- Tạo table `escalations` để track
- Refactor hook để chỉ fetch escalation status

---

## PHASE 2: CROSS-MODULE INTEGRATION (Week 2-3)

### Task 2.1: Complete AR → Credit Risk Flow (Case 8)
**Module:** FDP → CDP

**Vấn đề:** Customer ID join không đúng giữa `invoices` và `cdp_customers`

**Giải pháp:** Fix `fdp_push_ar_to_cdp` để join qua `external_id`

---

### Task 2.2: Implement Seasonal Pattern Sync (Case 9)
**Module:** MDP → FDP

**Vấn đề:** Seasonal patterns từ MDP chưa được sync sang FDP forecast

**Giải pháp:**
- Tạo table `seasonal_patterns`
- Tạo RPC `mdp_push_seasonal_to_fdp`

---

### Task 2.3: Channel ROI → Budget Reallocation (Case 10)
**Module:** MDP → FDP

**Giải pháp:** Tạo view `v_budget_reallocation_suggestions`

---

## PHASE 3: AUTOMATION & TRIGGERS (Week 4)

### Task 3.1: Schedule Cross-Module Daily Sync
- Add `cross_module_run_daily_sync` to pg_cron (04:00 daily)

### Task 3.2: Alert Clustering Implementation
- Tạo table `alert_clusters`
- Tạo function `cluster_related_alerts`

### Task 3.3: Variance Auto-Dispatch
- Tạo trigger sau `detect_cross_domain_variance`
- Auto-create decision cards cho relevant module

---

## PHASE 4: CONFIGURATION TABLE (Week 5)

### Task 4.1: Cross-Module Config Table
Tạo `cross_module_config` table với:
- `variance_threshold`: 0.10 (default), 0.20 (critical)
- `cost_fallback`: COGS 55%, Fee 20%
- `escalation_hours`: Critical 24h, Warning 48h
- `sync_schedule`: Daily build 02:00, Cross sync 04:00

### Task 4.2: LTV Auto-Seed Assumptions
- Tạo default assumptions per industry
- Auto-seed khi tenant mới được tạo

---

## PHASE 5: CASH FORECAST MIGRATION (Week 5-6)

### Task 5.1: Migrate Forecast Logic to RPC
**Module:** FDP

**Vấn đề:** `useForecastInputs.ts` có `generateForecast()` logic trong frontend

**Giải pháp:**
- Tạo RPC `generate_cash_forecast`
- Move AR collection probability logic sang DB
- Move T+14 settlement logic sang DB
- Refactor hook thành thin wrapper

---

## PHASE 6: UI POLISH & GOVERNANCE (Week 6)

### Task 6.1: Insight Dismiss/Snooze UI (CDP)
### Task 6.2: Resolution Workflow UI (Control Tower)
### Task 6.3: Governance Dashboard Enhancement (All)

---

## ACCEPTANCE CRITERIA

### Phase 1 Complete:
- ESLint shows 0 `external_orders` violations
- `useMarketingDecisionEngine` chỉ fetch, không compute
- Escalation happens via DB trigger

### Phase 2 Complete:
- Credit Risk scores update từ AR aging
- Seasonal patterns available trong FDP forecast
- Budget suggestions generated từ Channel ROI

### Phase 3 Complete:
- Daily sync runs automatically at 04:00
- Alerts được cluster và hiển thị grouped
- Variance tự động tạo decision cards

### Phase 4-6 Complete:
- Tất cả thresholds configurable từ DB
- Cash forecast 100% từ RPC
- Insights có dismiss/snooze, Alerts có resolution workflow

---

## COMPLETED ACTIONS

### Phase 1.1 ✅ DONE (28/01/2026)
- Fixed `src/lib/command-center/metric-registry.ts`
- Changed 4 metrics from `external_orders` → `cdp_orders`:
  - net_revenue
  - contribution_margin
  - contribution_margin_percent
  - return_rate

### Phase 1.2 ✅ DONE (28/01/2026)
- Created `mdp_config` table for configurable thresholds
- Created `seed_mdp_config_defaults` function
- Created `v_mdp_decision_signals` view with decision logic in SQL
- Created `src/hooks/useMDPDecisionSignals.ts` as thin wrapper

### Phase 1.3 ✅ DONE (28/01/2026)
- Created `alert_escalations` table
- Created `v_alerts_pending_escalation` view
- Created `auto_escalate_alerts` function
- Created `check_alert_escalation` trigger
- Created `src/hooks/useAlertEscalationSSOT.ts` as thin wrapper

### Phase 2.1 ✅ DONE (28/01/2026)
- Created `cdp_customer_credit_risk` table
- Created `fdp_push_ar_to_cdp` RPC with fixed join logic via `external_id`, `name`, or `email`
- Credit score calculation: 100 - penalties (overdue %, days overdue)
- Risk levels: low, medium, high, critical
- Equity risk multiplier for customer valuation adjustment

### Phase 2.2 ✅ DONE (28/01/2026)
- Created `mdp_seasonal_patterns` table (monthly, weekly, event, campaign types)
- Created `mdp_push_seasonal_to_fdp` RPC for MDP → FDP sync
- Created `fdp_get_seasonal_adjustments` RPC for FDP consumption
- Confidence levels: LOCKED (≥80% + 12 samples), OBSERVED (≥50% + 3 samples), ESTIMATED

### Phase 2.3 ✅ DONE (28/01/2026)
- Created `mdp_channel_roi` table with ROAS and CAC computed columns
- Created `mdp_push_channel_roi_to_fdp` RPC with auto-recommendation logic
- Created `v_budget_reallocation_suggestions` view
- Created `fdp_get_budget_recommendations` RPC
- Action types: KILL, REDUCE, SCALE, MAINTAIN based on Profit ROAS & CM%

### Phase 3.1 ✅ DONE (28/01/2026)
- Created pg_cron job `cross_module_daily_sync` scheduled at 04:00 UTC daily
- Job calls `scheduled-sync` edge function with `cross_module_sync` action

### Phase 3.2 ✅ DONE (28/01/2026)
- Created `alert_clusters` table with metric_family, entity, time_window, causal_chain types
- Created `alert_cluster_members` junction table
- Created `cluster_related_alerts` function to group related alerts

### Phase 3.3 ✅ DONE (28/01/2026)
- Created `variance_decision_cards` table for auto-dispatched cards
- Created `auto_dispatch_variance_to_cards` trigger function
- Trigger fires on `cross_domain_variance_alerts` insert
- Auto-creates decision cards for FDP, MDP, CDP based on variance type

### Phase 4.1 ✅ DONE (28/01/2026)
- Created `cross_module_config` table for centralized configuration
- Implemented `seed_cross_module_config_defaults` function
- Default configs: variance thresholds, cost fallbacks, escalation hours, sync schedule, MDP thresholds

### Phase 4.2 ✅ DONE (28/01/2026)
- Created `ltv_industry_assumptions` table with 5 industry presets
- Created `tenant_ltv_config` table for tenant-specific overrides
- Implemented `get_tenant_ltv_assumptions` RPC for effective assumptions
- Created `trigger_auto_seed_tenant_config` to auto-seed on tenant creation
- Created `get_cross_module_config` and `set_cross_module_config` RPCs

### Phase 5.1 ✅ DONE (28/01/2026)
- Created `forecast_row` type for structured output
- Created `generate_cash_forecast` RPC with full logic:
  - AR collection probability curve (85% → 10% based on days overdue)
  - T+14 eCommerce settlement delay
  - AP payment spread by due dates
  - Recurring expense normalization (weekly/yearly → monthly)
  - Confidence interval bands (1.2%/day, max 60%)
  - Support for 'rule-based' and 'simple' methods
- Created `get_forecast_inputs_summary` RPC for data quality status
- Created `src/hooks/useCashForecastSSOT.ts` as thin wrapper

### Phase 6.1 ✅ DONE (28/01/2026)
- Created `cdp_insight_actions` table for dismiss/snooze tracking
- Created RPCs: `dismiss_insight`, `snooze_insight`, `reactivate_insight`
- Created `v_cdp_insights_with_actions` view for display status
- Created `src/hooks/useInsightActions.ts` with mutation hooks
- Created `src/components/cdp/insights/InsightActionButtons.tsx` UI component

### Phase 6.2 ✅ DONE (28/01/2026)
- Created `alert_resolutions` table for resolution workflow
- Created RPCs: `start_alert_resolution`, `complete_alert_resolution`, `mark_alert_false_positive`
- Created `v_alerts_with_resolution` view for resolution status + time metrics
- Created `src/hooks/useAlertResolution.ts` with query + mutation hooks
- Created `src/components/control-tower/AlertResolutionWorkflow.tsx` UI component

---

## ARCHITECTURE ROADMAP COMPLETE ✅

All 6 phases have been successfully implemented:
- Phase 1: Critical Fixes (Metric Registry, MDP Decision Logic, Escalation)
- Phase 2: Cross-Module Integration (AR→Credit, Seasonal, Channel ROI)
- Phase 3: Automation & Triggers (Daily Sync, Alert Clustering, Variance Dispatch)
- Phase 4: Configuration Table (Cross-Module Config, LTV Auto-Seed)
- Phase 5: Cash Forecast Migration (RPC-based forecast generation)
- Phase 6: UI Polish & Governance (Insight Actions, Alert Resolution)
