
# KẾ HOẠCH TỐI ƯU 4 TAB: ROI, NPV/IRR, PAYBACK, SENSITIVITY

## TỔNG QUAN

Nâng cấp 4 tab từ "Financial Calculator" thành "Decision-Ready Analysis" với:
- Visual KPIs thay vì flat cards
- Industry benchmarks để so sánh
- Scenario integration (ScenarioSandbox)
- AI insights contextual
- Actionable workflow

---

## PHẦN 1: ROI ANALYSIS TAB

### Trước vs Sau

```text
BEFORE:                              AFTER:
┌─────────┬─────────┬─────────┐     ┌─────────────────────────────────────┐
│ ROI 75% │ CAGR 12%│ Net 750M│     │ SCENARIO SANDBOX (Global toggles)   │
└─────────┴─────────┴─────────┘     ├─────────────────────────────────────┤
┌─────────────┐ ┌────────────┐      │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│ Input Form  │ │ Bar Chart  │      │ │ ROI │ │CAGR │ │ NP  │ │MULT │    │
│ ...         │ │            │      │ │75%  │ │12%  │ │750M │ │1.75x│    │
│             │ │            │      │ │⬤⬤⬤⬤│ │⬤⬤⬤ │ │⬤⬤⬤⬤│ │⬤⬤⬤ │    │
│             │ │            │      │ │Bench│ │Bench│ │     │ │     │    │
└─────────────┘ └────────────┘      │ └─────┘ └─────┘ └─────┘ └─────┘    │
┌───────────────────────────┐       ├─────────────────┬───────────────────┤
│ Text recommendation       │       │ Year-by-Year    │ Cumulative Chart  │
└───────────────────────────┘       │ Stacked Bar     │ with ROI Timeline │
                                    ├─────────────────┴───────────────────┤
                                    │ DECISION WORKFLOW CARD              │
                                    │ [Approve] [Request Data] [Compare]  │
                                    └─────────────────────────────────────┘
```

### Changes for ROIAnalysis.tsx

1. **Replace flat cards with `KPIRingGrid`**:
   - ROI Total → Ring with 20% benchmark line
   - CAGR → Ring with 10% industry benchmark
   - Net Profit → Ring format currency
   - Multiple (Total/Investment) → Ring với 1.5x threshold

2. **Add ScenarioSandbox** at top for what-if:
   - Revenue growth scenarios
   - Cost increase scenarios

3. **Enhanced Bar Chart**:
   - Add cumulative line overlay
   - Add break-even reference line
   - Show industry average dotted line

4. **Replace text recommendation with `DecisionWorkflowCard`**:
   - Approve & Notify buttons
   - Confidence score from calculation variance

5. **Add `InlineAIAdvisor`**:
   - Insight: "ROI vượt ngưỡng 20%, nhưng Year 4-5 giảm. Kiểm tra sustainability."
   - Insight: "CAGR 12% cao hơn industry 10%"

---

## PHẦN 2: NPV/IRR ANALYSIS TAB

### Trước vs Sau

```text
BEFORE:                              AFTER:
┌─────────┬─────────┬─────────┐     ┌─────────────────────────────────────┐
│ NPV 82M │ IRR 10% │ PI 1.04 │     │ SCENARIO SANDBOX (Discount rates)   │
└─────────┴─────────┴─────────┘     │ [Base 12%] [Pessimistic 15%] [Opt]  │
┌─────────────┐ ┌────────────┐      ├─────────────────────────────────────┤
│ Input Form  │ │ NPV Profile│      │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│ Dynamic     │ │ (Line)     │      │ │NPV  │ │IRR  │ │ PI  │ │Cash │    │
│ Cash flows  │ │            │      │ │82tr │ │10%  │ │1.04x│ │3.0tỷ│    │
│             │ │            │      │ │⬤⬤⬤ │ │⬤⬤  │ │⬤⬤⬤ │ │⬤⬤⬤⬤│    │
└─────────────┘ └────────────┘      │ └─────┘ └─────┘ └─────┘ └─────┘    │
┌───────────────────────────┐       ├───────────────────┬─────────────────┤
│ Text recommendation       │       │ NPV PROFILE CHART │ IRR GAUGE DIAL  │
└───────────────────────────┘       │ + Multi-scenario  │ vs WACC         │
                                    │ overlay           │                 │
                                    ├───────────────────┴─────────────────┤
                                    │ SENSITIVITY MINI-HEATMAP            │
                                    │ (Discount Rate vs Cash Flow)        │
                                    ├─────────────────────────────────────┤
                                    │ DECISION WORKFLOW CARD              │
                                    └─────────────────────────────────────┘
```

