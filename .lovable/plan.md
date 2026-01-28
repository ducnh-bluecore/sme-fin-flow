
# Control Tower "WOW FACTOR" Upgrade Plan

## Executive Summary
Nang cap Control Tower tu "functional" len "exceptional" voi 6 tinh nang moi, bien Control Tower thanh **Trung tam Chi huy Chien luoc** thuc su - khong phai dashboard, ma la **Situation Awareness System**.

---

## Feature 1: LIVE PULSE DASHBOARD

### Vision
"Business Heartbeat" - hien thi real-time suc khoe toan he thong trong 1 man hinh duy nhat.

### Components

**1.1 PulseRing Component**
- Animated ring hien thi "nhip tim" cua business
- Mau sac thay doi theo trang thai: 
  - Xanh (pulse cham) = On dinh
  - Vang (pulse nhanh) = Canh bao
  - Do (pulse tat + rung) = Nguy cap

**1.2 Module Health Grid (3x1)**
```text
+-------------+-------------+-------------+
|    FDP      |    MDP      |    CDP      |
|   [icon]    |   [icon]    |   [icon]    |
|   Status    |   Status    |   Status    |
|  Last sync  |  Last sync  |  Last sync  |
+-------------+-------------+-------------+
```

**1.3 Live Metrics Stream**
- Realtime subscription toi `alert_instances` va `central_metrics_snapshots`
- Auto-refresh khi co du lieu moi (khong can user refresh)
- Toast notification khi phat hien van de moi

### Technical Implementation

**Database changes:**
- Them `module_health_status` table de track trang thai tung module
- Enable realtime cho `alert_instances` va `decision_cards`

**New hooks:**
- `useBusinessPulse()` - aggregate health signals
- `useModuleHealthStatus()` - per-module status
- `useRealtimePulse()` - WebSocket subscription

**New components:**
- `src/components/control-tower/pulse/PulseRing.tsx`
- `src/components/control-tower/pulse/ModuleHealthGrid.tsx`
- `src/components/control-tower/pulse/LiveMetricsTicker.tsx`

---

## Feature 2: RISK HEATMAP

### Vision
Visualization "hot zones" - nhin 1 cai la biet van de o dau, nghiem trong the nao.

### Components

**2.1 Heatmap Grid**
```text
           Revenue    Cash    Operations
FDP        [cell]    [cell]    [cell]
MDP        [cell]    [cell]    [cell]  
CDP        [cell]    [cell]    [cell]
```
- Moi cell la 1 indicator mau (gradient do -> xanh)
- Hover = tooltip chi tiet
- Click = navigate den van de cu the

**2.2 Risk Intensity Scale**
- 0-20: Xanh la (Safe)
- 21-50: Vang (Monitor)
- 51-80: Cam (Warning)
- 81-100: Do (Critical)

**2.3 Cascade Effect Lines**
- SVG arrows hien thi cascade: 
- VD: "CDP Churn" -> "MDP CAC tang" -> "FDP Cash giam"

### Technical Implementation

**Database changes:**
- Them `risk_heatmap_data` view aggregate tu cac bang hien tai
- RPC `compute_risk_heatmap(p_tenant_id)` tinh toan intensity

**New hooks:**
- `useRiskHeatmap()` - fetch heatmap data
- `useRiskCascade()` - cross-module risk relationships

**New components:**
- `src/components/control-tower/heatmap/RiskHeatmapGrid.tsx`
- `src/components/control-tower/heatmap/HeatmapCell.tsx`
- `src/components/control-tower/heatmap/CascadeLines.tsx`

---

## Feature 3: DECISION CASCADE VIEWER

### Vision
Hien thi **visual flow** cach 1 quyet dinh anh huong toan he thong.

### Components

**3.1 Flow Diagram (react-flow or custom SVG)**
```text
[Decision Card]
      |
      v
+------------+     +------------+
|  FDP Impact |---->|  MDP Impact |
|  -₫50M Cash |     |  +15% CAC   |
+------------+     +------------+
      |                   |
      v                   v
+------------+     +------------+
| CDP Impact |     | Ops Impact |
| -200 cust. |     | +2 days    |
+------------+     +------------+
```

**3.2 Impact Simulation**
- Drag slider de "What if we delay 1 week?"
- Numbers update real-time theo simulation

### Technical Implementation

**Database changes:**
- Them `decision_impact_projections` table
- RPC `simulate_decision_impact(card_id, delay_days)` 

**New hooks:**
- `useDecisionCascade(cardId)` - fetch impact tree
- `useImpactSimulation()` - run simulations

**New components:**
- `src/components/control-tower/cascade/DecisionCascadeViewer.tsx`
- `src/components/control-tower/cascade/ImpactNode.tsx`
- `src/components/control-tower/cascade/ImpactSlider.tsx`

---

## Feature 4: AI PREDICTION PANEL

### Vision
AI-powered: "Neu khong hanh dong, se mat bao nhieu?"

### Components

**4.1 Prediction Card**
```text
+------------------------------------------+
| AI PREDICTION                            |
|------------------------------------------|
| Neu khong xu ly trong 48h:               |
|                                          |
| ⚠️ Mat them: ₫120M - ₫180M              |
| ⚠️ Risk level: 85% -> 95%               |
| ⚠️ Cascade: 3 van de phu sinh           |
|                                          |
| [Confidence: 72%] [Last updated: 2m ago] |
+------------------------------------------+
```

**4.2 Scenario Comparison**
- "Act Now" vs "Delay 24h" vs "Delay 7d"
- Visual bar chart so sanh outcomes

### Technical Implementation

**Edge Function:** `ai-prediction`
- Input: Decision card data + historical outcomes
- Output: Predicted impact range + confidence score
- Model: google/gemini-3-flash-preview (Lovable AI)

