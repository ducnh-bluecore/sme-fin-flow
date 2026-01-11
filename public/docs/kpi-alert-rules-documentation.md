# Tài liệu KPI Alert Rules - Control Tower

> Hệ thống 47+ quy tắc cảnh báo thông minh cho vận hành đa kênh bán lẻ

---

## 📋 Tổng quan

Hệ thống KPI Alert Rules được thiết kế để tự động giám sát và cảnh báo các vấn đề trong hoạt động kinh doanh đa kênh. Mỗi rule bao gồm:

- **Rule Code**: Mã định danh duy nhất
- **Công thức tính toán**: Logic tính toán metric
- **Ngưỡng cảnh báo**: Critical / Warning / Info
- **Hành động đề xuất**: Các bước xử lý khi cảnh báo xảy ra
- **Kênh áp dụng**: Shopee, Lazada, TikTok, Website, Social, POS

---

## 🚚 Nhóm 1: FULFILLMENT & VẬN CHUYỂN

### 1.1 ORDER_DELIVERY_DELAYED - Đơn giao chậm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | Số ngày vượt SLA giao hàng |
| **Công thức** | `delivery_days - platform_sla_days` |
| **Ngưỡng Critical** | > 2 ngày |
| **Ngưỡng Warning** | > 1 ngày |

**Mô tả**: Đơn hàng vượt SLA giao hàng của sàn TMĐT, có nguy cơ bị phạt hoặc ảnh hưởng rating shop.

**Hành động đề xuất**:
- Liên hệ ĐVVC kiểm tra trạng thái
- Cân nhắc chuyển đơn vị khác
- Giao trực tiếp nếu cần

---

### 1.2 ORDER_NOT_SHIPPED_24H - Đơn chưa xuất kho

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Shopee, Lazada, TikTok, Website, Social |
| **Metric** | Số giờ từ khi xác nhận đơn |
| **Công thức** | `NOW() - order_confirmed_at` |
| **Ngưỡng Critical** | > 24 giờ |
| **Ngưỡng Warning** | > 12 giờ |

**Mô tả**: Đơn hàng đã xác nhận nhưng chưa giao cho đơn vị vận chuyển.

**Hành động đề xuất**:
- Kiểm tra tồn kho và năng lực đóng gói
- Ưu tiên xử lý ngay

---

### 1.3 RETURN_NOT_COLLECTED - Hàng hoàn chưa lấy về

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | Số ngày kể từ khi tạo hoàn |
| **Công thức** | `NOW() - return_created_at` |
| **Ngưỡng Critical** | > 5 ngày |
| **Ngưỡng Warning** | > 3 ngày |

**Mô tả**: Đơn hoàn trả nhưng chưa được nhập kho lại.

**Hành động đề xuất**:
- Liên hệ ĐVVC lấy hàng hoàn
- Kiểm tra trạng thái trên sàn

---

### 1.4 ORDER_SURGE_ALERT - Đơn tăng đột biến

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Tất cả kênh |
| **Metric** | % so với năng lực xử lý |
| **Công thức** | `(current_orders_per_hour / warehouse_capacity_per_hour) * 100` |
| **Ngưỡng Critical** | > 200% |
| **Ngưỡng Warning** | > 150% |

**Mô tả**: Số đơn/giờ vượt năng lực xử lý kho.

**Hành động đề xuất**:
- Tăng cường nhân sự đóng gói
- Thông báo team kho chuẩn bị OT
- Tạm dừng promotion nếu cần

---

### 1.5 SHIPPING_COST_SPIKE - Chi phí ship tăng bất thường

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Shopee, Lazada, TikTok, Website, Social |
| **Metric** | % thay đổi chi phí ship |
| **Công thức** | `((current_avg - prev_avg) / prev_avg) * 100` |
| **Ngưỡng Critical** | > 30% |
| **Ngưỡng Warning** | > 20% |

**Mô tả**: Chi phí vận chuyển/đơn tăng so với tuần trước.

