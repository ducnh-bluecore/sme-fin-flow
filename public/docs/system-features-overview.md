# Bluecore Financial Intelligence Platform
## Tổng Quan Tính Năng Hệ Thống

---

## Triết Lý Thiết Kế

### Nguyên Tắc Cốt Lõi

| Nguyên tắc | Mô tả |
|------------|-------|
| 🎯 **Single Source of Truth** | 1 Net Revenue, 1 Contribution Margin, 1 Cash Position. Không có phiên bản khác. |
| 💰 **Real Cash** | Phân biệt: Tiền đã về / sẽ về / có nguy cơ không về / đang bị khóa |
| ⚡ **Today's Decision** | Phục vụ quyết định hôm nay, không phải báo cáo cuối tháng |
| 🚨 **Surface Problems** | Không làm đẹp số, không che anomaly, chỉ ra vấn đề sớm |
| 🔗 **Revenue ↔ Cost** | Mọi doanh thu đều đi kèm chi phí. Không có doanh thu "đứng một mình" |

---

## Module 1: FDP - Financial Data Platform

> *"FDP không phải phần mềm kế toán - Phục vụ CEO/CFO điều hành, không nộp báo cáo thuế"*

### Tính Năng Chi Tiết

| Tính năng | Mô tả | Đối tượng | KPIs chính |
|-----------|-------|-----------|------------|
| **CFO Dashboard** | Tổng quan tài chính real-time | CEO, CFO | Net Revenue, CM, Cash Position |
| **Real Cash Breakdown** | Phân tích tiền thật theo trạng thái | CFO | Cash Available, Cash Locked, Cash at Risk |
| **Unit Economics** | Phân tích lợi nhuận theo SKU/kênh | COO, CFO | CM per SKU, Break-even point |
| **Cash Flow Direct** | Dòng tiền trực tiếp (Direct method) | CFO | Operating Cash Flow, Free Cash Flow |
| **Cash Forecast** | Dự báo dòng tiền 30/60/90 ngày | CFO, CEO | Runway, Cash Gap Projection |
| **P&L Report** | Báo cáo lãi lỗ đa kênh | CFO | Gross Margin, EBITDA, Net Profit |
| **Channel P&L** | Lãi lỗ theo từng kênh bán hàng | CMO, CFO | Channel CM, Channel ROI |
| **Working Capital** | Quản lý vốn lưu động | CFO | DSO, DIO, DPO, CCC |
| **AR Operations** | Quản lý công nợ phải thu | Kế toán, CFO | AR Aging, Collection Rate |
| **Variance Analysis** | Phân tích chênh lệch thực tế vs kế hoạch | CFO | Budget Variance, Forecast Accuracy |

### Công Thức Tài Chính Chính

```
Net Revenue = Gross Revenue - Returns - Discounts - Platform Fees

Contribution Margin = Net Revenue - COGS - Variable Costs

Real Cash Position = Bank Balance 
                   - Pending Payables 
                   - Locked Inventory Value 
                   + Confirmed Receivables
```

---

## Module 2: Control Tower

> *"Control Tower không phải Dashboard - Tồn tại để báo động và hành động"*

### Nguyên Tắc Hoạt Động

1. **Chỉ quan tâm "điều gì sai"** - Nếu không có vấn đề → im lặng
2. **Mỗi alert phải có giá** - Mất bao nhiêu tiền? Còn bao lâu để hành động?
3. **Tối đa 5-7 alerts** - Ít nhưng chí mạng
4. **Phải có owner & outcome** - Không owner → không alert

### Tính Năng Chi Tiết

