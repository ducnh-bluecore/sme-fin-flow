

# Gộp thành "Lệnh Điều Chuyển Ngày" + Giảm 9 tabs xuống 4

## Tổng quan

Thay thế giao diện 9 tabs rối rắm bằng 1 "Phiếu Điều Chuyển Ngày" gộp theo cửa hàng đích, giúp người dùng chỉ cần đọc 1 lệnh duy nhất mỗi ngày.

## Giao diện mới

```text
+--------------------------------------------------+
|  LỆNH ĐIỀU CHUYỂN - 23/02/2026                   |
|  Tổng: 4,200 units | 32 cửa hàng | +1.2B revenue |
|  [P1: 8] [P2: 15] [P3: 9]  (filter buttons)      |
|  [Duyệt tất cả P1]  [Xuất Excel]                 |
+--------------------------------------------------+
|                                                    |
|  > Store A (Tier S, HCM) -- 320 units, 5 SP       |
|    Ly do: Stockout 3 size + velocity cao           |
|                                                    |
|  > Store B (Tier A, HN) -- 180 units, 3 SP        |
|    Ly do: Weeks cover < 1 tuan                     |
|                                                    |
|  (click mo ra -> chi tiet tung FC + size)          |
+--------------------------------------------------+
|  Tabs phu: [Mo phong] [Lich su] [Cai dat]          |
+--------------------------------------------------+
```

## Chi tiet ky thuat

### 1. Tao moi: `src/components/inventory/DailyTransferOrder.tsx`

Component chinh, nhan `suggestions[]`, `storeMap`, `fcNameMap`, `onApprove`, `onReject`.

Logic gop:
- Group tat ca suggestions theo `to_location` (cua hang dich)
- Moi store group hien thi: ten store, tier, region, tong units, so FC, priority cao nhat
- **Reason summary**: Phan tich truong `reason` cua cac suggestions trong group, gop thanh 1 dong mo ta ngan gon (VD: "3 FC stockout, 2 FC velocity cao")
- Mac dinh chi hien stores co **P1** (urgent), toggle de xem P2/P3
- Accordion: click store -> hien chi tiet tung FC + size breakdown (tai su dung logic tu RebalanceBoardTable)

Header summary bar:
- Tong units, tong cua hang, tong revenue tiem nang
- Priority badges voi so luong (P1: 8, P2: 15, P3: 9)
- Nut "Duyet tat ca P1" + "Xuat Excel"

### 2. Sua: `src/pages/InventoryAllocationPage.tsx`

Gop 9 tabs thanh 4:

| Tab | Component | Noi dung |
|-----|-----------|----------|
| Lenh Dieu Chuyen | `DailyTransferOrder` (moi) | Mac dinh, hien phieu dieu chuyen ngay |
| Mo phong | `RebalanceSimulationTab` (giu nguyen) | Simulation |
| Lich su | `RebalanceAuditLog` (giu nguyen) | Audit log |
| Cai dat | `RebalanceConfigPanel` + `StoreDirectoryTab` (gop) | Config + Store directory |

Xoa:
- 5 tabs du lieu (Tat ca, V1, V2, Tu kho tong, Giua cac kho) -> thay bang DailyTransferOrder
- View mode toggle (cards/table) -> khong can nua vi DailyTransferOrder co UI rieng
- Cac filter/state lien quan (activeTab cua 5 tabs cu)

Giu nguyen:
- InventoryHeroHeader, CapacityOptimizationCard, RebalanceSummaryCards o phia tren
- Action bar (Chay Engine dropdown, Tach Size button)
- Tat ca hooks va logic approve/reject

### 3. Giu nguyen (khong xoa)

- `InventoryFCDecisionCards.tsx` - co the dung lai trong drill-down
- `RebalanceBoardTable.tsx` - co the dung lai cho detail view
- Tat ca hooks, export utils

## Ket qua

- Tu 9 tabs -> 4 tabs
- Tu 11,000+ dong rieng le -> 1 phieu gop theo ~32 cua hang
- Mac dinh chi hien P1 -> nguoi dung thay ngay viec khan cap
- Moi store co 1 dong ly do tom tat -> khong can doc tung suggestion
- 1 nut duyet, 1 nut export -> xong

