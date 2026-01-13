# MDP DATA REQUIREMENTS
## Marketing Data Platform - Yêu cầu dữ liệu đầu vào

> **MDP Manifesto**: "Profit before Performance. Cash before Clicks."

---

## 📊 TỔNG QUAN CÁC NGUỒN DỮ LIỆU

MDP cần dữ liệu từ 4 nhóm chính:

| Nhóm | Mục đích | Bắt buộc |
|------|----------|----------|
| **Orders & Revenue** | Đo lường doanh thu thật | ✅ Bắt buộc |
| **Marketing Spend** | Attribution chi phí | ✅ Bắt buộc |
| **Cost Structure** | Tính Contribution Margin | ✅ Bắt buộc |
| **Cash Flow** | Theo dõi tiền thật | ✅ Bắt buộc |

---

## 1️⃣ ORDERS & REVENUE DATA

### Table: `external_orders`
> Nguồn sự thật về doanh thu từ các kênh bán hàng

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Order ID |
| `tenant_id` | UUID | ✅ | Tenant identifier |
| `channel` | TEXT | ✅ | Kênh bán (Shopee, Lazada, TikTok, Website...) |
| `order_date` | DATE | ✅ | Ngày đặt hàng |
| `status` | TEXT | ✅ | pending/confirmed/shipped/delivered/cancelled/returned |
| `total_amount` | NUMERIC | ✅ | Tổng giá trị đơn hàng |
| `seller_income` | NUMERIC | ⚠️ | Tiền thực nhận sau phí sàn |
| `cost_of_goods` | NUMERIC | ⚠️ | Giá vốn hàng bán |
| `platform_fee` | NUMERIC | ⚠️ | Phí sàn TMĐT |
| `commission_fee` | NUMERIC | ⚠️ | Hoa hồng |
| `payment_fee` | NUMERIC | ⚠️ | Phí thanh toán |
| `shipping_fee` | NUMERIC | ⚠️ | Phí vận chuyển |
| `gross_profit` | NUMERIC | ⚠️ | Lợi nhuận gộp |
| `payment_status` | TEXT | ✅ | pending/paid/refunded |
| `integration_id` | UUID | ⚠️ | Liên kết với connector |
| `customer_id` | TEXT | ⚠️ | Customer identifier |
| `order_discount` | NUMERIC | ⚠️ | Giảm giá trên đơn |
| `province_name` | TEXT | ⚠️ | Địa chỉ giao hàng |

**Sử dụng cho:**
- Profit Attribution (tính CM thật)
- Cash Impact (tiền đã về / pending)
- Channel Performance
- Geographic Analysis

---

### Table: `external_order_items`
> Chi tiết từng sản phẩm trong đơn hàng

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Item ID |
| `order_id` | UUID | ✅ | Link đến external_orders |
| `product_id` | UUID | ⚠️ | Link đến external_products |
| `sku` | TEXT | ⚠️ | Mã SKU |
| `product_name` | TEXT | ✅ | Tên sản phẩm |
| `quantity` | INTEGER | ✅ | Số lượng |
| `unit_price` | NUMERIC | ✅ | Đơn giá bán |
| `cost_price` | NUMERIC | ⚠️ | Giá vốn |
| `total_amount` | NUMERIC | ✅ | Thành tiền |
| `discount_amount` | NUMERIC | ⚠️ | Giảm giá item |

**Sử dụng cho:**
- SKU Profitability Analysis
- Product Attribution
- Inventory metrics

---

## 2️⃣ MARKETING SPEND DATA

### Table: `promotion_campaigns`
> Thông tin campaigns marketing

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Campaign ID |
| `tenant_id` | UUID | ✅ | Tenant identifier |
| `campaign_name` | TEXT | ✅ | Tên campaign |
| `channel` | TEXT | ✅ | Kênh quảng cáo (Facebook, Google, TikTok...) |
| `campaign_type` | TEXT | ⚠️ | awareness/conversion/retargeting |
| `status` | TEXT | ✅ | draft/active/paused/ended |
| `start_date` | DATE | ✅ | Ngày bắt đầu |
| `end_date` | DATE | ✅ | Ngày kết thúc |
| `budget` | NUMERIC | ✅ | Ngân sách dự kiến |
| `actual_cost` | NUMERIC | ✅ | Chi phí thực tế |
| `total_orders` | INTEGER | ⚠️ | Số đơn attributed |
| `total_revenue` | NUMERIC | ⚠️ | Doanh thu attributed |
| `total_discount_given` | NUMERIC | ⚠️ | Giảm giá đã cho |

**Sử dụng cho:**
- Campaign Performance (Marketing Mode)
- Profit Attribution (CMO Mode)
- Risk Alerts (negative margin)

