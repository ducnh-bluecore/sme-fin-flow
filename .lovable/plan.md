

# Bluecore Retail Command Center v1

## Triết lý thiết kế

Dashboard hiện tại hỏi: "Financial position đang thế nào?"
Dashboard mới sẽ hỏi: **"Retail machine đang khỏe hay đang chết ở đâu?"**

Không phải financial reporting. Mà là **Retail Operating Console**.

## Layout tổng thể

```text
+================================================================+
| RETAIL HEALTH SCORE: GOOD / WARNING / CRITICAL                 |
| Net Margin | Cash Runway | Inventory Days | Sell-through | CAC |
+================================================================+
|                                                                |
| SECTION 1: MONEY ENGINE (Quality of Revenue)                   |
| Blended Margin | Discount Rate | Ads Ratio | CM after Ads     |
|                                                                |
+================================+===============================+
|                                |                               |
| SECTION 2: CHANNEL WAR        | SECTION 3: INVENTORY RISK     |
| Revenue + Margin by channel   | Dead stock value               |
| ROAS per channel              | Aging >90 days                 |
| AOV shift                     | Top items about to stockout    |
|                                |                               |
+================================+===============================+
|                                |                               |
| SECTION 4: CASH VELOCITY      | SECTION 5: DECISION FEED      |
| CCC trend                     | Top 5 decisions this week      |
| Inventory lock days           | AI narrative, not thresholds   |
| Locked cash breakdown         | Owner + deadline               |
|                                |                               |
+================================+===============================+
```

## Chi tiet tung section

### HERO STRIP -- Retail Health Score

Thay "Financial Position" bằng 1 health score tổng hợp:
- Score = weighted average of 5 sub-scores (margin, inventory, cash, channel, marketing)
- Hiển thị: **GOOD** (xanh) / **WARNING** (vàng) / **CRITICAL** (đỏ)
- Bên dưới: 5 metrics cốt lõi duy nhất

| Metric | Source | Logic |
|---|---|---|
| Net Margin % | snapshot.contributionMarginPercent | Direct from SSOT |
| Cash Runway | snapshot.cashRunwayMonths | Direct from SSOT |
| Inventory Days | snapshot.dio | Direct from SSOT |
| Sell-through Rate | Computed: orders / inventory items | Simple ratio |
| CAC Payback | snapshot.cac / snapshot.avgOrderValue | Months to recover |

Health Score logic:
- CRITICAL: margin < 5% OR cash runway < 3 months OR dead stock > 30%
- WARNING: margin < 15% OR cash runway < 6 months OR dead stock > 20%
- GOOD: tất cả các chỉ số trên ngưỡng

### Section 1: MONEY ENGINE (Quality of Revenue)

Thay "Financial Position" 8 metrics thành 4 metrics cho biết **chất lượng** doanh thu:

| Metric | Formula | Ý nghĩa |
|---|---|---|
| Blended Margin | snapshot.grossMarginPercent | Tổng quan margin |
| Marketing/Revenue Ratio | marketingSpend / netRevenue * 100 | Ads đang ăn bao nhiêu % doanh thu |
| CM after Ads | contributionMarginPercent | Sau khi trừ hết chi phí biến đổi |
| ROAS | snapshot.marketingRoas | 1 đồng ads tạo bao nhiêu đồng revenue |

Hiển thị dạng 4 cards ngang, mỗi card có:
- Giá trị chính (bold, lớn)
- So sánh với benchmark (xanh/đỏ)
- Mini trend nếu có

### Section 2: CHANNEL WAR

Horizontal bar chart + table, data từ `v_channel_pl_summary`:

Mỗi channel hiển thị:
- Revenue (bar)
- Margin % (badge xanh/đỏ)
- ROAS (nếu có marketing_spend)
- Order count
- AOV = gross_revenue / order_count

Columns trong view đã có sẵn: `channel`, `gross_revenue`, `net_revenue`, `cogs`, `gross_margin`, `contribution_margin`, `cm_percent`, `marketing_spend`, `roas`, `order_count`, `unique_customers`

### Section 3: INVENTORY RISK

Lấy data từ `useInventoryAging` (đã có sẵn):

