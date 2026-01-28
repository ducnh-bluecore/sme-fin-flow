
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

## NEXT ACTIONS

1. **Bắt đầu Phase 1.1:** Fix metric-registry.ts
2. **Review files:** `useMarketingDecisionEngine.ts`, `useAlertEscalation.ts`
3. **Prepare migrations:** v_mdp_decision_signals, mdp_config, escalations
