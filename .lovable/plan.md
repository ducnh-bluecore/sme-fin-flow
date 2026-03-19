

## Tình trạng hiện tại

**Dữ liệu ads: Hoàn toàn trống.** Cả `ad_spend_daily` và `platform_ads_daily` (cả public và tenant_guno schema) đều có 0 rows. Chưa có data ads nào được sync vào hệ thống.

**Vấn đề logic hiện tại:**
- Doanh thu lịch sử trong `cdp_orders` **đã bao gồm** doanh thu từ ads (khách đến từ ads vẫn tạo đơn trong hệ thống).
- RPC `forecast_revenue_cohort_based` xử lý ads: khi `p_ads_spend = 0` → `ads_revenue = 0`, nhưng baseline (trend + LY-anchor) vẫn tính trên toàn bộ doanh thu lịch sử (đã bao gồm ads). → Dự báo thực chất đã "ngầm" bao gồm chi phí ads lịch sử.
- Khi user nhập ads spend → tính **thêm** `ads_revenue = spend × ROAS` → **double-count** phần ads.
- ROAS fallback = 3.0 (hardcoded) vì bảng `ad_spend_daily` trống.

---

## Giải pháp đề xuất

### Cách tiếp cận: "Baseline = Status Quo" + Giải thích minh bạch

Vì không có data ads chi tiết để tách organic vs paid, ta sẽ:

1. **Redefine ý nghĩa của input "Chi phí Ads"** từ "tổng chi phí ads" thành **"chi phí ads bổ sung so với mức hiện tại"** (delta).
2. **Tính chi phí ads trung bình lịch sử** từ `promotion_campaigns` hoặc ước lượng từ tỷ lệ industry benchmark, hiển thị cho user biết.
3. **Khi không có data ads**: Giải thích rõ ràng rằng baseline đã bao gồm hiệu quả ads lịch sử.

### Chi tiết thay đổi

#### 1. Cập nhật RPC `forecast_revenue_cohort_based`
- Thêm output field `historical_avg_ads_spend` — tính từ `ad_spend_daily` nếu có data, hoặc trả `null` nếu không có.
- Khi `ad_spend_daily` có data: Tính trung bình chi phí ads/tháng 3 tháng gần nhất, tr