**Hành động đề xuất**:
- Kiểm tra cơ cấu ĐVVC
- Đàm phán lại giá với carrier

---

### 1.6 CARRIER_DELAY_PATTERN - ĐVVC giao chậm liên tục

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Shopee, Lazada, TikTok, Website, Social |
| **Metric** | % đơn giao trễ của ĐVVC |
| **Công thức** | `(delayed_orders / total_orders_by_carrier) * 100` |
| **Ngưỡng Critical** | > 25% |
| **Ngưỡng Warning** | > 15% |

**Mô tả**: Một ĐVVC có tỷ lệ giao trễ cao trong tuần.

**Hành động đề xuất**:
- Giảm tỷ trọng đơn cho ĐVVC này
- Liên hệ đàm phán SLA

---

### 1.7 COD_NOT_RECEIVED - COD chưa đối soát

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | Số ngày từ khi giao thành công |
| **Công thức** | `NOW() - order_delivered_at` |
| **Ngưỡng Critical** | > 10 ngày |
| **Ngưỡng Warning** | > 7 ngày |

**Mô tả**: Tiền COD chưa nhận sau khi giao thành công.

**Hành động đề xuất**:
- Liên hệ sàn/ĐVVC kiểm tra
- Tạo ticket hỗ trợ

---

### 1.8 FAILED_DELIVERY_HIGH - Tỷ lệ giao thất bại cao

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Shopee, Lazada, TikTok, Website, Social |
| **Metric** | % đơn giao thất bại |
| **Công thức** | `(failed_deliveries / total_deliveries) * 100` |
| **Ngưỡng Critical** | > 15% |
| **Ngưỡng Warning** | > 10% |

**Mô tả**: Tỷ lệ giao thất bại trong ngày cao bất thường.

**Hành động đề xuất**:
- Phân tích nguyên nhân
- Cải thiện thông tin liên hệ KH
- Đổi ĐVVC cho vùng có vấn đề

---

## 📦 Nhóm 2: TỒN KHO & HÀNG HÓA

### 2.1 STOCKOUT_IMMINENT - Sắp hết hàng

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Tất cả kênh |
| **Metric** | Số ngày tồn kho còn lại |
| **Công thức** | `current_stock / avg_daily_sales` |
| **Ngưỡng Critical** | < 3 ngày |
| **Ngưỡng Warning** | < 7 ngày |

**Mô tả**: Tồn kho thấp hơn số ngày dự trữ an toàn.

**Hành động đề xuất**:
- Đặt hàng NCC ngay
- Tạm ẩn sản phẩm nếu không kịp nhập

---

### 2.2 INVENTORY_SYNC_MISMATCH - Tồn kho lệch giữa các kênh

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | Số lượng chênh lệch |
| **Công thức** | `ABS(system_stock - platform_stock)` |
| **Ngưỡng Critical** | > 10 sản phẩm |
| **Ngưỡng Warning** | > 5 sản phẩm |

**Mô tả**: Số liệu tồn kho khác nhau giữa sàn và hệ thống.

**Hành động đề xuất**:
- Đồng bộ lại tồn kho ngay
- Kiểm tra log sync

---

### 2.3 DEAD_STOCK_30_DAYS - Hàng tồn không bán

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Tất cả kênh |
| **Metric** | Số ngày không bán được |
| **Công thức** | `NOW() - last_sale_date` |
| **Ngưỡng Critical** | > 60 ngày |
| **Ngưỡng Warning** | > 30 ngày |

**Mô tả**: SKU không có giao dịch trong thời gian dài.

**Hành động đề xuất**:
- Chạy promotion thanh lý
- Combo với SP bán chạy
- Điều chuyển sang kênh khác

---

### 2.4 OVERSTOCK_WARNING - Tồn quá mức

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Tất cả kênh |
| **Metric** | Số ngày tồn kho |
| **Công thức** | `current_stock / avg_daily_sales` |
| **Ngưỡng Critical** | > 120 ngày |
| **Ngưỡng Warning** | > 90 ngày |

