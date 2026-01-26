# E2E TEST EXPECTED VALUES - ALL SCREENS
## Tenant: E2E Test Company
## Tenant ID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
## Data Period: 2025-01 → 2026-12 (sau khi shift +2 years)

---

# 📊 TỔNG QUAN DATA TEST

| Metric | Value | Notes |
|--------|-------|-------|
| Total Orders | 5,500 | Across all channels |
| Unique Customers | 500 | With computed equity |
| Active Customers (in orders) | 300 | Customers with orders |
| Total Products | 100 | 5 categories |
| Total Net Revenue | ₫2,346,175,150 | ~2.35B VND |
| Total COGS | ₫1,243,472,830 | 53% of revenue |
| Total Gross Margin | ₫1,005,543,985 | 43% |
| Avg Order Value | ₫426,577 | ~427K VND |
| Total Equity 12M | ₫1,227,758,419 | ~1.23B VND |
| Total Equity 24M | ₫1,825,614,700 | ~1.83B VND |

---

# 🛍️ CDP - CUSTOMER DATA PLATFORM

## /cdp - Tổng quan CDP

### CustomerEquitySnapshot Component
| Metric | Expected Value | Format |
|--------|---------------|--------|
| Tổng Equity (12 tháng) | ₫1.2B | formatCurrency |
| Tổng Equity (24 tháng) | ₫1.8B | formatCurrency + "(Dự báo)" |
| Giá trị Rủi ro | ₫98M | ~98.4M VND (high risk) |
| % Rủi ro | ~8.0% | at_risk / total_equity |

### ActiveCustomersCard
| Metric | Expected Value |
|--------|---------------|
| Khách hàng có đơn | 300 |
| Tổng khách hàng | 500 |

### DataQualityCard
| Metric | Expected Value |
|--------|---------------|
| Đơn hàng đã sync | 5,500 |
| Nguồn kết nối | 4 (Shopee, Lazada, TikTok, Website) |

---

## /cdp/explore - Khám phá Khách hàng

### Customer Research Table
| Metric | Expected Value |
|--------|---------------|
| Total rows | 300 (customers with orders) |
| Columns shown | Name, Orders, Revenue, AOV, Last Order |

### Filter Results
| Filter | Expected Count |
|--------|---------------|
| All customers | 300 |
| High value (>5M revenue) | ~50-80 |
| At risk (no order >90d) | ~100 |

---

## /cdp/ltv-engine - Giá trị Khách hàng (LTV Engine)

### Overview Tab
| Metric | Expected Value | Notes |
|--------|---------------|-------|
| Total CLV | ₫2.35B | Net Revenue all-time |
| Realized Revenue | ₫2.35B | From cdp_orders |
| Remaining Potential | ₫1.23B | equity_12m |
| CLV per Customer | ₫4.69M | 2.35B / 500 |
| Equity per Customer | ₫2.46M | avg_equity_12m |

### By Risk Level
| Risk Level | Count | Equity 12M | Avg Equity |
|------------|-------|-----------|------------|
| Low | 100 | ₫826M | ₫8.26M |
| Medium | 150 | ₫303M | ₫2.02M |
| High | 250 | ₫98M | ₫394K |

### Equity Distribution Buckets
| Bucket | Expected Count |
|--------|---------------|
| 0-1M | ~150 (high risk) |
| 1-5M | ~200 (medium) |
| 5-10M+ | ~150 (low risk) |

---

## /cdp/populations - Tập Khách hàng

### Expected Populations (if auto-created)
| Population | Expected Count | Revenue Share |
|------------|---------------|---------------|
| Top 10% Value | 50 | ~40-50% |
| Top 20% Value | 100 | ~60-70% |
| At Risk | 250 | ~15-20% |
| New Customers | ~50 | ~5-10% |

---

## /cdp/confidence - Độ tin cậy Dữ liệu

### Data Quality Metrics
| Metric | Expected Value |
|--------|---------------|
| Total Orders | 5,500 |
| Connected Sources | 4 |
| Data Freshness | Recent (based on order dates) |
| Quality Score | 70-90% (depending on sync) |

---

# 💰 FDP - FINANCIAL DATA PLATFORM

## /dashboard - CFO Dashboard

### Key Metrics (Period: Current Month)
| Metric | Expected Range | Notes |
|--------|---------------|-------|
| Net Revenue | ₫150-220M | Monthly varies |
| COGS | ~53% of revenue | Locked ratio |
| Gross Margin | ~47% | 100% - 53% |
| Platform Fees | ~4.5% | Locked ratio |

### Revenue by Channel
| Channel | Revenue Share |
|---------|--------------|
| Shopee | 36.5% (~₫857M total) |
| Lazada | 26.2% (~₫614M total) |
| Website | 21.3% (~₫499M total) |
| TikTok Shop | 16.0% (~₫376M total) |

---

## /pl-report - P&L Report

