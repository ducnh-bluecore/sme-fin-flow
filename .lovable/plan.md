

# Nang cap AI Agent: Tu "11 tools co dinh" sang "AI tu kham pha data"

## Van de goc

Hien tai AI Agent co 11 tools co dinh, moi tool lay 1 loai data cu the. Khi nguoi dung hoi cau ngoai pham vi 11 tools do (vi du "top cua hang doanh thu cao nhat"), AI khong biet data ton tai va tu choi tra loi.

Trong khi do, database co **100+ views** va nhieu bang du lieu ma AI hoan toan co the truy van duoc — nhung AI khong biet chung ton tai.

## Giai phap: Them "Schema Discovery Tool"

Thay vi them tung tool mot, them **1 tool duy nhat** cho phep AI tu kham pha schema cua database. Khi gap cau hoi ma 10 tools co san khong dap ung duoc, AI se:

1. Goi `discover_schema` de xem co nhung bang/view nao lien quan
2. Doc cot va kieu du lieu cua view do
3. Dung `query_database` de truy van

```text
Luong xu ly moi:

Nguoi dung hoi "top cua hang doanh thu?"
    |
    v
Pass 1: AI chon tool → khong co tool "store" → goi discover_schema("store")
    |
    v
discover_schema tra ve: inv_stores, v_inv_store_revenue, v_inv_store_metrics (kem cot)
    |
    v
AI dung query_database voi SQL join cac view da kham pha
    |
    v
Pass 2: Phan tich va tra loi
```

## Thay doi chi tiet

### 1. Them tool `discover_schema` (supabase/functions/cdp-qa/index.ts)

Tool moi cho phep AI truy van `information_schema` de tim bang/view va cot cua chung:

```text
Tool: discover_schema
Muc dich: Tim bang/view trong database theo tu khoa. Tra ve ten bang, ten cot, kieu du lieu.
Tham so: 
  - search_term (bat buoc): tu khoa tim kiem (vi du: "store", "inventory", "expense", "cash")
Returns: Danh sach bang/view khop + cac cot cua chung
```

Cach hoat dong:
- Query `information_schema.columns` voi filter `table_name ILIKE '%search_term%'`
- Chi tra ve bang/view trong schema `public`
- Gioi han 500 cot de tranh qua tai

### 2. Mo rong allowed tables trong `execute_readonly_query` (database migration)

Hien tai `execute_readonly_query` chi cho phep:
- Moi view bat dau bang `v_` (da OK)
- 14 bang co dinh (thieu `inv_stores`, `inv_family_codes`, v.v.)

Can them cac bang `inv_*` vao danh sach cho phep de AI co the truy van khi can.

### 3. Cap nhat system prompt (supabase/functions/cdp-qa/index.ts)

Them huong dan cho AI biet cach dung `discover_schema`:

```text
## KHAM PHA DU LIEU
Khi khong co tool phu hop, dung 2 buoc:
1. Goi discover_schema("tu_khoa") de tim bang/view lien quan
2. Goi query_database voi SQL dua tren schema da kham pha

Vi du: Hoi ve "cua hang" → discover_schema("store") → thay v_inv_store_revenue → query_database
Vi du: Hoi ve "dong tien" → discover_schema("cash") → thay v_cash_flow_monthly → query_database
```

Dong thoi xoa quy tac sai "chua co du lieu cua hang" o QUY TAC VANG.

### 4. Ap dung toi uu toc do V2 (supabase/functions/cdp-qa/index.ts)

Ket hop luon cac toi uu da ban truoc do:
- Pass 2: doi tu `gemini-2.5-pro` sang `gemini-2.5-flash` (nhanh 3-5x)
- Pass 2: giam `max_tokens` tu 10000 xuong 3000
- Giam `maxRetries` tu 5 xuong 2
- Tinh gon Pass 2 inject prompt (tu 30 dong xuong 8 dong)

## Tong ket thay doi

| File | Thay doi |
|------|----------|
| `supabase/functions/cdp-qa/index.ts` | Them tool `discover_schema`, cap nhat system prompt, toi uu Pass 2 |
| Database migration | Them `inv_*` tables vao allowed list cua `execute_readonly_query` |

## Ket qua ky vong

- AI co the tra loi **bat ky cau hoi nao** ve data co san trong he thong, khong can them tool moi moi lan
- Toc do giam tu 20-30s xuong 5-12s nho doi sang flash model
- Khi co view/bang moi trong tuong lai, AI tu dong kham pha duoc ma khong can sua code