**Mô tả**: Tồn kho vượt quá nhu cầu dự kiến, có nguy cơ ứ vốn.

**Hành động đề xuất**:
- Giảm đơn hàng NCC
- Tăng promotion
- Điều chuyển kênh

---

### 2.5 EXPIRY_APPROACHING - Hàng gần hết date

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | POS, Website |
| **Metric** | Số ngày còn lại đến HSD |
| **Công thức** | `expiry_date - NOW()` |
| **Ngưỡng Critical** | < 15 ngày |
| **Ngưỡng Warning** | < 30 ngày |

**Mô tả**: Sản phẩm sắp hết hạn sử dụng.

**Hành động đề xuất**:
- Ưu tiên xuất trước (FEFO)
- Chạy flash sale
- Donate nếu còn ít

---

### 2.6 NEGATIVE_STOCK - Tồn kho âm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Tất cả kênh |
| **Metric** | Số lượng tồn kho |
| **Công thức** | `current_stock` |
| **Ngưỡng Critical** | < 0 |
| **Ngưỡng Warning** | < 0 |

**Mô tả**: Số lượng tồn âm (lỗi dữ liệu).

**Hành động đề xuất**:
- Kiểm tra lịch sử giao dịch
- Điều chỉnh tồn kho
- Fix nguyên nhân gốc

---

### 2.7 REORDER_POINT_HIT - Đến điểm đặt hàng

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔵 Info |
| **Áp dụng** | Tất cả kênh |
| **Metric** | Chênh lệch với điểm đặt hàng |
| **Công thức** | `current_stock - reorder_point` |
| **Ngưỡng Critical** | < -10 |
| **Ngưỡng Warning** | ≤ 0 |

**Mô tả**: Tồn kho chạm mức cần đặt NCC.

**Hành động đề xuất**:
- Tạo PO cho NCC
- Kiểm tra lead time

---

### 2.8 SLOW_MOVING_TO_FAST - Hàng chậm bán đột ngột tăng

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔵 Info |
| **Áp dụng** | Tất cả kênh |
| **Metric** | % thay đổi tốc độ bán |
| **Công thức** | `(current_velocity / previous_velocity) * 100` |
| **Ngưỡng Critical** | > 500% |
| **Ngưỡng Warning** | > 300% |

**Mô tả**: SKU slow-moving có tốc độ bán tăng mạnh.

**Hành động đề xuất**:
- Tăng tồn kho cho SP này
- Phân tích nguyên nhân để nhân rộng

---

## 💰 Nhóm 3: DOANH THU & BIÊN LỢI NHUẬN

### 3.1 REVENUE_DROP_DAILY - Doanh thu ngày giảm mạnh

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Tất cả kênh |
| **Metric** | % thay đổi doanh thu |
| **Công thức** | `((today - same_day_last_week) / same_day_last_week) * 100` |
| **Ngưỡng Critical** | < -50% |
| **Ngưỡng Warning** | < -30% |

**Mô tả**: Doanh thu giảm so với cùng ngày tuần trước.

**Hành động đề xuất**:
- Phân tích traffic và conversion
- Kiểm tra vấn đề kỹ thuật
- Tăng promotion

---

### 3.2 MARGIN_NEGATIVE - Biên lợi nhuận âm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Tất cả kênh |
| **Metric** | % biên lợi nhuận gộp |
| **Công thức** | `((selling_price - cost - fees) / selling_price) * 100` |
| **Ngưỡng Critical** | < -5% |
| **Ngưỡng Warning** | < 0% |

**Mô tả**: Sản phẩm hoặc đơn hàng có margin âm.

**Hành động đề xuất**:
- Điều chỉnh giá bán
- Giảm chi phí
- Ngừng bán nếu không cải thiện

---

### 3.3 DISCOUNT_ABUSE - Lạm dụng khuyến mãi

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Website, Social |
| **Metric** | Số lần sử dụng voucher |
| **Công thức** | `COUNT(voucher_used) GROUP BY customer` |
| **Ngưỡng Critical** | > 10 lần |
| **Ngưỡng Warning** | > 5 lần |

