

# Fix DSO: Bán lẻ thì đơn hàng = hóa đơn

## Vấn đề

Hiện tại `compute_central_metrics_snapshot` tính AR/DSO từ bảng `invoices` (trống). Nhưng trong hệ thống bán lẻ/e-commerce:
- **Đơn hàng = Invoice** (khách đặt hàng = phát sinh công nợ)
- **AR = đơn hàng đang vận chuyển/chờ sàn thanh toán** (tiền chưa về)
- **DSO = thời gian trung bình từ đặt hàng đến nhận tiền**

## Dữ liệu thực có trong DB

| Metric | Giá trị (90 ngày gần nhất) |
|--------|---------------------------|
| Revenue | 104.6 ty VND |
| Daily Revenue | 1.16 ty/ngay |
| Retail AR (don dang van chuyen) | 16.59 ty VND |
| Completed orders | 98,905 |
| In-transit orders | status 2, 3, SHIPPED, READY_TO_SHIP, etc. |

## Gia tri ky vong sau fix

| Metric | Gia tri | Nguon | Badge |
|--------|---------|-------|-------|
| DSO | ~14 ngay | cdp_orders in-transit | **Tu data that** |
| DIO | 365 ngay (capped) | inventory / annual COGS | Tam tinh (COGS 4.2% coverage) |
| DPO | 0 ngay | bills table (trong) | Tam tinh (chua co AP) |
| CCC | ~379 ngay | DSO + DIO - DPO | Tam tinh |
| Retail AR | 16.59 ty | cdp_orders in-transit | Tu data that |
| Locked Cash - Platform | 16.59 ty | = Retail AR | Moi |

DSO = 14 ngay hoan toan hop ly cho e-commerce (Shopee/TikTok hold tien 7-14 ngay sau delivery).

## Thay doi can lam

### 1. Migration: Update `compute_central_metrics_snapshot`

Thay doi phan tinh AR/DSO (lines 104-114 trong function hien tai):

```text
CU:   AR tu invoices WHERE status IN ('sent','overdue','partial')  --> 0 (invoices trong)
MOI:  AR tu cdp_orders WHERE status la in-transit/pending settlement
      - Status in-transit: '2', '3', 'SHIPPED', 'shipped', 'confirmed', 'packed', 
        'READY_TO_SHIP', 'PROCESSED', 'TO_CONFIRM_RECEIVE'
      - AR = SUM(net_revenue) cua cac don nay
      - DSO = AR / daily_revenue (cap at 365)
```

Giu nguyen:
- DIO tinh tu inventory/annual_cogs (khong doi)
- DPO tinh tu bills (khong doi, = 0 khi bills trong)
- CCC = DSO + DIO - DPO

Them:
- Column `locked_cash_platform` vao `central_metrics_snapshots` = Retail AR (tien san giu)
- Update locked cash total = inventory + ads + ops + platform

### 2. Update `CashVelocityPanel.tsx`

- Hien thi DSO voi gia tri that (~14 ngay), KHONG co badge "tam tinh"
- DIO: giu badge "tam tinh" (COGS coverage thap)
- DPO: badge "tam tinh (chua co AP)"
- Them dong "Platform Hold" trong Locked Cash breakdown (16.59 ty)
- CCC: hien thi gia tri that, note "DIO va DPO la tam tinh"

### 3. Update `RetailHealthHero.tsx`

- Inventory Days: hien thi 365 + badge "tam tinh"
- Cac metrics khac giu nguyen logic hien tai

### 4. Update `useRetailHealthScore.ts`

- DIO status: khi COGS coverage thap, danh WARNING thay vi CRITICAL cho DIO = 365

## Tong ket files

| File | Thay doi |
|------|---------|
| Migration SQL | Update `compute_central_metrics_snapshot`: AR tu cdp_orders, them `locked_cash_platform` |
| `src/components/dashboard/CashVelocityPanel.tsx` | Hien thi DSO that, DIO/DPO tam tinh, them Platform Hold |
| `src/components/dashboard/RetailHealthHero.tsx` | Badge "tam tinh" cho DIO |
| `src/hooks/useRetailHealthScore.ts` | Adjust DIO status khi COGS coverage thap |

## Kiem tra sau fix

| # | Kiem tra | Ky vong |
|---|---------|---------|
| 1 | DSO hien thi | ~14 ngay, khong co badge tam tinh |
| 2 | DIO hien thi | 365 ngay + badge "tam tinh" |
| 3 | DPO hien thi | 0 ngay + badge "tam tinh" |
| 4 | CCC hien thi | ~379 ngay + note |
| 5 | Locked Cash - Platform | 16.59 ty VND (moi) |
| 6 | Health Score | WARNING (khong CRITICAL) vi co data that cho DSO |
| 7 | Recompute snapshot | Goi compute function tra ve gia tri moi |

