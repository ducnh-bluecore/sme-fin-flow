
# BLUECORE SYSTEM REVIEW - POST PHASE 6
## Đánh giá Kiến trúc và SSOT Compliance

**Ngày review:** 28/01/2026
**Phạm vi:** FDP, MDP, CDP, Control Tower, Cross-Module

---

## 1. EXECUTIVE SUMMARY

### Trạng thái tổng quan

| Tiêu chí | Trước Phase 1 | Sau Phase 6 | Đánh giá |
|----------|--------------|-------------|----------|
| FDP SSOT | 85% | 95% | GOOD |
| MDP SSOT | 75% | 85% | NEEDS WORK |
| CDP SSOT | 90% | 95% | GOOD |
| Control Tower SSOT | 80% | 90% | GOOD |
| Cross-Module Integration | 8/12 | 12/12 | COMPLETE |
| Frontend Business Logic | ~500 lines | ~200 lines | IMPROVED |

---

## 2. VẤN ĐỀ CÒN TỒN ĐỌNG

### 2.1 CRITICAL: MDP Decision Engine còn Business Logic trong Frontend

**File:** `src/hooks/useMarketingDecisionEngine.ts`

**Vấn đề:**
- Hook vẫn chứa 280 dòng business logic (lines 39-186)
- Sử dụng `MDP_V2_THRESHOLDS` từ frontend (`src/types/mdp-v2.ts`)
- Tính toán `decisionCards`, `ceoSnapshot`, `scaleOpportunities` trong `useMemo`
- **VI PHẠM:** Manifesto yêu cầu "0 business logic trong hooks"

**Evidence:**
```text
Line 112: .filter(c => c.cash_conversion_rate < MDP_V2_THRESHOLDS.PAUSE_CASH_CONVERSION_D14)
Line 147: return refundRate > MDP_V2_THRESHOLDS.CAP_RETURN_RATE;
Line 239: .filter(p => p.contribution_margin_percent >= MDP_V2_THRESHOLDS.SCALE_MIN_CM_PERCENT * 100)
```

**Giải pháp:**
- Page `MDPV2CEOPage.tsx` vẫn import từ `useMarketingDecisionEngine` thay vì `useMDPDecisionSignals`
- Cần migrate page sang sử dụng hook SSOT mới

---

### 2.2 MODERATE: Cash Forecast vẫn có Legacy Path

**File:** `src/hooks/useForecastInputs.ts`

**Vấn đề:**
- Function `generateForecast()` (lines 321-457) vẫn tồn tại với đầy đủ logic
- `DailyForecastView.tsx` vẫn import và sử dụng `generateForecast()` từ legacy hook
- RPC `generate_cash_forecast` đã tạo nhưng chưa được sử dụng ở UI

**Evidence:**
```text
DailyForecastView.tsx:39 - import { generateForecast } from '@/hooks/useForecastInputs';
DailyForecastView.tsx:362 - return generateForecast(inputs, 90, forecastMethod, ...);
```

**Giải pháp:**
- Migrate `DailyForecastView.tsx` sang sử dụng `useCashForecastSSOT`
- Deprecate `generateForecast()` function trong `useForecastInputs.ts`

---

### 2.3 MODERATE: external_orders vẫn còn References

**Vấn đề:** Tìm thấy 33 files với 465 references đến `external_orders`

**Các trường hợp HỢP LỆ (Exceptions đã documented):**
1. `useEcommerceReconciliation.ts` - Reconciliation staging data
2. `PortalPage.tsx` - Data presence check
3. `scheduled-bigquery-sync/index.ts` - Sync target table
4. Comments explaining SSOT migration

**Các trường hợp CẦN XEM XÉT:**
1. `src/pages/mdp/DataReadinessPage.tsx` - UI field descriptions
2. `src/hooks/useChannelPL.ts` - Comment outdated (nói là từ external_orders)
3. `docs/*` - Documentation có thể cần update

---

### 2.4 LOW: Frontend .reduce() vẫn còn nhiều

**Vấn đề:** Tìm thấy 1154 matches trong 62 files

**Phân loại:**
- **UI Aggregation (OK):** Tổng hợp kết quả từ DB cho hiển thị
- **Business Logic (BAD):** Tính toán metrics, margins, KPIs

**Files cần review:**
1. `useAudienceData.ts` - Nhiều .reduce() để tính RFM, LTV
2. `useSKUProfitabilityCache.ts` - Tổng profit, margin
3. `useWorkingCapital.ts` - CCC trend calculations
4. `useProductMetrics.ts` - Aggregations

---

## 3. PHÂN TÍCH THEO MODULE

### 3.1 FDP (Financial Data Platform) - 95% SSOT

**Đạt chuẩn:**
- `useFinanceTruthSnapshot` - Canonical hook, NO calculations
- `useCentralFinancialMetrics` - Deprecated wrapper, delegate only
- `useCashForecastSSOT` - Thin wrapper for RPC

**Chưa đạt:**
- `useForecastInputs.ts` - Legacy generateForecast() còn tồn tại
- UI components vẫn dùng legacy path

### 3.2 MDP (Marketing Data Platform) - 85% SSOT

**Đạt chuẩn:**
- `useMDPDecisionSignals` - Thin wrapper cho view
- `v_mdp_decision_signals` - Logic trong SQL
- `mdp_config` - Thresholds configurable

**Chưa đạt:**
- `useMarketingDecisionEngine.ts` - 280 lines business logic
- `MDPV2CEOPage.tsx` - Sử dụng legacy hook
- `MDP_V2_THRESHOLDS` - Hardcoded trong types file

