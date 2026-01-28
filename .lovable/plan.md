
# CONTROL TOWER - BỔ SUNG DECISION EFFECTIVENESS TRACKING

## TÌNH TRẠNG HIỆN TẠI

### Data Analysis

| Page | Hook | Data Source | Status |
|------|------|-------------|--------|
| CommandPage | `useActiveAlerts()` | `alert_instances` | **REAL** - table trống |
| SignalsPage | `useActiveAlerts()` | `alert_instances` | **REAL** - table trống |
| QueuePage | `useActiveAlerts()` + `useDecisionCards()` | Both tables | **REAL** - tables trống |
| VariancePage | `alert_instances` | type=cross_module_variance | **REAL + MOCK fallback** |
| OutcomesPage | `alert_instances` | status=resolved | **REAL + MOCK fallback** |

### Database có sẵn
- `decision_outcome_records` - 27 columns tracking before/after metrics
- `decision_cards` - Full decision tracking
- `alert_resolutions` - Resolution history
- Tất cả tables hiện **chưa có data**

---

## PHẦN 1: VẤN ĐỀ CẦN GIẢI QUYẾT

### 1.1 OutcomesPage hiện tại thiếu:
- Không có workflow record outcome khi resolve
- Không link predicted vs actual từ database
- Chỉ hiển thị mock data
- Không có learning feedback loop

### 1.2 Feature Gap: Decision Effectiveness Tracking
Để khách hàng theo dõi hiệu quả quyết định cần:
1. **Record Outcome** - Nhập kết quả thực tế sau khi resolve
2. **Compare** - So sánh predicted vs actual
3. **Learn** - Patterns từ outcomes để improve
4. **ROI** - Tổng giá trị Control Tower mang lại

---

## PHẦN 2: GIẢI PHÁP

### 2.1 Bổ sung Outcome Recording Flow

Khi user click "Resolve" trong CommandPage/QueuePage:
```text
┌─────────────────────────────────────────────────────────────────┐
│  RESOLVE DECISION                                               │
├─────────────────────────────────────────────────────────────────┤
│  Decision: Stop SKU-A0015 due to margin < 5%                    │
│  Predicted Impact: ₫85M saved                                   │
├─────────────────────────────────────────────────────────────────┤
│  OUTCOME RECORDING                                              │
│                                                                 │
│  What was the actual outcome?                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ○ Better than expected                                     ││
│  │ ○ As expected                                              ││
│  │ ○ Worse than expected                                      ││
│  │ ○ Cannot measure yet (follow up later)                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Actual financial impact (if known):                            │
│  [₫____________]                                                │
│                                                                 │
│  Notes (optional):                                              │
│  [_____________________________________________]                │
│                                                                 │
│  [Cancel]                              [Record & Resolve]       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Enhanced OutcomesPage

Thêm các section mới:

```text
┌─────────────────────────────────────────────────────────────────┐
│  DECISION EFFECTIVENESS                    Period: Last 90 days │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SUMMARY METRICS                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Resolved │  │ Success  │  │ Accuracy │  │ Total    │        │
│  │    12    │  │   87%    │  │   92%    │  │  ROI     │        │
│  │ decisions│  │          │  │pred vs   │  │ ₫450M    │        │
│  │          │  │          │  │actual    │  │ saved    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ACCURACY TREND                                                 │
│  [Chart showing prediction accuracy over time]                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  EFFECTIVENESS BY MODULE                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Module │ Decisions │ Success │ Avg Accuracy │ Total Value  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ FDP    │     5     │   80%   │     95%      │   ₫250M     ││
│  │ MDP    │     4     │   100%  │     88%      │   ₫150M     ││
│  │ CDP    │     3     │   67%   │     92%      │   ₫50M      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  LEARNING INSIGHTS                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 💡 FDP margin decisions có accuracy 95% - rất đáng tin cậy ││
│  │ ⚠️ MDP campaign decisions thường underestimate impact 15%  ││
│  │ 📊 Decisions resolved trong 4h có success rate cao hơn 20% ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  PENDING FOLLOW-UP                                              │
│  Decisions marked "cannot measure yet" (3 items)                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • Scale TikTok Channel - follow up due in 5 days           ││
│  │ • Reactivate Dormant Segment - follow up due in 12 days    ││
│  │ • New pricing strategy - follow up due in 20 days          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## PHẦN 3: IMPLEMENTATION PLAN

