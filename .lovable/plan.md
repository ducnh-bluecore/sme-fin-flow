

# Plan: Hybrid AI Agent -- Knowledge Packs + Focused Query Fallback

## Van de ban lo ngai (dung)

Plan truoc gioi han moi Knowledge Pack o 20-50 rows, ~100KB. Nhu vay AI chi tra loi duoc cau hoi "tong quan". Cac cau hoi kho hon se bi ket:

- "Phan tich chi tiet san pham A theo thang?" (can time-series data)
- "So sanh 3 kenh, ke ca chinh sach phi?" (can cross-domain joins)
- "Xu huong doanh thu 6 thang chi tiet theo tuan?" (can hang tram data points)
- "Khach hang nao co LTV cao nhat va mua gi?" (can drill-down 2 cap)

## Giai phap: 3-tier Hybrid

Thay vi "chi Knowledge Packs" hay "chi SQL", ket hop 3 tang:

```text
TIER 1: Knowledge Packs (80% cau hoi, 2-5 giay)
   |  Pre-built, server-side fetch, SSOT views
   |  Dung cho: tong quan, so sanh kenh, KPI summary, alerts
   |
TIER 2: Focused Query Templates (15% cau hoi, 5-10 giay)  
   |  AI chon template + parameters, server validate + execute
   |  Dung cho: drill-down, time-series, top-N theo tieu chi cu the
   |
TIER 3: Supervised Dynamic Query (5% cau hoi, 8-15 giay)
   |  AI viet SQL nhung bi kiem soat chat: whitelist views, row limit, timeout
   |  Dung cho: cau hoi tuy y ngoai template
```

## Chi tiet tung Tier

### TIER 1: Knowledge Packs (giu nguyen plan truoc)

Server-side fetch 2-4 packs song song tu SSOT views. AI chi suy luan.

8 packs nhu plan truoc: overview, revenue, profitability, channels, products, marketing, customers, alerts.

**Khac biet voi plan truoc**: Moi pack kem metadata giup AI biet khi nao can "di sau hon":

```text
{
  "pack": "channels",
  "data": [...],
  "drill_down_available": true,
  "drill_down_hint": "Neu can chi tiet theo thang hoac theo san pham trong kenh, dung focused_query template 'channel_monthly_detail'"
}
```

### TIER 2: Focused Query Templates (MOI - giai quyet van de cau hoi kho)

Tao 10-15 "query templates" duoc dinh nghia san trong code. AI chi can chon template + truyen parameters. Server validate va execute.

```text
Templates du kien:

1. revenue_time_series
   Params: granularity (day/week/month), days (7-365), channel? 
   SQL: SELECT ... FROM kpi_facts_daily GROUP BY {granularity}
   Max rows: 365

2. channel_monthly_detail
   Params: channel?, months (1-12)
   SQL: SELECT ... FROM v_channel_pl_summary WHERE ...
   Max rows: 100

3. product_deep_dive
   Params: product_id | product_name | category, days
   SQL: SELECT ... FROM cdp_order_items JOIN products ...
   Max rows: 200

4. customer_segment_detail
   Params: segment (platinum/gold/silver/bronze/at_risk)
   SQL: SELECT ... FROM v_cdp_rfm_segments WHERE ...
   Max rows: 100

5. expense_breakdown
   Params: months, category?
   SQL: SELECT ... FROM v_expenses_by_category_monthly
   Max rows: 50

6. cash_flow_analysis
   Params: months
   SQL: SELECT ... FROM v_cash_flow_monthly
   Max rows: 24

7. pl_trend
   Params: months (3-12)
   SQL: SELECT ... FROM v_pl_monthly_summary
   Max rows: 12

8. alert_history
   Params: severity?, category?, days
   SQL: SELECT ... FROM alert_instances ORDER BY created_at
   Max rows: 50

9. cohort_deep_dive
   Params: cohort_month
   SQL: SELECT ... FROM v_cdp_ltv_by_cohort WHERE cohort_month = ...
   Max rows: 20

10. store_performance
    Params: store_id?
    SQL: SELECT ... FROM inv_stores JOIN v_inv_store_revenue ...
    Max rows: 50

11. category_pl
    Params: months?
    SQL: SELECT ... FROM v_category_pl_summary
    Max rows: 50

12. rfm_analysis
    Params: none
    SQL: SELECT ... FROM v_cdp_rfm_segment_summary
    Max rows: 20
```

AI tool definition cho Tier 2:

```text
Tool: focused_query
Params:
  - template: (enum cua 12 templates)
  - params: { key: value }
```