### 3.3 CDP (Customer Data Platform) - 95% SSOT

**Đạt chuẩn:**
- Insight Actions (dismiss/snooze) via RPC
- Cross-module flows (Credit Risk, LTV, Churn)
- Population queries from views

**Chưa đạt:**
- `useAudienceData.ts` - RFM calculations trong frontend

### 3.4 Control Tower - 90% SSOT

**Đạt chuẩn:**
- Alert Resolution workflow via RPC
- Escalation via DB trigger
- Priority Queue from view

**Chưa đạt:**
- `useControlTowerSSOT.ts` - Một số mapping logic

---

## 4. CROSS-MODULE INTEGRATION

### 4.1 Đã hoàn thành 12/12 Cases

| Case | Flow | Status | Implementation |
|------|------|--------|----------------|
| 1 | CDP → FDP: Revenue Forecast | DONE | `cdp_push_revenue_to_fdp` |
| 2 | FDP → MDP: Locked Costs | DONE | `mdp_get_costs_for_roas` |
| 3 | CDP → MDP: Segment LTV | DONE | `useMDPSegmentLTV` |
| 4 | CDP → MDP: Churn Signal | DONE | `useMDPChurnSignals` |
| 5 | MDP → CDP: Attribution CAC | DONE | `usePushAttributionToCDP` |
| 6 | MDP → CDP: Acquisition Source | DONE | `usePushAcquisitionToCDP` |
| 7 | FDP → CDP: Actual Revenue | DONE | `usePushActualRevenueToCDP` |
| 8 | FDP → CDP: AR → Credit Risk | DONE | `fdp_push_ar_to_cdp` |
| 9 | MDP → FDP: Seasonal Patterns | DONE | `fdp_get_seasonal_adjustments` |
| 10 | MDP → FDP: Channel ROI | DONE | `fdp_get_budget_recommendations` |
| 11 | CT → All: Variance Alerts | DONE | `trigger_auto_dispatch_variance` |
| 12 | All → CT: Priority Queue | DONE | `useControlTowerPriorityQueue` |

---

## 5. ACTION ITEMS - PRIORITIZED

### Phase 7.1: MDP SSOT Completion (HIGH PRIORITY)

**Task 7.1.1:** Migrate MDPV2CEOPage sang useMDPDecisionSignals
- File: `src/pages/mdp/MDPV2CEOPage.tsx`
- Thay `useMarketingDecisionEngine` → `useMDPDecisionSignals`
- Map `decisionCards` từ signals
- Remove CEOSnapshot computation (move to view)

**Task 7.1.2:** Deprecate useMarketingDecisionEngine
- Add @deprecated annotation
- Remove business logic
- Make it a thin wrapper hoặc delete

**Task 7.1.3:** Move MDP_V2_THRESHOLDS sang Database
- Thresholds đã có trong `mdp_config`
- UI nên fetch từ `useMDPConfig()`
- Update `DecisionContextRail.tsx` để dùng DB values

### Phase 7.2: Cash Forecast Cleanup (MEDIUM PRIORITY)

**Task 7.2.1:** Migrate DailyForecastView sang SSOT
- Replace `generateForecast()` → `useCashForecastSSOT()`
- Remove import từ `useForecastInputs`

**Task 7.2.2:** Deprecate generateForecast()
- Add @deprecated annotation
- Consider removal sau 30 ngày

### Phase 7.3: Audience Data SSOT (LOW PRIORITY)

**Task 7.3.1:** Create v_cdp_rfm_segments view
- Move RFM calculation logic to SQL
- Pre-compute segment assignments

**Task 7.3.2:** Refactor useAudienceData
- Remove .reduce() business logic
- Fetch from view

---

## 6. METRICS TARGET POST-PHASE 7

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| FDP SSOT | 95% | 100% | Fix generateForecast |
| MDP SSOT | 85% | 98% | Fix MDPV2CEOPage |
| CDP SSOT | 95% | 100% | Fix useAudienceData |
| CT SSOT | 90% | 95% | Minor cleanup |
| Frontend Business Logic Lines | ~200 | <50 | Focus on 3 hooks |

---

## 7. POSITIVE FINDINGS

### 7.1 Metric Registry đã sửa đúng
- 4 metrics đã chuyển từ `external_orders` → `cdp_orders`
- ESLint guardrails đang hoạt động

### 7.2 Database-First Architecture hoàn thiện
- 15+ RPCs đã tạo
- 10+ Views cho aggregation
- Triggers cho automation

### 7.3 Cross-Module Data Flywheel hoạt động
- 12/12 integration cases implemented
- Fallback chain (Locked → Observed → Estimated)
- Daily sync orchestration

### 7.4 UI Polish & Governance
- Insight Actions (Dismiss/Snooze)
- Alert Resolution Workflow
- Governance Overlay (?governance=1)

---

## 8. RECOMMENDATIONS

### Immediate (This Week)
1. Fix MDPV2CEOPage.tsx to use useMDPDecisionSignals
2. Update DailyForecastView.tsx to use useCashForecastSSOT

### Short-term (Next 2 Weeks)
3. Create v_cdp_rfm_segments view
4. Refactor useAudienceData.ts
5. Audit remaining .reduce() usage

### Long-term (Next Month)
6. Remove deprecated hooks after 30-day notice
7. Strengthen ESLint rules to ERROR level
8. Add unit tests for database functions
