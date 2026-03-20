

## Thêm dữ liệu thực tế (Actual Revenue) vào chế độ Backtest

### Bối cảnh
Khi chạy backtest, các tháng dự báo thực ra đã có dữ liệu thực tế trong `cdp_orders`. Cần hiển thị doanh thu thực bên cạnh dự báo để đánh giá độ chính xác.

### Kế hoạch

**1. Tạo RPC `get_actual_monthly_revenue`**
- Input: `p_tenant_id`, `p_months` (text array, e.g. `['2026-01', '2026-02']`)
- Output: `month`, `actual_revenue` (SUM of `gross_revenue` from `cdp_orders` grouped by month)
- Filter: delivered orders only (`status` in delivered/completed states), `SECURITY DEFINER`

**2. Tạo hook `useBacktestActuals`**
- Chỉ chạy khi `params.asOfDate` != null (chế độ backtest)
- Gọi RPC trên với danh sách tháng từ forecast data
- Trả về map `{ [month]: actual_revenue }`

**3. Cập nhật ForecastMonth interface**
- Thêm field optional `actual_revenue?: number` để merge vào data

**4. Cập nhật RevenueForecastPage**
- Merge actual data vào forecast data khi ở chế độ backtest

**5. Cập nhật ForecastSummaryCards**
- Thêm card "Accuracy" khi có actual data: hiển thị % sai lệch (MAPE)

**6. Cập nhật ForecastChart**
- Thêm line series "Thực tế" (màu đỏ, nét liền) trên chart khi backtest
- So sánh trực quan forecast vs actual

**7. Cập nhật CohortBreakdownTable**
- Thêm row "Thực tế" và row "Sai lệch %" ở cuối bảng khi backtest

### Kết quả
Khi bật backtest và chọn tháng, người dùng sẽ thấy:
- Cột/line "Thực tế" trên chart
- Card accuracy tổng hợp
- Row so sánh trong bảng cohort

