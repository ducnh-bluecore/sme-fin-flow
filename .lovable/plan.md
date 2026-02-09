

# Fix Customer Linking: Tu 8.2% len 80%+

## Van de goc

1. **800K don KiotViet (2017-2024) thieu buyer_id** vi backfill cu chua map CusId
2. **Ham link_orders_batch chi match bang ten** - bo qua buyer_id va phone
3. Du lieu customer day du (311K records voi external_ids va phone) nhung khong duoc su dung

## Ke hoach thuc hien

### Buoc 1: Re-backfill don KiotViet de bo sung buyer_id

Chay lai backfill model `orders` voi date_from = 2017-01-01 de cap nhat truong `buyer_id` (CusId) va `customer_phone` (deliveryContactNumber) cho 800K don cu.

Code backfill hien tai DA CO mapping dung:
```
customer_id: 'CusId',
customer_phone: 'deliveryContactNumber',
```

Chi can chay lai backfill la du lieu se duoc cap nhat (upsert).

### Buoc 2: Viet lai ham link_orders_batch

Thay the ham hien tai (chi name match) bang 3-pass strategy:

**Pass 1 - buyer_id match (KiotViet ID)**
```text
cdp_orders.buyer_id = cdp_customers.external_ids[].id 
WHERE source = 'kiotviet'
```
Du kien match: ~225K don (KiotViet 2025+, sau khi re-backfill se len 800K+)

**Pass 2 - Phone match**
```text
normalize(cdp_orders.customer_phone) = cdp_customers.canonical_key
```
Du kien match: them ~50K don co phone khong bi mask

**Pass 3 - Name match (giu nguyen logic cu)**
```text
exact name match voi unique customer names
```
Fallback cho cac don con lai

### Buoc 3: Chay linking toan bo

Goi ham `link_orders_batch` nhieu lan (batch 5000) cho den khi het don chua link.

## Chi tiet ky thuat

### Migration SQL - Viet lai link_orders_batch

```sql
CREATE OR REPLACE FUNCTION link_orders_batch(
  p_tenant_id uuid, 
  p_batch_size integer DEFAULT 5000
) RETURNS integer AS $$
DECLARE
  v_linked integer := 0;
  v_pass integer := 0;
BEGIN
  -- Pass 1: Match by buyer_id (KiotViet CusId)
  WITH batch AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM cdp_orders o
    JOIN cdp_customers c 
      ON c.tenant_id = o.tenant_id
      AND c.external_ids @> jsonb_build_array(
        jsonb_build_object('id', o.buyer_id::bigint, 'source', 'kiotviet')
      )
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.buyer_id IS NOT NULL 
      AND o.buyer_id != ''
      AND o.channel = 'kiotviet'
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  -- Pass 2: Match by phone
  WITH batch AS (
    SELECT o.id as order_id, c.id as customer_id
    FROM cdp_orders o
    JOIN cdp_customers c 
      ON c.tenant_id = o.tenant_id
      AND c.canonical_key = regexp_replace(o.customer_phone, '[^0-9]', '', 'g')
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.customer_phone IS NOT NULL
      AND o.customer_phone !~ '\*'
      AND length(regexp_replace(o.customer_phone, '[^0-9]', '', 'g')) >= 9
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  -- Pass 3: Name match (fallback)
  WITH unique_names AS (
    SELECT name, (array_agg(id ORDER BY created_at))[1] as customer_id
    FROM cdp_customers
    WHERE tenant_id = p_tenant_id
      AND name IS NOT NULL AND trim(name) != '' AND name !~ '\*'
    GROUP BY name HAVING COUNT(*) = 1
  ),
  batch AS (
    SELECT o.id as order_id, un.customer_id
    FROM cdp_orders o
    JOIN unique_names un ON trim(o.customer_name) = un.name
    WHERE o.tenant_id = p_tenant_id
      AND o.customer_id IS NULL
      AND o.customer_name IS NOT NULL
      AND o.customer_name !~ '\*'
    LIMIT p_batch_size
  )
  UPDATE cdp_orders o
  SET customer_id = b.customer_id
  FROM batch b WHERE o.id = b.order_id;
  GET DIAGNOSTICS v_pass = ROW_COUNT;
  v_linked := v_linked + v_pass;

  RETURN v_linked;
END;
$$ LANGUAGE plpgsql;
```

### Index can thiet

```sql
-- Index cho buyer_id matching
CREATE INDEX IF NOT EXISTS idx_cdp_orders_buyer_id 
  ON cdp_orders(tenant_id, buyer_id) 
  WHERE buyer_id IS NOT NULL AND customer_id IS NULL;

-- Index cho phone matching  
CREATE INDEX IF NOT EXISTS idx_cdp_orders_phone_unlinked
  ON cdp_orders(tenant_id, customer_phone)
  WHERE customer_id IS NULL AND customer_phone IS NOT NULL;

-- GIN index cho external_ids JSONB search
CREATE INDEX IF NOT EXISTS idx_cdp_customers_ext_ids
  ON cdp_customers USING gin(external_ids);
```

### Trinh tu thuc hien

1. Tao indexes truoc (de matching nhanh)
2. Deploy ham link_orders_batch moi
3. Re-backfill KiotViet orders (2017-2024) de bo sung buyer_id
4. Chay link_orders_batch nhieu lan cho den khi return 0
5. Kiem tra ket qua: `SELECT COUNT(*) FILTER (WHERE customer_id IS NOT NULL) FROM cdp_orders`

### Du kien ket qua

- Truoc: 8.2% linked (91.8% unlinked)
- Sau Pass 1 (buyer_id): +60% KiotViet orders linked
- Sau Pass 2 (phone): +5-10% them
- Sau Pass 3 (name): +3-5% them
- Tong du kien: 70-80% linked

### Luu y

- Re-backfill KiotViet orders la buoc ton thoi gian nhat (800K records, nhieu batch)
- JSONB @> query can GIN index de khong bi slow
- Phone normalize phai khop voi logic trong backfill-bigquery (regexp_replace bo ky tu dac biet)
- Marketplace orders (Shopee/TikTok) se kho match hon vi phone bi mask - can giai phap rieng sau