**Mô tả**: Khách dùng quá nhiều mã giảm giá.

**Hành động đề xuất**:
- Block tài khoản khả nghi
- Điều chỉnh điều kiện voucher

---

### 3.4 AOV_DROP - Giá trị đơn TB giảm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Tất cả kênh |
| **Metric** | % thay đổi AOV |
| **Công thức** | `((current_aov - prev_aov) / prev_aov) * 100` |
| **Ngưỡng Critical** | < -25% |
| **Ngưỡng Warning** | < -15% |

**Mô tả**: AOV (Average Order Value) giảm trong tuần.

**Hành động đề xuất**:
- Thiết kế bundle/combo
- Tăng free shipping threshold
- Upsell SP bổ sung

---

### 3.5 PROMOTION_OVERSPEND - Chi phí KM vượt ngân sách

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Tất cả kênh |
| **Metric** | % sử dụng ngân sách KM |
| **Công thức** | `(actual_cost / budget) * 100` |
| **Ngưỡng Critical** | > 130% |
| **Ngưỡng Warning** | > 110% |

**Mô tả**: Chi phí promotion vượt budget kế hoạch.

**Hành động đề xuất**:
- Tạm dừng/giảm khuyến mãi
- Review hiệu quả campaign

---

### 3.6 PLATFORM_FEE_INCREASE - Phí sàn tăng

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔵 Info |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | % thay đổi phí sàn |
| **Công thức** | `((current_fee - prev_fee) / prev_fee) * 100` |
| **Ngưỡng Critical** | > 20% |
| **Ngưỡng Warning** | > 10% |

**Mô tả**: Phí commission sàn tăng bất thường.

**Hành động đề xuất**:
- Cập nhật pricing strategy
- Tính lại margin
- Cân nhắc tăng giá

---

### 3.7 CHANNEL_REVENUE_IMBALANCE - Doanh thu lệch kênh

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Tất cả kênh |
| **Metric** | % doanh thu của kênh |
| **Công thức** | `(channel_revenue / total_revenue) * 100` |
| **Ngưỡng Critical** | > 80% |
| **Ngưỡng Warning** | > 70% |

**Mô tả**: Một kênh chiếm tỷ trọng quá cao trong tổng doanh thu.

**Hành động đề xuất**:
- Đầu tư phát triển kênh khác
- Đa dạng hóa nguồn doanh thu

---

### 3.8 CASH_FLOW_WARNING - Dòng tiền căng

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Tất cả kênh |
| **Metric** | Số ngày tiền mặt đủ cover |
| **Công thức** | `current_cash / avg_daily_expenses` |
| **Ngưỡng Critical** | < 3 ngày |
| **Ngưỡng Warning** | < 7 ngày |

**Mô tả**: Tiền mặt thấp hơn chi phí dự kiến.

**Hành động đề xuất**:
- Thu hồi công nợ gấp
- Đàm phán giãn thanh toán NCC
- Vay ngắn hạn

---

## ⭐ Nhóm 4: CHẤT LƯỢNG DỊCH VỤ

### 4.1 NEGATIVE_REVIEW_SPIKE - Đánh giá xấu tăng

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | % tăng đánh giá xấu |
| **Công thức** | `((this_week - last_week) / last_week) * 100` |
| **Ngưỡng Critical** | > 100% |
| **Ngưỡng Warning** | > 50% |

**Mô tả**: Đánh giá 1-2 sao tăng mạnh trong tuần.

**Hành động đề xuất**:
- Phân tích nội dung đánh giá
- Liên hệ KH xin feedback
- Cải thiện SP/DV

---

### 4.2 RESPONSE_TIME_SLOW - Phản hồi chat chậm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Shopee, Lazada, TikTok, Social |
| **Metric** | Phút phản hồi trung bình |
| **Công thức** | `AVG(first_response_time - message_received_time)` |
| **Ngưỡng Critical** | > 30 phút |
| **Ngưỡng Warning** | > 15 phút |