Server-side: Validate template name + params -> build SQL tu template (KHONG cho AI viet SQL) -> execute -> return max N rows.

**Loi ich**: 
- AI KHONG viet SQL -> KHONG the bia sai cau truc
- Templates co metadata (labels, caveats) -> AI biet "est_revenue" vs "actual revenue"
- Rows co the len toi 200-365 rows cho time-series -> du de ve chart chi tiet

### TIER 3: Supervised Dynamic Query (giu tu code hien tai, nhung thua hon)

Giu lai `query_database` nhu hien tai cho 5% cau hoi tuy y. Nhung them constraints:

- AI PHAI ghi ly do tai sao Tier 1+2 khong du truoc khi dung Tier 3
- Max 50 rows tra ve
- Timeout 30 giay
- Chi cho phep ~30 views duoc dang ky (v_* + inv_*)

## Luong xu ly moi (1-pass)

```text
User gui cau hoi
    |
    v
Edge Function:
  1. Intent detect (keyword matching) -> chon 2-4 Knowledge Packs
  2. Fetch packs song song (Promise.all) -> 200-500ms
  3. Goi AI voi:
     - System prompt + business rules
     - Knowledge Pack data (Tier 1)
     - Tool: focused_query (Tier 2)
     - Tool: query_database (Tier 3, fallback)
     - Conversation history
  4. AI nhan data Tier 1, suy luan
     - Neu du -> tra loi ngay (1-pass, stream) -> 3-5 giay
     - Neu can chi tiet -> goi focused_query(template, params) -> server execute -> AI tra loi -> 5-10 giay
     - Neu van chua du -> goi query_database (Tier 3) -> 8-15 giay
  5. Stream response
```

## Vi du cu the

**Cau hoi de (Tier 1 du)**:
"Tinh hinh doanh thu thang nay?"
-> Fetch: overview + revenue packs -> AI suy luan -> 3s

**Cau hoi trung binh (Tier 2)**:
"Xu huong doanh thu 6 thang theo tuan?"
-> Fetch: overview pack (boi canh)
-> AI goi focused_query(template="revenue_time_series", params={granularity:"week", days:180})
-> Server tra ve ~26 rows -> AI ve chart + phan tich -> 7s

**Cau hoi kho (Tier 2 multi-call)**:
"So sanh hieu qua marketing giua Shopee va TikTok, ke ca LTV khach hang moi kenh?"
-> Fetch: marketing + channels packs (boi canh)
-> AI goi focused_query("channel_monthly_detail", {channel:"Shopee"}) + focused_query("channel_monthly_detail", {channel:"TikTok"})
-> AI suy luan cross-domain -> 10s

**Cau hoi rat kho (Tier 3 fallback)**:
"Tinh ti le hoan hang theo san pham, chi nhung san pham co >50 don?"
-> Khong co template phu hop
-> AI goi query_database voi SQL tu viet (validated) -> 12s

## Thay doi ky thuat

| File | Thay doi |
|------|----------|
| `supabase/functions/cdp-qa/index.ts` | Viet lai: them Tier 1 fetcher + Tier 2 template executor, giam tools tu 12 xuong 3 (focused_query, query_database, discover_schema), cap nhat system prompt |
| `supabase/functions/_shared/cdp-schema.ts` | Them QUERY_TEMPLATES dinh nghia 12 templates voi SQL, params, metadata, labels, max_rows |

**KHONG thay doi**:
- Frontend (useCDPQA.ts, AIMessageContent.tsx) - streaming logic giu nguyen
- Database - dung 120+ views da co san, khong can migration

## Ket qua ky vong

| Metric | Hien tai | Sau khi doi |
|--------|---------|-------------|
| Cau hoi de (80%) | 15-30s, hay bia | 2-5s, chinh xac |
| Cau hoi trung binh (15%) | 15-30s, thuong sai | 5-10s, chinh xac (template) |
| Cau hoi kho (5%) | 15-30s, 50% sai | 8-15s, co kiem soat |
| Hallucination | Thuong xuyen | Tier 1+2: bat kha thi. Tier 3: giam manh |

## Rui ro va mitigation

1. **12 templates khong du?** -> Theo doi cau hoi roi vao Tier 3 -> them template dan. Bat dau voi 12 la du cho 95% cau hoi.
2. **AI chon sai template?** -> Template name + description ro rang. Temperature = 0.1. Co the dung tool_choice = required cho turn 1.
3. **Data van bia o Tier 3?** -> Giu constraint hien tai + them rule: Tier 3 data PHAI duoc nhan dien rieng trong prompt de AI biet "data nay tu dynamic query, co the khong day du".

