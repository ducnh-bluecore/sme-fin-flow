# BLUECORE CDP MANIFESTO
## Customer Data Platform - Financial Intelligence Layer

---

## 1️⃣ Sứ Mệnh (Mission)

### CDP TỒN TẠI ĐỂ:

> **Phát hiện, giải thích và định lượng các dịch chuyển giá trị (value shifts) trong tập khách hàng, nhằm giúp doanh nghiệp ra quyết định về pricing, policy, growth và phân bổ nguồn lực.**

### CDP KHÔNG TỒN TẠI ĐỂ:

- ❌ Quản lý quan hệ khách hàng (CRM)
- ❌ Vận hành marketing (Marketing Automation)
- ❌ Theo dõi tương tác vi mô (Engagement tracking)

---

## 2️⃣ Nguyên Lý Cốt Lõi (Core Principles)

### Principle 1 — Customer = Financial Asset

Khách hàng được nhìn như:

| Góc nhìn | Mô tả |
|----------|-------|
| 💰 **Dòng tiền tương lai** | Future cashflow potential |
| ⚠️ **Rủi ro** | Volatility, churn probability, return rate |
| 📦 **Chi phí phục vụ** | Discount, COD, logistics, support cost |

> 👉 **KHÔNG** nhìn khách hàng như "đối tượng cần chăm sóc"

---

### Principle 2 — Population > Individual

CDP chỉ quan tâm tới **phân phối (distribution)**:

```
┌─────────────────────────────────────────────────────────┐
│                    CDP FOCUS                             │
├─────────────────────────────────────────────────────────┤
│  ✅ Cohort Analysis     │  Nhóm theo thời điểm/hành vi  │
│  ✅ Segment Distribution│  Phân bố theo giá trị/rủi ro  │
│  ✅ Percentile Tracking │  Top 10%, Bottom 20%, etc.    │
├─────────────────────────────────────────────────────────┤
│  ⚠️ Customer-level view │  CHỈ để giải thích số liệu   │
│                         │  KHÔNG để hành động          │
└─────────────────────────────────────────────────────────┘
```

---

### Principle 3 — Shift, Không Phải Snapshot

CDP **KHÔNG** trả lời:
> "Hiện tại là bao nhiêu?"

CDP trả lời:
> "**Đang thay đổi như thế nào so với baseline?**"

| Metric | Snapshot ❌ | Shift ✅ |
|--------|-------------|----------|
| Customer Value | "AOV = 500K" | "AOV giảm 15% vs Q1" |
| Segment Size | "VIP = 1,200" | "VIP shrinking 8% MoM" |
| Churn | "Churn = 5%" | "Churn tăng 2pp so với baseline" |

---

### Principle 4 — Insight Phải Quy Ra Tiền Hoặc Rủi Ro

Mọi insight **BẮT BUỘC** phải:

1. **Định lượng impact** (VNĐ, %, units)
2. **HOẶC** định lượng risk (probability, exposure)

```
┌─────────────────────────────────────────────────────────┐
│ ❌ INVALID INSIGHT                                       │
│ "Khách hàng VIP đang giảm"                              │
├─────────────────────────────────────────────────────────┤
│ ✅ VALID INSIGHT                                         │
│ "VIP segment shrinking 8% MoM"                          │
│ "= -2.4 tỷ projected revenue impact"                    │
│ "= 340M margin at risk if trend continues"              │
└─────────────────────────────────────────────────────────┘
```

> 💡 **Insight không có trade-off = KHÔNG được tồn tại**

---

### Principle 5 — CDP Không Sở Hữu Hành Động

CDP:
- ❌ Không gửi (email, SMS, notification)
- ❌ Không gán (task, owner, reminder)
- ❌ Không kích hoạt (workflow, campaign, trigger)

CDP chỉ:
- ✅ Phát tín hiệu (signals)
- ✅ Đặt câu hỏi quyết định (decision prompts)
- ✅ Định nghĩa audience (read-only)

> **Hệ thống khác (Control Tower, MDP) xử lý hành động**

---

## 3️⃣ CDP KHÔNG LÀ GÌ (Anti-Manifest)

### CDP KHÔNG PHẢI:

| Tưởng nhầm | Sự thật |
|------------|---------|
| CRM nâng cấp | CDP là financial intelligence layer |
| Marketing Automation backend | CDP không trigger campaigns |
| Dashboard khách hàng đẹp | CDP chỉ hiển thị shifts & risks |

### CDP CẤM TUYỆT ĐỐI:

```
┌─────────────────────────────────────────────────────────┐
│ 🚫 FORBIDDEN FEATURES                                    │
├─────────────────────────────────────────────────────────┤
│ • Pipeline, Lead stage                                  │
│ • Task, Reminder, Follow-up                             │
│ • Campaign builder                                       │
│ • KPI click/open/engagement                             │
│ • Customer 360 profile                                  │
│ • Interaction timeline                                  │
│ • Loyalty points/rewards                                │
└─────────────────────────────────────────────────────────┘
```

---

## 4️⃣ Câu Hỏi CDP Được Phép Trả Lời

CDP **CHỈ** trả lời các câu hỏi dạng:

| # | Câu hỏi | Output Type |
|---|---------|-------------|
| 1 | Tập khách hàng đang **mất giá trị** ở đâu? | Trend Insight |
| 2 | Giá trị khách hàng đang **dịch chuyển** sang cấu trúc kém lợi nhuận hơn không? | Trend Insight |
| 3 | Tốc độ **quay vòng khách hàng** đang chậm lại hay nhanh lên? | Trend Insight |
| 4 | Doanh nghiệp đang **giữ sai loại khách** hay **mất đúng loại khách**? | Decision Prompt |
| 5 | Nếu **không thay đổi chính sách**, rủi ro tài chính là gì? | Decision Prompt |

---

## 5️⃣ Output Duy Nhất Của CDP

CDP **CHỈ** tạo ra 3 loại output:

### Output 1: Trend Insight

```typescript
interface TrendInsight {
  metric: string;           // "vip_segment_size"
  baseline_period: string;  // "Q1-2024"
  current_period: string;   // "Q2-2024"
  change_percent: number;   // -8.5
  change_absolute: number;  // -102 customers
  
  // REQUIRED: Financial impact
  revenue_impact: number;   // -2,400,000,000 VND
  margin_impact: number;    // -340,000,000 VND
  
  confidence: 'high' | 'medium' | 'low';
  data_quality: 'confirmed' | 'estimated';
}
```

### Output 2: Decision Prompt

```typescript
interface DecisionPrompt {
  question: string;         // "Có nên điều chỉnh chính sách VIP?"
  context: string;          // "VIP shrinking 8% MoM..."
  
  // REQUIRED: Trade-offs
  options: {
    action: string;         // "Giữ nguyên / Nới lỏng / Thắt chặt"
    projected_impact: number;
    risk_level: 'high' | 'medium' | 'low';
  }[];
  
  deadline_hint?: string;   // "Cần quyết định trước Q3"
  
  // NO action field - CDP không hành động
}
```

### Output 3: Audience Definition

```typescript
interface AudienceDefinition {
  id: string;
  name: string;             // "High-Value At-Risk"
  version: number;          // Versioned, immutable
  
  criteria: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'between';
    value: number | [number, number];
  }[];
  
  // READ-ONLY snapshot
  snapshot_date: string;
  member_count: number;
  total_value: number;
  
  // NO export/sync/push capabilities
}
```

---

## 6️⃣ CDP Metrics Framework

### Value Metrics (per customer/segment)

| Metric | Formula | Frequency |
|--------|---------|-----------|
| **CLV** | Σ(future_margin) × retention_prob | Monthly |
| **AOV** | total_revenue / order_count | Weekly |
| **Purchase Frequency** | orders / months_active | Monthly |
| **Margin per Customer** | CM / customer_count | Monthly |

### Risk Metrics

| Metric | Formula | Frequency |
|--------|---------|-----------|
| **Churn Probability** | ML model / rules | Weekly |
| **Value at Risk** | CLV × churn_prob | Weekly |
| **Return Rate** | return_value / gross_revenue | Monthly |
| **COD Risk** | cod_orders × fail_rate | Weekly |

### Movement Metrics

| Metric | Description | Frequency |
|--------|-------------|-----------|
| **Segment Migration** | Flows between value tiers | Monthly |
| **Cohort Decay** | Retention curve by cohort | Monthly |
| **Velocity Change** | ΔPurchase frequency | Weekly |

---

## 7️⃣ CDP → Other Modules Integration

```
┌─────────────────────────────────────────────────────────┐
│                        CDP                               │
│              (Value Shift Detection)                     │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Control Tower  │     │      FDP        │
│  (Decision Hub) │     │ (Financial      │
│                 │     │  Aggregation)   │
│ • Receive       │     │                 │
│   Decision      │     │ • CLV in        │
│   Prompts       │     │   revenue       │
│ • Assign owner  │     │   projections   │
│ • Track outcome │     │ • Customer      │
│                 │     │   margin in     │
└─────────────────┘     │   P&L           │
                        └─────────────────┘
          │
          ▼
┌─────────────────┐
│      MDP        │
│ (Marketing      │
│  Intelligence)  │
│                 │
│ • Audience      │
│   definitions   │
│   for targeting │
│ • CAC/LTV by    │
│   segment       │
└─────────────────┘
```

---

## 8️⃣ Data Sources

### Primary Source: Orders

```sql
-- Customer value derived from orders
SELECT 
  customer_id,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as aov,
  MAX(order_date) as last_order,
  DATEDIFF(NOW(), MAX(order_date)) as days_since_last
FROM external_orders
GROUP BY customer_id
```

### Enrichment: Customer Master

```sql
-- Customer master for segmentation
SELECT
  id,
  first_order_date,  -- Cohort assignment
  segment,           -- Value tier
  lifetime_value,    -- Calculated CLV
  churn_score,       -- Risk indicator
  last_segment_change_date
FROM customers
```

---

## 9️⃣ Nguyên Tắc Cuối Cùng

> **Nếu CDP không khiến một quyết định về pricing, policy, hoặc phân bổ nguồn lực trở nên rõ ràng hơn — CDP đã thất bại.**

---

*Phiên bản: 1.0 | Module: CDP | Cập nhật: 2024-01*
