# BLUECORE CDP - CUSTOMER ECONOMICS METRIC CONSTITUTION
## (Customer as Financial Asset)

---

## I. MỤC ĐÍCH CỦA HIẾN PHÁP

Tài liệu này xác định:
- Metric nào CDP **ĐƯỢC PHÉP** sử dụng
- Metric nào CDP **BỊ CẤM** tuyệt đối
- Cách metric được dùng để tạo insight xu hướng
- Cách metric được trình bày để phục vụ quyết định tài chính

> 👉 **Mục tiêu**: Mọi insight từ CDP đều phải nói được bằng ngôn ngữ của CEO / CFO / Head of Growth, không phải Marketing Ops.

---

## II. ĐƠN VỊ PHÂN TÍCH DUY NHẤT

CDP chỉ được phép phân tích ở các cấp sau:

| Cấp độ | Mô tả |
|--------|-------|
| **Cohort** | Theo thời điểm mua đầu, hành vi, giá trị |
| **Segment** | Logic-based, versioned |
| **Percentile** | P10 / P25 / P50 / P75 / P90 |
| **Distribution** | Median, variance, tail |

### 🚫 CẤM TUYỆT ĐỐI:
- Funnel stage
- Lead / deal / opportunity
- Cá nhân làm đơn vị ra quyết định

---

## III. NHÓM METRIC ĐƯỢC PHÉP (ALLOWED METRICS)

### 1️⃣ VALUE METRICS (Giá trị tài chính)

> Đây là xương sống CDP.

| Metric | Cách dùng |
|--------|-----------|
| Revenue per customer (rolling) | Distribution, Trend vs baseline |
| Gross margin per customer / cohort | Cohort comparison |
| Net revenue (sau refund/return) | Distribution |
| LTV (realized / projected rule-based) | Trend vs baseline |
| AOV (median, percentile) | Distribution, NOT average đơn lẻ |

🚫 **Không được dùng để "xếp hạng khách lẻ".**

---

### 2️⃣ VELOCITY / TIMING METRICS (Tốc độ & nhịp mua)

| Metric | Ý nghĩa |
|--------|---------|
| Time-to-second-purchase (median) | Cashflow |
| Inter-purchase time distribution | Retention economics |
| Purchase frequency (rolling window) | Forecast reliability |
| Decay curve theo cohort | Retention value |

🚫 **Không được gắn với "engagement".**

---

### 3️⃣ MIX & STRUCTURE METRICS (Cấu trúc mua)

| Metric | Dùng để |
|--------|---------|
| % discounted orders | Phát hiện shift cấu trúc giá trị |
| Category mix share | Đánh giá biên lợi nhuận |
| Bundle vs single-item ratio | Đánh giá rủi ro |
| Channel mix (POS / online / marketplace) | Mix shift detection |
| Payment method mix (COD / prepaid) | Risk assessment |

---

### 4️⃣ RISK & STABILITY METRICS (Rủi ro tài sản)

> Đây là metric "rất CFO".

| Metric | Mô tả |
|--------|-------|
| Return / refund rate | Rủi ro hoàn hàng |
| Volatility (std dev, IQR) của chi tiêu | Độ ổn định |
| Churn probability (cohort/segment level) | Không cá nhân! |
| Revenue concentration risk | Top X% đóng góp bao nhiêu |

---

### 5️⃣ QUALITY & COVERAGE METRICS (Data quality)

> 📌 **CDP phải tự nghi ngờ số của mình.**

| Metric | Mô tả |
|--------|-------|
| Identity coverage | % order có customer_id |
| Merge confidence | Độ tin cậy ghép customer |
| Refund mapping completeness | % refund được map |
| Missing cost coverage | % order có COGS |

---

## IV. METRIC BỊ CẤM TUYỆT ĐỐI (FORBIDDEN METRICS)

> ⚠️ Nếu xuất hiện bất kỳ metric nào dưới đây → **vi phạm hiến pháp**.

### 🚫 Engagement / Marketing metrics
- Open rate
- Click rate
- Impression
- Reach
- CTR
- Session duration
- Page view

### 🚫 CRM / Sales metrics
- Lead status
- Deal stage
- Opportunity value
- Task count
- Call / meeting count

### 🚫 "Soft metrics" cảm tính
- Customer happiness
- Customer interest
- Engagement score (không gắn tiền)
- Loyalty score không quy đổi tiền

---

## V. CÁCH METRIC ĐƯỢC DÙNG ĐỂ TẠO INSIGHT

> CDP không hiển thị metric trần.

### Metric chỉ được tồn tại nếu thỏa 3 điều kiện:

```
┌─────────────────────────────────────────────────────────┐
│ ĐIỀU KIỆN 1 — CÓ BASELINE                               │
├─────────────────────────────────────────────────────────┤
│ • Rolling vs rolling                                    │
│ • Hoặc cùng kỳ                                          │
│ • Hoặc cohort chuẩn                                     │
└─────────────────────────────────────────────────────────┘
                           +
┌─────────────────────────────────────────────────────────┐
│ ĐIỀU KIỆN 2 — CÓ SHIFT                                  │
├─────────────────────────────────────────────────────────┤
│ • ↑ ↓ hoặc change in distribution                       │
│ • Không shift → không insight                           │
└─────────────────────────────────────────────────────────┘
                           +
┌─────────────────────────────────────────────────────────┐
│ ĐIỀU KIỆN 3 — CÓ IMPACT                                 │
├─────────────────────────────────────────────────────────┤
│ • Impact tiền                                           │
│ • Hoặc impact rủi ro                                    │
└─────────────────────────────────────────────────────────┘
```

📌 **Metric không đủ 3 điều kiện → không được show.**

---

## VI. CẤU TRÚC CHUẨN CỦA 1 METRIC TRONG CDP

Mỗi metric phải được định nghĩa rõ:

| Field | Mô tả |
|-------|-------|
| **Definition** | Công thức & nguồn |
| **Granularity** | Customer / cohort / segment |
| **Window** | 30/60/90 ngày |
| **Baseline** | So với cái gì |
| **Interpretation rule** | Thay đổi bao nhiêu thì đáng chú ý |
| **Limitation** | Khi nào không tin cậy |

---

## VII. CÁCH CDP "NÓI" METRIC (LANGUAGE RULE)

### ❌ SAI (Ngôn ngữ cảm xúc)
- "Khách tương tác kém"
- "Khách ít quan tâm hơn"
- "Khách không hài lòng"

### ✅ ĐÚNG (Ngôn ngữ kinh tế)
- "Giá trị mua lặp lại của cohort chính giảm"
- "Tốc độ quay vòng khách hàng chậm lại"
- "Phân phối chi tiêu dịch chuyển về phân khúc biên lợi nhuận thấp"
- "Revenue concentration risk tăng từ 65% lên 78%"

> 👉 **Không dùng từ cảm xúc. Chỉ dùng từ kinh tế.**

---

## VIII. HỆ QUẢ CHIẾN LƯỢC

Nếu tuân thủ hiến pháp này:

| Outcome | Mô tả |
|---------|-------|
| ✅ CDP không thể biến thành CRM | Vì không có lead/deal/task |
| ✅ CDP không cạnh tranh với MA | Vì không có engagement metrics |
| ✅ CDP trở thành lớp intelligence độc quyền | Unique positioning |
| ✅ Insight CDP đủ sức đứng trong phòng họp | CFO/CEO language |

---

## IX. QUY TẮC CUỐI (NON-NEGOTIABLE)

> **Nếu một metric không trả lời được câu hỏi "ảnh hưởng tiền / rủi ro là gì?" thì metric đó không thuộc CDP.**

---

## METRIC REGISTRY

### Allowed Metrics Codes

| Code | Name | Category | Granularity |
|------|------|----------|-------------|
| `VAL_REV` | Revenue per Customer | Value | Cohort/Segment |
| `VAL_GM` | Gross Margin per Customer | Value | Cohort/Segment |
| `VAL_NR` | Net Revenue | Value | Cohort/Segment |
| `VAL_LTV` | Lifetime Value | Value | Cohort/Segment |
| `VAL_AOV` | Average Order Value (median) | Value | Distribution |
| `VEL_T2P` | Time to Second Purchase | Velocity | Cohort |
| `VEL_IPT` | Inter-Purchase Time | Velocity | Distribution |
| `VEL_FRQ` | Purchase Frequency | Velocity | Rolling |
| `VEL_DEC` | Decay Curve | Velocity | Cohort |
| `MIX_DSC` | Discount Order Ratio | Mix | Segment |
| `MIX_CAT` | Category Mix Share | Mix | Segment |
| `MIX_BND` | Bundle Ratio | Mix | Segment |
| `MIX_CHN` | Channel Mix | Mix | Segment |
| `MIX_PAY` | Payment Method Mix | Mix | Segment |
| `RSK_RET` | Return/Refund Rate | Risk | Segment |
| `RSK_VOL` | Spend Volatility | Risk | Segment |
| `RSK_CHN` | Churn Probability | Risk | Cohort/Segment |
| `RSK_CON` | Revenue Concentration | Risk | Population |
| `QUA_IDC` | Identity Coverage | Quality | Population |
| `QUA_MRG` | Merge Confidence | Quality | Population |
| `QUA_REF` | Refund Mapping | Quality | Population |
| `QUA_COG` | COGS Coverage | Quality | Population |

---

*Phiên bản: 1.0 | CDP Metric Constitution | Cập nhật: 2024-01*