---

### Table: `marketing_expenses`
> Chi tiết chi phí marketing theo ngày/kênh

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Expense ID |
| `tenant_id` | UUID | ✅ | Tenant identifier |
| `channel` | TEXT | ✅ | Kênh chi phí |
| `expense_date` | DATE | ✅ | Ngày chi |
| `amount` | NUMERIC | ✅ | Số tiền |
| `expense_type` | TEXT | ⚠️ | ads/influencer/content/other |
| `campaign_id` | UUID | ⚠️ | Link đến campaign |
| `description` | TEXT | ⚠️ | Mô tả |

**Sử dụng cho:**
- Cash Impact by Channel
- Daily spend tracking
- Budget monitoring

---

### Table: `channel_analytics`
> Metrics performance từ các nền tảng ads

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Record ID |
| `tenant_id` | UUID | ✅ | Tenant identifier |
| `channel` | TEXT | ✅ | Kênh |
| `analytics_date` | DATE | ✅ | Ngày |
| `impressions` | INTEGER | ⚠️ | Số lượt hiển thị |
| `clicks` | INTEGER | ⚠️ | Số lượt click |
| `spend` | NUMERIC | ⚠️ | Chi phí |
| `conversions` | INTEGER | ⚠️ | Số conversions |
| `revenue` | NUMERIC | ⚠️ | Doanh thu tracked |
| `ctr` | NUMERIC | ⚠️ | Click-through rate |
| `cpc` | NUMERIC | ⚠️ | Cost per click |
| `cpa` | NUMERIC | ⚠️ | Cost per acquisition |
| `roas` | NUMERIC | ⚠️ | Return on ad spend |

**Sử dụng cho:**
- Marketing Mode metrics
- Funnel Analysis
- Execution Alerts

---

## 3️⃣ COST STRUCTURE DATA

### Table: `channel_fees`
> Chi phí phí sàn và dịch vụ

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Fee ID |
| `tenant_id` | UUID | ✅ | Tenant identifier |
| `integration_id` | UUID | ⚠️ | Link đến connector |
| `fee_type` | TEXT | ✅ | platform_fee/commission/payment/logistics |
| `fee_category` | TEXT | ⚠️ | Phân loại chi tiết |
| `amount` | NUMERIC | ✅ | Số tiền |
| `fee_date` | DATE | ⚠️ | Ngày phát sinh |

**Sử dụng cho:**
- True Profit Calculation
- Fee Analysis by Channel

---

### Table: `external_products`
> Danh mục sản phẩm với giá vốn

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Product ID |
| `tenant_id` | UUID | ✅ | Tenant identifier |
| `sku` | TEXT | ⚠️ | Mã SKU |
| `name` | TEXT | ✅ | Tên sản phẩm |
| `selling_price` | NUMERIC | ⚠️ | Giá bán |
| `cost_price` | NUMERIC | ⚠️ | Giá vốn |
| `category` | TEXT | ⚠️ | Danh mục |
| `stock_quantity` | INTEGER | ⚠️ | Tồn kho |

**Sử dụng cho:**
- COGS Calculation
- SKU Profitability
- Inventory valuation

---

### Table: `expenses`
> Chi phí vận hành chung

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Expense ID |
| `tenant_id` | UUID | ✅ | Tenant identifier |
| `category` | TEXT | ✅ | marketing/operations/payroll/rent/utilities... |
| `amount` | NUMERIC | ✅ | Số tiền |
| `expense_date` | DATE | ✅ | Ngày chi |
| `description` | TEXT | ⚠️ | Mô tả |
| `is_recurring` | BOOLEAN | ⚠️ | Chi phí định kỳ |

**Sử dụng cho:**
- Operating Expenses
- Cash Burn Rate
- Budget tracking

---

## 4️⃣ CASH FLOW DATA

### Table: `channel_settlements`
> Thanh toán từ các sàn TMĐT

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Settlement ID |
| `tenant_id` | UUID | ✅ | Tenant identifier |
| `integration_id` | UUID | ⚠️ | Link đến connector |
| `settlement_number` | TEXT | ⚠️ | Mã thanh toán |
| `period_start` | DATE | ✅ | Từ ngày |
| `period_end` | DATE | ✅ | Đến ngày |
| `payout_date` | DATE | ⚠️ | Ngày nhận tiền |
| `gross_sales` | NUMERIC | ⚠️ | Doanh số gộp |
| `total_fees` | NUMERIC | ⚠️ | Tổng phí |
| `total_refunds` | NUMERIC | ⚠️ | Tổng hoàn |
| `net_amount` | NUMERIC | ✅ | Số tiền thực nhận |
| `total_orders` | INTEGER | ⚠️ | Số đơn trong kỳ |
| `status` | TEXT | ⚠️ | pending/paid/reconciled |
| `is_reconciled` | BOOLEAN | ⚠️ | Đã đối soát |

