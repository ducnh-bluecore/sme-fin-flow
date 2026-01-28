

# BlueCore Decision OS v1 - Implementation Plan

## Executive Summary

Triển khai Decision OS v1 song song với Control Tower hiện tại. Hệ thống cũ vẫn hoạt động 100%, không có breaking changes.

---

## Phase 1: Core Infrastructure

### 1.1 Layout Component

**File:** `src/components/layout/DecisionOSLayout.tsx`

- 4-tab navigation: Decision Board, Execution Queue, History, Outcomes
- Clean, executive-grade design
- No sidebar, no charts
- Footer: "BlueCore Decision OS helps executives act on what matters — not analyze what already happened."

### 1.2 Routing

**File:** `src/App.tsx`

Add routes:
- `/decision-os` → redirect to `/decision-os/board`
- `/decision-os/board` → DecisionBoardPage
- `/decision-os/queue` → ExecutionQueuePage
- `/decision-os/history` → DecisionHistoryPage
- `/decision-os/outcomes` → OutcomesPage
- `/decision-os/review/:id` → DecisionReviewPage

---

## Phase 2: CEO Mode Components

### 2.1 Confidence Badge

**File:** `src/components/decision-os/ConfidenceBadge.tsx`

- `Locked ✓` - Cross-module verified actuals (green)
- `Observed` - Transactional data (blue)
- `Estimated ⚠` - Model-based assumption (amber)

### 2.2 Decision Card OS

**File:** `src/components/decision-os/DecisionCardOS.tsx`

Structure (STRICT):
```text
┌─────────────────────────────────────────────────┐
│ [Priority]                    [Confidence Badge]│
│                                                 │
│ DECISION TITLE (≤8 words, verb + object)        │
│                                                 │
│ Context: Detected across Finance × Marketing    │
│                                                 │
│ ───────────────────────────────────────────────│
│ IMPACT                                          │
│ Financial: −420M VND over 30 days               │
│ Risk if delayed: High – Cash compression        │
│                                                 │
│ ───────────────────────────────────────────────│
│ RECOMMENDED ACTION                              │
│ Primary: Pause campaign immediately             │
│ Alternative: Reduce budget by 50%               │
│                                                 │
│ Owner: CMO                    Resolution: 72h   │
└─────────────────────────────────────────────────┘
```

### 2.3 Decision Board Page

**File:** `src/pages/decision-os/DecisionBoardPage.tsx`

- Purpose: "What requires my attention today?"
- Maximum 7 Decision Cards
- Vertical stack, no side panels
- Data: `useDecisionCards({ limit: 7, status: ['OPEN', 'IN_PROGRESS'] })`

### 2.4 Decision Review Page

**File:** `src/pages/decision-os/DecisionReviewPage.tsx`

Sections (FIXED ORDER):
1. Decision Statement - Auto-generated, no edit
2. Impact Explanation - Revenue, Margin, Cash, Risk
3. Evidence & Verification - Collapsible
4. Decision State - Proposed/Accepted/Executed/Verified/Rejected

---

## Phase 3: COO Mode Components

### 3.1 Execution Item

**File:** `src/components/decision-os/ExecutionItem.tsx`

- Action summary
- Owner
- Time remaining
- Escalation path

### 3.2 Execution Queue Page

**File:** `src/pages/decision-os/ExecutionQueuePage.tsx`

- Purpose: "What must be executed now?"
- No strategy explanation
- Only: Action, Owner, SLA, Escalation
- Copy: "This queue exists to prevent issues from silently compounding."

---

## Phase 4: History & Outcomes

### 4.1 Decision History Page

**File:** `src/pages/decision-os/DecisionHistoryPage.tsx`

- Past decisions log
- Filter by state: All, Executed, Rejected
- Simple table, no charts

### 4.2 Outcome Card

**File:** `src/components/decision-os/OutcomeCard.tsx`

- Outcome Status: Positive/No Change/Negative/Inconclusive
- Before vs After comparison
- Delta highlight only

### 4.3 Outcomes Page

**File:** `src/pages/decision-os/OutcomesPage.tsx`

- Purpose: "Did this decision improve the business?"
- 7/14/30 day window toggle
- Copy: "Outcome evaluation is automated to reduce bias."

---

## Phase 5: Portal Integration

### 5.1 Update Portal Card

**File:** `src/pages/PortalPage.tsx`

- Add Decision OS entry card
- Link to `/decision-os/board`
- Badge: "Decision OS"
- Tagline: "Decision > Metric > Data"

---

## Files Summary

| Action | File | Lines (est) |
|--------|------|-------------|
| CREATE | `src/components/layout/DecisionOSLayout.tsx` | ~80 |
| CREATE | `src/components/decision-os/ConfidenceBadge.tsx` | ~40 |
| CREATE | `src/components/decision-os/DecisionCardOS.tsx` | ~120 |
| CREATE | `src/components/decision-os/ExecutionItem.tsx` | ~60 |
| CREATE | `src/components/decision-os/OutcomeCard.tsx` | ~80 |
| CREATE | `src/pages/decision-os/DecisionBoardPage.tsx` | ~80 |
| CREATE | `src/pages/decision-os/DecisionReviewPage.tsx` | ~150 |
| CREATE | `src/pages/decision-os/ExecutionQueuePage.tsx` | ~80 |
| CREATE | `src/pages/decision-os/DecisionHistoryPage.tsx` | ~100 |
| CREATE | `src/pages/decision-os/OutcomesPage.tsx` | ~100 |
| MODIFY | `src/App.tsx` | +25 |
| MODIFY | `src/pages/PortalPage.tsx` | +20 |

**Total:** 10 new files, 2 modified files

---

## Data Reuse

Tái sử dụng 100% hooks hiện có:
- `useDecisionCards` - Decision Board data
- `useDecisionCard` - Single decision detail  
- `useDecideCard` - Accept/Execute
- `useDismissCard` - Reject
- `useDecisionOutcomes` - Outcome history

**No database changes required.**

---

## Visual Design

- Light professional theme (white background)
- Low density, executive-grade spacing
- Color reserved for: Severity, Confidence, Escalation only
- No charts by default
- Maximum 7 items per screen

---

## Anti-Pattern Checklist

Before each component, verify:
- [ ] Does NOT look like BI dashboard
- [ ] Does NOT allow deep filtering
- [ ] Does NOT show charts by default
- [ ] Does NOT show more than 7 priorities
- [ ] Does NOT use KPI grids
- [ ] Does NOT feel like task management

