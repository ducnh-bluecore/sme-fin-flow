# BLUECORE FINANCIAL INTELLIGENCE PLATFORM
## Hướng dẫn Sử dụng Chi tiết

---

# MỤC LỤC

1. [Tổng quan Hệ thống](#tổng-quan-hệ-thống)
2. [Module 1: FDP - Financial Data Platform](#module-1-fdp---financial-data-platform)
3. [Module 2: Control Tower](#module-2-control-tower)
4. [Module 3: MDP - Marketing Data Platform](#module-3-mdp---marketing-data-platform)
5. [Module 4: Decision Center](#module-4-decision-center)
6. [Module 5: Scenario & Planning](#module-5-scenario--planning)
7. [Module 6: Data Management](#module-6-data-management)
8. [Bluecore Scores™](#bluecore-scores)
9. [Phụ lục](#phụ-lục)

---

# TỔNG QUAN HỆ THỐNG

## Triết lý Thiết kế

Bluecore Platform được xây dựng dựa trên nguyên tắc **"Truth over Flexibility"**:

| Nguyên tắc | Mô tả |
|------------|-------|
| **Single Source of Truth** | Chỉ có 1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác |
| **Real Cash** | Phân biệt rõ: Cash đã về / sẽ về / có nguy cơ không về / đang bị khóa |
| **Revenue ↔ Cost** | Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình" |
| **Today's Decision** | Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng |
| **Surface Problems** | Không làm đẹp số, chỉ ra vấn đề sớm |

## Đối tượng Sử dụng

| Role | Modules chính | Quyền hạn |
|------|---------------|-----------|
| **CEO** | Decision Center, Control Tower, Executive Summary | Xem tất cả, phê duyệt quyết định lớn |
| **CFO** | FDP Dashboard, Cash Flow, P&L, Working Capital | Full access FDP, thiết lập ngưỡng |
| **CMO** | MDP Dashboard, Campaign Analysis, Budget Optimizer | Full access MDP, phân bổ ngân sách |
| **COO** | Control Tower, Inventory, Operations | Alert management, vận hành |
| **Marketer** | MDP Marketing Mode, Campaigns, Funnel | Xem metrics, không thay đổi công thức |
| **Accountant** | Invoice, Bills, Reconciliation | Nhập liệu, đối soát |

---

# MODULE 1: FDP - FINANCIAL DATA PLATFORM

> **Mục đích:** Cung cấp "Financial Truth" cho CEO/CFO điều hành doanh nghiệp.
> **LƯU Ý:** FDP KHÔNG PHẢI phần mềm kế toán, không dùng để nộp báo cáo thuế.

## 1.1 CFO Dashboard

### Tính năng
Màn hình tổng quan tài chính real-time, hiển thị các KPI quan trọng nhất.

### Các chỉ số hiển thị

| KPI | Công thức | Ý nghĩa |
|-----|-----------|---------|
| **Cash on Hand** | Tổng số dư tài khoản ngân hàng | Tiền mặt hiện có |
| **Total AR** | Tổng công nợ phải thu | Tiền khách hàng đang nợ |
| **Overdue AR** | AR quá hạn thanh toán | Tiền có nguy cơ không thu được |
| **DSO** | (AR / Revenue) × 30 | Số ngày trung bình thu tiền |
| **Gross Margin** | (Revenue - COGS) / Revenue × 100 | Biên lợi nhuận gộp |

### Use Cases

**UC1.1: CEO kiểm tra sức khỏe tài chính buổi sáng**
```
Bước 1: Mở CFO Dashboard
Bước 2: Xem Cash on Hand → Đủ runway không?
Bước 3: Xem Overdue AR → Có vấn đề thu tiền không?
Bước 4: Xem Bluecore Scores → Sức khỏe tổng thể?
Kết quả: Trong 30 giây biết cần làm gì hôm nay
```

**UC1.2: CFO theo dõi dòng tiền hàng tuần**
```
Bước 1: Xem Cash Forecast Chart
Bước 2: Kiểm tra điểm thấp nhất trong 30 ngày tới
Bước 3: So sánh với burn rate hiện tại
Bước 4: Nếu runway < 90 ngày → Lên kế hoạch huy động
```

---

## 1.2 Real Cash Breakdown

### Tính năng
Phân tích chi tiết các trạng thái của tiền trong doanh nghiệp.

### Phân loại Cash

| Loại | Mô tả | Màu sắc |
|------|-------|---------|
| **Available Cash** | Tiền có thể sử dụng ngay | 🟢 Xanh |
| **Pending AR** | Tiền khách hàng sẽ trả (chưa đến hạn) | 🟡 Vàng |
| **Overdue AR** | Tiền khách hàng nợ quá hạn | 🔴 Đỏ |
| **Locked in Inventory** | Tiền đang bị "khóa" trong hàng tồn kho | 🟠 Cam |
| **Locked in Ads** | Tiền đã chi cho quảng cáo, chờ thu hồi | 🟣 Tím |

### Use Cases

**UC1.3: Phân tích tiền bị "khóa"**
```
Bước 1: Mở Real Cash Breakdown
Bước 2: Xem tỷ lệ Locked in Inventory
Bước 3: Nếu > 30% tổng cash → Cảnh báo tồn kho cao
Bước 4: Drill down xem SKU nào chiếm nhiều nhất
Bước 5: Quyết định: Khuyến mãi / Thanh lý / Ngừng nhập
```

---

## 1.3 Unit Economics

### Tính năng
Phân tích lợi nhuận chi tiết theo từng SKU/Sản phẩm.

### Công thức chính

```
Net Revenue = Gross Revenue - Returns - Discounts - Platform Fees

Contribution Margin = Net Revenue - COGS - Shipping - Payment Fees - Commission

Margin % = (Contribution Margin / Net Revenue) × 100
```

### Bảng phân loại SKU

| Margin % | Phân loại | Hành động đề xuất |
|----------|-----------|-------------------|
| > 20% | 🟢 Healthy | Scale, tăng inventory |
| 10-20% | 🟡 Acceptable | Theo dõi, tối ưu chi phí |
| 0-10% | 🟠 Warning | Điều tra, tăng giá hoặc giảm chi phí |
| < 0% | 🔴 Loss-making | STOP - Ngừng bán hoặc thanh lý |

### Use Cases

**UC1.4: Phát hiện SKU lỗ**
```
Bước 1: Mở Unit Economics
Bước 2: Lọc SKU có Margin < 10%
Bước 3: Xem chi tiết breakdown chi phí
Bước 4: Xác định nguyên nhân: COGS cao? Shipping cao? Return cao?
Bước 5: Tạo Decision Card để xử lý
```

**UC1.5: Tìm SKU nên scale**
```
Bước 1: Lọc SKU có Margin > 20%
Bước 2: Kiểm tra trend: Margin có ổn định không?
Bước 3: Kiểm tra inventory: Còn hàng để scale không?
Bước 4: Kiểm tra ads: Chi phí ads có hợp lý không?
Bước 5: Quyết định tăng budget/inventory
```

---

## 1.4 Cash Flow Direct

### Tính năng
Theo dõi dòng tiền vào/ra theo phương pháp trực tiếp.

### Phân loại dòng tiền

| Loại | Inflow | Outflow |
|------|--------|---------|
| **Operating** | Thu từ khách hàng | Chi trả nhà cung cấp, lương, thuê |
| **Investing** | Bán tài sản | Mua tài sản, đầu tư |
| **Financing** | Vay vốn, góp vốn | Trả nợ, chia cổ tức |

### Use Cases

**UC1.6: Dự báo thiếu hụt tiền mặt**
```
Bước 1: Mở Cash Flow Direct
Bước 2: Xem Net Cash Flow 30 ngày tới
Bước 3: Nếu Net < 0 → Xem chi tiết outflow lớn
Bước 4: Xác định: Có thể hoãn thanh toán nào không?
Bước 5: Liên hệ supplier đàm phán payment terms
```

---

## 1.5 P&L Report

### Tính năng
Báo cáo Lãi/Lỗ theo kênh bán hàng và tổng thể.

### Cấu trúc P&L

```
Gross Revenue
  - Returns & Refunds
  - Discounts
  - Platform Fees
= Net Revenue

Net Revenue
  - COGS
= Gross Profit

Gross Profit
  - Marketing Costs
  - Shipping & Fulfillment
  - Payment Processing
  - Commission
= Contribution Margin

Contribution Margin
  - Fixed Costs (Rent, Salary, Admin)
= EBITDA

EBITDA
  - Depreciation
  - Interest
  - Tax
= Net Profit
```

### Use Cases

**UC1.7: So sánh hiệu quả các kênh**
```
Bước 1: Mở Channel P&L
Bước 2: So sánh Contribution Margin % giữa các kênh
Bước 3: Xác định kênh nào hiệu quả nhất
Bước 4: Phân bổ lại ngân sách marketing
```

---

## 1.6 Working Capital

### Tính năng
Quản lý vốn lưu động và chu kỳ chuyển đổi tiền mặt.

### Công thức CCC (Cash Conversion Cycle)

```
CCC = DIO + DSO - DPO

DIO (Days Inventory Outstanding) = (Inventory / COGS) × 365
DSO (Days Sales Outstanding) = (AR / Revenue) × 365
DPO (Days Payable Outstanding) = (AP / COGS) × 365
```

### Bảng đánh giá CCC

| CCC | Đánh giá | Hành động |
|-----|----------|-----------|
| < 30 ngày | 🟢 Xuất sắc | Duy trì |
| 30-60 ngày | 🟡 Tốt | Theo dõi |
| 60-90 ngày | 🟠 Cảnh báo | Cải thiện DIO hoặc DPO |
| > 90 ngày | 🔴 Nguy hiểm | Hành động ngay |

---

# MODULE 2: CONTROL TOWER

> **Mục đích:** Phát hiện vấn đề và ép hành động, KHÔNG PHẢI dashboard để xem.
> **Nguyên tắc:** Nếu không có vấn đề, Control Tower im lặng.

## 2.1 Alert System

### Tính năng
Hệ thống cảnh báo thông minh với 3 cấp độ.

### Cấp độ Alert

| Level | Màu | Deadline | Escalation |
|-------|-----|----------|------------|
| **P1 - Critical** | 🔴 Đỏ | < 4 giờ | CEO/CFO ngay lập tức |
| **P2 - Warning** | 🟡 Vàng | 24-72 giờ | Manager trong 24h |
| **P3 - Info** | 🔵 Xanh | 1 tuần | Team lead |

### Cấu trúc Alert bắt buộc

Mỗi alert PHẢI có đủ 3 thông tin:
1. **Mất bao nhiêu tiền?** (Impact amount)
2. **Nếu không xử lý, mất thêm bao nhiêu?** (Cost of delay)
3. **Còn bao lâu để hành động?** (Deadline)

### Use Cases

**UC2.1: Xử lý P1 Alert**
```
Bước 1: Nhận notification P1 (push/email)
Bước 2: Mở Control Tower → Xem chi tiết alert
Bước 3: Đọc: Vấn đề gì? Mất bao nhiêu? Còn bao lâu?
Bước 4: Xem System Recommendation
Bước 5: Chấp nhận hoặc chọn hành động khác
Bước 6: Ghi note lý do
Bước 7: Alert chuyển sang Resolved
```

---

## 2.2 Intelligent Rules

### Tính năng
Thiết lập quy tắc tự động phát hiện vấn đề.

### Các loại Rule có sẵn

| Rule Type | Trigger | Alert Level |
|-----------|---------|-------------|
| **SKU Margin < 10%** | Margin giảm dưới ngưỡng | P1 nếu revenue > 50M |
| **Cash Runway < 60 days** | Runway giảm | P1 |
| **Overdue AR > 30%** | Tỷ lệ nợ xấu tăng | P2 |
| **ROAS < 1.5** | Campaign không hiệu quả | P2 |
| **Inventory > 90 days** | Tồn kho quá lâu | P2 |

### Tùy chỉnh Rule

```yaml
Rule: SKU_LOW_MARGIN
  Condition: margin_percent < threshold
  Threshold: 10%  # Có thể chỉnh
  Scope: All SKUs | Specific category
  Alert Level: P1 if revenue > 50M else P2
  Owner: CFO
  Auto-action: None | Pause ads | Notify supplier
```

---

## 2.3 Task Management

### Tính năng
Quản lý công việc từ alert đến hoàn thành.

### Workflow

```
Alert Created → Task Created → Assigned → In Progress → Resolved
                     ↓
                 Escalated (nếu quá hạn)
```

### Use Cases

**UC2.2: Tạo task từ alert**
```
Bước 1: Mở alert chi tiết
Bước 2: Click "Tạo Task"
Bước 3: Assign cho người phụ trách
Bước 4: Set deadline
Bước 5: Theo dõi tiến độ trong Tasks page
```

---

## 2.4 Data Source Health

### Tính năng
Giám sát tình trạng kết nối dữ liệu.

### Trạng thái

| Status | Ý nghĩa | Hành động |
|--------|---------|-----------|
| 🟢 Healthy | Sync bình thường | Không cần làm gì |
| 🟡 Delayed | Sync chậm > 1 giờ | Kiểm tra kết nối |
| 🔴 Error | Sync thất bại | Fix ngay, dữ liệu không chính xác |

---

# MODULE 3: MDP - MARKETING DATA PLATFORM

> **Mục đích:** Đo lường GIÁ TRỊ TÀI CHÍNH THẬT của Marketing.
> **Nguyên tắc:** Profit before Performance. Cash before Clicks.

## 3.1 CMO Mode (Dành cho CFO/CMO)

### 3.1.1 Profit Attribution

**Tính năng:** Phân bổ lợi nhuận thật về từng campaign/channel.

**Công thức:**
```
Profit ROAS = Contribution Margin / Ad Spend

True CAC = Total Marketing Cost / New Customers Acquired

LTV:CAC Ratio = Customer Lifetime Value / True CAC
```

**Bảng đánh giá:**

| Metric | Tốt | Chấp nhận | Nguy hiểm |
|--------|-----|-----------|-----------|
| Profit ROAS | > 2.0 | 1.5-2.0 | < 1.5 |
| LTV:CAC | > 3.0 | 2.0-3.0 | < 2.0 |

**Use Cases:**

**UC3.1: Đánh giá campaign có lãi thật không**
```
Bước 1: Mở Profit Attribution
Bước 2: Chọn campaign cần đánh giá
Bước 3: Xem Profit ROAS (không phải Revenue ROAS!)
Bước 4: Nếu Profit ROAS < 1.5 → Campaign đang lỗ
Bước 5: Quyết định: Tối ưu / Giảm budget / Dừng
```

### 3.1.2 Cash Impact

**Tính năng:** Đo lường ảnh hưởng của marketing đến dòng tiền.

**Metrics:**
- **Days to Cash:** Số ngày từ chi ads đến khi thu được tiền
- **Cash Locked in Ads:** Tiền đã chi nhưng chưa thu hồi
- **Marketing Cash ROI:** (Cash Collected - Ad Spend) / Ad Spend

**Use Cases:**

**UC3.2: Kiểm tra marketing có "đốt tiền" không**
```
Bước 1: Mở Cash Impact
Bước 2: Xem Days to Cash trung bình
Bước 3: Nếu > 30 ngày → Marketing đang "khóa" cash quá lâu
Bước 4: Xem Cash Locked → Bao nhiêu tiền đang bị khóa?
Bước 5: So sánh với runway → Có đủ cash để chờ không?
```

### 3.1.3 Risk Alerts

**Tính năng:** Cảnh báo rủi ro marketing.

**Các loại cảnh báo:**
- Campaign ROAS giảm đột ngột
- CAC tăng vượt ngưỡng
- Chi tiêu vượt budget
- Tăng trưởng bất thường (có thể là fraud)

---

## 3.2 Marketing Mode (Dành cho Marketer)

### 3.2.1 Campaign Performance

**Tính năng:** Theo dõi hiệu quả chi tiết từng campaign.

**Metrics hiển thị:**
| Metric | Mô tả |
|--------|-------|
| Impressions | Số lần hiển thị |
| Clicks | Số lần click |
| CTR | Click-through rate |
| CPC | Cost per click |
| Conversions | Số đơn hàng |
| CVR | Conversion rate |
| Revenue | Doanh thu |
| ROAS | Return on ad spend |

**Financial Truth Overlay:**
> Luôn hiển thị cùng với Profit ROAS và True Margin để marketer không chỉ nhìn vanity metrics.

### 3.2.2 Funnel Analysis

**Tính năng:** Phân tích funnel từ impression đến profit.

**Funnel stages:**
```
Impressions → Clicks → Add to Cart → Checkout → Order → Payment → Delivered → Profit
```

**Use Cases:**

**UC3.3: Tìm điểm nghẽn trong funnel**
```
Bước 1: Mở Funnel Analysis
Bước 2: Xem drop-off rate ở mỗi stage
Bước 3: Xác định stage có drop-off cao nhất
Bước 4: Drill down xem nguyên nhân
Bước 5: A/B test để cải thiện
```

### 3.2.3 Platform Ads Overview

**Tính năng:** So sánh hiệu quả ads giữa các platform.

**Platforms hỗ trợ:**
- Facebook Ads
- Google Ads
- TikTok Ads
- Shopee Ads
- Lazada Ads

---

# MODULE 4: DECISION CENTER

> **Mục đích:** Biến data thành quyết định trong 30 giây.
> **Nguyên tắc:** Ép hành động, không đề xuất suông.

## 4.1 Decision Cards

### Tính năng
Mỗi vấn đề được thể hiện dưới dạng một "Card" với đầy đủ thông tin để quyết định.

### Cấu trúc Card

```yaml
Card:
  Title: "PAUSE Facebook Ads Campaign X ngay?"  # Câu hỏi quyết định
  Entity: Campaign X
  Priority: P1 | P2 | P3
  
  Facts:
    - Revenue: 50M
    - Margin: -8%
    - ROAS: 0.8
    
  Impact:
    Amount: -15,000,000đ
    Window: 7 days
    
  System Recommendation: PAUSE
  
  Actions:
    - PAUSE (recommended)
    - INVESTIGATE
    - SCALE_WITH_CONDITION
    
  Intelligence Trace:
    - 30 ngày dữ liệu
    - 170 rows phân tích
    - 2 nguồn: FDP + MDP
    - Độ tin cậy: Cao
```

### Use Cases

**UC4.1: CEO xử lý quyết định sáng (30-second test)**
```
0-5 giây:
  - Mở Decision Center
  - Đọc: "Hôm nay có 3 quyết định có thể gây thiệt hại"
  
5-10 giây:
  - Xem card P1 đầu tiên
  - Đọc câu hỏi: "PAUSE Facebook Ads?"
  - Xem impact: -15M / 7 ngày
  
10-20 giây:
  - Xem System Recommendation: PAUSE
  - Xem: "Còn 6 giờ để quyết"
  - Xem: "Quyết định đang chờ bạn"
  
20-30 giây:
  - Xem Intelligence Trace → Tin được
  - Click "Chấp nhận" hoặc "Quyết định"
  
Kết quả: Quyết định xong trong 30 giây
```

---

## 4.2 Bluecore Scores™

### Tính năng
4 chỉ số sức khỏe tổng thể của doanh nghiệp.

### Các Scores

| Score | Tên đầy đủ | Câu hỏi trả lời |
|-------|-----------|-----------------|
| **CHS** | Cash Health Score | Dòng tiền có khỏe không? |
| **GQS** | Growth Quality Score | Tăng trưởng có bền vững không? |
| **MAS** | Marketing Accountability Score | Marketing có tạo lợi nhuận thật không? |
| **CVRS** | Customer Value & Risk Score | Khách hàng có giá trị và rủi ro thế nào? |

### Thang điểm

| Điểm | Grade | Màu | Ý nghĩa |
|------|-------|-----|---------|
| 80-100 | Xuất sắc | 🟢 Xanh lá | Duy trì |
| 60-79 | Tốt | 🟢 Xanh nhạt | Theo dõi |
| 40-59 | Cảnh báo | 🟡 Vàng | Cần cải thiện |
| 0-39 | Nguy hiểm | 🔴 Đỏ | Hành động ngay |

### Cách tính (ví dụ CHS)

```
CHS = w1 × Runway_Score + w2 × AR_Health_Score + w3 × Cash_Velocity_Score

Runway_Score:
  - > 180 days = 100
  - 90-180 days = 75
  - 60-90 days = 50
  - < 60 days = 25

AR_Health_Score:
  - Overdue < 10% = 100
  - 10-20% = 75
  - 20-30% = 50
  - > 30% = 25
```

---

# MODULE 5: SCENARIO & PLANNING

## 5.1 What-If Simulation

### Tính năng
Mô phỏng các kịch bản kinh doanh để dự báo kết quả.

### Các biến có thể điều chỉnh

| Biến | Range | Ảnh hưởng đến |
|------|-------|---------------|
| Revenue Growth | -50% to +100% | Revenue, Profit |
| COGS Change | -30% to +30% | Margin, Profit |
| Marketing Spend | -50% to +200% | Revenue, CAC |
| Price Change | -30% to +50% | Revenue, Volume |

### Use Cases

**UC5.1: Đánh giá impact của tăng giá**
```
Bước 1: Mở What-If Simulation
Bước 2: Điều chỉnh Price +10%
Bước 3: Giả định Volume giảm 5%
Bước 4: Xem kết quả: Profit thay đổi như nào?
Bước 5: So sánh với baseline
Bước 6: Quyết định có tăng giá không
```

---

## 5.2 Budget vs Actual

### Tính năng
So sánh kế hoạch với thực tế theo từng hạng mục.

### Báo cáo Variance

| Metric | Budget | Actual | Variance | % |
|--------|--------|--------|----------|---|
| Revenue | 1,000M | 950M | -50M | -5% |
| COGS | 600M | 580M | +20M | +3% |
| Marketing | 100M | 120M | -20M | -20% |

---

## 5.3 Rolling Forecast

### Tính năng
Dự báo liên tục cập nhật dựa trên dữ liệu mới nhất.

### Phương pháp

```
Forecast = Historical Trend + Seasonality + Recent Performance Adjustment
```

---

# MODULE 6: DATA MANAGEMENT

## 6.1 Data Hub

### Tính năng
Quản lý tất cả nguồn dữ liệu đầu vào.

### Connectors hỗ trợ

| Platform | Loại data | Sync frequency |
|----------|-----------|----------------|
| Shopee | Orders, Products, Ads | Real-time |
| Lazada | Orders, Products, Ads | Real-time |
| TikTok Shop | Orders, Products, Ads | Real-time |
| Bank (VCB, TCB, MB) | Transactions | Daily |
| Accounting (MISA, Fast) | GL, AR, AP | Daily |

---

## 6.2 Reconciliation Hub

### Tính năng
Đối soát giao dịch giữa các nguồn.

### Các loại đối soát

| Loại | Nguồn 1 | Nguồn 2 |
|------|---------|---------|
| Bank vs ERP | Bank transactions | AR payments |
| Platform vs Orders | Platform settlements | Order records |
| Inventory | Physical count | System records |

---

## 6.3 Data Readiness Check

### Tính năng
Kiểm tra dữ liệu đã đủ để vận hành hệ thống chưa.

### Checklist

| Module | Required Data | Status |
|--------|---------------|--------|
| FDP | Bank accounts, Invoices, Bills | ✅ Ready |
| MDP | Campaigns, Orders with source | ⚠️ Partial |
| Control Tower | All of above | ✅ Ready |

---

# PHỤ LỤC

## A. Bảng Thuật ngữ

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| **AR** | Accounts Receivable - Công nợ phải thu |
| **AP** | Accounts Payable - Công nợ phải trả |
| **COGS** | Cost of Goods Sold - Giá vốn hàng bán |
| **CCC** | Cash Conversion Cycle - Chu kỳ chuyển đổi tiền mặt |
| **DSO** | Days Sales Outstanding - Số ngày thu tiền |
| **DIO** | Days Inventory Outstanding - Số ngày tồn kho |
| **DPO** | Days Payable Outstanding - Số ngày trả tiền |
| **ROAS** | Return on Ad Spend - Doanh thu / Chi phí ads |
| **CAC** | Customer Acquisition Cost - Chi phí thu hút khách hàng |
| **LTV** | Lifetime Value - Giá trị vòng đời khách hàng |
| **SKU** | Stock Keeping Unit - Mã hàng hóa |
| **Runway** | Số tháng có thể hoạt động với cash hiện có |
| **Burn Rate** | Tốc độ tiêu tiền hàng tháng |

## B. Keyboard Shortcuts

| Phím | Hành động |
|------|-----------|
| `Ctrl + K` | Mở command palette |
| `Ctrl + /` | Mở AI Assistant |
| `Ctrl + R` | Refresh data |
| `Esc` | Đóng dialog |

## C. FAQ

**Q: FDP có thay thế phần mềm kế toán không?**
A: KHÔNG. FDP phục vụ điều hành, không làm báo cáo thuế.

**Q: Dữ liệu cập nhật bao lâu một lần?**
A: Bank/Transactions: Daily. Sales: Near real-time (15-30 phút).

**Q: Ai có thể thay đổi công thức tính?**
A: Không ai. Công thức là cố định để đảm bảo Truth.

**Q: Alert có gửi qua điện thoại không?**
A: Có. P1 alerts gửi push notification ngay lập tức.

---

*Phiên bản: 1.0*
*Cập nhật: Tháng 1, 2026*
*Bluecore Financial Intelligence Platform*
