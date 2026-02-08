

# Customer Equity Calculation - Practical Model

## Data hiện có

| Data | Rows | Coverage |
|------|------|----------|
| Orders (có customer_id, revenue > 0) | 93,159 | 34,974 customers |
| Orders có COGS | ~1,434 (linked to customer) | Rất thấp |
| 1-order customers | 20,311 (58%) | One-time buyers |
| 2-3 orders | 8,934 (26%) | Light repeaters |
| 4-10 orders | 4,613 (13%) | Regular |
| 10+ orders | 1,116 (3%) | Power buyers |

## Vấn đề: COGS coverage thấp ở customer level

Dù Phase 1 đã fix 89K orders, phần lớn orders có COGS lại thiếu `customer_id` (chưa link). Nên model equity KHÔNG nên phụ thuộc COGS ở customer level mà dùng **tenant-level average margin rate** làm proxy.

## Model đề xuất: RFM-Weighted Historical Projection

Nguyên tắc:
- Dùng data thật (revenue, frequency, recency) -- không giả lập
- Dùng tenant-level margin rate thay vì customer-level COGS (vì coverage thấp)
- Đánh dấu rõ `equity_is_estimated = true` + lý do

### Công thức

```text
Step 1: Tính RFM metrics cho mỗi customer
  - recency_days = NOW() - last_order_at
  - frequency_180d = orders trong 180 ngày gần nhất
  - monetary_180d = SUM(net_revenue) trong 180 ngày

Step 2: Tính retention probability (survival function)
  - p_active = EXP(-recency_days / avg_inter_purchase_days)
  - Nếu chỉ có 1 order: p_active = EXP(-recency_days / 180)

Step 3: Tính projected revenue
  - annual_run_rate = (monetary_180d / 180) * 365
  - Nếu monetary_180d = 0: dùng lifetime_aov * frequency_yearly_estimate
  - equity_12m = annual_run_rate * p_active * tenant_margin_rate
  - equity_24m = equity_12m * (1 + p_active) (giảm dần theo năm 2)

Step 4: Churn risk score
  - churn_risk = 1 - p_active
  - risk_level = 'low' (<0.3), 'medium' (0.3-0.7), 'high' (>0.7)
```

### Tenant margin rate

```text
tenant_margin_rate = SUM(gross_margin) / SUM(net_revenue) 
                     FROM cdp_orders WHERE cogs > 0
-- Dùng ~89K orders đã có COGS làm sample
-- Hiện tại: avg margin ~ 14.4% (833,739 / (833,739 + COGS))
```

## Implementation

### Migration: Create function `cdp_build_customer_equity_batched`

SQL function nhận `p_tenant_id` + `p_batch_size`, xử lý theo batch:

1. Tính `tenant_margin_rate` từ orders có COGS
2. Tính RFM metrics per customer từ `cdp_orders`
3. Tính `p_active`, `annual_run_rate`, `equity_12m`, `equity_24m`
4. UPSERT vào `cdp_customer_equity_computed`
5. Đánh dấu: `equity_is_estimated = true`, `equity_estimation_method = 'rfm_historical_projection_v1'`
6. Return JSON report (customers processed, avg equity, etc.)

### Batching strategy

- 34,974 customers, batch 5,000 mỗi lần
- 7 batches, mỗi batch ~3-5s
- Edge function `run-cogs-pipeline` gọi tuần tự

### Confidence scoring

```text
confidence = 
  base_score (30 nếu có >= 1 order)
  + frequency_bonus (0-25 dựa trên order count)
  + recency_bonus (0-25 dựa trên recency)
  + cogs_bonus (20 nếu customer có COGS data)
```

### Data quality flags

Mỗi customer có `data_quality_flags` JSONB:
- `has_cogs`: boolean
- `margin_source`: 'customer' | 'tenant_avg'
- `order_count`: number
- `data_span_days`: number

## Kết quả mong đợi

| Metric | Value |
|--------|-------|
| Customers computed | ~34,974 |
| Avg equity_12m (repeat buyers) | Actual projected margin |
| Avg equity_12m (one-time, churned) | ~0 (p_active gần 0) |
| Coverage | 100% customers có orders |
| Estimation method | rfm_historical_projection_v1 |

## Lưu ý quan trọng (FDP Manifesto)

- Model KHÔNG fake numbers -- customers inactive 2000+ ngày sẽ có equity gần 0 (đúng thực tế)
- Dùng `equity_is_estimated = true` cho tất cả (vì dùng tenant margin proxy)
- Khi customer-level COGS coverage tăng, model tự chuyển sang dùng customer margin
- 58% customers chỉ có 1 order, recency trung bình 2000+ ngày --> equity sẽ rất thấp (phản ánh đúng thực tế)

