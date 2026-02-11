

## Plan: Fix Unit Economics Page Loading (3 Database Bottlenecks)

### Van de hien tai

Trang Unit Economics bi "treo" vi 3 query song song deu that bai:

| Query | Loi | Nguyen nhan |
|-------|-----|-------------|
| `get_fdp_period_summary` | PGRST203 (300) | 2 phien ban RPC trung ten (text vs date params) |
| `v_channel_performance` | Timeout (500) | View scan toan bo 1.2M orders, khong co date filter |
| `fdp_invoice_summary` | 404 | Bang khong ton tai |

### Giai phap

#### Buoc 1: Xoa RPC trung lap `get_fdp_period_summary`

Hien co 2 overload:
- `(uuid, text, text)` -- dang dung, giu lai
- `(uuid, date, date)` -- thua, gay loi PGRST203

Xoa phien ban `(uuid, date, date)` de PostgREST tu dong chon dung.

#### Buoc 2: Thay `v_channel_performance` bang RPC co date filter

View hien tai:
```
SELECT ... FROM cdp_orders GROUP BY tenant_id, channel
```
Scan 1.2M dong moi lan goi -- khong the chay duoi 30s.

Tao RPC `get_channel_performance` nhan `p_tenant_id`, `p_start_date`, `p_end_date` de chi scan orders trong khoang thoi gian, tan dung index `idx_cdp_orders_tenant_order_at_channel`.

Cap nhat frontend `useFDPAggregatedMetricsSSOT.ts` de goi RPC thay vi query view.

#### Buoc 3: Xu ly `fdp_invoice_summary` khong ton tai

Frontend dang query bang `fdp_invoice_summary` nhung bang nay khong co. Cap nhat code de:
- Bat loi 404 gracefully (khong throw)
- Tra ve gia tri mac dinh (0) cho invoice metrics

### Chi tiet ky thuat

**SQL Migration:**

```text
-- 1. Xoa RPC trung lap
DROP FUNCTION IF EXISTS get_fdp_period_summary(uuid, date, date);

-- 2. Tao RPC channel performance co date filter
CREATE OR REPLACE FUNCTION get_channel_performance(
  p_tenant_id UUID, p_start_date TEXT, p_end_date TEXT
) RETURNS TABLE(...) AS $$
  SELECT channel, count(*), sum(net_revenue), sum(cogs), ...
  FROM cdp_orders 
  WHERE tenant_id = p_tenant_id 
    AND order_at >= p_start_date::timestamp
    AND order_at < (p_end_date::date + 1)::timestamp
  GROUP BY channel
$$ LANGUAGE sql STABLE;
```

**Frontend changes:**

- `src/hooks/useFDPAggregatedMetricsSSOT.ts`:
  - Thay `client.from('v_channel_performance')` bang `client.rpc('get_channel_performance', {...})`
  - Bat loi `fdp_invoice_summary` gracefully (try/catch, default 0)

### Ket qua mong doi

- Unit Economics page load trong 3-5 giay thay vi treo vo han
- Tat ca metrics (AOV, CM, ROAS, LTV:CAC) hien thi dung
- Khong con loi 500/404 trong console

