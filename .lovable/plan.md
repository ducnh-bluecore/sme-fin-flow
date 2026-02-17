

# Phase 4: Strategic — Markdown Memory Engine (Moat Feature)

## Tai sao lam cai nay truoc?

Theo danh gia chien luoc, **Markdown Memory** la "signature feature candidate" vi:
- Can historical behavioral data de hoat dong — moat = time
- La nen tang cho Clearance Intelligence hien tai (dang thieu du lieu lich su)
- Nuoi truc tiep Capital Misallocation Score (da co KPI card, nhung chua co markdown history data feed)

Thu tu uu tien: Markdown Memory > Capital Misallocation Score nang cao > Buy Depth Engine

---

## Thay doi chi tiet

### 1. Database: 3 tables moi

**`inv_markdown_events`** — Ghi lai moi su kien giam gia cua SKU
- `fc_id`, `sku`, `channel`, `discount_pct`, `units_sold`, `revenue_collected`, `event_date`
- Muc dich: Accumulate behavioral data — moi lan off gia la 1 event

**`sem_markdown_ladders`** — Hieu qua thoat hang theo tung bac giam gia
- `fc_id`, `channel`, `discount_step` (10/20/30/40/50), `clearability_score`, `avg_days_to_clear`, `total_units_cleared`
- Muc dich: Tra loi "off 30% tren Shopee → clear duoc bao nhieu?"

**`sem_markdown_caps`** — Gioi han giam gia theo nhom san pham
- `fc_id` hoac `category`, `max_discount_pct`, `reason`, `override_by`
- Muc dich: Enforce Premium Guardrail tu database (hien tai chi check client-side)

RLS policies cho ca 3 tables: tenant-isolated reads/writes.

### 2. RPC: `fn_markdown_ladder_summary`

- Input: `p_tenant_id`, `p_fc_id` (optional)
- Output: Aggregated ladder data — clearability score per channel per discount step
- Thay the client-side aggregation hien tai trong `MarkdownHistoryTab`

### 3. Frontend: Nang cap ClearancePage

**Tab "Lich Su Markdown" nang cap:**
- Hien thi **Markdown Ladder visualization**: 5 bac (10% → 50%), moi bac hien clearability score + avg days
- Them **Channel comparison**: cung 1 muc giam gia, kenh nao clear tot nhat?
- Them **"Next Step Recommendation"**: Dua tren ladder data, de xuat muc giam gia tiep theo

**ProductDetailPanel nang cap:**
- Them section "Markdown History" hien thi timeline cac lan giam gia truoc do
- Them "Recommended Next Discount Step" dua tren `sem_markdown_ladders`

**WhyClearCard nang cap:**
- Them "Markdown Memory" section: "San pham nay da off X% tren kenh Y, clear duoc Z units trong N ngay"

### 4. Hook moi: `useMarkdownLadder`

- Wrap RPC `fn_markdown_ladder_summary`
- staleTime: 5 phut (state data)
- Return: ladder steps, channel comparison, next-step recommendation

### 5. Cap nhat types

Them interfaces vao `src/types/inventory.ts`:
- `InvMarkdownEvent`
- `SemMarkdownLadder`  
- `SemMarkdownCap`

### 6. Cap nhat plan.md

Them Phase 4 vao plan voi status tracking.

---

## Khong thay doi

- Growth Simulator Engine — giu nguyen
- AssortmentPage — khong thay doi
- CommandOverviewPage — khong thay doi (Capital Misallocation KPI da co)
- Decision Queue logic — khong thay doi

---

## Thu tu implement

| # | Viec | Effort |
|---|------|--------|
| 1 | Database migration: 3 tables + indexes + RLS | Trung binh |
| 2 | RPC `fn_markdown_ladder_summary` | Thap |
| 3 | Types trong `inventory.ts` | Thap |
| 4 | Hook `useMarkdownLadder` | Thap |
| 5 | Nang cap MarkdownHistoryTab — ladder visualization | Trung binh |
| 6 | Nang cap ProductDetailPanel — markdown timeline | Trung binh |
| 7 | Cap nhat plan.md | Thap |

---

## Gia tri chien luoc

- **Moat**: Data accumulate theo thoi gian — competitor khong co lich su nay
- **Decision quality**: Tu "giam gia bao nhieu?" thanh "giam bao nhieu, tren kenh nao, trong bao lau"
- **Premium protection**: Guardrail tu database, khong chi client-side
- **Feed Control Tower**: Markdown events → trigger alerts khi discount vuot cap

