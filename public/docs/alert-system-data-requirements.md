# Yêu cầu Dữ liệu cho Hệ thống Alert Control Tower

> Tài liệu mô tả chi tiết các nguồn dữ liệu cần thiết để 47+ KPI Alert Rules hoạt động đầy đủ

---

## 📊 Tổng quan Nguồn Dữ liệu

Hệ thống cần **7 nhóm dữ liệu chính** để tất cả cảnh báo hoạt động:

| # | Nhóm Dữ liệu | Bảng/Table | Số Rules sử dụng |
|---|--------------|------------|------------------|
| 1 | Đơn hàng (Orders) | `orders`, `order_items` | 15+ rules |
| 2 | Tồn kho (Inventory) | `products`, `inventory_batches` | 10+ rules |
| 3 | Khách hàng (Customers) | `customers`, `customer_transactions` | 6+ rules |
| 4 | Doanh thu & Chi phí | `invoices`, `expenses`, `channel_analytics` | 12+ rules |
| 5 | Vận chuyển (Shipping) | `shipments`, `carriers` | 8+ rules |
| 6 | Đánh giá & CSKH | `reviews`, `tickets`, `messages` | 6+ rules |
| 7 | Tiền mặt (Cash Flow) | `bank_accounts`, `bank_transactions` | 5+ rules |

---

## 🗃️ 1. DỮ LIỆU ĐƠN HÀNG (Orders)

### 1.1 Bảng `orders` (Bắt buộc - ĐÃ CÓ)

**Trường cần bổ sung cho alerts:**

| Trường | Kiểu | Mô tả | Rule sử dụng |
|--------|------|-------|--------------|
| `confirmed_at` | timestamp | Thời điểm xác nhận đơn | ORDER_NOT_SHIPPED_24H |
| `shipped_at` | timestamp | Thời điểm giao ĐVVC | ORDER_DELIVERY_DELAYED |
| `delivered_at` | timestamp | Thời điểm giao thành công | COD_NOT_RECEIVED |
| `platform_sla_days` | integer | SLA của sàn (ngày) | ORDER_DELIVERY_DELAYED |
| `cod_collected_at` | timestamp | Thời điểm nhận COD | COD_NOT_RECEIVED |
| `carrier_code` | varchar(30) | Mã đơn vị vận chuyển | CARRIER_DELAY_PATTERN |

**📌 Rules sử dụng:**
- `ORDER_DELIVERY_DELAYED` - delivery_days - platform_sla_days > 2
- `ORDER_NOT_SHIPPED_24H` - NOW() - confirmed_at > 24h
- `ORDER_SURGE_ALERT` - current_orders_per_hour / warehouse_capacity > 150%
- `COD_NOT_RECEIVED` - NOW() - delivered_at > 7 days
- `FAILED_DELIVERY_HIGH` - failed_deliveries / total_deliveries > 10%

### 1.2 Bảng `order_returns` (Cần tạo mới)

```sql
CREATE TABLE order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID REFERENCES orders(id),
  
  return_type VARCHAR(20),       -- 'refund', 'exchange', 'return'
  return_reason VARCHAR(100),
  status VARCHAR(20),            -- 'pending', 'approved', 'collected', 'completed'
  
  return_created_at TIMESTAMP,   -- ⭐ Cần cho RETURN_NOT_COLLECTED
  collected_at TIMESTAMP,        -- ⭐ Ngày lấy hàng hoàn về
  refund_amount DECIMAL(15,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rule sử dụng:**
- `RETURN_NOT_COLLECTED` - NOW() - return_created_at > 3 days

---

## 📦 2. DỮ LIỆU TỒN KHO (Inventory)

### 2.1 Bảng `products` (Bắt buộc - ĐÃ CÓ)

**Trường cần bổ sung:**

| Trường | Kiểu | Mô tả | Rule sử dụng |
|--------|------|-------|--------------|
| `current_stock` | integer | Tồn kho hiện tại | STOCKOUT_IMMINENT, NEGATIVE_STOCK |
| `avg_daily_sales` | decimal | TB bán/ngày | STOCKOUT_IMMINENT, OVERSTOCK |
| `last_sale_date` | timestamp | Ngày bán cuối | DEAD_STOCK_30_DAYS |
| `reorder_point` | integer | Điểm đặt hàng | REORDER_POINT_HIT |
| `platform_stock` | jsonb | Tồn trên các sàn | INVENTORY_SYNC_MISMATCH |
| `sales_velocity` | decimal | Tốc độ bán hiện tại | SLOW_MOVING_TO_FAST |
| `prev_sales_velocity` | decimal | Tốc độ bán kỳ trước | SLOW_MOVING_TO_FAST |

**📌 Rules sử dụng:**
- `STOCKOUT_IMMINENT` - current_stock / avg_daily_sales < 3 days
- `INVENTORY_SYNC_MISMATCH` - ABS(system_stock - platform_stock) > 10
- `DEAD_STOCK_30_DAYS` - NOW() - last_sale_date > 30 days
- `OVERSTOCK_WARNING` - current_stock / avg_daily_sales > 90 days
- `NEGATIVE_STOCK` - current_stock < 0
- `REORDER_POINT_HIT` - current_stock ≤ reorder_point

### 2.2 Bảng `inventory_batches` (Cần tạo - cho hàng có HSD)

```sql
CREATE TABLE inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID REFERENCES products(id),
  
  batch_number VARCHAR(50),
  quantity INTEGER,
  
  manufacture_date DATE,
  expiry_date DATE,              -- ⭐ Cần cho EXPIRY_APPROACHING
  
  warehouse_location VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rule sử dụng:**
