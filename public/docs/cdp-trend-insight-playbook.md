# BLUECORE CDP - TREND INSIGHT PLAYBOOK
## Customer Economics & Behavior Intelligence

---

## I. MỤC ĐÍCH CỦA PLAYBOOK

Playbook này xác định:
- Những loại **Trend Insight** CDP được phép tạo
- **Logic phát hiện** (detection logic) cho từng loại
- Cách **diễn giải insight** cho doanh nghiệp
- **Decision Prompt** chuẩn (CDP dừng ở đâu)
- **Mapping** insight → Decision Card

> 👉 **CDP không trả lời "làm gì"**, mà trả lời **"đang xảy ra chuyện gì + rủi ro/cơ hội là gì"**.

---

## II. KHUNG TỔNG QUÁT CỦA MỌI TREND INSIGHT

Mọi Trend Insight trong CDP **BẮT BUỘC** tuân theo cấu trúc này:

| # | Thành phần | Mô tả |
|---|------------|-------|
| 1 | **Population** | Tập khách hàng nào? |
| 2 | **Shift** | Cái gì đang thay đổi? |
| 3 | **Baseline** | So với giai đoạn nào? |
| 4 | **Magnitude** | Mức độ thay đổi? |
| 5 | **Financial Impact** | Ảnh hưởng tiền / rủi ro? |
| 6 | **Interpretation** | Giải thích kinh tế (không cảm xúc) |
| 7 | **Decision Prompt** | Câu hỏi cần ra quyết định |

> ⚠️ **Nếu thiếu 1 trong 7 → không phải insight hợp lệ.**

---

## III. CÁC NHÓM TREND INSIGHT ĐƯỢC PHÉP

CDP chỉ được phép tồn tại **5 nhóm insight** sau.

---

### 1️⃣ SPEND / VALUE DECLINE INSIGHT
*(Giá trị khách hàng suy giảm)*

#### Mô tả
Phát hiện khi giá trị kinh tế của một tập khách đang giảm.

#### Metric sử dụng
- Revenue per customer (median / percentile)
- AOV
- Purchase frequency
- Net revenue (after refund)

#### Detection Logic
```
IF AOV ↓ >10% trong 60 ngày
OR Frequency ↓ >5% so với baseline 90 ngày
AND cohort đóng góp >X% doanh thu
→ TRIGGER insight
```

#### Insight Statement (chuẩn)
> "Top 20% khách hàng theo LTV đang giảm AOV −12% và tần suất −8% trong 60 ngày gần đây."

#### Financial Framing
> "Nếu xu hướng giữ nguyên, doanh thu lặp lại quý tới ước giảm ~X tỷ."

#### Decision Prompt
> "Giá trị khách hàng đang phản ứng với pricing/bundle hiện tại. Cần đánh giá lại chính sách giá trị cho nhóm này."

---

### 2️⃣ VELOCITY / PURCHASE SLOWDOWN INSIGHT
*(Khách mua chậm lại)*

#### Mô tả
Phát hiện khi nhịp mua của khách hàng chậm hơn → ảnh hưởng cashflow & retention.

#### Metric sử dụng
- Inter-purchase time (median, P75)
- Time-to-second-purchase
- Purchase interval distribution

#### Detection Logic
```
IF Median inter-purchase time ↑ >20%
OR P75 kéo dài bất thường
→ TRIGGER insight
```

#### Insight Statement
> "Thời gian giữa các lần mua của nhóm khách repeat tăng từ 21 → 29 ngày trong 90 ngày gần đây."

#### Financial Framing
> "Điều này làm chậm dòng tiền và làm yếu forecast doanh thu Q+1."

#### Decision Prompt
> "Cần xem lại yếu tố nào đang làm giảm động lực mua lặp lại (pricing, assortment, policy)."

---

### 3️⃣ MIX / STRUCTURAL SHIFT INSIGHT
*(Cấu trúc mua thay đổi)*

#### Mô tả
Phát hiện khi cách khách hàng tạo ra doanh thu thay đổi theo hướng kém lợi nhuận hơn.

#### Metric sử dụng
- % discounted orders
- Category mix
- Bundle vs single-item ratio
- Channel / payment mix

#### Detection Logic
```
IF Discounted orders ↑ >X%
OR Category low-margin share ↑
OR Bundle ratio ↓
→ TRIGGER insight
```

#### Insight Statement
> "Tỷ trọng đơn giảm giá trong nhóm khách repeat tăng từ 35% → 52% trong 2 tháng."

#### Financial Framing
> "Biên lợi nhuận bình quân nhóm này giảm ~4.2 điểm."