### Changes for NPVIRRAnalysis.tsx

1. **Replace flat cards with `KPIRingGrid`**:
   - NPV → Ring with 0 threshold (green if positive)
   - IRR → Ring with discount rate as benchmark line
   - Profitability Index → Ring with 1.0 threshold
   - Total Cash Flow → Ring format currency

2. **Add ScenarioSandbox** specifically for discount rates:
   - Presets: Conservative (15%), Base (12%), Optimistic (8%)
   - Show NPV at each discount rate

3. **Enhanced NPV Profile Chart**:
   - Multi-scenario overlay (3 lines for 3 discount rates)
   - IRR marker with animated pulse
   - WACC reference band (shaded area)

4. **NEW: IRR Gauge Dial**:
   - Semi-circular gauge showing IRR vs WACC
   - Green zone (IRR > WACC), Red zone (IRR < WACC)
   - Animated needle pointing to current IRR

5. **Add mini SensitivityHeatmap**:
   - X-axis: Discount rate (8-16%)
   - Y-axis: Cash flow variance (-20% to +20%)
   - Color = NPV value

6. **Replace text with `DecisionWorkflowCard`**

---

## PHẦN 3: PAYBACK ANALYSIS TAB

### Trước vs Sau

```text
BEFORE:                              AFTER:
┌─────────┬─────────┬─────────┐     ┌─────────────────────────────────────┐
│Simple 3.8│Disc 4.5│Target 4 │     │ VISUAL TIMELINE                     │
└─────────┴─────────┴─────────┘     │ ├─────●─────●─────●─────●─────●──── │
┌─────────────┐ ┌────────────┐      │ Y1   Y2   Y3   Y4   Y5   Y6        │
│ Input Form  │ │ Area Chart │      │           ▲           ▲            │
│ + Sliders   │ │            │      │        Simple     Discounted       │
│             │ │            │      │        Payback    Payback          │
│             │ │            │      ├─────────────────────────────────────┤
└─────────────┘ └────────────┘      │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
┌───────────────────────────┐       │ │Simp │ │Disc │ │Target│ │Risk │   │
│ Text recommendation       │       │ │3.8y │ │4.5y │ │ 4y  │ │Score│    │
└───────────────────────────┘       │ │⬤⬤⬤⬤│ │⬤⬤⬤ │ │ ✓  │ │ 72 │    │
                                    │ └─────┘ └─────┘ └─────┘ └─────┘    │
                                    ├─────────────────┬───────────────────┤
                                    │ Cash Flow Chart │ WHAT-IF PANEL     │
                                    │ with Zones      │ "If delay 6mo..."│
                                    ├─────────────────┴───────────────────┤
                                    │ DECISION WORKFLOW CARD              │
                                    └─────────────────────────────────────┘
```

### Changes for PaybackAnalysis.tsx

1. **NEW: Visual Timeline Component**:
   - Horizontal timeline showing Year 1 → Year 10
   - Simple Payback marker (vertical line + label)
   - Discounted Payback marker
   - Target Payback marker
   - Color zones: Green (before target), Yellow (near), Red (after)

2. **Replace flat cards with `KPIRingGrid`**:
   - Simple Payback → Ring with target as maxValue
   - Discounted Payback → Ring
   - Target Achievement → Pass/Fail indicator
   - Risk Score → Calculated from variance

3. **Enhanced Area Chart**:
   - Zone coloring: Green (positive cash flow), Red (negative)
   - Break-even line with animated marker
   - Confidence band (if growth varies ±5%)

4. **NEW: What-If Mini Panel**:
   - "If cash flow delays 6 months" → new payback
   - "If growth is 0%" → new payback
   - Quick scenario buttons

5. **Replace text with `DecisionWorkflowCard`**:
   - Risk level based on margin to target

---

## PHẦN 4: SENSITIVITY ANALYSIS TAB (Critical)

### Trước vs Sau