| Tính năng | Mô tả | Đối tượng |
|-----------|-------|-----------|
| **Alert System** | Hệ thống cảnh báo thông minh với impact calculation | CEO, COO |
| **Intelligent Rules** | Quy tắc cảnh báo tùy chỉnh theo ngưỡng KPI | Admin |
| **Task Management** | Gán owner, theo dõi tiến độ xử lý, deadline | Team Lead |
| **Escalation** | Tự động leo thang khi chưa xử lý trong thời gian quy định | Manager |
| **Store Health Map** | Theo dõi sức khỏe từng cửa hàng/kênh theo thời gian thực | COO |
| **Data Source Health** | Giám sát chất lượng và tính kịp thời của nguồn dữ liệu | IT, Admin |
| **Notification Center** | Quản lý thông báo qua email, push, Slack | All |

### Cấu Trúc Alert

```
┌─────────────────────────────────────────────────────┐
│ ALERT: [Tên vấn đề]                                 │
├─────────────────────────────────────────────────────┤
│ 💰 Impact: [Số tiền thiệt hại]                      │
│ ⏰ Deadline: [Thời gian còn lại để xử lý]           │
│ 👤 Owner: [Người chịu trách nhiệm]                  │
│ 📊 Status: Open / In Progress / Resolved           │
├─────────────────────────────────────────────────────┤
│ Action Required: [Hành động cụ thể cần thực hiện]  │
└─────────────────────────────────────────────────────┘
```

---

## Module 3: MDP - Marketing Data Platform

> *"MDP không phải MarTech - Đo lường giá trị tài chính thật của Marketing"*

### Nguyên Tắc

- **Profit before Performance** - Lợi nhuận trước hiệu suất
- **Cash before Clicks** - Dòng tiền trước lượt click
- **Phục vụ CEO & CFO trước, Marketer sau**

### CMO Mode (Chế độ Ra Quyết Định)

| Tính năng | Mô tả | KPIs |
|-----------|-------|------|
| **Profit Attribution** | Quy về lợi nhuận thật cho từng campaign | Profit ROAS, True CM |
| **Cash Impact** | Tác động marketing lên dòng tiền | Days to Cash, Cash Conversion |
| **Risk Alerts** | Cảnh báo marketing đốt tiền | Burn Rate, CAC Payback |
| **Decision Panel** | Khuyến nghị Scale / Hold / Stop | ROI Score |

### Marketing Mode (Chế độ Thực Thi)

| Tính năng | Mô tả | KPIs |
|-----------|-------|------|
| **Campaign Performance** | Hiệu suất chi tiết chiến dịch | ROAS, CVR, CPC, CTR |
| **Platform Analytics** | Phân tích theo nền tảng | Shopee, Lazada, TikTok, Website |
| **Funnel Analysis** | Phân tích phễu chuyển đổi | Impression → Click → Cart → Order |
| **Execution Alerts** | Cảnh báo vận hành chiến dịch | Budget Pacing, Anomaly Detection |

### Công Thức MDP

```
Profit ROAS = (Revenue - COGS - Platform Fees - Shipping - Returns) / Ad Spend

True CAC = Total Marketing Spend / New Customers Acquired

LTV:CAC Ratio = Customer Lifetime Value / Customer Acquisition Cost

Days to Cash = Order Date → Settlement Date → Bank Receipt Date
```

---

## Module 4: Scenario & Planning

| Tính năng | Mô tả | Đối tượng |
|-----------|-------|-----------|
| **What-If Simulation** | Mô phỏng kịch bản: Nếu tăng giá 10%? Nếu giảm chi phí marketing? | CEO, CFO |
| **Budget vs Actual** | So sánh ngân sách vs thực tế theo tháng/quý | CFO |
| **Scenario Hub** | Quản lý nhiều kịch bản: Best/Base/Worst case | CFO |
| **Rolling Forecast** | Dự báo cuốn chiếu 12 tháng liên tục | CFO |
| **Monthly Planning** | Lập kế hoạch tháng với target và tracking | CFO, COO |

---

## Module 5: Decision Support