### Step 1: Database Updates
- Thêm fields vào `alert_instances` nếu thiếu (outcome tracking)
- Verify `decision_outcome_records` có đủ fields
- Tạo view `v_decision_effectiveness` aggregate metrics

### Step 2: Create Resolution Dialog Component
- `OutcomeRecordingDialog.tsx` - Dialog capture outcome
- Fields: outcome_verdict, actual_impact, notes, follow_up_date
- Save to `decision_outcome_records` table

### Step 3: Integrate with Resolve Actions
- Update CommandPage resolve button → open dialog
- Update QueuePage resolve button → open dialog
- Record outcome before marking as resolved

### Step 4: Enhance OutcomesPage
- Add ROI summary card
- Add accuracy trend chart (simple bar chart)
- Add effectiveness by module breakdown
- Add learning insights section
- Add pending follow-up list

### Step 5: Create Hooks
- `useOutcomeRecording()` - Save outcome to DB
- `useDecisionEffectiveness()` - Fetch aggregated effectiveness data
- `useLearningInsights()` - Generate insights from patterns

### Step 6: Follow-up System
- Alert user when follow-up is due
- Auto-add to queue for outcome measurement

---

## PHẦN 4: NEW FILES TO CREATE

### Components:
```text
src/components/control-tower/
├── common/
│   ├── OutcomeRecordingDialog.tsx    (NEW)
│   └── EffectivenessSummary.tsx      (NEW)
├── outcomes/
│   ├── AccuracyTrendChart.tsx        (NEW)
│   ├── ModuleEffectivenessTable.tsx  (NEW)
│   ├── LearningInsightsCard.tsx      (NEW)
│   └── PendingFollowUpList.tsx       (NEW)
```

### Hooks:
```text
src/hooks/control-tower/
├── useOutcomeRecording.ts      (NEW)
├── useDecisionEffectiveness.ts (NEW)
└── useLearningInsights.ts      (NEW)
```

### Database:
```sql
-- View for aggregated effectiveness
CREATE VIEW v_decision_effectiveness AS
SELECT 
  tenant_id,
  decision_type,
  COUNT(*) as total_decisions,
  COUNT(CASE WHEN outcome_verdict = 'success' THEN 1 END) as successful,
  AVG(outcome_confidence) as avg_accuracy,
  SUM(financial_delta_30d) as total_value
FROM decision_outcome_records
GROUP BY tenant_id, decision_type;
```

---

## PHẦN 5: TIMELINE

| Step | Task | Estimate |
|------|------|----------|
| 1 | Database view + verify schema | 15 min |
| 2 | OutcomeRecordingDialog component | 30 min |
| 3 | Integrate with resolve actions | 20 min |
| 4 | Enhanced OutcomesPage sections | 45 min |
| 5 | New hooks | 30 min |
| 6 | Follow-up system | 20 min |

**Total: ~2.5 hours**

---

## PHẦN 6: KẾT QUẢ SAU IMPLEMENTATION

### Khách hàng có thể:
1. ✅ Record outcome khi resolve decision
2. ✅ Xem tổng ROI của Control Tower decisions
3. ✅ So sánh predicted vs actual accuracy
4. ✅ Biết module nào predictions đáng tin cậy nhất
5. ✅ Nhận learning insights từ historical data
6. ✅ Được nhắc follow-up decisions chưa measure

### Control Tower value proposition:
- Không chỉ detect & alert
- Mà còn **track effectiveness** và **learn over time**
- Chứng minh ROI cụ thể bằng số liệu