**Mô tả**: Thời gian phản hồi TB quá lâu.

**Hành động đề xuất**:
- Tăng nhân sự CSKH
- Sử dụng chatbot
- Set up auto-reply

---

### 4.3 COMPLAINT_PENDING - Khiếu nại chưa xử lý

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Tất cả kênh |
| **Metric** | Số giờ chưa xử lý |
| **Công thức** | `NOW() - ticket_created_at` |
| **Ngưỡng Critical** | > 72 giờ |
| **Ngưỡng Warning** | > 48 giờ |

**Mô tả**: Ticket mở quá lâu chưa giải quyết.

**Hành động đề xuất**:
- Ưu tiên xử lý ngay
- Escalate lên cấp cao hơn

---

### 4.4 REFUND_RATE_HIGH - Tỷ lệ hoàn tiền cao

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Tất cả kênh |
| **Metric** | % đơn hoàn tiền |
| **Công thức** | `(refunded_orders / total_orders) * 100` |
| **Ngưỡng Critical** | > 10% |
| **Ngưỡng Warning** | > 5% |

**Mô tả**: Tỷ lệ refund cao trong tuần.

**Hành động đề xuất**:
- Phân tích nguyên nhân
- Cải thiện mô tả SP
- Tăng QC trước khi gửi

---

### 4.5 PRODUCT_QUALITY_ISSUE - Lỗi chất lượng sản phẩm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Tất cả kênh |
| **Metric** | Số khiếu nại chất lượng |
| **Công thức** | `COUNT(complaints) WHERE type = quality GROUP BY sku` |
| **Ngưỡng Critical** | > 5 khiếu nại |
| **Ngưỡng Warning** | > 3 khiếu nại |

**Mô tả**: Nhiều khiếu nại cùng 1 SKU về chất lượng.

**Hành động đề xuất**:
- Tạm dừng bán SP
- Kiểm tra lô hàng
- Liên hệ NCC
- Thu hồi nếu nghiêm trọng

---

### 4.6 STORE_RATING_DROP - Điểm shop giảm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | Điểm đánh giá shop |
| **Công thức** | `current_store_rating` |
| **Ngưỡng Critical** | < 4.0 sao |
| **Ngưỡng Warning** | < 4.5 sao |

**Mô tả**: Rating shop dưới ngưỡng yêu cầu sàn.

**Hành động đề xuất**:
- Cải thiện các chỉ số ảnh hưởng rating
- Follow-up KH đánh giá tốt

---

### 4.7 PENALTY_WARNING - Cảnh báo vi phạm sàn

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | Số vi phạm đang hoạt động |
| **Công thức** | `COUNT(penalties) WHERE status = active` |
| **Ngưỡng Critical** | > 1 |
| **Ngưỡng Warning** | > 0 |

**Mô tả**: Shop nhận cảnh cáo/phạt từ sàn.

**Hành động đề xuất**:
- Đọc kỹ nội dung vi phạm
- Khắc phục ngay
- Gửi khiếu nại nếu bị oan

---

## ⚙️ Nhóm 5: VẬN HÀNH - SÀN TMĐT

### 5.1 PLATFORM_API_SYNC_FAILED - Lỗi đồng bộ sàn

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | Phút từ lần sync cuối |
| **Công thức** | `NOW() - last_successful_sync` |
| **Ngưỡng Critical** | > 60 phút |
| **Ngưỡng Warning** | > 30 phút |

**Mô tả**: API kết nối sàn bị lỗi quá lâu.

**Hành động đề xuất**:
- Kiểm tra API credentials
- Retry sync
- Liên hệ support sàn

---

### 5.2 FLASH_SALE_STOCK_LOW - Hết hàng Flash Sale

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | % hàng Flash Sale còn lại |
| **Công thức** | `(remaining / initial) * 100` |
| **Ngưỡng Critical** | < 5% |
| **Ngưỡng Warning** | < 10% |

**Mô tả**: Tồn kho Flash Sale còn ít.

