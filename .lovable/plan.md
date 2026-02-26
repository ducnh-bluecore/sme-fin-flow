
# Plan: Nang cap Phan bo + Thu hoi hang hoa

## 1. Hien thi canh bao suc chua sau dieu chuyen

**Van de**: Hien tai khi xem de xuat dieu chuyen, khong co thong tin store dich se vuot suc chua hay khong.

**Giai phap**: Trong `DailyTransferOrder.tsx`, khi expand store group, tinh toan va hien thi:
- Ton kho hien tai cua store dich
- Capacity cua store
- Ton kho sau khi nhan hang = hien tai + tong qty dieu chuyen
- % su dung sau dieu chuyen
- Canh bao do/vang neu vuot 85%/100%

**Chi tiet ky thuat**:
- Truyen them `stores` data vao `DailyTransferOrder` (da co san tu `useInventoryStores`)
- Trong Store Summary Card (dong 256-290), them 1 row hien thi: `Ton hien tai: X | Capacity: Y | Sau nhan: Z (XX%)` voi mau do neu vuot capacity

## 2. Hien thi thong tin store giong screenshot

**Van de**: Screenshot cho thay store header voi 4 metric: Ton kho, Gia tri ton, Capacity (% su dung), Da ban.

**Giai phap**: Trong phan AccordionTrigger cua moi store group, them 1 mini info bar giong screenshot:
- Ton kho (total_on_hand)
- Gia tri ton (@350k/unit)
- Capacity + % su dung
- Da ban (total_sold - lay tu store metrics)

**Chi tiet ky thuat**:
- Truyen `stores` array vao `DailyTransferOrder`
- Build map `storeId -> { total_on_hand, capacity, total_sold }` 
- Hien thi trong Store Summary Card khi expand, hoac inline tren AccordionTrigger

## 3. Tinh nang Thu hoi hang hoa (Stock Recall)

**Van de**: Hien tai chi co Push (tu kho tong -> store) va Lateral (store <-> store). Chua co Recall (store -> kho tong).

**Giai phap**: Them tab/section "Thu hoi" trong trang Allocation, cho phep:
- Xac dinh store nao co hang can thu hoi (DOC qua cao, velocity qua thap, store sap dong, hang seasonal het mua)
- Tao de xuat thu hoi tu store ve kho tong
- Hien thi gia tri hang thu hoi va ly do

**Chi tiet ky thuat**:

a) **Database**: Tao migration them `transfer_type = 'recall'` vao logic hien tai. Bang `inv_rebalance_suggestions` da co `transfer_type` column, them gia tri 'recall'.

b) **Edge Function**: Tao `inventory-recall-engine/index.ts` de:
- Query cac store co DOC > 60 ngay (hoac velocity < threshold)
- Xac dinh SKU/FC nao nen thu hoi (WOC > 12w, velocity < 0.05/day)
- Tinh toan so luong thu hoi (giu lai min stock cho store)
- Upsert vao `inv_rebalance_suggestions` voi `transfer_type = 'recall'`

c) **UI Component**: Tao `RecallOrderPanel.tsx` tuong tu `DailyTransferOrder` nhung:
- Group theo store nguon (store can thu hoi)
- Hien thi ly do thu hoi (DOC cao, velocity thap, hang het mua)
- Hien thi gia tri hang thu hoi
- Action: Duyet thu hoi / Tu choi

d) **Tich hop vao page**: Them tab "Thu hoi" trong `InventoryAllocationPage.tsx`, them option "Thu hoi hang" vao dropdown "Chay Engine"

## Trinh tu thuc hien

1. Cap nhat `DailyTransferOrder.tsx`: truyen them stores data, hien thi capacity check + store info
2. Cap nhat `InventoryAllocationPage.tsx`: truyen stores vao DailyTransferOrder
3. Tao migration cho recall support
4. Tao edge function `inventory-recall-engine`
5. Tao component `RecallOrderPanel.tsx`
6. Them tab Thu hoi va Engine option vao page
