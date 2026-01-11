# 📊 TỔNG QUAN HỆ THỐNG CẢNH BÁO KPI - REVIEW

> **Ngày review:** 2026-01-11
> **Phiên bản:** 1.0

---

## 🎯 TỔNG QUAN KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ALERT SYSTEM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐       │
│  │ Data Sources│ ──► │ Alert Detection │ ──► │ Alert Instances  │       │
│  │             │     │   Edge Function │     │   (Supabase)     │       │
│  └─────────────┘     └─────────────────┘     └──────────────────┘       │
│        │                    │                        │                   │
│        ▼                    ▼                        ▼                   │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐       │
│  │  Products   │     │  Intelligent    │     │  Notifications   │       │
│  │  Orders     │     │  Alert Rules    │     │    (Push/Email)  │       │
│  │  Stores     │     │  (82 rules)     │     │                  │       │
│  └─────────────┘     └─────────────────┘     └──────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📈 THỐNG KÊ HIỆN TẠI

### 1. Dữ liệu trong hệ thống

| Bảng dữ liệu | Số lượng | Trạng thái |
|--------------|----------|------------|
| `intelligent_alert_rules` | **82** | ✅ Đã cấu hình |
| `alert_instances` | 19 | ✅ Đang hoạt động |
| `alert_objects` | 2,975 | ✅ Đang theo dõi |
| `extended_alert_configs` | 32 | ✅ Đã cấu hình |
| `object_calculated_metrics` | 1,000 | ✅ Pre-calculated |
| `alert_data_sources` | 0 | ⚠️ Chưa cấu hình |
| `alert_settings` | 0 | ⚠️ Chưa cấu hình |
| `notification_recipients` | 0 | ⚠️ Chưa cấu hình |

### 2. Bảng dữ liệu KPI mới (Đã tạo)

| Bảng | Số lượng | Trạng thái |
|------|----------|------------|
| `products` | 0 | ❌ Chưa có dữ liệu |
| `stores` | 0 | ❌ Chưa có dữ liệu |
| `order_returns` | 0 | ❌ Chưa có dữ liệu |
| `inventory_batches` | 0 | ❌ Chưa có dữ liệu |
| `channel_analytics` | 0 | ❌ Chưa có dữ liệu |
| `promotion_campaigns` | 0 | ❌ Chưa có dữ liệu |
| `shipments` | 0 | ❌ Chưa có dữ liệu |
| `reviews` | 0 | ❌ Chưa có dữ liệu |
| `cash_flow_daily` | 0 | ❌ Chưa có dữ liệu |
| `website_analytics` | 0 | ❌ Chưa có dữ liệu |
| `store_daily_metrics` | 0 | ❌ Chưa có dữ liệu |

---

## 🔧 CÁC THÀNH PHẦN HỆ THỐNG

### 1. Edge Functions (Backend)

| Function | Chức năng | Trạng thái |
|----------|-----------|------------|
| `detect-alerts` | Phát hiện cảnh báo dựa trên rules | ✅ Hoạt động |
| `process-alert-notifications` | Gửi thông báo | ✅ Hoạt động |
| `send-notification` | Gửi push notification | ✅ Hoạt động |
| `send-fcm-notification` | Gửi FCM notification | ✅ Hoạt động |
| `sync-connector` | Đồng bộ dữ liệu từ connectors | ✅ Hoạt động |
| `scheduled-sync` | Đồng bộ theo lịch | ✅ Hoạt động |

### 2. Frontend Pages

| Trang | Đường dẫn | Chức năng |
|-------|-----------|-----------|
| Control Tower Dashboard | `/control-tower` | Tổng quan |
| Alerts | `/control-tower/alerts` | Quản lý cảnh báo |
| Notifications | `/control-tower/notifications` | Cài đặt thông báo |
| Intelligent Rules | `/control-tower/kpi-rules` | Quản lý rules KPI |
| Settings | `/control-tower/settings` | Cài đặt hệ thống |

### 3. React Hooks

| Hook | Chức năng |
|------|-----------|
| `useIntelligentAlertRules` | Quản lý rules KPI |
| `useAlertInstances` | Quản lý alert instances |
| `useAlertObjects` | Quản lý đối tượng theo dõi |
| `useMultiChannelAlertRules` | Templates rules đa kênh |
| `useRealtimeAlerts` | Real-time alerts subscription |
| `useAlertDataSources` | Quản lý nguồn dữ liệu |