**Hành động đề xuất**:
- Bổ sung stock nếu còn thời gian
- Chuẩn bị communication

---

### 5.3 LISTING_DEACTIVATED - Sản phẩm bị ẩn

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | Số SP bị ẩn |
| **Công thức** | `COUNT(listings) WHERE status = deactivated` |
| **Ngưỡng Critical** | > 5 |
| **Ngưỡng Warning** | > 1 |

**Mô tả**: SP bị sàn ẩn do vi phạm/hết hàng.

**Hành động đề xuất**:
- Kiểm tra nguyên nhân
- Cập nhật stock hoặc sửa vi phạm

---

### 5.4 CAMPAIGN_ENDING_SOON - Campaign sắp kết thúc

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔵 Info |
| **Áp dụng** | Shopee, Lazada, TikTok |
| **Metric** | Số giờ còn lại |
| **Công thức** | `campaign_end_time - NOW()` |
| **Ngưỡng Critical** | < 6 giờ |
| **Ngưỡng Warning** | < 24 giờ |

**Mô tả**: Chương trình KM còn ít thời gian.

**Hành động đề xuất**:
- Communication push cuối
- Review kết quả để plan tiếp

---

## 🌐 Nhóm 6: VẬN HÀNH - WEBSITE/APP

### 6.1 CART_ABANDON_HIGH - Bỏ giỏ hàng cao

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Website |
| **Metric** | % bỏ giỏ hàng |
| **Công thức** | `(abandoned / total_carts) * 100` |
| **Ngưỡng Critical** | > 85% |
| **Ngưỡng Warning** | > 75% |

**Mô tả**: Tỷ lệ abandon cart cao.

**Hành động đề xuất**:
- Tối ưu checkout flow
- Thêm trust signals
- Set up abandon cart email

---

### 6.2 CHECKOUT_FAILURE - Lỗi thanh toán

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | Website |
| **Metric** | % checkout thất bại |
| **Công thức** | `(failed / total_checkouts) * 100` |
| **Ngưỡng Critical** | > 10% |
| **Ngưỡng Warning** | > 5% |

**Mô tả**: Tỷ lệ checkout thất bại cao.

**Hành động đề xuất**:
- Kiểm tra payment gateway
- Test các phương thức
- Liên hệ provider

---

### 6.3 TRAFFIC_SPIKE - Traffic đột biến

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔵 Info |
| **Áp dụng** | Website |
| **Metric** | % tăng traffic |
| **Công thức** | `(current_hour / avg_hourly) * 100` |
| **Ngưỡng Critical** | > 300% |
| **Ngưỡng Warning** | > 200% |

**Mô tả**: Lượng truy cập tăng mạnh bất thường.

**Hành động đề xuất**:
- Kiểm tra server capacity
- Scale up nếu cần
- Tận dụng cơ hội convert

---

### 6.4 PAGE_LOAD_SLOW - Website chậm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Website |
| **Metric** | Thời gian tải trang (giây) |
| **Công thức** | `AVG(page_load_time)` |
| **Ngưỡng Critical** | > 5 giây |
| **Ngưỡng Warning** | > 3 giây |

**Mô tả**: Page load quá lâu.

**Hành động đề xuất**:
- Optimize images
- Enable caching
- Check server performance

---

## 🏪 Nhóm 7: VẬN HÀNH - CỬA HÀNG VẬT LÝ

### 7.1 STORE_NO_SALES_2H - Cửa hàng không có đơn

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | POS |
| **Metric** | Số giờ không có đơn |
| **Công thức** | `NOW() - last_pos_transaction_time` |
| **Ngưỡng Critical** | > 4 giờ |
| **Ngưỡng Warning** | > 2 giờ |

**Mô tả**: Không ghi nhận giao dịch trong thời gian dài.

**Hành động đề xuất**:
- Kiểm tra POS có hoạt động
- Liên hệ nhân viên cửa hàng

---

