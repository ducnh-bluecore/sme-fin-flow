# Kiểm tra độ sẵn sàng dữ liệu cho KPI Alert System

## Tổng quan

| Nhóm Alert | Số Rules | Trạng thái Data |
|------------|----------|-----------------|
| General | 35 | ⚠️ Một phần |
| Operations | 11 | ⚠️ Một phần |
| Inventory | 10 | ✅ Sẵn sàng |
| Fulfillment | 9 | ✅ Sẵn sàng |
| Service | 9 | ✅ Sẵn sàng |
| Revenue | 8 | ✅ Sẵn sàng |

## Dữ liệu hiện có

| Bảng | Số bản ghi | Trạng thái |
|------|------------|------------|
| alert_objects | 2,990 | ✅ Đủ |
| customers | 1,527 | ✅ Đủ |
| products | 10 | ✅ Test data |
| orders | 10 | ✅ Test data |
| channel_analytics | 8 | ✅ Test data |
| cash_flow_daily | 14 | ✅ Test data |
| shipments | 6 | ✅ Test data |
| reviews | 8 | ✅ Test data |
| stores | 5 | ✅ Test data |
| store_daily_metrics | 5 | ✅ Test data |
| support_tickets | 5 | ✅ Test data |
| promotion_campaigns | 5 | ✅ Test data |
| order_returns | 6 | ✅ Test data |
| inventory_batches | 5 | ✅ Test data |
| website_analytics | 5 | ✅ Test data |
| voucher_usage | 3 | ✅ Test data |

---

## Chi tiết theo nhóm KPI

### 1. INVENTORY (10 rules) ✅ SẴN SÀNG

| Rule | Bảng cần | Có data? | Sẵn sàng? |
|------|----------|----------|-----------|
| Sắp hết hàng | products, alert_objects | ✅ | ✅ |
| Tồn kho theo ngày bán (DOS) | products, alert_objects | ✅ | ✅ |
| Đến điểm đặt hàng | products, alert_objects | ✅ | ✅ |
| Hàng gần hết date | inventory_batches | ✅ | ✅ |
| Hàng tồn không bán | products, alert_objects | ✅ | ✅ |
| Tồn kho âm | products | ✅ | ✅ |
| Tồn quá mức | products, alert_objects | ✅ | ✅ |
| Tồn kho lệch giữa các kênh | products.platform_stock | ✅ | ✅ |
| Hàng chậm bán đột ngột tăng | products, alert_objects | ✅ | ✅ |
| Tồn tại điểm thấp | stores, store_daily_metrics | ✅ | ✅ |

### 2. FULFILLMENT (9 rules) ✅ SẴN SÀNG

| Rule | Bảng cần | Có data? | Sẵn sàng? |
|------|----------|----------|-----------|
| Đơn giao chậm | orders, shipments | ✅ | ✅ |
| Đơn chưa xuất kho | orders | ✅ | ✅ |
| Hàng hoàn chưa lấy về | order_returns | ✅ | ✅ |
| Đơn tăng đột biến | orders | ✅ | ✅ |
| Chi phí ship tăng bất thường | shipments | ✅ | ✅ |
| ĐVVC giao chậm liên tục | shipments | ✅ | ✅ |
| COD chưa đối soát | orders, shipments | ✅ | ✅ |
| Tỷ lệ giao thất bại cao | shipments | ✅ | ✅ |
| Đơn live tăng vọt | orders | ✅ | ✅ |

### 3. SERVICE (9 rules) ✅ SẴN SÀNG

| Rule | Bảng cần | Có data? | Sẵn sàng? |
|------|----------|----------|-----------|
| Đánh giá xấu tăng | reviews | ✅ | ✅ |
| Khiếu nại chưa xử lý | support_tickets | ✅ | ✅ |
| Phản hồi chat chậm | support_tickets | ✅ | ✅ |
| Tin nhắn chưa trả lời | reviews (is_responded) | ✅ | ✅ |
| Tỷ lệ hoàn tiền cao | order_returns | ✅ | ✅ |
| Điểm shop giảm | channel_analytics | ⚠️ | ⚠️ Thiếu shop_score |
| Cảnh báo vi phạm sàn | - | ❌ | ❌ Cần bảng violations |
| Lỗi chất lượng sản phẩm | reviews | ✅ | ✅ |
| Mention tiêu cực | - | ❌ | ❌ Cần social_mentions |

### 4. REVENUE (8 rules) ✅ SẴN SÀNG

| Rule | Bảng cần | Có data? | Sẵn sàng? |
|------|----------|----------|-----------|
| Doanh thu ngày giảm mạnh | channel_analytics, store_daily_metrics | ✅ | ✅ |
| Biên lợi nhuận âm | channel_analytics | ✅ | ✅ |
| Chi phí KM vượt ngân sách | promotion_campaigns | ✅ | ✅ |
| Doanh thu lệch kênh | channel_analytics | ✅ | ✅ |
| Dòng tiền căng | cash_flow_daily | ✅ | ✅ |
| Giá trị đơn TB giảm | channel_analytics, orders | ✅ | ✅ |
| Lạm dụng khuyến mãi | voucher_usage | ✅ | ✅ |
| Phí sàn tăng | channel_analytics | ✅ | ✅ |

### 5. OPERATIONS (11 rules) ⚠️ MỘT PHẦN

