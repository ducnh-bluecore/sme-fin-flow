

## Implement L2 to L3 to L4 Pipeline (KPI Aggregation + Alert Detection)

### Hien trang

**Data da co o L2 Master Model:**
- cdp_orders: 1,144,132 records
- cdp_customers: 310,680 records
- ad_spend_daily: 449 records
- promotion_campaigns: 210,462 records

**Chua co:**
- Bang `kpi_facts_daily` chua ton tai trong database
- Chua co DB function `compute_kpi_facts_daily()` va `detect_threshold_breaches()`
- Chua co Edge Function nao de trigger pipeline nay

---

### Giai phap: Tao pipeline L2 --> L3 --> L4 hoan chinh

#### Buoc 1: Migration - Tao bang `kpi_facts_daily`

Tao bang voi cau truc phu hop cho BigQuery data (theo e2e test script 21):

| Column | Type | Mo ta |
|--------|------|-------|
| tenant_id | UUID | Tenant isolation |
| grain_date | DATE | Ngay aggregate |
| metric_code | TEXT | Ma metric (NET_REVENUE, ORDER_COUNT, AOV, AD_SPEND, ROAS, COGS, GROSS_MARGIN) |
| dimension_type | TEXT | Loai dimension (channel, total, campaign) |
| dimension_value | TEXT | Gia tri dimension (shopee, lazada, all_channels) |
| metric_value | NUMERIC | Gia tri metric |
| comparison_value | NUMERIC | Gia tri ngay truoc (de tinh % thay doi) |
| period_type | TEXT | daily / monthly |

- Unique constraint: `(tenant_id, grain_date, metric_code, dimension_type, dimension_value, period_type)`
- RLS enabled voi tenant isolation
- Index tren `(tenant_id, grain_date)` va `(tenant_id, metric_code)`

#### Buoc 2: DB Function `compute_kpi_facts_daily()`

Function nay aggregate tu nhieu bang L2:

**Tu cdp_orders:**
- NET_REVENUE: SUM(net_revenue) theo channel + total
- ORDER_COUNT: COUNT(*) theo channel + total
- AOV: AVG(net_revenue) theo channel + total
- COGS: SUM(cogs) theo channel
- GROSS_MARGIN: SUM(gross_margin) theo channel

**Tu ad_spend_daily:**
- AD_SPEND: SUM(expense) theo channel
- AD_IMPRESSIONS: SUM(impressions) theo channel
- AD_CLICKS: SUM(clicks) theo channel
- ROAS: SUM(direct_order_amount) / NULLIF(SUM(expense), 0) theo channel

**Tu cdp_customers:**
- NEW_CUSTOMERS: COUNT theo ngay dau tien mua hang

Tat ca deu co `comparison_value` = gia tri ngay hom truoc (dung LAG window function)

#### Buoc 3: DB Function `detect_threshold_breaches()`

Phat hien bat thuong tu kpi_facts_daily va ghi vao alert_instances:

- **Revenue Drop >20%**: severity high/critical, impact = so tien mat
- **Order Count Drop >30%**: severity high/critical
- **Low AOV <200K VND**: severity medium
- **Ad ROAS <2.0**: severity high (dang tot tien quang cao)
- **Ad Spend Spike >50%**: severity medium (chi tieu tang dot bien)

Moi alert co: title, message, impact_amount, suggested_action, severity

#### Buoc 4: Edge Function `compute-kpi-pipeline`

Tao Edge Function de trigger toan bo pipeline tu frontend/cron:
- Goi `compute_kpi_facts_daily()` cho khoang thoi gian chi dinh
- Goi `detect_threshold_breaches()` de phat hien alert
- Tra ve summary (so KPI facts tao, so alerts phat hien)
- Co the goi tu Admin UI hoac tu cron job

### Chi tiet ky thuat

**Files can tao/sua:**

1. `Migration SQL` - Tao bang kpi_facts_daily + 2 DB functions
2. `supabase/functions/compute-kpi-pipeline/index.ts` - Edge Function trigger pipeline
3. `supabase/config.toml` - Them config cho function moi (KHONG SUA, tu dong)

**KPI Metrics duoc aggregate (12 metrics):**

```text
TU CDP_ORDERS:
  NET_REVENUE    - Doanh thu thuan theo channel + total
  ORDER_COUNT    - So don hang theo channel + total
  AOV            - Gia tri don trung binh theo channel
  COGS           - Gia von hang ban theo channel
  GROSS_MARGIN   - Bien loi nhuan gop theo channel

TU AD_SPEND_DAILY:
  AD_SPEND       - Chi phi quang cao theo channel
  AD_IMPRESSIONS - Luot hien thi theo channel
  ROAS           - Return on Ad Spend theo channel

TU CDP_CUSTOMERS:
  NEW_CUSTOMERS  - Khach hang moi theo ngay

CROSS-TABLE (Orders + Ad Spend):
  CPA            - Cost per Acquisition
  MARKETING_RATIO - Ad Spend / Revenue %
```

**Alert Rules (5 loai):**

| Rule | Nguong | Severity | Category |
|------|--------|----------|----------|
| Revenue Drop | >20% DoD | high/critical | revenue |
| Order Drop | >30% DoD | high/critical | operations |
| Low AOV | <200K VND | medium | unit_economics |
| Low ROAS | <2.0 | high | marketing |
| Ad Spend Spike | >50% DoD | medium | marketing |

### Ket qua mong doi

- kpi_facts_daily: ~2,000-5,000 rows (150+ ngay x 5 channels x 12 metrics)
- alert_instances: 20-100 alerts tu du lieu thuc te
- Pipeline co the chay lai (idempotent) nho UPSERT voi unique constraint