### 7.2 POS_OFFLINE - POS mất kết nối

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🔴 Critical |
| **Áp dụng** | POS |
| **Metric** | Phút mất kết nối |
| **Công thức** | `NOW() - last_heartbeat` |
| **Ngưỡng Critical** | > 30 phút |
| **Ngưỡng Warning** | > 15 phút |

**Mô tả**: Thiết bị POS offline quá lâu.

**Hành động đề xuất**:
- Kiểm tra mạng tại cửa hàng
- Restart thiết bị
- Chế độ offline nếu cần

---

### 7.3 CASH_DISCREPANCY - Chênh lệch tiền mặt

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | POS |
| **Metric** | Số tiền chênh lệch |
| **Công thức** | `ABS(counted_cash - system_cash)` |
| **Ngưỡng Critical** | > 500,000 VNĐ |
| **Ngưỡng Warning** | > 100,000 VNĐ |

**Mô tả**: Tiền kiểm đếm khác hệ thống.

**Hành động đề xuất**:
- Kiểm tra lại giao dịch
- Đối chiếu hóa đơn
- Báo cáo nếu chênh lệch lớn

---

### 7.4 STORE_INVENTORY_LOW - Tồn tại điểm thấp

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | POS |
| **Metric** | Số lượng còn tại cửa hàng |
| **Công thức** | `store_stock WHERE is_top_seller = true` |
| **Ngưỡng Critical** | < 2 sản phẩm |
| **Ngưỡng Warning** | < 5 sản phẩm |

**Mô tả**: SKU top-seller còn ít tại cửa hàng.

**Hành động đề xuất**:
- Điều chuyển từ kho
- Đặt hàng bổ sung

---

## 📱 Nhóm 8: VẬN HÀNH - SOCIAL COMMERCE

### 8.1 MESSAGE_UNANSWERED - Tin nhắn chưa trả lời

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Social |
| **Metric** | Phút chưa trả lời |
| **Công thức** | `NOW() - message_received_at` |
| **Ngưỡng Critical** | > 60 phút |
| **Ngưỡng Warning** | > 30 phút |

**Mô tả**: Tin nhắn chưa phản hồi quá lâu.

**Hành động đề xuất**:
- Phản hồi ngay
- Set up auto-reply ngoài giờ

---

### 8.2 LIVE_SALE_ORDER_SURGE - Đơn live tăng vọt

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Social |
| **Metric** | Số đơn live/giờ |
| **Công thức** | `COUNT(orders) WHERE source = livestream AND created_at > NOW() - 1 hour` |
| **Ngưỡng Critical** | > 200 đơn |
| **Ngưỡng Warning** | > 100 đơn |

**Mô tả**: Đơn từ livestream vượt capacity xử lý.

**Hành động đề xuất**:
- Tăng nhân sự nhận đơn
- Chuẩn bị inventory
- Thông báo KH về thời gian xử lý

---

### 8.3 SOCIAL_MENTION_NEGATIVE - Mention tiêu cực

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Áp dụng** | Social |
| **Metric** | Số mention tiêu cực |
| **Công thức** | `COUNT(mentions) WHERE sentiment = negative` |
| **Ngưỡng Critical** | > 5 mentions |
| **Ngưỡng Warning** | > 1 mention |

**Mô tả**: Phát hiện bài viết/comment tiêu cực.

**Hành động đề xuất**:
- Phản hồi chuyên nghiệp
- Xử lý vấn đề KH
- Escalate nếu viral risk

---

## 📊 Nhóm 9: BUSINESS & CHIẾN LƯỢC

### 9.1 CATEGORY_UNDERPERFORMING - Danh mục SP kém hiệu quả

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Metric** | % tăng trưởng category |
| **Công thức** | `category_growth_rate vs avg_category_growth_rate` |
| **Ngưỡng Critical** | < -20% |
| **Ngưỡng Warning** | < -10% |

**Hành động đề xuất**:
- Review product mix
- Promotion cho category

---

### 9.2 CHANNEL_UNPROFITABLE - Kênh bán không sinh lời

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Metric** | % margin kênh |
| **Công thức** | `(Revenue - COGS - Channel Fees) / Revenue × 100` |
| **Ngưỡng Critical** | < 0% |
| **Ngưỡng Warning** | < 5% |