**Sử dụng cho:**
- Cash Received tracking
- Pending Cash
- Reconciliation

---

### Table: `bank_accounts` & `bank_transactions`
> Tài khoản và giao dịch ngân hàng

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `balance` | NUMERIC | ✅ | Số dư hiện tại |
| `last_synced_at` | TIMESTAMP | ⚠️ | Lần sync cuối |
| `transaction_amount` | NUMERIC | ✅ | Số tiền giao dịch |
| `transaction_type` | TEXT | ✅ | inflow/outflow |
| `transaction_date` | DATE | ✅ | Ngày giao dịch |

**Sử dụng cho:**
- Real Cash Position
- Cash Flow Analysis

---

## 5️⃣ CUSTOMER DATA (for LTV/CAC)

### Table: `customers` hoặc từ `external_orders`
> Thông tin khách hàng

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_id` | TEXT | ⚠️ | Customer identifier |
| `first_order_date` | DATE | ⚠️ | Ngày mua đầu tiên |
| `total_orders` | INTEGER | ⚠️ | Tổng số đơn |
| `total_spent` | NUMERIC | ⚠️ | Tổng chi tiêu |
| `acquisition_channel` | TEXT | ⚠️ | Kênh thu hút |

**Sử dụng cho:**
- Customer LTV
- CAC Calculation
- Cohort Analysis

---

## 📋 DATA QUALITY CHECKLIST

### Minimum Viable Data (MVP)

Để MDP hoạt động cơ bản, cần ít nhất:

```
✅ external_orders với:
   - channel, order_date, status
   - total_amount, payment_status
   - cost_of_goods (hoặc estimate 55-65%)

✅ promotion_campaigns với:
   - campaign_name, channel
   - actual_cost, total_revenue

✅ marketing_expenses với:
   - channel, expense_date, amount
```

### Full Feature Data

Để có đầy đủ insights:

```
✅ external_order_items (SKU analysis)
✅ channel_fees (true profit)
✅ channel_settlements (cash timing)
✅ channel_analytics (funnel metrics)
✅ customer data (LTV/CAC)
```

---

## 🔄 DATA SYNC FREQUENCY

| Data Source | Recommended Frequency | Critical Level |
|-------------|----------------------|-----------------|
| Orders | Real-time / Hourly | 🔴 Critical |
| Marketing Spend | Daily | 🔴 Critical |
| Channel Fees | Daily | 🟡 Important |
| Settlements | Daily | 🟡 Important |
| Bank Transactions | Daily | 🟡 Important |
| Channel Analytics | Daily | 🟢 Nice-to-have |

---

## ⚠️ ESTIMATED vs ACTUAL DATA

Khi thiếu dữ liệu thực, MDP sẽ estimate:

| Missing Data | Estimation Method | Accuracy |
|--------------|-------------------|----------|
| COGS | 55-60% of net revenue | ±10% |
| Platform Fees | 12-15% of GMV | ±5% |
| Payment Fees | 1.5-2% of GMV | ±1% |
| Logistics | 15-25K per order | ±15% |

> **FDP Principle**: MDP luôn ưu tiên REAL DATA. Estimates được đánh dấu rõ ràng.

---

## 🔌 DATA SOURCES

### Automated (via Connectors)
- Shopee (API)
- Lazada (API)
- TikTok Shop (API)
- Facebook Ads (API)
- Google Ads (API)

### Manual Import (Excel/CSV)
- Offline sales
- Custom ad platforms
- Bank statements
- Settlement reports

### Database Views (Auto-calculated)
- `daily_channel_revenue`
- `channel_performance_summary`
- `sku_profitability_cache`

---

## 📊 KPIs DERIVED FROM DATA

| KPI | Formula | Required Tables |
|-----|---------|-----------------|
| **ROAS** | Revenue / Ad Spend | orders + campaigns |
| **Profit ROAS** | CM / Ad Spend | orders + campaigns + fees |
| **CM%** | CM / Net Revenue | orders + all costs |
| **CAC** | Marketing Spend / New Customers | expenses + orders |
| **Cash Conversion** | Cash Received / Revenue | orders + settlements |
| **Days to Cash** | (Order Date → Settlement Date) | orders + settlements |

---

> **Note**: Dữ liệu càng chi tiết → Insights càng chính xác → Quyết định càng tốt.
> 
> Tuân thủ MDP Manifesto: "Nếu MDP không làm một quyết định marketing trở nên rõ ràng hơn, thì MDP đã thất bại."
