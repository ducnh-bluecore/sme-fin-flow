

# CDP-QA v2: 2-Pass Optimized AI Agent

## Tong quan

Viet lai duy nhat 1 Edge Function (`cdp-qa/index.ts`) + 1 migration SQL mo rong allowlist. Frontend KHONG DOI.

## Pham vi thay doi

| File | Hanh dong | Anh huong |
|------|-----------|-----------|
| `supabase/functions/cdp-qa/index.ts` | Viet lai hoan toan | Chi rieng file nay |
| Migration SQL | Mo rong `execute_readonly_query` allowlist: them `v_*` | Chi READ, khong thay doi data |
| `supabase/config.toml` | Them `[functions.cdp-qa]` verify_jwt = false | Da co san pattern nay |
| `src/hooks/useCDPQA.ts` | **KHONG DOI** | Tuong thich 100% |
| Frontend pages | **KHONG DOI** | Tuong thich 100% |
| Data layers (L2/L3/L4) | **KHONG DOI** | Chi doc, khong ghi |

## Buoc 1: Migration SQL

Mo rong allowlist cua `execute_readonly_query` tu 14 items co dinh sang: giu danh sach bang L2/L3/L4 + tu dong cho phep tat ca view `v_*` (120+ views).

```text
Logic moi:
  IF v_table NOT IN ('cdp_orders','cdp_customers','cdp_order_items','products',
    'kpi_facts_daily','alert_instances','cdp_customer_equity_computed',
    'expenses','invoices','bank_transactions','ad_spend_daily')
  AND v_table NOT LIKE 'v\_%'   -- cho phep tat ca views
  THEN RAISE EXCEPTION
```

Khong thay doi gi khac trong function (van giu SELECT-only, 30s timeout, uuid auto-cast).

## Buoc 2: Config

Them vao `supabase/config.toml`:
```text
[functions.cdp-qa]
verify_jwt = false
```

## Buoc 3: Viet lai `cdp-qa/index.ts` (~450 dong)

### Cau truc tong the

```text
1. CORS + Auth + Tenant resolution (giu nguyen logic cu)
2. TOOL_DEFINITIONS: 10 fixed tools + 1 query_database
3. executeTool(): switch/case goi Supabase queries
4. SYSTEM_PROMPT: vai tro + schema catalog (top 20) + analysis rules + business rules
5. 2-pass flow:
   Pass 1: non-streaming, AI chon tools (max 2 turns)
   Pass 2: streaming, AI phan tich + tra loi
```

### 11 Tools

| # | Tool | Data source |
|---|------|-------------|
| 1 | `get_revenue_kpis` | kpi_facts_daily (NET_REVENUE, ORDER_COUNT, AOV) |
| 2 | `get_profitability` | kpi_facts_daily (COGS, GROSS_MARGIN) |
| 3 | `get_channel_breakdown` | kpi_facts_daily dimension=channel |
| 4 | `get_marketing_kpis` | kpi_facts_daily (AD_SPEND, ROAS) |
| 5 | `get_top_products` | v_top_products_30d |
| 6 | `get_inventory_health` | products (stock > 0) |
| 7 | `get_active_alerts` | alert_instances status=open |
| 8 | `get_customer_overview` | v_cdp_ltv_summary |
| 9 | `get_cohort_analysis` | v_cdp_ltv_by_cohort |
| 10 | `get_channel_pl` | v_channel_pl_summary |
| 11 | `query_database` | execute_readonly_query RPC (bat ky view v_*) |

### System Prompt (gom 5 phan)

**1. Vai tro**: Bluecore AI Analyst cho CEO/CFO, tra loi bang tieng Viet

**2. Schema Catalog** (top 20 views pin trong prompt):
- Tai chinh: kpi_facts_daily, v_channel_pl_summary, v_fdp_truth_snapshot, v_financial_monthly_summary, v_pl_monthly_summary
- Don hang: v_channel_daily_revenue, v_variance_orders_monthly, v_base_order_metrics
- Khach hang: v_cdp_ltv_summary, v_cdp_ltv_by_cohort, v_cdp_ltv_by_source, v_cdp_rfm_segment_summary, v_cdp_customer_research, v_cdp_equity_overview
- San pham: v_top_products_30d, v_cdp_product_benchmark
- Marketing: v_mdp_ceo_snapshot, v_mdp_platform_ads_summary
- Alerts: alert_instances, v_cdp_data_quality

**3. Analysis Rules**: So sanh %, tim nguyen nhan, cross-check (revenue vs margin), anomaly detection

**4. Business Rules (FDP/MDP/CT)**: Revenue di kem COGS, marketing do bang Contribution Margin, SKU am margin => STOP

**5. Data Reliability**: Customer linking 7.6% warning, expenses=0 warning, cash=0 warning

### Luong 2-Pass

```text
Request -> Auth -> Tenant
  |
  v
Pass 1 (non-streaming, google/gemini-3-flash-preview):
  messages[-6] + system_prompt + tool_definitions
  -> AI returns tool_calls
  -> executeTool() cho moi call
  -> Neu AI goi them tool (turn 2): execute tiep
  -> Max 2 turns, sau do bat buoc sang Pass 2
  |
  v
Pass 2 (streaming, google/gemini-3-flash-preview):
  messages[-6] + system_prompt + tool_results (inject vao context)
  -> Stream ve client (SSE format, tuong thich useCDPQA.ts)
```

### executeTool() - Logic tung tool

Moi fixed tool = 1 Supabase query don gian, tra ve JSON + metadata:
- `get_revenue_kpis(days)`: SELECT tu kpi_facts_daily, filter metric_code, group by grain_date
- `get_channel_breakdown(days)`: SELECT tu kpi_facts_daily, filter dimension_type=channel
- `query_database(sql)`: Goi execute_readonly_query RPC, inject tenant_id vao SQL

Tat ca tool results deu kem: `{ data: [...], source: "table_name", rows: N, period: "..." }`

## Kiem tra truoc khi deploy

- Frontend `useCDPQA.ts` gui POST voi `{ messages }` va nhan SSE stream -> KHONG DOI
- Edge function van tra ve `text/event-stream` -> KHONG DOI
- Auth flow (Bearer token + x-tenant-id) -> KHONG DOI

## Rui ro va giam thieu

| Rui ro | Muc do | Giam thieu |
|--------|--------|------------|
| AI chon sai tool | Trung binh | Tool descriptions ro rang + top 20 catalog |
| Tool-calling loop | Thap | Hard limit 2 turns |
| Dynamic SQL sai | Trung binh | execute_readonly_query da co SELECT-only + allowlist + 30s timeout |
| Latency tang | Nhe (+1-2s) | Pass 1 non-streaming nhanh, Pass 2 stream ngay |
| Gateway khong ho tro tool-calling | Can kiem tra | Fallback: parse JSON tu AI response thay vi native tool_calls |