**Hành động đề xuất**:
- Review fee structure
- Điều chỉnh giá bán

---

### 9.3 MARKET_SHARE_CHANGE - Thị phần thay đổi

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Metric** | Thay đổi thị phần |
| **Công thức** | `our_sales / total_market_sales × 100` |
| **Ngưỡng Critical** | < -15 điểm % |
| **Ngưỡng Warning** | < -8 điểm % |

**Hành động đề xuất**:
- Phân tích đối thủ
- Điều chỉnh chiến lược giá

---

### 9.4 SEASONAL_PREPARATION - Chuẩn bị mùa cao điểm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Metric** | Tỷ lệ demand/stock |
| **Công thức** | `forecast_demand_next_30_days / current_stock` |
| **Ngưỡng Critical** | > 3x |
| **Ngưỡng Warning** | > 2x |

**Hành động đề xuất**:
- Đặt hàng thêm từ NCC
- Tăng nhân sự
- Chuẩn bị marketing

---

## 💵 Nhóm 10: DÒNG TIỀN (CASHFLOW)

### 10.1 AR_COLLECTION_RATE_LOW - Tỷ lệ thu hồi AR thấp

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Metric** | % thu hồi AR |
| **Công thức** | `collected_amount / total_ar_due × 100` |
| **Ngưỡng Critical** | < 60% |
| **Ngưỡng Warning** | < 75% |

**Hành động đề xuất**:
- Tăng cường nhắc nhở thanh toán
- Review credit terms

---

### 10.2 CASH_INFLOW_VELOCITY_DROP - Dòng tiền vào giảm

| Thuộc tính | Giá trị |
|------------|---------|
| **Mức độ** | 🟡 Warning |
| **Metric** | % thay đổi dòng tiền vào |
| **Công thức** | `(current_week_inflow - avg_weekly_inflow) / avg_weekly_inflow × 100` |
| **Ngưỡng Critical** | < -40% |
| **Ngưỡng Warning** | < -25% |

**Hành động đề xuất**:
- Kiểm tra AR collection
- Liên hệ khách hàng chậm thanh toán
- Review quy trình thu tiền

---

## 📈 Tổng kết

| Nhóm | Số Rules | Critical | Warning | Info |
|------|----------|----------|---------|------|
| Fulfillment | 8 | 3 | 5 | 0 |
| Tồn kho | 8 | 3 | 3 | 2 |
| Doanh thu | 8 | 2 | 5 | 1 |
| Chất lượng DV | 7 | 4 | 3 | 0 |
| Vận hành TMĐT | 4 | 1 | 2 | 1 |
| Vận hành Website | 4 | 1 | 2 | 1 |
| Cửa hàng | 4 | 1 | 3 | 0 |
| Social Commerce | 3 | 0 | 3 | 0 |
| Business | 4 | 0 | 4 | 0 |
| Cashflow | 2+ | 0 | 2+ | 0 |
| **Tổng** | **47+** | **15** | **32** | **5** |

---

## 🔧 Hướng dẫn cấu hình

### Bật/Tắt Rule
1. Vào **Control Tower > KPI Rules**
2. Tìm rule cần cấu hình
3. Toggle switch để bật/tắt

### Điều chỉnh ngưỡng
1. Click vào rule cần chỉnh
2. Mở panel **Chỉnh tham số**
3. Thay đổi giá trị Critical/Warning
4. Lưu thay đổi

### Thêm người nhận thông báo
1. Vào tab **Người nhận**
2. Click **Thêm người nhận**
3. Điền thông tin (Email, Điện thoại, Slack)
4. Chọn vai trò và loại thông báo

---

## 📞 Liên hệ hỗ trợ

Nếu cần tùy chỉnh thêm rule hoặc có câu hỏi, liên hệ:
- Email: support@controltower.vn
- Slack: #control-tower-support

---

*Tài liệu cập nhật: Tháng 01/2026*