- `EXPIRY_APPROACHING` - expiry_date - NOW() < 30 days

---

## 👥 3. DỮ LIỆU KHÁCH HÀNG (Customers)

### 3.1 Bảng `customers` (Bắt buộc - ĐÃ CÓ)

**Trường cần bổ sung:**

| Trường | Kiểu | Mô tả | Rule sử dụng |
|--------|------|-------|--------------|
| `last_order_date` | timestamp | Ngày mua cuối | CUSTOMER_CHURN |
| `total_orders` | integer | Tổng số đơn | REPEAT_RATE_LOW |
| `clv_value` | decimal | Giá trị vòng đời KH | CLV_DECLINING |
| `prev_clv_value` | decimal | CLV kỳ trước | CLV_DECLINING |
| `acquisition_cost` | decimal | Chi phí thu hút KH | CAC_TOO_HIGH |

**📌 Rules sử dụng:**
- `CUSTOMER_CHURN` - NOW() - last_order_date > 90 days
- `REPEAT_RATE_LOW` - repeat_customers / total_customers < 25%
- `CLV_DECLINING` - (current_clv - prev_clv) / prev_clv < -10%
- `CAC_TOO_HIGH` - marketing_spend / new_customers > 300,000 VND

### 3.2 Bảng `voucher_usage` (Cần tạo)

```sql
CREATE TABLE voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  customer_id UUID REFERENCES customers(id),
  voucher_code VARCHAR(50),
  order_id UUID,
  
  discount_amount DECIMAL(15,2),
  used_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rule sử dụng:**
- `DISCOUNT_ABUSE` - COUNT(voucher_used) BY customer > 5

---

## 💰 4. DỮ LIỆU DOANH THU & CHI PHÍ

### 4.1 Bảng `channel_analytics` (Cần tạo)

```sql
CREATE TABLE channel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  channel VARCHAR(20),           -- 'shopee', 'lazada', 'tiktok', 'website', 'pos', 'social'
  analytics_date DATE,
  
  -- Doanh thu
  revenue DECIMAL(15,2),         -- ⭐ Doanh thu ngày
  prev_revenue DECIMAL(15,2),    -- Doanh thu cùng kỳ
  
  -- Đơn hàng
  total_orders INTEGER,
  avg_order_value DECIMAL(15,2), -- ⭐ AOV
  prev_aov DECIMAL(15,2),
  
  -- Chi phí
  platform_fee DECIMAL(15,2),    -- ⭐ Phí sàn
  prev_platform_fee DECIMAL(15,2),
  shipping_cost DECIMAL(15,2),
  marketing_cost DECIMAL(15,2),
  
  -- COGS & Margin
  total_cogs DECIMAL(15,2),
  gross_margin DECIMAL(10,2),    -- ⭐ Biên lợi nhuận %
  
  -- Traffic
  sessions INTEGER,
  conversion_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rules sử dụng:**
- `REVENUE_DROP_DAILY` - (today - same_day_last_week) / same_day_last_week < -30%
- `MARGIN_NEGATIVE` - (selling_price - cost - fees) / selling_price < 0%
- `AOV_DROP` - (current_aov - prev_aov) / prev_aov < -15%
- `PLATFORM_FEE_INCREASE` - (current_fee - prev_fee) / prev_fee > 10%
- `CHANNEL_REVENUE_IMBALANCE` - channel_revenue / total_revenue > 70%