---

## 📋 DANH SÁCH 82 RULES KPI

### Phân bổ theo nhóm (alert_group)

| Nhóm | Số rules | Mô tả |
|------|----------|-------|
| `fulfillment` | ~20 | Giao hàng, vận chuyển |
| `inventory` | ~15 | Tồn kho, sản phẩm |
| `revenue` | ~12 | Doanh thu, lợi nhuận |
| `service` | ~10 | CSKH, đánh giá |
| `operations` | ~10 | Vận hành, cửa hàng |
| `cashflow` | ~8 | Dòng tiền |
| `general` | ~7 | Chung |

### Phân bổ theo mức độ (severity)

| Mức độ | Số rules | Ý nghĩa |
|--------|----------|---------|
| `critical` | ~25 | Cần xử lý ngay |
| `warning` | ~50 | Cần theo dõi |
| `info` | ~7 | Thông tin |

### Các kênh áp dụng (applicable_channels)

- `shopee` - Shopee marketplace
- `lazada` - Lazada marketplace  
- `tiktok` - TikTok Shop
- `website` - Website/App
- `social` - Facebook, Zalo...
- `store` - Cửa hàng offline/POS

---

## ⚙️ CƠ CHẾ HOẠT ĐỘNG

### 1. Detect Alerts Flow

```
1. Gọi Edge Function `detect-alerts` với tenant_id
   │
2. Lấy danh sách intelligent_alert_rules (enabled)
   │
3. Sử dụng pre-calculated metrics (nếu có)
   │   └── Từ bảng object_calculated_metrics
   │
4. Với mỗi rule, tính toán metric value:
   │   ├── days_of_stock = current_stock / avg_daily_sales
   │   ├── revenue_change = (today - last_week) / last_week * 100
   │   └── ... (theo calculation_formula)
   │
5. So sánh với threshold_config:
   │   ├── critical: threshold_config.critical
   │   └── warning: threshold_config.warning
   │
6. Tạo alert_instance nếu vượt ngưỡng
   │
7. Gửi notification (push/email/slack)
```

### 2. Threshold Config Format

```json
{
  "critical": 3,     // Ngưỡng critical (VD: < 3 ngày tồn kho)
  "warning": 7,      // Ngưỡng warning (VD: < 7 ngày tồn kho)
  "operator": "less_than",  // Toán tử so sánh
  "unit": "days"     // Đơn vị đo
}
```

### 3. Calculation Formula Examples

| Rule | Formula | Giải thích |
|------|---------|------------|
| Days of Stock | `current_stock / avg_daily_sales` | Số ngày còn hàng |
| Revenue Drop | `(today - same_day_last_week) / same_day_last_week * 100` | % thay đổi doanh thu |
| Failed Delivery | `failed_deliveries / total_deliveries * 100` | Tỷ lệ giao thất bại |
| Cart Abandon | `abandoned_carts / initiated_checkouts * 100` | Tỷ lệ bỏ giỏ |

---

## 🚨 VẤN ĐỀ CẦN XỬ LÝ

### ❌ Vấn đề nghiêm trọng

1. **Thiếu dữ liệu nguồn**
   - Tất cả 11 bảng dữ liệu KPI mới đều TRỐNG
   - Không có products, stores, orders data
   - Không thể tính toán các metrics

2. **Chưa cấu hình thông báo**
   - `alert_settings`: 0 records
   - `notification_recipients`: 0 records
   - Alerts tạo ra nhưng không gửi được thông báo

3. **Chưa có data sources**
   - `alert_data_sources`: 0 records
   - Chưa kết nối với Shopee, Lazada, TikTok...

### ⚠️ Vấn đề cần cải thiện

1. **Pre-calculated metrics không đầy đủ**
   - Chỉ có DOS và Revenue metrics
   - Thiếu Fulfillment, Service, Cashflow metrics

2. **Thiếu scheduled jobs**
   - Cần job định kỳ tính toán metrics
   - Cần job định kỳ chạy detect-alerts

---

## ✅ HÀNH ĐỘNG TIẾP THEO