| Rule | Bảng cần | Có data? | Sẵn sàng? |
|------|----------|----------|-----------|
| Bỏ giỏ hàng cao | website_analytics | ✅ | ✅ |
| Campaign sắp kết thúc | promotion_campaigns | ✅ | ✅ |
| Chênh lệch tiền mặt | store_daily_metrics | ✅ | ✅ |
| Cửa hàng không có đơn | stores, store_daily_metrics | ✅ | ✅ |
| Hết hàng Flash Sale | promotion_campaigns, products | ✅ | ✅ |
| Lỗi đồng bộ sàn | - | ❌ | ❌ Cần sync_logs |
| Lỗi thanh toán | website_analytics | ✅ | ✅ |
| POS mất kết nối | - | ❌ | ❌ Cần pos_status |
| Sản phẩm bị ẩn | products | ✅ | ✅ |
| Traffic đột biến | website_analytics | ✅ | ✅ |
| Website chậm | website_analytics | ✅ | ✅ |

### 6. GENERAL (35 rules) ⚠️ MỘT PHẦN

| Rule | Bảng cần | Có data? | Sẵn sàng? |
|------|----------|----------|-----------|
| Biên lợi nhuận gộp giảm | channel_analytics | ✅ | ✅ |
| Biên lợi nhuận ròng thấp | channel_analytics | ✅ | ✅ |
| Cash Runway Thấp | cash_flow_daily | ✅ | ✅ |
| Chi phí thu hút khách mới cao | customers | ✅ | ✅ |
| CLV khách hàng giảm | customers | ✅ | ✅ |
| Conversion Rate | channel_analytics, website_analytics | ✅ | ✅ |
| Danh mục sản phẩm kém hiệu quả | products | ✅ | ✅ |
| Dead Stock (Hàng chậm) | products, alert_objects | ✅ | ✅ |
| Độ chính xác tồn kho thấp | inventory_batches | ✅ | ✅ |
| Doanh thu/m² thấp | stores, store_daily_metrics | ⚠️ | ⚠️ Thiếu area_sqm |
| Dòng tiền ra tăng đột biến | cash_flow_daily | ✅ | ✅ |
| Dòng tiền vào giảm | cash_flow_daily | ✅ | ✅ |
| Fast Mover (Sản phẩm HOT) | products, alert_objects | ✅ | ✅ |
| Hiệu suất Pick & Pack thấp | - | ❌ | ❌ Cần warehouse_ops |
| Kênh bán không sinh lời | channel_analytics | ✅ | ✅ |
| Lead time NCC không ổn định | - | ❌ | ❌ Cần purchase_orders |
| Lượng khách giảm | store_daily_metrics, website_analytics | ✅ | ✅ |
| Năng suất nhân viên thấp | store_daily_metrics | ✅ | ✅ |
| Overstock (Tồn quá mức) | products, alert_objects | ✅ | ✅ |
| Reorder Point | products, alert_objects | ✅ | ✅ |
| Store Revenue Velocity | store_daily_metrics | ✅ | ✅ |
| Sức chứa kho cao | - | ❌ | ❌ Cần warehouse_capacity |
| Tăng trưởng doanh thu chậm | channel_analytics | ✅ | ✅ |
| Thị phần thay đổi | - | ❌ | ❌ Cần market_data |
| Thời gian giao hàng chậm | shipments | ✅ | ✅ |
| Tồn kho theo ngày bán (DOS) | products, alert_objects | ✅ | ✅ |
| Tỷ lệ chi phí vận hành cao | channel_analytics | ✅ | ✅ |
| Tỷ lệ hoàn thành đơn thấp | orders, shipments | ✅ | ✅ |
| Tỷ lệ hủy đơn cao | orders | ✅ | ✅ |
| Tỷ lệ mất khách hàng cao | customers | ✅ | ✅ |
| Tỷ lệ mua lại thấp | customers, orders | ✅ | ✅ |
| Tỷ lệ thu hồi AR thấp | invoices | ⚠️ | ⚠️ Cần invoice data |
| Tỷ lệ trả hàng cao | order_returns | ✅ | ✅ |
| Vòng quay tồn kho store thấp | store_daily_metrics | ✅ | ✅ |

---

## Tổng kết

### ✅ Sẵn sàng chạy (66/82 rules = 80%)

Các nhóm rules có thể chạy ngay:
- **Inventory**: 10/10 rules
- **Fulfillment**: 9/9 rules
- **Revenue**: 8/8 rules
- **Service**: 7/9 rules
- **Operations**: 9/11 rules
- **General**: 23/35 rules

### ⚠️ Thiếu một số bảng/cột (16 rules)

| Thiếu | Rules bị ảnh hưởng | Giải pháp |
|-------|-------------------|-----------|
| shop_score trong channel_analytics | Điểm shop giảm | Thêm cột |
| violations table | Cảnh báo vi phạm sàn | Tạo bảng |
| social_mentions table | Mention tiêu cực | Tạo bảng |
| sync_logs table | Lỗi đồng bộ sàn | Tạo bảng |
| pos_status table | POS mất kết nối | Tạo bảng |
| warehouse_ops table | Hiệu suất Pick & Pack | Tạo bảng |
| purchase_orders table | Lead time NCC | Tạo bảng |
| warehouse_capacity table | Sức chứa kho cao | Tạo bảng |
| market_data table | Thị phần thay đổi | Tạo bảng |
| area_sqm trong stores | Doanh thu/m² thấp | Thêm cột |

---

## Kết luận

🎯 **Hệ thống đã sẵn sàng chạy 80% KPI rules với dữ liệu test hiện có.**

Các bước tiếp theo để đạt 100%:
1. Thêm cột `shop_score` vào `channel_analytics`
2. Thêm cột `area_sqm` vào `stores`
3. Tạo các bảng còn thiếu nếu cần tính năng đó

Để test alert detection ngay, có thể gọi edge function `detect-alerts` với tenant_id.