### 4.2 Bảng `promotion_campaigns` (Cần tạo)

```sql
CREATE TABLE promotion_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  campaign_name VARCHAR(200),
  campaign_type VARCHAR(30),
  
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  
  budget DECIMAL(15,2),          -- ⭐ Ngân sách dự kiến
  actual_cost DECIMAL(15,2),     -- ⭐ Chi thực tế
  
  total_orders INTEGER,
  total_revenue DECIMAL(15,2),
  
  status VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rule sử dụng:**
- `PROMOTION_OVERSPEND` - actual_cost / budget > 110%

---

## 🚚 5. DỮ LIỆU VẬN CHUYỂN (Shipping)

### 5.1 Bảng `shipments` (Cần tạo)

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  order_id UUID REFERENCES orders(id),
  
  carrier_code VARCHAR(30),      -- 'ghn', 'ghtk', 'viettel', 'jt', 'ninja'
  carrier_name VARCHAR(100),
  tracking_number VARCHAR(100),
  
  status VARCHAR(30),            -- 'pending', 'picked_up', 'in_transit', 'delivered', 'failed'
  
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  delivery_days INTEGER,         -- ⭐ Số ngày giao thực tế
  is_on_time BOOLEAN,
  
  shipping_fee DECIMAL(15,2),    -- ⭐ Phí ship
  failure_reason VARCHAR(200),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Bảng `carrier_performance` (Cần tạo)

```sql
CREATE TABLE carrier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  carrier_code VARCHAR(30),
  performance_date DATE,
  
  total_shipments INTEGER,
  delivered_count INTEGER,
  failed_count INTEGER,
  delayed_count INTEGER,         -- ⭐ Số đơn trễ
  delay_rate DECIMAL(5,2),       -- ⭐ Tỷ lệ trễ %
  
  avg_delivery_days DECIMAL(5,2),
  avg_cost_per_shipment DECIMAL(15,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rules sử dụng:**
- `SHIPPING_COST_SPIKE` - (current_avg - prev_avg) / prev_avg > 20%
- `CARRIER_DELAY_PATTERN` - delayed_orders / total_orders_by_carrier > 15%
- `FAILED_DELIVERY_HIGH` - failed_deliveries / total_deliveries > 10%

### 5.3 Bảng `warehouse_capacity` (Cần tạo)

```sql
CREATE TABLE warehouse_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  warehouse_code VARCHAR(50),
  warehouse_name VARCHAR(200),
  
  max_orders_per_hour INTEGER,   -- ⭐ Công suất tối đa
  max_orders_per_day INTEGER,
  
  current_staff_count INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rule sử dụng:**
- `ORDER_SURGE_ALERT` - current_orders / warehouse_capacity > 150%

---

## ⭐ 6. DỮ LIỆU ĐÁNH GIÁ & CSKH

### 6.1 Bảng `reviews` (Cần tạo)

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  order_id UUID,
  product_id UUID,
  customer_id UUID,
  
  channel VARCHAR(20),           -- 'shopee', 'lazada', 'tiktok'
  platform_review_id VARCHAR(100),
  
  rating INTEGER,                -- ⭐ 1-5 sao
  review_content TEXT,
  sentiment VARCHAR(20),         -- 'positive', 'neutral', 'negative'
  
  is_responded BOOLEAN DEFAULT FALSE,
  responded_at TIMESTAMP,
  
  review_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rules sử dụng:**
- `NEGATIVE_REVIEW_SPIKE` - negative_reviews_today / avg_negative_reviews > 200%
- `SHOP_RATING_DROP` - (current_rating - prev_rating) < -0.3

### 6.2 Bảng `support_tickets` (Cần tạo)

```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  ticket_number VARCHAR(50),
  customer_id UUID,
  order_id UUID,
  
  channel VARCHAR(30),           -- 'shopee_chat', 'lazada_chat', 'zalo', 'facebook'
  category VARCHAR(50),
  priority VARCHAR(20),
  status VARCHAR(20),
  
  created_at TIMESTAMP,
  first_response_at TIMESTAMP,   -- ⭐ Thời gian phản hồi đầu
  resolved_at TIMESTAMP,
  
  response_time_minutes INTEGER, -- ⭐ SLA phản hồi
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rules sử dụng:**
- `RESPONSE_TIME_SLA_BREACH` - avg_response_time > 60 minutes
- `COMPLAINT_SURGE` - complaints_today / avg_complaints > 200%

### 6.3 Bảng `chat_messages` (Cần tạo)

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  channel VARCHAR(20),
  conversation_id VARCHAR(100),
  customer_id UUID,
  
  message_type VARCHAR(20),      -- 'customer', 'seller'
  message_content TEXT,
  
  received_at TIMESTAMP,
  responded_at TIMESTAMP,
  response_time_minutes INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rule sử dụng:**
- `CHAT_UNANSWERED` - NOW() - last_customer_message > 30 minutes

---

## 💵 7. DỮ LIỆU TIỀN MẶT (Cash Flow)

### 7.1 Bảng `bank_accounts` & `bank_transactions` (ĐÃ CÓ)

**Trường quan trọng đã có:**
- `current_balance` - Số dư hiện tại
- `transaction_type` - 'credit' (vào) / 'debit' (ra)
- `amount` - Số tiền

### 7.2 Bảng `cash_flow_daily` (Cần tạo)

```sql
CREATE TABLE cash_flow_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  flow_date DATE,
  
  total_inflow DECIMAL(15,2),    -- ⭐ Tổng thu
  total_outflow DECIMAL(15,2),   -- ⭐ Tổng chi
  net_cash_flow DECIMAL(15,2),
  closing_balance DECIMAL(15,2),
  
  avg_daily_expenses DECIMAL(15,2), -- ⭐ Chi phí TB/ngày
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rules sử dụng:**
- `CASH_FLOW_WARNING` - current_cash / avg_daily_expenses < 7 days
- `CASH_RUNWAY_LOW` - current_cash / avg_monthly_burn < 60 days
- `CASH_OUTFLOW_SPIKE` - (current_outflow - avg_outflow) / avg_outflow > 30%
- `CASH_INFLOW_SLOW` - (current_inflow - avg_inflow) / avg_inflow < -25%
- `AR_COLLECTION_RATE` - collected_amount / total_ar_due < 75%

---

## 🌐 8. DỮ LIỆU WEBSITE (Cho kênh website)

### 8.1 Bảng `website_analytics` (Cần tạo)

```sql
CREATE TABLE website_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  analytics_date DATE,
  
  sessions INTEGER,
  unique_visitors INTEGER,
  page_views INTEGER,
  
  bounce_rate DECIMAL(5,2),           -- ⭐ Tỷ lệ thoát
  cart_abandonment_rate DECIMAL(5,2), -- ⭐ Tỷ lệ bỏ giỏ
  conversion_rate DECIMAL(5,2),       -- ⭐ Tỷ lệ chuyển đổi
  
  checkout_errors_count INTEGER,       -- ⭐ Lỗi thanh toán
  avg_load_time_ms INTEGER,           -- ⭐ Thời gian tải
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rules sử dụng:**
- `CONVERSION_RATE_DROP` - current_cr / prev_cr < 70%
- `CART_ABANDONMENT_HIGH` - cart_abandonment_rate > 80%
- `BOUNCE_RATE_HIGH` - bounce_rate > 70%
- `PAGE_LOAD_SLOW` - avg_load_time > 5000ms
- `CHECKOUT_ERROR_SPIKE` - checkout_errors > 10

---

## 🏪 9. DỮ LIỆU CỬA HÀNG (POS)

### 9.1 Bảng `stores` (ĐÃ CÓ - cần bổ sung)

**Trường cần bổ sung:**

| Trường | Kiểu | Mô tả | Rule sử dụng |
|--------|------|-------|--------------|
| `daily_sales_target` | decimal | Mục tiêu doanh số/ngày | STORE_TARGET_MISS |
| `current_daily_sales` | decimal | Doanh số hiện tại | STORE_TARGET_MISS |
| `last_transaction_at` | timestamp | Giao dịch cuối | STORE_NO_TRANSACTION |

### 9.2 Bảng `store_daily_metrics` (Cần tạo)

```sql
CREATE TABLE store_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID,
  
  metrics_date DATE,
  
  total_revenue DECIMAL(15,2),
  target_revenue DECIMAL(15,2),
  achievement_rate DECIMAL(5,2), -- ⭐ % đạt target
  
  transactions_count INTEGER,
  stockout_items INTEGER,        -- ⭐ Số SKU hết hàng
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rules sử dụng:**
- `STORE_TARGET_MISS` - current_sales / target_sales < 80%
- `STORE_STOCKOUT_HIGH` - stockout_items > 5
- `STORE_NO_TRANSACTION` - last_transaction_time > 2 hours

---

## 📱 10. DỮ LIỆU SOCIAL COMMERCE

### 10.1 Bảng `social_analytics` (Cần tạo)

```sql
CREATE TABLE social_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  platform VARCHAR(20),          -- 'facebook', 'instagram', 'tiktok', 'zalo'
  analytics_date DATE,
  
  followers_count INTEGER,
  engagement_rate DECIMAL(5,2),  -- ⭐ Tỷ lệ tương tác
  
  messages_received INTEGER,
  messages_responded INTEGER,
  avg_response_time_minutes INTEGER,
  
  orders_from_social INTEGER,
  revenue_from_social DECIMAL(15,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

**📌 Rules sử dụng:**
- `SOCIAL_ENGAGEMENT_DROP` - current_engagement / prev_engagement < 50%
- `SOCIAL_MESSAGE_BACKLOG` - unread_messages > 20

---

## 📋 TÓM TẮT: BẢNG CẦN THIẾT

### Mức độ ưu tiên

| Ưu tiên | Bảng | Trạng thái | Số Rules |
|---------|------|------------|----------|
| 🔴 P0 | `orders` (bổ sung trường) | ĐÃ CÓ | 15+ |
| 🔴 P0 | `products` (bổ sung trường) | ĐÃ CÓ | 10+ |
| 🔴 P0 | `channel_analytics` | CẦN TẠO | 8+ |
| 🟡 P1 | `shipments` | CẦN TẠO | 6+ |
| 🟡 P1 | `carrier_performance` | CẦN TẠO | 3+ |
| 🟡 P1 | `customers` (bổ sung trường) | ĐÃ CÓ | 5+ |
| 🟡 P1 | `bank_accounts` + `bank_transactions` | ĐÃ CÓ | 5+ |
| 🟢 P2 | `reviews` | CẦN TẠO | 3+ |
| 🟢 P2 | `support_tickets` | CẦN TẠO | 3+ |
| 🟢 P2 | `chat_messages` | CẦN TẠO | 1+ |
| 🟢 P2 | `website_analytics` | CẦN TẠO | 4+ |
| 🔵 P3 | `social_analytics` | CẦN TẠO | 2+ |
| 🔵 P3 | `store_daily_metrics` | CẦN TẠO | 3+ |
| 🔵 P3 | `promotion_campaigns` | CẦN TẠO | 1+ |
| 🔵 P3 | `warehouse_capacity` | CẦN TẠO | 1+ |
| 🔵 P3 | `order_returns` | CẦN TẠO | 1+ |
| 🔵 P3 | `voucher_usage` | CẦN TẠO | 1+ |
| 🔵 P3 | `inventory_batches` | CẦN TẠO | 1+ |
| 🔵 P3 | `cash_flow_daily` | CẦN TẠO | 3+ |

---

## 🔌 NGUỒN DỮ LIỆU SYNC

### Tích hợp cần thiết

| Nguồn | Loại | Dữ liệu lấy được |
|-------|------|------------------|
| **Shopee Open API** | API | Đơn hàng, tồn kho, đánh giá, chat |
| **Lazada Open API** | API | Đơn hàng, tồn kho, đánh giá |
| **TikTok Shop API** | API | Đơn hàng, sản phẩm, phân tích |
| **GHN/GHTK/ViettelPost** | API | Trạng thái vận chuyển |
| **Google Analytics** | API | Traffic website |
| **Facebook Graph API** | API | Social metrics |
| **Banking API** | API/Import | Giao dịch ngân hàng |
| **POS System** | API/DB | Dữ liệu cửa hàng |
| **BigQuery** | Connector | Data warehouse |

---

## 📝 LƯU Ý QUAN TRỌNG

1. **Trường timestamp**: Tất cả các bảng cần có `created_at`, `updated_at`

2. **Multi-tenant**: Tất cả bảng PHẢI có `tenant_id` và RLS policies

3. **Sync frequency**: 
   - Đơn hàng, chat: Real-time hoặc 5 phút
   - Tồn kho: 15-30 phút
   - Analytics: 1 giờ hoặc daily

4. **Historical data**: Cần giữ ít nhất 90 ngày để tính so sánh

5. **Data quality**: Cần có job kiểm tra data integrity

---

*Tài liệu được tạo: 2026-01-11*
*Phiên bản: 1.0*
