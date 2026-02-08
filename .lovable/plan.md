

## Plan: Fix AI Data Layer - Seed Registry + Rewire to SSOT

### Van de hien tai

AI Layer dang "rong ruot":
- 4/5 platform registry tables EMPTY (chi co 8 metric definitions)
- 2 edge functions chinh (`analyze-financial-data`, `analyze-contextual`) doc tu legacy tables (invoices, expenses) thay vi L2/L3 SSOT (cdp_orders 1.14M, kpi_facts_daily 8K)
- Tat ca edge functions goi OpenAI truc tiep thay vi dung Lovable AI gateway (mien phi, khong can API key)

### Plan 3 buoc

#### Buoc 1: Seed Platform Registry (Migration SQL)

**1a. ai_semantic_models** - Dinh nghia schema cho 4 entities chinh:

- **order**: cdp_orders columns (order_key, channel, status, order_at, gross_revenue, net_revenue, customer_name, buyer_id...)
- **customer**: cdp_customers columns (name, phone, email, acquisition_source, lifetime_value, external_ids...)
- **product**: products columns (sku, name, selling_price, current_stock, category...)
- **kpi_fact**: kpi_facts_daily columns (grain_date, metric_code, value, dimension_type, dimension_value, comparison_value...)

Moi entity gom: columns (ten + kieu + y nghia), relationships (lien ket entity khac), business_rules (validation)

**1b. ai_dimension_catalog** - Seed ~15 dimensions:

- channel (string): shopee, lazada, tiktok_shop, tiki, kiotviet
- status (string): completed, cancelled, refunded, pending
- metric_code (string): NET_REVENUE, ORDER_COUNT, AOV, COGS, GROSS_MARGIN, ROAS, CPA...
- dimension_type (string): channel, total, campaign
- period_type (string): daily, weekly, monthly
- acquisition_source (string): kiotviet, haravan, bluecore
- category (string): revenue, margin, cash, customer, marketing, operations

**1c. ai_query_templates** - Seed ~10 proven SQL patterns:

- "doanh thu theo kenh" -> SELECT from kpi_facts_daily WHERE metric_code='NET_REVENUE' GROUP BY dimension_value
- "top SKU loi nhuan" -> SELECT from cdp_order_items JOIN products...
- "khach hang moi theo thang" -> SELECT from cdp_customers WHERE created_at...
- "ROAS theo campaign" -> SELECT from kpi_facts_daily WHERE metric_code='ROAS'
- "xu huong doanh thu 30 ngay" -> SELECT from kpi_facts_daily WHERE grain_date >= now() - interval '30 days'

#### Buoc 2: Rewire AI Edge Functions to L2/L3 SSOT

**2a. `analyze-financial-data`** - Thay doi data source:

Hien tai doc:
- invoices, expenses, bank_accounts, bank_transactions, revenues, customers, payments, cash_forecasts

Sau khi sua doc:
- kpi_facts_daily (L3 - pre-aggregated metrics: revenue, margin, ROAS)
- cdp_orders (L2 - raw orders cho drill-down)
- cdp_customers (L2 - customer metrics)
- alert_instances (L4 - active alerts)

Loi ich: Data thuc tu 1.14M orders thay vi legacy tables (co the rong hoac khong dong bo)

**2b. `analyze-contextual`** - Tuong tu, rewire sang L2/L3 cho cac context khac nhau:

- profitability -> kpi_facts_daily (GROSS_MARGIN, NET_REVENUE, COGS)
- revenue -> kpi_facts_daily (NET_REVENUE by channel)
- expenses -> giu nguyen (expenses table van la SSOT cho chi phi van hanh)

#### Buoc 3: Chuyen sang Lovable AI Gateway (optional nhung recommended)

Thay doi tu:
```text
fetch("https://api.openai.com/v1/chat/completions", {
  headers: { Authorization: "Bearer ${OPENAI_API_KEY}" },
  body: { model: "gpt-4o-mini" }
})
```

Sang:
```text
fetch("https://ujteggwzllzbhbwrqsmk.supabase.co/functions/v1/proxy-ai", {
  // hoac dung Lovable AI gateway truc tiep
  body: { model: "google/gemini-2.5-flash" }
})
```

Loi ich: Khong can OPENAI_API_KEY, mien phi, model manh hon (gemini-2.5-flash > gpt-4o-mini)

### Files thay doi

1. **Migration SQL** (new): Seed ai_semantic_models, ai_dimension_catalog, ai_query_templates
2. **`supabase/functions/analyze-financial-data/index.ts`**: Rewire sang kpi_facts_daily + cdp_orders
3. **`supabase/functions/analyze-contextual/index.ts`**: Rewire sang L2/L3 cho relevant contexts
4. **Optional**: Chuyen 4 functions sang Lovable AI gateway

### Thu tu thuc hien

```text
1. Migration: Seed platform registry (semantic models + dimensions + templates)
2. Rewire analyze-financial-data -> L2/L3 SSOT
3. Rewire analyze-contextual -> L2/L3 SSOT
4. (Optional) Switch to Lovable AI gateway
5. Test: Goi analyze-financial-data va verify data tu SSOT
```

### Ket qua ky vong

- AI co "hieu biet" ve schema thuc (1.14M orders, 310K customers, 16.7K products)
- Insights dua tren Financial Truth (FDP Manifesto #2: SINGLE SOURCE OF TRUTH)
- Khong con "so ao" tu legacy tables
- Tiet kiem chi phi API (neu dung Lovable AI gateway)