#### Decision Prompt
> "Cấu trúc giá trị đang xấu đi. Cần đánh giá lại chính sách khuyến mãi/bundle."

---

### 4️⃣ STABILITY / VOLATILITY INSIGHT
*(Khách hàng kém ổn định hơn)*

#### Mô tả
Phát hiện khi hành vi chi tiêu trở nên khó dự đoán, tăng rủi ro.

#### Metric sử dụng
- Std deviation / IQR của spend
- Revenue concentration
- Return/refund variance

#### Detection Logic
```
IF Volatility ↑ >30% so với baseline
OR Tail risk (top/bottom percentile) mở rộng
→ TRIGGER insight
```

#### Insight Statement
> "Biến động chi tiêu của nhóm khách giá trị cao tăng 40% trong 3 tháng."

#### Financial Framing
> "Doanh thu từ nhóm này trở nên khó forecast, tăng rủi ro kế hoạch."

#### Decision Prompt
> "Cần xem lại chính sách giữ ổn định giá trị khách hàng chủ lực."

---

### 5️⃣ QUALITY / ACQUISITION DEGRADATION INSIGHT
*(Chất lượng khách mới kém đi)*

#### Mô tả
Không đo marketing performance, mà đo giá trị kinh tế của cohort mới.

#### Metric sử dụng
- First-30-day revenue
- Return rate early lifecycle
- Time-to-second-purchase
- Net margin cohort mới vs cũ

#### Detection Logic
```
IF Cohort mới < cohort cũ >X%
OR Early return/refund ↑
→ TRIGGER insight
```

#### Insight Statement
> "Khách hàng mới 60 ngày gần đây có giá trị mua 30 ngày đầu thấp hơn cohort trước 25%."

#### Financial Framing
> "Chi phí tăng trưởng đang tạo ra tài sản khách hàng chất lượng thấp hơn."

#### Decision Prompt
> "Cần đánh giá lại chiến lược tăng trưởng và tiêu chí chất lượng khách."

---

## IV. INSIGHT → DECISION CARD MAPPING

Mỗi Trend Insight phải sinh ra đúng **1 Decision Card**.

### Decision Card Structure

| Field | Mô tả |
|-------|-------|
| **Insight Summary** | Tóm tắt insight |
| **Population & Metrics** | Tập khách + metric liên quan |
| **Financial Impact Range** | Khoảng ảnh hưởng tiền |
| **Risk if Ignored** | Rủi ro nếu không hành động |
| **Owner** | Role, không phải cá nhân |
| **Review Horizon** | Thời hạn cần review |

> 🚫 **Decision Card không chứa action.**

---

## V. TẦN SUẤT & NGƯỠNG KÍCH HOẠT

CDP không spam insight.

### Quy tắc

| Aspect | Rule |
|--------|------|
| **Threshold** | Mỗi insight type có threshold rõ ràng |
| **Cooldown** | Có cooldown period sau mỗi insight |
| **Priority** | High value population > Low value |
| **Priority** | High financial impact > Low impact |

---

## VI. VAI TRÒ CỦA CDP TRONG PHÒNG HỌP

### CDP TỒN TẠI ĐỂ:
- ✅ Nêu vấn đề kinh tế
- ✅ Định lượng rủi ro & cơ hội
- ✅ Buộc tổ chức ra quyết định có kỷ luật

### CDP KHÔNG TRANH VAI:
- ❌ CRM (vận hành khách)
- ❌ MDP (hiệu quả marketing)
- ❌ Control Tower (thực thi & cảnh báo)

---

## VII. CÂU CHỐT (LOCK-IN RULE)

> **Nếu một insight không thể trình bày trong 60 giây cho CEO/CFO bằng ngôn ngữ tiền và rủi ro, insight đó không được phép tồn tại trong CDP.**

---

## INSIGHT TYPE REGISTRY

| Code | Type | Metrics | Threshold |
|------|------|---------|-----------|
| `SPEND_DECLINE` | Value Decline | AOV, Frequency, Revenue | >10% decline |
| `VELOCITY_SLOW` | Purchase Slowdown | Inter-purchase time | >20% increase |
| `MIX_SHIFT` | Structural Shift | Discount %, Category mix | >15% shift |
| `VOLATILITY_UP` | Stability Risk | Spend std dev, IQR | >30% increase |
| `QUALITY_DROP` | Acquisition Degradation | First-30-day value | >15% vs prev cohort |

---

*Phiên bản: 1.0 | CDP Trend Insight Playbook | Cập nhật: 2024-01*
