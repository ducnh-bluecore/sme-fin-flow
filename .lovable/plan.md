

## Fix Customer Deduplication Logic

### Van de hien tai

Customer merge rate chi 0.4% (1 record merge) thay vi muc tieu 20-30%. Nguyen nhan:
- KiotViet (217K): canonical_key = phone (0xxx...)
- Haravan (55K): canonical_key = email (khong co phone)
- 2 nguon dung 2 loai key khac nhau nen KHONG BAO GIO match

### Giai phap: Two-Pass Dedup

#### Buoc 1: Sua logic trong Edge Function `backfill-bigquery/index.ts`

Thay doi ham `syncCustomers` de thuc hien dedup 2 vong:

**Vong 1 (giu nguyen):** Upsert theo `canonical_key = phone || email` — tao profile co ban.

**Vong 2 (moi):** Sau khi upsert xong tat ca sources, chay merge query:
- Tim cac cap customer co cung email nhung khac canonical_key (1 ben la phone, 1 ben la email)
- Merge: gop external_ids, giu phone tu KiotViet, giu email tu Haravan, lay earliest created_at
- Xoa record trung (giu record co phone lam master)

Logic merge SQL (chay cuoi ham syncCustomers):

```text
-- Tim cap trung lap: customer A co phone, customer B co email giong A.email
-- Merge B vao A: 
--   A.external_ids = A.external_ids || B.external_ids
--   A.email = COALESCE(A.email, B.email)
-- Xoa B
```

#### Buoc 2: Tao database function `merge_duplicate_customers`

Tao stored function de thuc hien merge an toan:

```text
merge_duplicate_customers(p_tenant_id uuid)
  1. Tim tat ca customers co email NOT NULL
  2. Group by normalized email
  3. Voi moi group > 1 record:
     - Chon master = record co phone NOT NULL (uu tien kiotviet)
     - Merge external_ids tu tat ca records vao master
     - Cap nhat cdp_orders.customer_id tro ve master
     - Xoa cac duplicate records
  4. Return so luong merged
```

#### Buoc 3: Cap nhat `useBigQueryBackfill.ts`

Khong can thay doi type hay UI — logic merge chay tu dong trong syncCustomers.

### Files thay doi

1. **`supabase/functions/backfill-bigquery/index.ts`**: Them Phase 2 merge logic sau khi upsert xong tat ca customer sources
2. **Migration SQL**: Tao function `merge_duplicate_customers(uuid)` trong database

### Ket qua ky vong

- KiotViet customers co email (5,451) se match voi Haravan customers cung email
- Merge rate tang tu 0.4% len ~5-10% (realistic vi chi 5K kiotviet co email)
- External_ids se chua ca kiotviet + haravan source IDs
- Khong mat du lieu — chi gop va xoa trung

### Luu y

- Merge chi ap dung cho customers co **cung email** giua cac nguon
- Merge rate thuc te co the khong dat 20-30% vi kiotviet chi co 5,451 email (2.5% tong)
- De tang merge rate cao hon, can lam sach du lieu phone cua Haravan tu BigQuery source (hien tai Haravan khong co phone)