| Chỉ số | Source |
|---|---|
| Dead stock value | agingBuckets[>180].totalValue |
| Dead stock % | agingBuckets[>180].percentage |
| Slow-moving (>90 ngày) | summary.slowMovingValue |
| Slow-moving % | summary.slowMovingPercentage |
| Total inventory value | summary.totalValue |
| Avg age (days) | summary.avgAge |

Hiển thị: mini donut chart (aging buckets) + highlight items sắp hết hàng

### Section 4: CASH VELOCITY

Lấy từ `useFinanceTruthSnapshot` (đã có sẵn):

| Metric | Field |
|---|---|
| CCC (Cash Conversion Cycle) | snapshot.ccc |
| DSO | snapshot.dso |
| DPO | snapshot.dpo |
| DIO | snapshot.dio |
| Locked Cash Total | snapshot.lockedCashTotal |
| - Inventory lock | snapshot.lockedCashInventory |
| - Ads lock | snapshot.lockedCashAds |
| - Ops lock | snapshot.lockedCashOps |

Hiển thị: CCC bar visualization + locked cash breakdown (stacked bar)

### Section 5: DECISION FEED

Thay "Financial Decisions Required" bằng **AI-driven narrative decisions**:

Thay vì threshold alerts ("CM at 0%"), tạo narrative decisions:

| Rule | Trigger | Narrative |
|---|---|---|
| Channel margin collapse | CM% < 10% on any channel | "[Channel] đang đốt margin: CM chỉ X% do chi phí Y" |
| Inventory cash trap | Slow-moving > 25% total value | "Z tỷ VND bị khóa trong tồn kho >90 ngày, chiếm X% tổng giá trị" |
| Marketing overspend | ROAS < 2.0 on any channel | "[Channel] ROAS chỉ X, mỗi đồng ads chỉ thu về X đồng" |
| Stockout risk | Items with high velocity + low stock | "X SKU top-seller sắp hết hàng trong Y ngày" |
| Cash velocity warning | CCC > 60 days | "Vòng quay tiền mất X ngày, chậm hơn benchmark Y ngày" |

Quick Actions bên dưới: links to Inventory Allocation, Unit Economics, Channel P&L, Marketing Dashboard

## Data hooks

Tất cả data đều có sẵn, KHÔNG cần tạo view mới:

| Data | Hook/Source | Status |
|---|---|---|
| Revenue, Margin, Cash, CCC | `useFinanceTruthSnapshot` | Co san |
| Channel breakdown | `v_channel_pl_summary` via `useAllChannelsPL` | Co san |
| Inventory aging | `useInventoryAging` | Co san |
| Top products | `v_top_products_30d` | Co san (view), chua co hook |
| Cash runway | `useCashRunway` | Co san |

Tao moi:
- `useRetailHealthScore` -- hook tinh Health Score tu snapshot data
- `useTopBottomSKU` -- hook fetch v_top_products_30d

## Files thay doi

| File | Thay doi |
|---|---|
| `src/pages/CFODashboard.tsx` | Rewrite toan bo layout theo 5 sections |
| `src/components/dashboard/RetailHealthHero.tsx` | **MOI** - Health Score + 5 hero metrics |
| `src/components/dashboard/MoneyEngineCards.tsx` | **MOI** - 4 cards Quality of Revenue |
| `src/components/dashboard/ChannelWarChart.tsx` | **MOI** - Channel bar chart + margin badges |
| `src/components/dashboard/InventoryRiskPanel.tsx` | **MOI** - Aging donut + dead stock highlight |
| `src/components/dashboard/CashVelocityPanel.tsx` | **MOI** - CCC viz + locked cash breakdown |
| `src/components/dashboard/RetailDecisionFeed.tsx` | **MOI** - Narrative decisions + quick actions |
| `src/hooks/useRetailHealthScore.ts` | **MOI** - Compute health score from snapshot |
| `src/hooks/useTopBottomSKU.ts` | **MOI** - Fetch v_top_products_30d |

## Nguyen tac FDP ap dung

- Revenue luon di kem Cost (Money Engine section)
- Surface Problems: Decision Feed chi noi van de, khong ton vinh thanh tich
- Real Cash: Locked cash breakdown hien thi ro cash bi khoa o dau
- Today's Decision: Moi section huong toi hanh dong, khong chi bao cao
- UNIT ECONOMICS -> ACTION: Channel War chi ro kenh nao loi, kenh nao lai