### Annual Summary (2026)
| Line Item | Expected Value |
|-----------|---------------|
| Gross Revenue | ~₫1.55B (2026 data) |
| Net Revenue | ~₫1.40B |
| COGS (53%) | ~₫740M |
| Gross Profit | ~₫660M |
| Platform Fees (4.5%) | ~₫63M |
| Contribution Margin | ~₫597M |

---

## /cash-forecast - Cash Forecast

### Based on FDP Locked Costs
| Month | Marketing Spend | COGS | Fees |
|-------|----------------|------|------|
| 2026-12 | ₫17.9M | ₫119M | ₫10.1M |
| 2025-01 | ₫15.9M | ₫105M | ₫8.9M |
| (varies by month) | ... | ... | ... |

---

# 📈 MDP - MARKETING DATA PLATFORM

## /mdp/ceo - CEO Decision View

### Financial Truth Overlay
| Metric | Expected Value |
|--------|---------------|
| Marketing Spend (locked) | ~₫180M total |
| ROAS (Revenue) | ~13x (2.35B / 180M) |
| ROAS (Contribution) | ~6x (with COGS deducted) |

---

## /mdp/profit - Profit Attribution

### Channel Performance
| Channel | Orders | Revenue | Est. Contribution |
|---------|--------|---------|------------------|
| Shopee | 2,200 | ₫857M | ~₫400M |
| Lazada | 1,375 | ₫614M | ~₫290M |
| Website | 825 | ₫499M | ~₫235M |
| TikTok Shop | 1,100 | ₫376M | ~₫177M |

---

## /mdp/campaigns - Campaign Performance

### Expected Data (if campaigns created)
| Metric | Expected Range |
|--------|---------------|
| Active Campaigns | 0-5 (depends on setup) |
| Avg ROAS | 10-15x |
| CAC | ₫180,000 (from locked costs) |

---

# 🎯 CONTROL TOWER

## /control-tower/ceo - CEO Strategic View

### Priority Queue
| Metric | Expected Value |
|--------|---------------|
| Queue Items | 12 |
| Severity Distribution | Mixed critical/warning |

### Cross-Domain Alerts
| Metric | Expected Value |
|--------|---------------|
| Variance Alerts | 7 |
| Types | CDP, FDP, MDP related |

---

## /control-tower/coo - COO Execution View

### Task Queue
| Metric | Expected Value |
|--------|---------------|
| Open Tasks | Based on alerts |
| High Priority | ~3-5 |

---

## /control-tower/alerts - All Alerts

### Alert Summary
| Alert Type | Expected Count |
|------------|---------------|
| Cross-Domain Variance | 7 |
| Priority Queue | 12 |
| Total Active | ~15-20 |

---

# 🔗 CROSS-MODULE DATA

## FDP Locked Costs Summary
| Metric | Total (18 months) |
|--------|------------------|
| Total COGS | ₫1.24B |
| Total Platform Fees | ₫105M |
| Total Marketing | ₫158M |
| Avg COGS % | 53.0% |
| Avg Fee % | 4.5% |
| Avg CAC | ₫180,000 |

## CDP → MDP Data
| Table | Row Count |
|-------|----------|
| cdp_segment_ltv_for_mdp | 4 |
| cdp_customer_cohort_cac | 100 |

## Control Tower Aggregation
| Table | Row Count |
|-------|----------|
| cross_domain_variance_alerts | 7 |
| control_tower_priority_queue | 12 |

---

# 📋 VERIFICATION CHECKLIST

## Layer 0: Source Data ✅
- [ ] Products: 100 rows
- [ ] Connectors: 4 integrations
- [ ] Categories: 5 (Áo, Quần, Váy, Phụ kiện, Giày dép)

## Layer 1: CDP Sync ✅
- [ ] Customers: 500 rows
- [ ] Orders: 5,500 rows
- [ ] Net Revenue: ₫2.35B (±10%)
- [ ] COGS %: 53% (±2%)

## Layer 2: Computed ✅
- [ ] Equity Computed: 500 rows
- [ ] Equity 12M: ₫1.23B (±20%)
- [ ] Risk Distribution: Low/Medium/High

## Layer 3: Cross-Module ✅
- [ ] FDP Locked Costs: 18 months
- [ ] Segment LTV: 4 segments
- [ ] Cohort CAC: 100 records

## Layer 4: Control Tower ✅
- [ ] Variance Alerts: 7
- [ ] Priority Queue: 12

---

# 🧪 TOLERANCE THRESHOLDS

| Metric Type | Tolerance |
|-------------|-----------|
| Counts (exact) | 0% |
| Revenue/Costs | ±10% |
| Percentages | ±2% |
| Equity projections | ±20% |
| Queue items | Range (5-20) |

---

# 📅 DATA DATE REQUIREMENTS

**IMPORTANT**: Test data dates must be shifted to current period for views to work correctly.

```sql
-- Run this to shift dates forward
UPDATE cdp_orders 
SET order_at = order_at + INTERVAL '2 years'
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

UPDATE external_orders 
SET order_date = order_date + INTERVAL '2 years',
    paid_at = paid_at + INTERVAL '2 years'
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
```

After shifting, orders should span 2026-01 to 2026-12 (current year).