### Ưu tiên 1: Nhập dữ liệu test

```sql
-- Cần có dữ liệu trong các bảng:
1. products (sản phẩm)
2. stores (cửa hàng)
3. orders (đơn hàng)
4. shipments (giao hàng)
5. reviews (đánh giá)
```

### Ưu tiên 2: Cấu hình thông báo

1. Thêm alert_settings cho tenant
2. Thêm notification_recipients
3. Cấu hình push notification keys

### Ưu tiên 3: Kết nối data sources

1. Tích hợp Shopee API
2. Tích hợp Lazada API
3. Tích hợp TikTok Shop API
4. Tích hợp POS/Banking

### Ưu tiên 4: Scheduled jobs

1. Cron job tính metrics (mỗi 15 phút)
2. Cron job detect alerts (mỗi 5 phút)
3. Cron job sync data (mỗi 30 phút)

---

## 📊 BIỂU ĐỒ LUỒNG DỮ LIỆU

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW DIAGRAM                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                            │
│  │  Shopee API │───┐                                                        │
│  └─────────────┘   │     ┌─────────────────┐     ┌──────────────────┐      │
│  ┌─────────────┐   │     │                 │     │                  │      │
│  │  Lazada API │───┼────►│  sync-connector │────►│  orders          │      │
│  └─────────────┘   │     │  (Edge Function)│     │  products        │      │
│  ┌─────────────┐   │     │                 │     │  shipments       │      │
│  │ TikTok API  │───┘     └─────────────────┘     │  reviews         │      │
│  └─────────────┘                                  └────────┬─────────┘      │
│                                                             │               │
│  ┌─────────────┐                                            ▼               │
│  │  POS System │─────────────────────────────────►┌──────────────────┐     │
│  └─────────────┘                                  │  alert_objects   │     │
│  ┌─────────────┐                                  │  (2,975 objects) │     │
│  │  Banking API│─────────────────────────────────►└────────┬─────────┘     │
│  └─────────────┘                                            │               │
│                                                             ▼               │
│                    ┌─────────────────────────────────────────┐              │
│                    │           detect-alerts                  │              │
│                    │         (Edge Function)                  │              │
│                    │                                          │              │
│                    │  ┌──────────────────────────┐           │              │
│                    │  │ intelligent_alert_rules  │           │              │
│                    │  │      (82 rules)          │           │              │
│                    │  └──────────────────────────┘           │              │
│                    └─────────────────┬───────────────────────┘              │
│                                      │                                       │
│                                      ▼                                       │
│                    ┌─────────────────────────────────────────┐              │
│                    │           alert_instances               │              │
│                    │            (19 active)                  │              │
│                    └─────────────────┬───────────────────────┘              │
│                                      │                                       │
│                                      ▼                                       │
│                    ┌─────────────────────────────────────────┐              │
│                    │     process-alert-notifications         │              │
│                    │         (Edge Function)                  │              │
│                    └─────────────────┬───────────────────────┘              │
│                                      │                                       │
│                    ┌─────────────────┼─────────────────┐                    │
│                    ▼                 ▼                 ▼                    │
│              ┌──────────┐    ┌──────────┐     ┌──────────┐                 │
│              │  Push    │    │  Email   │     │  Slack   │                 │
│              │  (FCM)   │    │          │     │  Webhook │                 │
│              └──────────┘    └──────────┘     └──────────┘                 │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 KẾT LUẬN

### Đã có:
- ✅ 82 intelligent alert rules đã cấu hình
- ✅ 2,975 alert objects đang theo dõi
- ✅ Edge functions xử lý alerts
- ✅ Pre-calculated metrics (1,000 records)
- ✅ Database schema hoàn chỉnh (16 bảng KPI)

### Cần bổ sung:
- ❌ Dữ liệu thực tế (products, orders, stores...)
- ❌ Cấu hình notification recipients
- ❌ Kết nối data sources (APIs)
- ❌ Scheduled jobs cho sync & detect

### Đánh giá tổng thể:
> **Hệ thống đã sẵn sàng về mặt kiến trúc và logic xử lý. Chỉ cần nhập dữ liệu và cấu hình thông báo để hoạt động đầy đủ.**

---

*Tài liệu này được tạo tự động bởi hệ thống review.*