| Tính năng | Mô tả | Output |
|-----------|-------|--------|
| **ROI Analysis** | Phân tích ROI dự án/đầu tư | ROI %, Payback Period |
| **NPV/IRR Analysis** | Phân tích giá trị hiện tại ròng | NPV, IRR, MIRR |
| **Sensitivity Analysis** | Phân tích độ nhạy các biến số | Tornado Chart, Scenario Matrix |
| **Payback Analysis** | Phân tích thời gian hoàn vốn | Break-even Timeline |
| **AI Advisor** | Tư vấn quyết định bằng AI | Recommendations, Risk Assessment |

---

## Module 6: Data Management

| Tính năng | Mô tả |
|-----------|-------|
| **Data Hub** | Trung tâm nhập/quản lý dữ liệu từ nhiều nguồn |
| **Data Readiness** | Kiểm tra sẵn sàng và chất lượng dữ liệu |
| **Reconciliation Hub** | Đối soát đơn hàng - thanh toán - giao hàng |
| **Connectors** | Kết nối tự động: Shopee, Lazada, TikTok, ERP, POS |
| **Import Templates** | Mẫu import Excel/CSV chuẩn hóa |

---

## Yêu Cầu Dữ Liệu

### Dữ Liệu Bắt Buộc (MVP)

| Nguồn | Bảng dữ liệu | Tần suất cập nhật |
|-------|--------------|-------------------|
| Orders | `external_orders`, `external_order_items` | Daily |
| Products | `external_products` | Weekly |
| Marketing | `marketing_expenses`, `promotion_campaigns` | Daily |
| Analytics | `channel_analytics` | Daily |
| Costs | `channel_fees`, `expenses` | Weekly |
| Cash | `channel_settlements`, `bank_transactions` | Daily |

### Dữ Liệu Nâng Cao

| Nguồn | Bảng dữ liệu | Mục đích |
|-------|--------------|----------|
| Inventory | `inventory_items` | Days of Stock, Stockout Risk |
| Customers | `customers` | LTV, CAC, Cohort Analysis |
| Invoices | `invoices` | AR Aging, Collection Tracking |
| Bills | `bills` | AP Aging, Cash Outflow Forecast |

---

## Phân Quyền Người Dùng

| Role | Modules Truy Cập | Quyền Hạn |
|------|------------------|-----------|
| **CEO** | FDP Dashboard, Control Tower, Decision Support | View All, Approve Decisions |
| **CFO** | Full FDP, Control Tower, MDP (CMO Mode), Scenarios | Full Access |
| **CMO** | MDP (Full), Channel P&L, Marketing Budgets | Marketing Data + Decisions |
| **COO** | Control Tower, Unit Economics, Inventory | Operations Data + Alerts |
| **Marketer** | MDP (Marketing Mode), Campaign Performance | Marketing Execution |
| **Kế Toán** | AR/AP Operations, Reconciliation, P&L | Transaction Data |
| **Admin** | Data Hub, Settings, User Management | System Configuration |

---

## Tích Hợp Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                    BLUECORE PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    ┌─────────────┐    ┌──────────────────┐    │
│  │ Shopee  │───▶│             │    │                  │    │
│  └─────────┘    │             │    │   FDP            │    │
│  ┌─────────┐    │   Data      │───▶│   (Financial     │    │
│  │ Lazada  │───▶│   Hub       │    │    Truth)        │    │
│  └─────────┘    │             │    │                  │    │
│  ┌─────────┐    │             │    └────────┬─────────┘    │
│  │ TikTok  │───▶│             │             │              │
│  └─────────┘    └─────────────┘             ▼              │
│  ┌─────────┐                       ┌──────────────────┐    │
│  │  ERP    │──────────────────────▶│  Control Tower   │    │
│  └─────────┘                       │  (Alerts &       │    │
│  ┌─────────┐                       │   Actions)       │    │
│  │  Bank   │──────────────────────▶│                  │    │
│  └─────────┘                       └──────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Liên Hệ & Hỗ Trợ

- **Documentation**: `/docs/` 
- **Data Requirements**: `/docs/mdp-data-requirements.md`
- **API Reference**: `/api/`

---

*Phiên bản: 1.0 | Cập nhật: 2024-01*
