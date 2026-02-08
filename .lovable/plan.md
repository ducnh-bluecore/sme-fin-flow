

# Upgrade cdp-qa: Expand to Full SSOT Agent + Migrate to Lovable AI Gateway

## Problem

The `cdp-qa` Edge Function currently:
1. Only queries **7 CDP views** (v_cdp_ltv_*, v_cdp_equity_*, v_cdp_population_catalog)
2. Uses **OPENAI_API_KEY** (legacy) instead of Lovable AI Gateway
3. Cannot answer questions about orders, KPIs, alerts, products, or customer equity -- the core L2/L3/L4 data

## Solution

### 1. Migrate cdp-qa to Lovable AI Gateway

**File: `supabase/functions/cdp-qa/index.ts`**

- Replace `openaiChat()` calls (OpenAI API) with Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`)
- Use `LOVABLE_API_KEY` instead of `OPENAI_API_KEY`
- Switch model to `google/gemini-3-flash-preview`
- Keep the existing 2-step flow (SQL generation -> execute -> answer with data)

### 2. Expand queryable tables in cdp-schema.ts

**File: `supabase/functions/_shared/cdp-schema.ts`**

Add these tables/views to `CDP_QUERYABLE_VIEWS` and `CDP_SCHEMA_DESCRIPTIONS`:

| Table | Layer | Purpose |
|-------|-------|---------|
| `cdp_orders` | L2 | Orders with revenue, COGS, channel, status |
| `cdp_customers` | L2 | Customer profiles, acquisition source, lifetime value |
| `cdp_order_items` | L2 | Line items, products, quantities |
| `products` | L2 | Product catalog, SKU, pricing, stock |
| `kpi_facts_daily` | L3 | Pre-aggregated daily KPIs (NET_REVENUE, COGS, ROAS, etc.) |
| `alert_instances` | L4 | Active alerts with severity, status, metrics |
| `cdp_customer_equity_computed` | L4 | Customer equity, churn risk, RFM scores |

Schema descriptions for each new table (columns + Vietnamese context):

- **cdp_orders**: `tenant_id, order_key, customer_id, order_at, channel, net_revenue, cogs, gross_margin, status, shop_name, province_name, payment_method, discount_amount, platform_fee, shipping_fee`
- **cdp_customers**: `tenant_id, id, name, phone, email, province, acquisition_source, first_order_at, last_order_at, status, lifetime_value`
- **cdp_order_items**: `tenant_id, order_id, product_id, qty, unit_price, line_revenue, discount_amount`
- **products**: `tenant_id, sku, name, category, brand, cost_price, selling_price, current_stock, avg_daily_sales, is_active`
- **kpi_facts_daily**: `tenant_id, grain_date, metric_code, dimension_type, dimension_value, metric_value, comparison_value, period_type` (metric_codes: NET_REVENUE, ORDER_COUNT, AOV, COGS, GROSS_MARGIN, AD_SPEND, ROAS, CPA, etc.)
- **alert_instances**: `tenant_id, alert_type, category, severity, title, message, metric_name, current_value, threshold_value, change_percent, status, priority, created_at`
- **cdp_customer_equity_computed**: `tenant_id, customer_id, as_of_date, orders_30d/90d/180d, net_revenue_30d/90d/180d, equity_12m, equity_24m, churn_risk_score, risk_level, equity_confidence`

### 3. Update suggested questions

Expand `SUGGESTED_QUESTIONS` to cover all layers:

```text
# L2 - Orders & Products
- "Tong doanh thu 30 ngay gan nhat theo tung kenh?"
- "Top 10 san pham ban chay nhat?"
- "Kenh nao co gross margin cao nhat?"

# L3 - KPIs
- "ROAS trung binh 7 ngay gan nhat?"
- "So sanh NET_REVENUE thang nay vs thang truoc?"

# L4 - Alerts & Equity
- "Co bao nhieu alert critical dang open?"
- "Top 20 khach hang co equity cao nhat?"
- "Bao nhieu khach hang co risk level = high?"

# CDP Views (existing)
- "Cohort nao co LTV cao nhat?"
- "Nguon khach hang nao co LTV:CAC ratio tot nhat?"
```

### 4. Update SQL generation prompt

Enhance `buildSqlGenerationPrompt` to:
- List all queryable tables (not just views)
- Add query hints: "For aggregate revenue questions, prefer kpi_facts_daily over cdp_orders (pre-aggregated, faster)"
- Add JOIN guidance: "cdp_orders.customer_id -> cdp_customers.id" and "cdp_order_items.order_id -> cdp_orders.id"

## Technical Details

### Changes summary

| File | Action |
|------|--------|
| `supabase/functions/_shared/cdp-schema.ts` | Add 7 tables to whitelist + schema descriptions |
| `supabase/functions/cdp-qa/index.ts` | Replace OpenAI with Lovable AI Gateway |

### Security

- `validateSQL()` already blocks INSERT/UPDATE/DELETE/DROP -- no change needed
- `injectTenantFilter()` already adds `WHERE tenant_id = ?` -- works for tables too
- `execute_readonly_query` RPC enforces read-only at DB level

### Risk mitigation

- kpi_facts_daily has ~8K rows, cdp_orders has 1.1M rows -- the SQL gen prompt will guide AI to use kpi_facts_daily for aggregate questions and add LIMIT for cdp_orders queries
- Large table queries will include prompt instruction: "Always add LIMIT 100 when querying cdp_orders or cdp_order_items directly"