```text
BEFORE:                              AFTER:
┌─────────┬─────────┬─────────┐     ┌─────────────────────────────────────┐
│Base 1.5B│Rev 67%  │COGS 43% │     │ HERO CARD: Most Sensitive Variable  │
└─────────┴─────────┴─────────┘     │ "DOANH THU - Rủi ro cao nhất"       │
┌─────────────┐ ┌────────────┐      │ ±10% Revenue → ±67% Profit          │
│ Sliders     │ │ Scatter    │      ├─────────────────────────────────────┤
│ (confusing) │ │ (messy)    │      │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│             │ │            │      │ │Base │ │Rev  │ │COGS │ │OPEX │    │
│             │ │            │      │ │1.5B │ │67%  │ │43%  │ │13%  │    │
│             │ │            │      │ │     │ │⬤⬤⬤⬤⬤│ │⬤⬤⬤ │ │⬤⬤  │    │
└─────────────┘ └────────────┘      │ └─────┘ └─────┘ └─────┘ └─────┘    │
┌───────────────────────────┐       ├─────────────────┬───────────────────┤
│ Conclusion boxes          │       │ TORNADO CHART   │ 2D HEATMAP        │
└───────────────────────────┘       │ (Horizontal Bar)│ (Rev vs COGS)     │
                                    ├─────────────────┴───────────────────┤
                                    │ BREAK-EVEN SCENARIOS                │
                                    │ "Revenue drops 15% → Break-even"    │
                                    │ "COGS rises 23% → Break-even"       │
                                    ├─────────────────────────────────────┤
                                    │ DECISION WORKFLOW CARD              │
                                    └─────────────────────────────────────┘
```

### Changes for SensitivityAnalysis.tsx

1. **NEW: Hero Card for Most Sensitive Variable**:
   - Large display showing the #1 risk factor
   - Visual impact indicator
   - Recommended action

2. **Replace Scatter Chart with TORNADO CHART**:
   - Horizontal bars showing impact range
   - Sorted by impact (highest at top)
   - Red/Blue coloring (negative/positive impact)
   - Clear labels on both ends

3. **Add 2D HEATMAP** (use existing `SensitivityHeatmap`):
   - X-axis: Revenue change (-20% to +20%)
   - Y-axis: COGS change (-15% to +15%)
   - Color: Profit level (red → yellow → green)
   - Current position marker
   - Break-even contour line

4. **NEW: Break-even Scenarios Panel**:
   - Calculate: "How much can X change before profit = 0?"
   - Display as warning cards
   - e.g., "Doanh thu giảm 15% → Hòa vốn"

5. **Replace flat cards with `KPIRingGrid`**

6. **Add `InlineAIAdvisor`**:
   - "Revenue là biến nhạy nhất. Cần theo dõi chặt."
   - "COGS impact 43% - Negotiate với supplier."

---

## PHẦN 5: FILES TO MODIFY

| File | Changes |
|------|---------|
| `src/components/decision/ROIAnalysis.tsx` | Replace cards with KPIRingGrid, add ScenarioSandbox, DecisionWorkflowCard, InlineAIAdvisor |
| `src/components/decision/NPVIRRAnalysis.tsx` | Same + add IRR Gauge, mini heatmap |
| `src/components/decision/PaybackAnalysis.tsx` | Same + add Visual Timeline, What-If Panel |
| `src/components/decision/SensitivityAnalysis.tsx` | Replace scatter with Tornado, add Hero Card, break-even scenarios |

### NEW Components to Create

| File | Purpose |
|------|---------|
| `src/components/decision/TornadoChart.tsx` | Horizontal bar sensitivity chart |
| `src/components/decision/PaybackTimeline.tsx` | Visual timeline for payback |
| `src/components/decision/IRRGauge.tsx` | Semi-circular gauge for IRR vs WACC |
| `src/components/decision/BreakEvenScenarios.tsx` | Warning cards for break-even points |

---

## PHẦN 6: SHARED ENHANCEMENTS

### Add to all 4 tabs:

1. **ScenarioSandbox integration** (already created):
   - Apply multipliers to base calculations
   - Show "Scenario applied" badge

2. **DecisionWorkflowCard** at bottom:
   - Approve & Notify
   - Request More Data
   - Compare with History

3. **InlineAIAdvisor** contextual:
   - 2-3 insights per tab based on results

4. **Industry Benchmarks**:
   - ROI: 15-20% typical
   - IRR: Compare to WACC (10-12%)
   - Payback: 3-5 years industry standard
   - Sensitivity: Flag variables > 50% impact

---

## PHẦN 7: EXECUTION ORDER

