

## Revenue Forecast — Plan v2 (Cohort-based)

### Thay đổi chính so với Plan v1

Thay vì dùng công thức tổng quát, **doanh thu khách cũ được tính chi tiết từ cohort analysis** — mỗi cohort (theo tháng acquisition) có tỷ lệ quay lại riêng, từ đó dự báo chính xác hơn và dễ giải thích kết quả.

---

### Phương pháp tính toán

#### A. Doanh thu khách cũ (Cohort-based)

Hệ thống đã có view `v_cdp_ltv_by_cohort` chứa:
- `cohort_month`: tháng acquisition
- `cohort_size`: số khách trong cohort
- `retention_rate_3m / 6m / 12m`: tỷ lệ quay lại
- `avg_revenue`: doanh thu TB/khách

**Logic forecast:**

```text
Với mỗi cohort đã tồn tại:
  age = số tháng từ cohort_month đến tháng forecast
  
  Tính retention_at_age dựa trên decay curve:
    - Nếu age ≤ 3: nội suy từ retention_3m
    - Nếu age ≤ 6: nội suy retention_3m → retention_6m  
    - Nếu age ≤ 12: nội suy retention_6m → retention_12m
    - Nếu age > 12: external decay (retention_12m × 0.85^(age-12)/12)
  
  Doanh thu cohort tháng X = cohort_size × retention_at_age × avg_monthly_revenue

Tổng doanh thu khách cũ = SUM(tất cả cohort)
```

Kết quả: bảng chi tiết "Cohort tháng 1/2025: 500 khách, 35% quay lại = 175 khách × 850k = 148M"

#### B. Doanh thu khách mới

```text
New_customers/tháng = trend 3 tháng gần nhất (từ cdp_orders)
Revenue_new = new_customers × AOV_first_order
```

#### C. Doanh thu từ Ads

```text
Ads_revenue = ads_spend × ROAS
```
(ROAS lấy từ `central_metrics_snapshots.marketing_roas`, cho phép override)

#### D. Tổng forecast

```text
Revenue_month[i] = Returning_cohort_revenue + New_customer_revenue + Ads_revenue
                   × seasonal_factor × (1 + manual_growth_adj)
```

3 scenarios: Conservative (×0.85), Base (×1.0), Optimistic (×1.15)

---

### Cấu trúc triển khai

#### 1. Database — RPC `forecast_revenue_cohort_based`

- Input: `p_tenant_id`, `p_horizon_months` (1/3/6), `p_ads_spend`, `p_roas_override`, `p_growth_adj`
- Logic:
  1. Query `v_cdp_ltv_by_cohort` → lấy tất cả cohort
  2. Query `cdp_orders` → tính new customer trend (3 tháng gần), AOV first-order
  3. Loop từng tháng forecast → tính retention mỗi cohort → sum
  4. Cộng new + ads
- Output: `JSONB[]` gồm `{ month, returning_revenue, returning_breakdown[], new_revenue, new_customers, ads_revenue, total_conservative, total_base, total_optimistic }`

#### 2. Frontend

| Component | Mô tả |
|-----------|-------|
| `RevenueForecastPage.tsx` | Trang chính, layout + orchestration |
| `ForecastInputPanel.tsx` | Inputs: horizon (1/3/6 tháng), ads spend, ROAS, growth adj, seasonal toggle |
| `ForecastSummaryCards.tsx` | KPI cards: tổng doanh thu dự báo, % từ khách cũ/mới/ads |
| `ForecastChart.tsx` | Bar chart theo tháng, stacked (returning/new/ads) + 3 scenario lines |
| `CohortBreakdownTable.tsx` | **Bảng chi tiết cohort**: mỗi row = 1 cohort, cột = tháng forecast, cell = doanh thu dự kiến |
| `useRevenueForecast.ts` | Hook gọi RPC |

#### 3. Navigation

Thêm vào section "PHÂN TÍCH" trong `fdpNavConfig.ts`:
```
{ id: 'revenue-forecast', label: 'Dự báo doanh thu', href: '/revenue-forecast' }
```

### Files cần tạo/sửa

| File | Action |
|------|--------|
| Migration SQL | RPC `forecast_revenue_cohort_based` |
| `src/pages/RevenueForecastPage.tsx` | Tạo mới |
| `src/hooks/useRevenueForecast.ts` | Tạo mới |
| `src/components/revenue-forecast/*.tsx` | 4-5 components mới |
| `src/components/layout/fdpNavConfig.ts` | Thêm menu item |
| `src/App.tsx` | Thêm route |

### Điểm khác biệt chính vs Plan v1

- **Cohort-level detail**: Không chỉ 1 con số "doanh thu khách cũ" mà chi tiết từng cohort quay lại bao nhiêu
- **Giải thích được**: "Cohort T1/2025 có 35% retention → dự kiến 148M" thay vì black-box
- **Dữ liệu sẵn có**: Tận dụng `v_cdp_ltv_by_cohort` đã có retention 3m/6m/12m
- **Decay curve thực tế**: Dùng retention thực của từng cohort thay vì 1 tỷ lệ chung