**Database changes:**
- Them `ai_predictions` table cache predictions
- `prediction_accuracy_log` de track accuracy over time

**New hooks:**
- `useAIPrediction(cardId)` - fetch/generate prediction
- `useScenarioComparison(cardId)` - compare scenarios

**New components:**
- `src/components/control-tower/ai/AIPredictionPanel.tsx`
- `src/components/control-tower/ai/ScenarioComparisonChart.tsx`
- `src/components/control-tower/ai/ConfidenceBadge.tsx`

---

## Feature 5: RESOLUTION TIMER & ESCALATION

### Vision
Visual countdown + auto-escalation khi qua han.

### Components

**5.1 Countdown Timer**
```text
+------------------------------------------+
|  ⏱️ CON LAI: 04:32:15                    |
|  [================------]  65% time used |
|                                          |
|  Auto-escalate to CEO in: 2h 15m         |
+------------------------------------------+
```

**5.2 Escalation Path Visualization**
```text
Current Owner: COO
       |
       v (4h remaining)
Auto-escalate: CFO
       |
       v (8h remaining)  
Final escalate: CEO
```

**5.3 Escalation Rules Engine**
- Configurable per card_type
- Priority-based thresholds
- Notification triggers

### Technical Implementation

**Database changes:**
- Them `escalation_rules` table
- Them `escalation_history` table
- Trigger `auto_escalate_overdue_cards()`

**Edge Function:** `check-escalations` (scheduled)
- Chay moi 15 phut
- Check overdue cards
- Execute escalations
- Send notifications

**New hooks:**
- `useResolutionTimer(cardId)` - countdown logic
- `useEscalationPath(cardId)` - escalation visualization
- `useEscalationRules()` - manage rules

**New components:**
- `src/components/control-tower/timer/ResolutionCountdown.tsx`
- `src/components/control-tower/timer/EscalationPath.tsx`
- `src/components/control-tower/timer/TimeProgressBar.tsx`

---

## Feature 6: OUTCOME TRACKER

### Vision
Retrospective: "Quyet dinh nay da tao ra gia tri gi?"

### Components

**6.1 Decision Outcome Card**
```text
+------------------------------------------+
| QUYET DINH: Stop SKU-A0015               |
| Ngay: 15/01/2026                         |
|------------------------------------------|
| DU KIEN           |    THUC TE           |
|-------------------|----------------------|
| Save: ₫85M        | Save: ₫92M (+8%)     |
| Time: 7 days      | Time: 5 days (-2d)   |
| Risk: Eliminated  | Risk: Eliminated ✓   |
|------------------------------------------|
| [SUCCESS RATE: 108%]                     |
+------------------------------------------+
```

**6.2 Outcome Trends Chart**
- Line chart: Expected vs Actual over time
- Accuracy trend: "Predictions are 85% accurate"

**6.3 Learning Insights**
- AI-generated: "Quyet dinh loai STOP co accuracy 92%"
- Suggest: "Tang confidence cho card loai nay"

### Technical Implementation

**Database changes:**
- Extend `decision_audit_log` voi actual_outcome fields
- Them `decision_outcome_records` table
- View `v_decision_outcome_analysis`

**Edge Function:** `track-outcomes` (scheduled)
- Chay daily
- Compare predicted vs actual metrics
- Update outcome records

**New hooks:**
- `useDecisionOutcomes()` - fetch outcomes
- `useOutcomeTrends()` - analytics
- `useOutcomeLearnings()` - AI insights

**New components:**
- `src/components/control-tower/outcomes/OutcomeCard.tsx`
- `src/components/control-tower/outcomes/OutcomeTrendsChart.tsx`
- `src/components/control-tower/outcomes/LearningInsightsPanel.tsx`

---

## Implementation Phases

### Phase 1: Foundation (3-4 days)
1. Database schema cho 6 features
2. Core hooks setup
3. Basic UI components

### Phase 2: Live Features (3-4 days)
1. Live Pulse Dashboard
2. Risk Heatmap
3. Resolution Timer

### Phase 3: Intelligence (3-4 days)
1. Decision Cascade Viewer
2. AI Prediction Panel (Edge Function)
3. Outcome Tracker

### Phase 4: Integration (2-3 days)
1. Connect all features
2. New unified Control Tower page
3. Testing & refinement

---

## New Page Structure

```text
/control-tower/command-center (NEW - replaces multiple pages)
  - Tab 1: Live Pulse (default)
  - Tab 2: Risk Map
  - Tab 3: Active Decisions (with cascade + AI + timer)
  - Tab 4: Outcomes
```

---

## Technical Summary

| Feature | Database | Edge Function | Hooks | Components |
|---------|----------|---------------|-------|------------|
| Live Pulse | 1 table + realtime | - | 3 | 3 |
| Risk Heatmap | 1 view + 1 RPC | - | 2 | 3 |
| Decision Cascade | 1 table + 1 RPC | - | 2 | 3 |
| AI Prediction | 2 tables | ai-prediction | 2 | 3 |
| Resolution Timer | 2 tables + trigger | check-escalations | 3 | 3 |
| Outcome Tracker | 2 tables + view | track-outcomes | 3 | 3 |
| **TOTAL** | **9 schema changes** | **3 functions** | **15 hooks** | **18 components** |

---

## Success Metrics

Sau khi hoan thanh, Control Tower se:
1. **Real-time**: Data cap nhat trong 30 giay (thay vi 60s hien tai)
2. **Visual**: 1 cai nhin = biet ngay van de (thay vi doc text)
3. **Predictive**: Biet van de TRUOC khi xay ra (thay vi chi reactive)
4. **Accountable**: Moi quyet dinh co outcome tracking
5. **Automated**: Escalation tu dong, khong can manual follow-up