```text
Phase 1: New Components ───────────────────────────────
│
│  Step 1: Create TornadoChart.tsx (replaces scatter)
│
│  Step 2: Create PaybackTimeline.tsx (visual timeline)
│
│  Step 3: Create IRRGauge.tsx (semi-circular gauge)
│
│  Step 4: Create BreakEvenScenarios.tsx (warning cards)
│
Phase 2: Update Analysis Components ───────────────────
│
│  Step 5: Update SensitivityAnalysis.tsx (highest impact)
│          └─ Add TornadoChart, Hero Card, Heatmap
│
│  Step 6: Update ROIAnalysis.tsx
│          └─ Add KPIRingGrid, ScenarioSandbox, Workflow
│
│  Step 7: Update NPVIRRAnalysis.tsx
│          └─ Add IRRGauge, mini heatmap
│
│  Step 8: Update PaybackAnalysis.tsx
│          └─ Add Timeline, What-If Panel
│
└──────────────────────────────────────────────────────
```

---

## PHẦN 8: EXPECTED VISUAL IMPACT

| Metric | Before | After |
|--------|--------|-------|
| KPI Visibility | Flat cards | Animated rings with benchmarks |
| Chart Clarity | Basic charts | Multi-layer with insights |
| Decision Ready | Text only | Actionable workflow |
| What-If Capability | None | ScenarioSandbox |
| AI Integration | Sidebar only | Inline contextual |
| "Wow Factor" | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## PHẦN 9: SAMPLE CODE STRUCTURE

### TornadoChart.tsx (Sensitivity replacement)

```tsx
interface TornadoChartProps {
  data: Array<{
    variable: string;
    minImpact: number; // % profit change at -X%
    maxImpact: number; // % profit change at +X%
    baseValue: number;
  }>;
  title?: string;
}

export function TornadoChart({ data, title }: TornadoChartProps) {
  // Sort by total impact range (most sensitive first)
  const sortedData = [...data].sort((a, b) => 
    (Math.abs(b.maxImpact) + Math.abs(b.minImpact)) - 
    (Math.abs(a.maxImpact) + Math.abs(a.minImpact))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Tornado Chart - Độ nhạy'}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData} layout="vertical">
            <XAxis type="number" domain={['auto', 'auto']} />
            <YAxis type="category" dataKey="variable" width={80} />
            <ReferenceLine x={0} stroke="#888" />
            <Bar dataKey="minImpact" fill="#ef4444" name="Giảm" />
            <Bar dataKey="maxImpact" fill="#10b981" name="Tăng" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### PaybackTimeline.tsx

```tsx
interface PaybackTimelineProps {
  simplePayback: number;
  discountedPayback: number;
  targetPayback: number;
  maxYears?: number;
}

export function PaybackTimeline({ 
  simplePayback, 
  discountedPayback, 
  targetPayback,
  maxYears = 10 
}: PaybackTimelineProps) {
  // Visual timeline with markers
  return (
    <Card className="bg-gradient-to-r from-green-50 to-yellow-50">
      <CardContent className="py-6">
        <div className="relative h-16">
          {/* Timeline bar */}
          <div className="absolute inset-x-0 top-1/2 h-2 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full" />
          
          {/* Year markers */}
          {Array.from({ length: maxYears + 1 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute top-1/2 w-px h-4 bg-gray-400"
              style={{ left: `${(i / maxYears) * 100}%` }}
            />
          ))}
          
          {/* Simple Payback marker */}
          <motion.div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${(simplePayback / maxYears) * 100}%` }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-4 h-4 bg-blue-500 rounded-full" />
            <span className="text-xs font-medium">Simple: {simplePayback.toFixed(1)}y</span>
          </motion.div>
          
          {/* Similar for discounted and target */}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## TÓM TẮT

Kế hoạch này sẽ biến 4 tab từ "Financial Calculator" thành "Decision-Ready Analysis" với:

1. **Animated KPI Rings** thay vì flat cards
2. **Tornado Chart** thay vì confusing scatter
3. **2D Heatmaps** cho sensitivity visualization
4. **Visual Timelines** cho payback
5. **IRR Gauge** cho NPV/IRR
6. **ScenarioSandbox** integration cho what-if
7. **DecisionWorkflowCard** cho actionable decisions
8. **InlineAIAdvisor** cho contextual insights
9. **Industry Benchmarks** cho context

**Ưu tiên cao nhất**: Sensitivity tab vì scatter chart hiện tại rất khó đọc.
