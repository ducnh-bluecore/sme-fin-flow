# 📊 Tài liệu Mô tả FDP & Control Tower

> **Phiên bản:** 1.0  
> **Cập nhật:** 2025-01-12

---

## 📑 Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [FDP - Financial Data Platform](#2-fdp---financial-data-platform)
3. [Control Tower](#3-control-tower)
4. [Use Cases](#4-use-cases)
5. [Kiến trúc dữ liệu](#5-kiến-trúc-dữ-liệu)
6. [Workflow người dùng](#6-workflow-người-dùng)

---

## 1. Tổng quan hệ thống

### 1.1 Giới thiệu

**FDP (Financial Data Platform)** và **Control Tower** là hai module chính trong hệ thống quản lý tài chính và vận hành doanh nghiệp, được thiết kế đặc biệt cho các doanh nghiệp bán lẻ đa kênh (Omnichannel).

| Module | Mục đích chính | Đối tượng sử dụng |
|--------|---------------|-------------------|
| **FDP** | Quản lý tài chính toàn diện: AR/AP, dòng tiền, ngân sách, báo cáo P&L | CFO, Kế toán trưởng, Finance Team |
| **Control Tower** | Giám sát vận hành real-time: alerts, KPIs, hiệu suất cửa hàng | Operations Manager, Store Manager, CEO |

### 1.2 Mối quan hệ giữa FDP và Control Tower

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA SOURCES                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Haravan  │  │  Shopee  │  │  Lazada  │  │ TikTok/Tiki/...  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │             │             │                  │          │
│       └─────────────┴─────────────┴──────────────────┘          │
│                            │                                     │
│                    ┌───────▼───────┐                            │
│                    │  DATA HUB     │                            │
│                    │  (ETL Layer)  │                            │
│                    └───────┬───────┘                            │
│              ┌─────────────┴─────────────┐                      │
│              │                           │                      │
│       ┌──────▼──────┐             ┌──────▼──────┐               │
│       │     FDP     │◄───────────►│CONTROL TOWER│               │
│       │ (Financial) │   Shared    │(Operations) │               │
│       └─────────────┘    Data     └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. FDP - Financial Data Platform

### 2.1 Tổng quan tính năng

FDP là nền tảng quản lý tài chính toàn diện, bao gồm:

| Nhóm tính năng | Mô tả | Trang/Module |
|----------------|-------|--------------|
| **Dashboard** | Tổng quan KPIs tài chính: Cash, AR, DSO, CCC, Margin | `/` |
| **AR Operations** | Quản lý công nợ phải thu, hóa đơn, aging | `/ar-operations` |
| **AP Operations** | Quản lý công nợ phải trả, bills, vendors | `/bills` |
| **Cash Flow** | Dự báo dòng tiền, runway analysis | `/cash-forecast` |
| **P&L Reports** | Báo cáo lãi lỗ theo thời gian, kênh | `/pl-report` |
| **Budget vs Actual** | So sánh ngân sách và thực tế | `/budget-vs-actual` |
| **Reconciliation** | Đối soát e-commerce và ngân hàng | `/reconciliation` |
| **Channel Analytics** | Phân tích hiệu suất kênh bán | `/channel-analytics` |
| **What-If Analysis** | Mô phỏng kịch bản kinh doanh | `/what-if` |
| **Decision Support** | Hỗ trợ ra quyết định đầu tư | `/decision-support` |
| **Risk Management** | Đánh giá và quản lý rủi ro | `/risk-dashboard` |

### 2.2 Chi tiết các tính năng

#### 2.2.1 Dashboard KPIs

| KPI | Công thức | Nguồn dữ liệu | Ý nghĩa |
|-----|----------|---------------|---------|
| **Cash Today** | `SUM(current_balance)` | `bank_accounts` | Tổng tiền mặt hiện có |
| **Total AR** | `SUM(total_amount - paid_amount)` | `invoices` | Tổng công nợ phải thu |
| **Overdue AR** | AR có `due_date < TODAY` | `invoices` | Công nợ quá hạn |
| **DSO** | `(Total AR × 90) / Revenue 90 days` | `invoices` | Số ngày thu tiền TB |
| **DPO** | `(Total AP × 90) / COGS 90 days` | `bills` | Số ngày trả NCC TB |
| **DIO** | `(Inventory × 90) / COGS` | `products` | Số ngày tồn kho TB |
| **CCC** | `DSO + DIO - DPO` | Calculated | Chu kỳ chuyển đổi tiền |
| **Gross Margin** | `(Revenue - COGS) / Revenue × 100%` | `invoices`, `orders` | Biên lợi nhuận gộp |

#### 2.2.2 AR/AP Management

**Accounts Receivable (AR):**
- Danh sách hóa đơn với trạng thái: draft, sent, paid, partial, overdue, cancelled
- AR Aging: Phân loại theo thời gian quá hạn (0, 1-30, 31-60, 61-90, >90 ngày)
- Credit Notes: Quản lý giấy báo có (trả hàng, giảm giá)
- Collection tracking: Theo dõi thu tiền

**Accounts Payable (AP):**
- Bills management: Quản lý hóa đơn mua hàng
- AP Aging: Phân loại công nợ phải trả
- Vendor management: Quản lý nhà cung cấp
- Payment scheduling: Lập lịch thanh toán

#### 2.2.3 Cash Flow Forecasting

| Tính năng | Mô tả | Khoảng thời gian |
|-----------|-------|------------------|
| **Cash Runway** | Số tháng có thể hoạt động với tiền hiện có | N/A |
| **Daily Forecast** | Dự báo dòng tiền hàng ngày | 30 ngày |
| **Weekly Forecast** | Dự báo dòng tiền hàng tuần | 13 tuần |
| **Rolling Forecast** | Dự báo liên tục cập nhật | 12 tháng |

#### 2.2.4 E-commerce Reconciliation

Đối soát tự động giữa:
- Đơn hàng từ sàn TMĐT (Shopee, Lazada, TikTok, Tiki, Sendo)
- Đơn vận chuyển (GHN, GHTK, ViettelPost, J&T, Ninja Van, BEST)
- Thanh toán từ sàn (Settlements)
- Giao dịch ngân hàng

#### 2.2.5 Channel P&L Analysis

```
Gross Revenue
  - Platform Commission (Hoa hồng sàn)
  - Payment Fee (Phí thanh toán)
  - Shipping Fee (Phí vận chuyển)
  - Other Fees (Dịch vụ, quảng cáo)
= Net Revenue
  - COGS (Giá vốn)
= Gross Profit
  
Gross Margin = Gross Profit / Net Revenue × 100%
```

#### 2.2.6 What-If Analysis

| Loại phân tích | Mô tả |
|----------------|-------|
| **Retail Scenario** | Mô phỏng thay đổi giá, số lượng, chi phí |
| **SKU Profitability** | Phân tích lợi nhuận theo từng sản phẩm |
| **Geographic Analysis** | Phân tích theo vùng địa lý |
| **Channel Optimization** | Tối ưu ngân sách marketing theo kênh |

#### 2.2.7 Decision Support

| Công cụ | Công thức | Mục đích |
|---------|----------|----------|
| **ROI Analysis** | `(Gain - Cost) / Cost × 100%` | Đánh giá hiệu quả đầu tư |
| **NPV Analysis** | `Σ(CFt / (1+r)^t) - Initial` | Giá trị hiện tại ròng |
| **IRR Analysis** | Rate where NPV = 0 | Tỷ suất hoàn vốn nội bộ |
| **Payback Period** | Time to recover investment | Thời gian hoàn vốn |
| **Sensitivity Analysis** | Impact of variable changes | Phân tích độ nhạy |

---

## 3. Control Tower

### 3.1 Tổng quan tính năng

Control Tower là trung tâm giám sát vận hành real-time:

| Tính năng | Mô tả | Trang |
|-----------|-------|-------|
| **Dashboard** | Tổng quan KPIs vận hành, alerts | `/control-tower` |
| **Alerts** | Quản lý cảnh báo real-time | `/control-tower/alerts` |
| **Tasks** | Quản lý công việc từ alerts | `/control-tower/tasks` |
| **Stores** | Giám sát hiệu suất cửa hàng | `/control-tower/stores` |
| **Analytics** | Phân tích dữ liệu vận hành | `/control-tower/analytics` |
| **Performance** | Đánh giá hiệu suất | `/control-tower/performance` |
| **Intelligent Rules** | Cấu hình rules cảnh báo thông minh | `/control-tower/intelligent-rules` |
| **AI Chat** | Trợ lý AI hỏi đáp | `/control-tower/chat` |
| **Team** | Quản lý team và phân quyền | `/control-tower/team` |
| **Settings** | Cài đặt hệ thống | `/control-tower/settings` |

### 3.2 Alert System

#### 3.2.1 Kiến trúc Alert

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  DATA SOURCES    │      │  ALERT ENGINE    │      │  NOTIFICATIONS   │
│  ─────────────   │      │  ─────────────   │      │  ─────────────   │
│  • alert_objects │─────►│  • Rule matching │─────►│  • In-app        │
│  • orders        │      │  • Threshold     │      │  • Email         │
│  • inventory     │      │  • AI detection  │      │  • Slack         │
│  • metrics       │      │  • Escalation    │      │  • Push          │
└──────────────────┘      └──────────────────┘      └──────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  alert_instances │
                          │  ─────────────   │
                          │  • Created       │
                          │  • Acknowledged  │
                          │  • Resolved      │
                          └──────────────────┘
```

#### 3.2.2 Các loại Alert

| Category | Mô tả | Ví dụ |
|----------|-------|-------|
| **inventory** | Cảnh báo tồn kho | Hết hàng, tồn kho thấp, tồn kho lâu ngày |
| **sales** | Cảnh báo doanh số | Doanh thu giảm, đơn hàng giảm |
| **financial** | Cảnh báo tài chính | Cash runway thấp, AR quá hạn |
| **operational** | Cảnh báo vận hành | Đơn hàng chậm xử lý, tỷ lệ hủy cao |
| **customer** | Cảnh báo khách hàng | Review tiêu cực, khiếu nại |

#### 3.2.3 Alert Severity

| Level | Màu | Ý nghĩa | Ví dụ |
|-------|-----|---------|-------|
| **critical** | Đỏ | Khẩn cấp, cần xử lý ngay | Hết hàng hot, Cash runway < 1 tháng |
| **warning** | Vàng | Cảnh báo, cần theo dõi | Tồn kho thấp, Doanh thu giảm 20% |
| **info** | Xanh | Thông tin | Xu hướng thay đổi, gợi ý cải thiện |

#### 3.2.4 Alert Lifecycle

```
Created ──► Acknowledged ──► Resolved
    │            │              │
    │            │              └─► resolution_notes
    │            └─► acknowledged_by, acknowledged_at
    └─► auto-resolve (optional)
```

### 3.3 Intelligent Alert Rules

#### 3.3.1 Cấu trúc Rule

```typescript
interface IntelligentAlertRule {
  id: string;
  rule_code: string;           // VD: "INV_LOW_STOCK"
  rule_name: string;           // VD: "Cảnh báo tồn kho thấp"
  rule_category: string;       // inventory, sales, financial...
  alert_group: string;         // stock, revenue, cash...
  severity: string;            // critical, warning, info
  
  calculation_formula: {
    formula: string;           // VD: "current_stock / avg_daily_sales"
    description: string;
    variables: Variable[];
    examples: Example[];
  };
  
  threshold_config: {
    operator: string;          // <, >, <=, >=, ==
    value: number;
    unit: string;
  };
  
  data_sources: string[];      // Tables/views được sử dụng
  applicable_channels: string[]; // Kênh áp dụng
  suggested_actions: string[]; // Gợi ý hành động
  
  is_enabled: boolean;
  priority: number;
}
```

#### 3.3.2 Các nhóm Rules

| Nhóm | Mô tả | Ví dụ Rules |
|------|-------|-------------|
| **Inventory** | Quản lý tồn kho | Low stock, Stockout risk, Slow moving |
| **Sales** | Giám sát doanh số | Revenue drop, Order decline, AOV change |
| **Financial** | Theo dõi tài chính | Cash runway, AR overdue, Margin alert |
| **Operational** | Vận hành | Fulfillment delay, High return rate |
| **Customer** | Khách hàng | Negative reviews, Complaint spike |

### 3.4 Store Performance Monitoring

#### 3.4.1 Metrics theo dõi

| Metric | Công thức | Đơn vị |
|--------|----------|--------|
| **Revenue** | SUM(order_value) | VND |
| **Orders** | COUNT(orders) | Đơn |
| **AOV** | Revenue / Orders | VND |
| **Conversion** | Orders / Visitors × 100 | % |
| **Fulfillment Rate** | Shipped / Total × 100 | % |
| **Return Rate** | Returns / Delivered × 100 | % |

#### 3.4.2 Store Health Status

| Status | Điều kiện | Màu |
|--------|----------|-----|
| **healthy** | Không có critical/warning alerts | Xanh |
| **warning** | Có warning alerts | Vàng |
| **critical** | Có critical alerts | Đỏ |
| **offline** | Không có dữ liệu gần đây | Xám |

### 3.5 AI Assistant

Control Tower tích hợp AI Assistant để:
- Hỏi đáp về dữ liệu vận hành
- Phân tích xu hướng
- Gợi ý hành động
- Tóm tắt tình hình

---

## 4. Use Cases

### 4.1 Use Cases cho FDP

#### UC-FDP-01: Theo dõi Cash Flow hàng ngày

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | CFO, Kế toán trưởng |
| **Precondition** | Có kết nối bank accounts |
| **Flow** | 1. Mở Dashboard → 2. Xem Cash Today → 3. Xem Cash Runway → 4. Xem Daily Forecast |
| **Output** | Biết được tình hình tiền mặt và dự báo |

#### UC-FDP-02: Đối soát doanh thu e-commerce

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | Kế toán |
| **Precondition** | Có đồng bộ đơn hàng từ sàn |
| **Flow** | 1. Vào Reconciliation → 2. Chọn kênh → 3. So sánh Orders vs Settlements → 4. Đánh dấu đã đối soát |
| **Output** | Xác nhận doanh thu khớp với thanh toán |

#### UC-FDP-03: Phân tích lợi nhuận theo kênh

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | CFO, Business Analyst |
| **Precondition** | Có dữ liệu orders và fees |
| **Flow** | 1. Vào Channel P&L → 2. Chọn thời gian → 3. So sánh các kênh → 4. Phân tích chi tiết phí |
| **Output** | Biết kênh nào sinh lời, kênh nào lỗ |

#### UC-FDP-04: Lập kế hoạch ngân sách

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | CFO, Finance Manager |
| **Precondition** | Có dữ liệu lịch sử |
| **Flow** | 1. Vào Scenario Planning → 2. Tạo kịch bản → 3. Nhập budget → 4. So sánh với forecast |
| **Output** | Có kế hoạch ngân sách được phê duyệt |

#### UC-FDP-05: Đánh giá quyết định đầu tư

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | CFO, CEO |
| **Precondition** | Có thông tin dự án đầu tư |
| **Flow** | 1. Vào Decision Support → 2. Nhập thông số → 3. Phân tích NPV/IRR → 4. So sánh kịch bản |
| **Output** | Quyết định có/không đầu tư |

### 4.2 Use Cases cho Control Tower

#### UC-CT-01: Giám sát vận hành real-time

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | Operations Manager |
| **Precondition** | Hệ thống đang hoạt động |
| **Flow** | 1. Mở Control Tower Dashboard → 2. Xem KPIs → 3. Kiểm tra Alerts → 4. Xem Store Health |
| **Output** | Nắm được tình hình vận hành tổng thể |

#### UC-CT-02: Xử lý cảnh báo hết hàng

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | Store Manager, Inventory Planner |
| **Precondition** | Có alert "Low Stock" hoặc "Stockout Risk" |
| **Flow** | 1. Nhận alert → 2. Xem chi tiết sản phẩm → 3. Kiểm tra supplier → 4. Tạo PO → 5. Resolve alert |
| **Output** | Đơn đặt hàng được tạo, tránh hết hàng |

#### UC-CT-03: Theo dõi hiệu suất cửa hàng

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | Area Manager, Store Manager |
| **Precondition** | Có dữ liệu POS/orders |
| **Flow** | 1. Vào Stores → 2. Xem danh sách cửa hàng → 3. So sánh performance → 4. Drill-down cửa hàng yếu |
| **Output** | Biết cửa hàng nào cần cải thiện |

#### UC-CT-04: Phản hồi khiếu nại khách hàng

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | Customer Service Manager |
| **Precondition** | Có alert "Negative Review" hoặc "Complaint Spike" |
| **Flow** | 1. Nhận alert → 2. Xem nội dung khiếu nại → 3. Assign task → 4. Theo dõi xử lý → 5. Resolve |
| **Output** | Khiếu nại được xử lý kịp thời |

#### UC-CT-05: Phân tích doanh số bất thường

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | Sales Manager, Analyst |
| **Precondition** | Có alert "Revenue Drop" |
| **Flow** | 1. Nhận alert → 2. Xem Analytics → 3. So sánh các giai đoạn → 4. Tìm nguyên nhân → 5. Đề xuất action |
| **Output** | Hiểu nguyên nhân và có hành động khắc phục |

#### UC-CT-06: Cấu hình rules cảnh báo

| Thuộc tính | Giá trị |
|------------|---------|
| **Actor** | Admin, Operations Manager |
| **Precondition** | Có quyền admin |
| **Flow** | 1. Vào Intelligent Rules → 2. Xem rules hiện có → 3. Enable/Disable rules → 4. Điều chỉnh threshold |
| **Output** | Rules được cấu hình phù hợp với business |

---

## 5. Kiến trúc dữ liệu

### 5.1 Data Sources và Sync Systems

| Data Source | Mô tả | Sync From | Tần suất |
|-------------|-------|-----------|----------|
| **alert_objects** | Đối tượng giám sát (stores, products) | Haravan, POS, ERP | Real-time / 15 phút |
| **alert_object_metrics** | Metrics của đối tượng | Calculated | Real-time |
| **orders / external_orders** | Đơn hàng | Shopee, Lazada, TikTok, Haravan | Real-time / 5 phút |
| **invoices** | Hóa đơn bán hàng | ERP, Accounting | Daily |
| **bills** | Hóa đơn mua hàng | ERP, Accounting | Daily |
| **bank_accounts** | Tài khoản ngân hàng | Bank API, Manual | Daily |
| **products** | Sản phẩm và tồn kho | Haravan, WMS | Real-time / 15 phút |
| **channel_settlements** | Thanh toán từ sàn | Shopee, Lazada API | Daily |
| **pos_transactions** | Giao dịch POS | POS System | Real-time |
| **revenues / expenses** | Doanh thu / Chi phí | Accounting | Daily |

### 5.2 Database Tables chính

#### Control Tower Tables

| Table | Mô tả |
|-------|-------|
| `alert_objects` | Các đối tượng được giám sát |
| `alert_object_metrics` | Metrics của từng đối tượng |
| `alert_instances` | Các alerts đã phát sinh |
| `alert_notification_logs` | Log gửi notification |
| `intelligent_alert_rules` | Rules cảnh báo thông minh |
| `extended_alert_configs` | Cấu hình mở rộng |
| `control_tower_tasks` | Tasks từ alerts |
| `notification_recipients` | Người nhận notification |

#### FDP Tables

| Table | Mô tả |
|-------|-------|
| `invoices` / `invoice_items` | Hóa đơn bán |
| `bills` / `bill_items` | Hóa đơn mua |
| `bank_accounts` / `bank_transactions` | Ngân hàng |
| `external_orders` | Đơn hàng e-commerce |
| `channel_settlements` | Thanh toán từ sàn |
| `monthly_plans` | Kế hoạch ngân sách |
| `cash_forecasts` | Dự báo dòng tiền |
| `capex_projects` | Dự án đầu tư |
| `decision_analyses` | Phân tích quyết định |

### 5.3 Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SYSTEMS                              │
├────────┬────────┬────────┬─────────┬──────────┬────────┬───────────┤
│Haravan │ Shopee │ Lazada │ TikTok  │   POS    │  Bank  │   ERP     │
└───┬────┴───┬────┴───┬────┴────┬────┴────┬─────┴───┬────┴────┬──────┘
    │        │        │         │         │         │         │
    └────────┴────────┴─────────┴─────────┴─────────┴─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   CONNECTOR HUB   │
                    │   (ETL Engine)    │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐
    │  STAGING  │      │   MASTER    │     │   CACHE     │
    │  TABLES   │      │   TABLES    │     │   TABLES    │
    └─────┬─────┘      └──────┬──────┘     └──────┬──────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
        ┌─────▼─────┐                  ┌──────▼──────┐
        │    FDP    │                  │   CONTROL   │
        │  MODULES  │                  │    TOWER    │
        └───────────┘                  └─────────────┘
```

---

## 6. Workflow người dùng

### 6.1 Daily Workflow - Operations Manager

```
08:00  ┌─► Mở Control Tower Dashboard
       │   ├── Check overnight alerts (Critical/Warning)
       │   ├── Review Store Health Map
       │   └── Check pending tasks
       │
09:00  ├─► Process Alerts
       │   ├── Acknowledge important alerts
       │   ├── Assign tasks to team members
       │   └── Escalate if needed
       │
12:00  ├─► Midday Check
       │   ├── Sales performance vs target
       │   ├── Inventory status
       │   └── Fulfillment metrics
       │
17:00  └─► End of Day
           ├── Resolve completed tasks
           ├── Review daily summary
           └── Check next day forecast
```

### 6.2 Weekly Workflow - CFO

```
Monday     ┌─► Cash Position Review
           │   ├── Bank balances
           │   ├── AR/AP status
           │   └── Cash forecast update
           │
Wednesday  ├─► Channel Performance
           │   ├── Channel P&L review
           │   ├── Fee analysis
           │   └── Margin optimization
           │
Friday     └─► Planning & Analysis
               ├── Budget vs Actual variance
               ├── What-If scenarios
               └── Decision support for pending items
```

### 6.3 Monthly Workflow - CEO

```
Week 1  ┌─► Monthly Close Review
        │   ├── P&L Report
        │   ├── Cash Flow Statement
        │   └── Key metrics dashboard
        │
Week 2  ├─► Business Review
        │   ├── Channel performance comparison
        │   ├── Store rankings
        │   └── Alert trends analysis
        │
Week 3  ├─► Strategic Planning
        │   ├── Scenario planning updates
        │   ├── Investment decisions
        │   └── Risk assessment
        │
Week 4  └─► Board Preparation
            ├── Board report generation
            ├── Key highlights
            └── Next month outlook
```

---

## 7. Tích hợp FDP và Control Tower

### 7.1 Shared Data

| Data | FDP sử dụng | Control Tower sử dụng |
|------|-------------|----------------------|
| **Orders** | Revenue calculation, Reconciliation | Sales alerts, Performance |
| **Inventory** | COGS calculation, Working capital | Stock alerts, Reorder |
| **Bank** | Cash position, Forecast | Cash alerts, Runway |
| **Invoices** | AR management, DSO | AR overdue alerts |
| **Channels** | P&L analysis, Fee breakdown | Channel performance alerts |

### 7.2 Alert → Action Flow

```
Control Tower Alert
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Cash Runway   │────►│ FDP: Cash     │────►│ Action:       │
│ < 3 months    │     │ Forecast View │     │ Reduce costs  │
└───────────────┘     └───────────────┘     └───────────────┘

┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Channel Loss  │────►│ FDP: Channel  │────►│ Action:       │
│ Alert         │     │ P&L Analysis  │     │ Fee negotiate │
└───────────────┘     └───────────────┘     └───────────────┘

┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ AR Overdue    │────►│ FDP: AR Aging │────►│ Action:       │
│ > 90 days     │     │ Dashboard     │     │ Collection    │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

## 8. Kết luận

FDP và Control Tower cùng nhau tạo thành một hệ thống toàn diện cho việc quản lý tài chính và vận hành doanh nghiệp bán lẻ đa kênh:

- **FDP** cung cấp cái nhìn sâu về tài chính, giúp CFO và team Finance đưa ra quyết định đúng đắn
- **Control Tower** cung cấp giám sát real-time, giúp Operations team phản ứng nhanh với các vấn đề

Hai module này bổ sung cho nhau và chia sẻ cùng một nguồn dữ liệu, đảm bảo tính nhất quán và đồng bộ trong toàn bộ hệ thống.
